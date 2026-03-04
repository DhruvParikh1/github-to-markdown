// Background service worker for GitHub to Markdown
// Handles popup injection, context menu actions, and keyboard shortcuts.

const PARENT_CONTEXT_MENU_ID = 'gh-to-md-parent';
const CONTEXT_MENU_ID = 'gh-to-md-copy-markdown';
const PRINT_CONTEXT_MENU_ID = 'gh-to-md-print-markdown';

const DEFAULT_SETTINGS = {
  includeTitle: true,
  includeTimestamps: true,
  includeNested: true,
  includeBotComments: true,
  eventVerbosity: 'full',
  showPageButton: true,
  exportPreset: 'standard',
  defaultCopyFrontmatter: false,
  enterpriseHosts: [],
  enableKeyboardShortcut: true,
  enableContextMenu: true
};

function normalizeHost(hostValue) {
  if (!hostValue) return '';
  return String(hostValue).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function hostMatchesPattern(hostname, pattern) {
  if (!pattern) return false;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  return hostname === pattern;
}

async function getSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
    settings.enterpriseHosts = Array.isArray(settings.enterpriseHosts)
      ? settings.enterpriseHosts.map(normalizeHost).filter(Boolean)
      : [];
    return settings;
  } catch (error) {
    console.error('[GitHub to Markdown] Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

async function isSupportedHost(urlString, settings) {
  try {
    const url = new URL(urlString);
    const hostname = normalizeHost(url.hostname);
    if (hostname === 'github.com') {
      return true;
    }

    const enterpriseHosts = Array.isArray(settings.enterpriseHosts) ? settings.enterpriseHosts : [];
    return enterpriseHosts.some(pattern => hostMatchesPattern(hostname, pattern));
  } catch {
    return false;
  }
}

function toDocumentUrlPatterns(settings) {
  const patterns = new Set(['https://github.com/*']);
  const enterpriseHosts = Array.isArray(settings.enterpriseHosts) ? settings.enterpriseHosts : [];

  enterpriseHosts.forEach((hostPattern) => {
    const normalized = normalizeHost(hostPattern);
    if (!normalized) return;

    if (normalized.startsWith('*.')) {
      const suffix = normalized.slice(2);
      if (!suffix) return;
      patterns.add(`https://${suffix}/*`);
      patterns.add(`https://*.${suffix}/*`);
      return;
    }

    patterns.add(`https://${normalized}/*`);
  });

  return Array.from(patterns);
}

async function ensureScriptsInjected(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['parser.js', 'content.js']
  });
}

async function sendQuickCopyRequest(tabId, settings) {
  return chrome.tabs.sendMessage(tabId, {
    action: 'copyMarkdownQuick',
    includeTitle: settings.includeTitle,
    includeTimestamps: settings.includeTimestamps,
    includeNested: settings.includeNested,
    includeBotComments: settings.includeBotComments,
    eventVerbosity: settings.eventVerbosity,
    exportPreset: settings.exportPreset,
    defaultCopyFrontmatter: settings.defaultCopyFrontmatter
  });
}

async function quickCopyFromTab(tab) {
  if (!tab || !tab.id || !tab.url) {
    return;
  }

  // Skip restricted browser pages.
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://')
  ) {
    return;
  }

  const settings = await getSettings();
  const supportedHost = await isSupportedHost(tab.url, settings);
  if (!supportedHost) {
    return;
  }

  try {
    await ensureScriptsInjected(tab.id);
    await sendQuickCopyRequest(tab.id, settings);
  } catch (error) {
    console.error('[GitHub to Markdown] Quick copy failed:', error);
  }
}

async function upsertContextMenu() {
  const settings = await getSettings();

  // Remove all existing menu items
  try { await chrome.contextMenus.remove(PARENT_CONTEXT_MENU_ID); } catch { /* may not exist */ }
  try { await chrome.contextMenus.remove(CONTEXT_MENU_ID); } catch { /* may not exist */ }
  try { await chrome.contextMenus.remove(PRINT_CONTEXT_MENU_ID); } catch { /* may not exist */ }

  if (!settings.enableContextMenu) {
    return;
  }

  const urlPatterns = toDocumentUrlPatterns(settings);

  chrome.contextMenus.create({
    id: PARENT_CONTEXT_MENU_ID,
    title: 'GitHub to Markdown',
    contexts: ['page'],
    documentUrlPatterns: urlPatterns
  });

  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    parentId: PARENT_CONTEXT_MENU_ID,
    title: 'Copy as Markdown',
    contexts: ['page'],
    documentUrlPatterns: urlPatterns
  });

  chrome.contextMenus.create({
    id: PRINT_CONTEXT_MENU_ID,
    parentId: PARENT_CONTEXT_MENU_ID,
    title: 'Print GitHub Markdown',
    contexts: ['page'],
    documentUrlPatterns: urlPatterns
  });
}

chrome.runtime.onInstalled.addListener(() => {
  upsertContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  upsertContextMenu();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    upsertContextMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  if (!settings.enableContextMenu) {
    return;
  }

  if (info.menuItemId === CONTEXT_MENU_ID) {
    await quickCopyFromTab(tab);
    return;
  }

  if (info.menuItemId === PRINT_CONTEXT_MENU_ID) {
    await printFromTab(tab);
    return;
  }
});

async function printFromTab(tab) {
  if (!tab || !tab.id || !tab.url) {
    return;
  }

  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://')
  ) {
    return;
  }

  const settings = await getSettings();
  const supportedHost = await isSupportedHost(tab.url, settings);
  if (!supportedHost) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['print/print.js']
    });
  } catch (error) {
    console.error('[GitHub to Markdown] Print failed:', error);
  }
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'quick-copy-markdown') {
    return;
  }

  const settings = await getSettings();
  if (!settings.enableKeyboardShortcut) {
    return;
  }

  if (tab?.id) {
    await quickCopyFromTab(tab);
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await quickCopyFromTab(activeTab);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id || !tab.url) {
      return;
    }

    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://')
    ) {
      console.log('[GitHub to Markdown] Cannot inject into restricted page:', tab.url);
      return;
    }

    const settings = await getSettings();
    const supportedHost = await isSupportedHost(tab.url, settings);
    if (!supportedHost) {
      console.log('[GitHub to Markdown] Unsupported host. Configure enterprise host in extension settings.');
      return;
    }

    // Inject parser + content + popup injector.
    // The content script is guarded against duplicate initialization.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['parser.js', 'content.js', 'injector.js']
    });

    console.log(`[GitHub to Markdown] Popup injected into tab ${tab.id}`);
  } catch (error) {
    console.error('[GitHub to Markdown] Failed to inject script:', error);
  }
});
