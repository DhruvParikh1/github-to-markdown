/**
 * GitHub to Markdown - Popup Script
 * Handles popup UI logic and communication with content script
 */

document.addEventListener('DOMContentLoaded', init);

// DOM Elements
let markdownTextarea, charCountEl, commentCountEl;
let pageInfoCard, pageTypeBadge;
let refreshBtn, copyBtn, copyBtnText;
let copyFrontmatterBtn, copyFrontmatterBtnText, downloadBtn;
let sendToBtn, sendToMenu, customTargetsMenuItems, addOwnBtn;
let includeTitleCheckbox, includeTimestampsCheckbox, includeNestedCheckbox;
let includeBotCommentsCheckbox, eventVerbositySelect;
let showPageButtonCheckbox, exportPresetSelect, defaultCopyFrontmatterCheckbox;
let enableKeyboardShortcutCheckbox, enableContextMenuCheckbox;
let enterpriseHostsInput;
let customTargetsList, customTargetNameInput, customTargetUrlInput, addCustomTargetBtn;
let toastContainer;

// Views
let mainView, settingsView, aboutView;
let navMain, navSettings, navAbout;
let settingsButton, infoButton;
let navigateTo; // Set in setupNavigation, used for cross-feature navigation

// State
let currentMarkdown = '';
let pageTitle = '';
let currentPageType = 'unknown';
let currentCommentCount = 0;
let currentSourceUrl = '';

// Default settings
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
  enableContextMenu: true,
  customTargets: []
};

let currentSettings = { ...DEFAULT_SETTINGS };

async function init() {
  // Get DOM elements
  markdownTextarea = document.getElementById('markdown-output');
  charCountEl = document.getElementById('char-count');
  commentCountEl = document.getElementById('comment-count');

  pageInfoCard = document.getElementById('page-info');
  pageTypeBadge = document.getElementById('page-type-badge');

  refreshBtn = document.getElementById('refresh-btn');
  copyBtn = document.getElementById('copy-btn');
  copyBtnText = document.getElementById('copy-btn-text');
  copyFrontmatterBtn = document.getElementById('copy-frontmatter-btn');
  copyFrontmatterBtnText = document.getElementById('copy-frontmatter-btn-text');
  downloadBtn = document.getElementById('download-btn');

  sendToBtn = document.getElementById('send-to-btn');
  sendToMenu = document.getElementById('send-to-menu');
  customTargetsMenuItems = document.getElementById('custom-targets-menu-items');
  addOwnBtn = document.getElementById('add-own-btn');
  customTargetsList = document.getElementById('custom-targets-list');
  customTargetNameInput = document.getElementById('custom-target-name');
  customTargetUrlInput = document.getElementById('custom-target-url');
  addCustomTargetBtn = document.getElementById('add-custom-target-btn');

  includeTitleCheckbox = document.getElementById('include-title');
  includeTimestampsCheckbox = document.getElementById('include-timestamps');
  includeNestedCheckbox = document.getElementById('include-nested');
  includeBotCommentsCheckbox = document.getElementById('include-bot-comments');
  eventVerbositySelect = document.getElementById('event-verbosity');
  showPageButtonCheckbox = document.getElementById('show-page-button');
  exportPresetSelect = document.getElementById('export-preset');
  defaultCopyFrontmatterCheckbox = document.getElementById('default-copy-frontmatter');
  enableKeyboardShortcutCheckbox = document.getElementById('enable-keyboard-shortcut');
  enableContextMenuCheckbox = document.getElementById('enable-context-menu');
  enterpriseHostsInput = document.getElementById('enterprise-hosts');

  toastContainer = document.getElementById('toast-container');

  // Views
  mainView = document.getElementById('main-view');
  settingsView = document.getElementById('settings-view');
  aboutView = document.getElementById('about-view');

  // Navigation
  navMain = document.getElementById('nav-main');
  navSettings = document.getElementById('nav-settings');
  navAbout = document.getElementById('nav-about');
  settingsButton = document.getElementById('settings-button');
  infoButton = document.getElementById('info-button');

  // Load saved settings
  await loadSettings();

  // Set up info-button tooltips
  setupTooltips();

  // Attach navigation event listeners
  setupNavigation();

  // Attach button event listeners
  refreshBtn.addEventListener('click', fetchMarkdown);
  copyBtn.addEventListener('click', () => copyToClipboard(false));
  copyFrontmatterBtn.addEventListener('click', () => copyToClipboard(true));
  downloadBtn.addEventListener('click', downloadMarkdown);

  // Settings listeners
  includeTitleCheckbox.addEventListener('change', async () => {
    await saveSettings();
    updateMarkdownDisplay();
  });
  includeTimestampsCheckbox.addEventListener('change', async () => {
    await saveSettings();
    fetchMarkdown();
  });
  includeNestedCheckbox.addEventListener('change', async () => {
    await saveSettings();
    fetchMarkdown();
  });
  includeBotCommentsCheckbox.addEventListener('change', async () => {
    await saveSettings();
    fetchMarkdown();
  });
  eventVerbositySelect.addEventListener('change', async () => {
    await saveSettings();
    fetchMarkdown();
  });
  showPageButtonCheckbox.addEventListener('change', async () => {
    await saveSettings();
    await notifyContentScriptOfSettings();
  });
  exportPresetSelect.addEventListener('change', async () => {
    await saveSettings();
    updateMarkdownDisplay();
  });
  defaultCopyFrontmatterCheckbox.addEventListener('change', async () => {
    await saveSettings();
    updateMarkdownDisplay();
  });
  enableKeyboardShortcutCheckbox.addEventListener('change', saveSettings);
  enableContextMenuCheckbox.addEventListener('change', saveSettings);
  enterpriseHostsInput.addEventListener('change', handleEnterpriseHostsChange);

  // Send To button — toggle dropdown
  sendToBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendToMenu.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    sendToMenu.classList.add('hidden');
  });

  // Prevent clicks inside the menu from closing it
  sendToMenu.addEventListener('click', (e) => e.stopPropagation());

  // Built-in targets
  sendToMenu.querySelectorAll('.send-to-option[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleSendTo(btn.dataset.target);
      sendToMenu.classList.add('hidden');
    });
  });

  // "Add Your Own..." → navigate to settings
  addOwnBtn.addEventListener('click', () => {
    sendToMenu.classList.add('hidden');
    if (navigateTo) navigateTo(navSettings, settingsView);
  });

  // Custom target management
  addCustomTargetBtn.addEventListener('click', handleAddCustomTarget);
  customTargetUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddCustomTarget();
  });

  // Listen for Escape key to close popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.parent !== window) {
      window.parent.postMessage({ type: 'GH_TO_MD_CLOSE' }, '*');
    }
  });

  // Update version badge
  updateVersionBadge();

  // Initial fetch
  fetchMarkdown();
}

function normalizeHost(hostValue) {
  return String(hostValue || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

function isValidHostPattern(hostPattern) {
  return /^(\*\.)?([a-z0-9-]+\.)+[a-z0-9-]+$/.test(hostPattern);
}

function parseEnterpriseHostsInput(value) {
  const rawHosts = String(value || '')
    .split(',')
    .map(normalizeHost)
    .filter(Boolean);

  const uniqueHosts = [];
  const invalidHosts = [];

  rawHosts.forEach((host) => {
    if (!isValidHostPattern(host)) {
      invalidHosts.push(host);
      return;
    }
    if (!uniqueHosts.includes(host)) {
      uniqueHosts.push(host);
    }
  });

  return { validHosts: uniqueHosts, invalidHosts };
}

function hostMatchesPattern(hostname, pattern) {
  if (!pattern) return false;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  return hostname === pattern;
}

function isSupportedHostUrl(urlString, settings = currentSettings) {
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

function getPageTypeLabel(pageType) {
  if (pageType === 'discussion') return 'Discussion';
  if (pageType === 'issue') return 'Issue';
  if (pageType === 'pr') return 'Pull Request';
  return 'Page';
}

function yamlString(value) {
  const normalized = String(value ?? '').replace(/\r\n/g, '\n');
  return `"${normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function buildFrontmatter({
  title,
  pageType,
  sourceUrl,
  commentCount,
  exportPreset
}) {
  const exportedAt = new Date().toISOString();
  return [
    '---',
    `title: ${yamlString(title || '')}`,
    `source_type: ${yamlString(pageType || '')}`,
    `source_url: ${yamlString(sourceUrl || '')}`,
    `comment_count: ${Number.isFinite(commentCount) ? commentCount : 0}`,
    `export_preset: ${yamlString(exportPreset || 'standard')}`,
    `exported_at: ${yamlString(exportedAt)}`,
    '---',
    ''
  ].join('\n');
}

function buildMetadataLines() {
  return [
    `- Source type: ${getPageTypeLabel(currentPageType)}`,
    `- Comments: ${Number.isFinite(currentCommentCount) ? currentCommentCount : 0}`,
    `- URL: ${currentSourceUrl || ''}`,
    `- Exported at: ${new Date().toISOString()}`
  ].join('\n');
}

function buildPresetMarkdown() {
  const preset = currentSettings.exportPreset || 'standard';
  const title = pageTitle || `${getPageTypeLabel(currentPageType)} export`;
  const body = currentMarkdown || '';
  const metadata = buildMetadataLines();

  if (preset === 'llm_context') {
    return [
      `# LLM Context: ${title}`,
      '',
      '## Metadata',
      metadata,
      '',
      '## Usage Notes',
      '- Treat this as source context for summarization and reasoning.',
      '- Preserve technical details and links from the raw thread.',
      '',
      '## Raw Thread',
      '',
      body
    ].join('\n');
  }

  if (preset === 'changelog') {
    return [
      `# Changelog Draft: ${title}`,
      '',
      '## Metadata',
      metadata,
      '',
      '## Highlights',
      '- Fill in key shipped changes.',
      '',
      '## Breaking Changes',
      '- None noted',
      '',
      '## Detailed Source Notes',
      '',
      body
    ].join('\n');
  }

  if (preset === 'incident_report') {
    return [
      `# Incident Report Notes: ${title}`,
      '',
      '## Metadata',
      metadata,
      '',
      '## Incident Summary',
      '- Fill in summary',
      '',
      '## Timeline',
      '',
      body,
      '',
      '## Impact',
      '- Fill in impact',
      '',
      '## Follow-up Actions',
      '- [ ] Add action item'
    ].join('\n');
  }

  if (preset === 'meeting_notes') {
    return [
      `# Meeting Notes: ${title}`,
      '',
      '## Metadata',
      metadata,
      '',
      '## Agenda',
      '- Fill in agenda',
      '',
      '## Discussion Log',
      '',
      body,
      '',
      '## Decisions',
      '- Fill in decisions',
      '',
      '## Action Items',
      '- [ ] Add action item'
    ].join('\n');
  }

  let markdown = body;
  if (currentSettings.includeTitle && pageTitle) {
    markdown = `# ${pageTitle}\n\n${markdown}`;
  }
  return markdown;
}

function buildExportMarkdown(forceFrontmatter = false) {
  const body = buildPresetMarkdown();
  const includeFrontmatter = forceFrontmatter || currentSettings.defaultCopyFrontmatter === true;
  if (!includeFrontmatter) {
    return body;
  }

  return `${buildFrontmatter({
    title: pageTitle,
    pageType: currentPageType,
    sourceUrl: currentSourceUrl,
    commentCount: currentCommentCount,
    exportPreset: currentSettings.exportPreset
  })}\n${body}`;
}

function setExportActionsEnabled(enabled) {
  copyBtn.disabled = !enabled;
  copyFrontmatterBtn.disabled = !enabled;
  downloadBtn.disabled = !enabled;
  if (sendToBtn) sendToBtn.disabled = !enabled;
}

/**
 * Setup navigation between views
 */
function setupNavigation() {
  const segmentButtons = [navMain, navSettings, navAbout];
  const views = [mainView, settingsView, aboutView];

  function setActiveSegment(activeButton, activeView) {
    // Update buttons
    segmentButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-selected', 'true');
    activeButton.setAttribute('tabindex', '0');
    activeButton.focus();

    // Update views
    views.forEach(view => view.classList.add('hidden'));
    activeView.classList.remove('hidden');
  }

  // Expose setActiveSegment for external use (e.g. "Add Your Own..." button)
  navigateTo = setActiveSegment;

  // Click handlers
  navMain.addEventListener('click', () => setActiveSegment(navMain, mainView));
  navSettings.addEventListener('click', () => setActiveSegment(navSettings, settingsView));
  navAbout.addEventListener('click', () => setActiveSegment(navAbout, aboutView));

  // Header button shortcuts
  settingsButton.addEventListener('click', () => setActiveSegment(navSettings, settingsView));
  infoButton.addEventListener('click', () => setActiveSegment(navAbout, aboutView));

  // Keyboard navigation (Left/Right arrows)
  segmentButtons.forEach((btn, index) => {
    btn.addEventListener('keydown', (e) => {
      let newIndex = index;
      if (e.key === 'ArrowRight') {
        newIndex = (index + 1) % segmentButtons.length;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        newIndex = (index - 1 + segmentButtons.length) % segmentButtons.length;
        e.preventDefault();
      }
      if (newIndex !== index) {
        setActiveSegment(segmentButtons[newIndex], views[newIndex]);
      }
    });
  });
}

/**
 * Update version badge from manifest
 */
function updateVersionBadge() {
  const versionBadge = document.getElementById('version-badge');
  if (versionBadge && chrome.runtime.getManifest) {
    try {
      const manifest = chrome.runtime.getManifest();
      versionBadge.textContent = `v${manifest.version}`;
    } catch {
      // Fallback
    }
  }
}

function collectUiSettings(baseSettings = currentSettings) {
  return {
    ...baseSettings,
    includeTitle: includeTitleCheckbox.checked,
    includeTimestamps: includeTimestampsCheckbox.checked,
    includeNested: includeNestedCheckbox.checked,
    includeBotComments: includeBotCommentsCheckbox.checked,
    eventVerbosity: eventVerbositySelect.value || 'full',
    showPageButton: showPageButtonCheckbox.checked,
    exportPreset: exportPresetSelect.value || 'standard',
    defaultCopyFrontmatter: defaultCopyFrontmatterCheckbox.checked,
    enableKeyboardShortcut: enableKeyboardShortcutCheckbox.checked,
    enableContextMenu: enableContextMenuCheckbox.checked
  };
}

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const storageSettings = { ...DEFAULT_SETTINGS, ...result.settings };
    const enterpriseHosts = Array.isArray(storageSettings.enterpriseHosts)
      ? storageSettings.enterpriseHosts.map(normalizeHost).filter(Boolean)
      : [];
    currentSettings = { ...storageSettings, enterpriseHosts };

    includeTitleCheckbox.checked = currentSettings.includeTitle;
    includeTimestampsCheckbox.checked = currentSettings.includeTimestamps;
    includeNestedCheckbox.checked = currentSettings.includeNested;
    includeBotCommentsCheckbox.checked = currentSettings.includeBotComments;
    eventVerbositySelect.value = currentSettings.eventVerbosity || 'full';
    showPageButtonCheckbox.checked = currentSettings.showPageButton;
    exportPresetSelect.value = currentSettings.exportPreset;
    defaultCopyFrontmatterCheckbox.checked = currentSettings.defaultCopyFrontmatter;
    enableKeyboardShortcutCheckbox.checked = currentSettings.enableKeyboardShortcut !== false;
    enableContextMenuCheckbox.checked = currentSettings.enableContextMenu !== false;
    enterpriseHostsInput.value = currentSettings.enterpriseHosts.join(', ');

    renderCustomTargetsList();
    renderCustomTargetsMenu();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings(extra = {}) {
  try {
    currentSettings = {
      ...collectUiSettings(),
      ...extra
    };
    await chrome.storage.local.set({ settings: currentSettings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function requestEnterpriseHostPermissions(hosts) {
  if (!hosts.length) {
    return true;
  }

  const origins = hosts.map((host) => `https://${host}/*`);
  try {
    const granted = await chrome.permissions.request({ origins });
    return granted === true;
  } catch (error) {
    console.error('Failed to request host permissions:', error);
    return false;
  }
}

async function handleEnterpriseHostsChange() {
  const { validHosts, invalidHosts } = parseEnterpriseHostsInput(enterpriseHostsInput.value);

  if (invalidHosts.length > 0) {
    showToast(`Invalid host: ${invalidHosts[0]}`, 'error');
    enterpriseHostsInput.value = currentSettings.enterpriseHosts.join(', ');
    return;
  }

  const previousHosts = Array.isArray(currentSettings.enterpriseHosts) ? currentSettings.enterpriseHosts : [];
  const addedHosts = validHosts.filter(host => !previousHosts.includes(host));

  const granted = await requestEnterpriseHostPermissions(addedHosts);
  if (!granted) {
    showToast('Host permissions were not granted', 'error');
    enterpriseHostsInput.value = previousHosts.join(', ');
    return;
  }

  enterpriseHostsInput.value = validHosts.join(', ');
  await saveSettings({ enterpriseHosts: validHosts });
  showToast('Enterprise hosts updated', 'success');
}

/**
 * Notify content script of settings change
 */
async function notifyContentScriptOfSettings() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && isSupportedHostUrl(tab.url)) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        showPageButton: currentSettings.showPageButton
      });
    }
  } catch (error) {
    console.log('Could not notify content script:', error.message);
  }
}

/**
 * Fetch markdown from the current tab
 */
async function fetchMarkdown() {
  setExportActionsEnabled(false);
  currentMarkdown = '';
  pageTitle = '';
  currentPageType = 'unknown';
  currentCommentCount = 0;
  currentSourceUrl = '';
  markdownTextarea.value = '';
  charCountEl.textContent = '';
  pageInfoCard.classList.add('hidden');

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      showToast('No active tab found', 'error');
      return;
    }

    if (!tab.url || !isSupportedHostUrl(tab.url)) {
      showToast('Navigate to a configured GitHub host', 'error');
      markdownTextarea.placeholder = 'Supported hosts: github.com and configured enterprise domains.\n\nOpen a discussion, issue, or pull request page and try again.';
      return;
    }

    // Check if it's a supported page
    const isDiscussion = tab.url.includes('/discussions/');
    const isIssue = tab.url.includes('/issues/');
    const isPullRequest = tab.url.includes('/pull/');

    if (!isDiscussion && !isIssue && !isPullRequest) {
      showToast('Not a supported page', 'error');
      markdownTextarea.placeholder = 'Navigate to a discussion (/discussions/), issue (/issues/), or pull request (/pull/) page to convert it to markdown.';
      return;
    }

    // Request markdown from content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getMarkdown',
      includeTimestamps: currentSettings.includeTimestamps,
      includeNested: currentSettings.includeNested,
      includeBotComments: currentSettings.includeBotComments,
      eventVerbosity: currentSettings.eventVerbosity
    });

    if (!response) {
      showToast('No response from page', 'error');
      markdownTextarea.placeholder = 'Could not communicate with the page.\n\nTry refreshing the page and clicking the extension again.';
      return;
    }

    if (!response.success) {
      showToast(response.error || 'Conversion failed', 'error');
      markdownTextarea.placeholder = response.error || 'Failed to convert the page.';
      return;
    }

    // Store conversion state
    pageTitle = response.title || '';
    currentMarkdown = response.markdown || '';
    currentPageType = response.pageType || 'unknown';
    currentCommentCount = response.commentCount || 0;
    currentSourceUrl = response.sourceUrl || tab.url;

    // Update page info card
    updatePageInfo(currentPageType, currentCommentCount);

    // Update display with chosen preset
    updateMarkdownDisplay();

    showToast(`Converted ${currentCommentCount} comment${currentCommentCount !== 1 ? 's' : ''}`, 'success');
    setExportActionsEnabled(true);

  } catch (error) {
    console.error('Popup error:', error);

    if (error.message?.includes('Receiving end does not exist')) {
      showToast('Please refresh the page', 'error');
      markdownTextarea.placeholder = 'The extension needs to be reloaded on this page.\n\nPlease refresh the page and try again.';
    } else {
      showToast('Connection error', 'error');
      markdownTextarea.placeholder = `Error: ${error.message}\n\nTry refreshing the page.`;
    }
  }
}

/**
 * Update page info card
 */
function updatePageInfo(pageType, commentCount) {
  pageInfoCard.classList.remove('hidden');

  // Update badge styling and text
  pageTypeBadge.className = 'page-type-badge';

  // SVG icons for each page type
  const discussionIcon = `<svg class="badge-icon" width="12" height="12" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path d="M32.5,138A72,72,0,1,1,62,167.5l-27.76,8.16a8,8,0,0,1-9.93-9.93Z" /><path d="M163.94,80.11A72,72,0,0,1,223.5,186l8.16,27.76a8,8,0,0,1-9.93,9.93L194,215.5A72.05,72.05,0,0,1,92.06,175.89" /></svg>`;
  const issueIcon = `<svg class="badge-icon" width="12" height="12" viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16" fill="currentColor"/></svg>`;
  const prIcon = `<svg class="badge-icon" width="12" height="12" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><circle cx="72" cy="192" r="24" /><circle cx="72" cy="64" r="24" /><line x1="72" y1="88" x2="72" y2="168" /><circle cx="200" cy="192" r="24" /><path d="M200,168V110.63a16,16,0,0,0-4.69-11.32L144,48" /><polyline points="144 96 144 48 192 48" /></svg>`;

  let icon = issueIcon;
  let label = getPageTypeLabel(pageType);
  if (pageType === 'discussion') {
    pageTypeBadge.classList.add('badge-discussion');
    icon = discussionIcon;
  } else if (pageType === 'issue') {
    pageTypeBadge.classList.add('badge-issue');
    icon = issueIcon;
  } else if (pageType === 'pr') {
    pageTypeBadge.classList.add('badge-pr');
    icon = prIcon;
  }

  pageTypeBadge.innerHTML = `${icon} <span>${label}</span>`;

  // Update comment count
  commentCountEl.textContent = `${commentCount} found`;
}

/**
 * Update the markdown display based on current settings
 */
function updateMarkdownDisplay() {
  if (!currentMarkdown) {
    markdownTextarea.value = '';
    charCountEl.textContent = '';
    return;
  }

  const displayMarkdown = buildExportMarkdown(false);
  markdownTextarea.value = displayMarkdown;

  // Update character count
  const charCount = displayMarkdown.length;
  if (charCount > 1000) {
    charCountEl.textContent = `${(charCount / 1000).toFixed(1)}k chars`;
  } else {
    charCountEl.textContent = `${charCount} chars`;
  }
}

async function copyText(text) {
  // Try using the Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (clipboardError) {
    console.log('Clipboard API failed, trying fallback:', clipboardError.message);

    // Fallback: Use execCommand
    try {
      markdownTextarea.value = text;
      markdownTextarea.select();
      markdownTextarea.setSelectionRange(0, markdownTextarea.value.length);
      const success = document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
      updateMarkdownDisplay();
      return success;
    } catch (execError) {
      console.error('Fallback copy also failed:', execError);
      return false;
    }
  }
}

function showCopySuccess(button, textEl, successText, resetText) {
  button.classList.add('btn-success');
  button.classList.remove('btn-primary');
  textEl.textContent = successText;
  setTimeout(() => {
    button.classList.remove('btn-success');
    if (button === copyBtn) {
      button.classList.add('btn-primary');
    }
    textEl.textContent = resetText;
  }, 2000);
}

/**
 * Copy markdown to clipboard
 */
async function copyToClipboard(forceFrontmatter) {
  const markdownToCopy = buildExportMarkdown(forceFrontmatter);

  if (!markdownToCopy) {
    showToast('Nothing to copy', 'error');
    return;
  }

  const copySuccess = await copyText(markdownToCopy);

  if (copySuccess) {
    if (forceFrontmatter) {
      showCopySuccess(copyFrontmatterBtn, copyFrontmatterBtnText, 'Copied', 'Copy + Frontmatter');
      showToast('Copied with frontmatter', 'success');
    } else {
      showCopySuccess(copyBtn, copyBtnText, 'Copied', 'Copy');
      showToast('Copied to clipboard', 'success');
    }
  } else {
    showToast('Failed to copy', 'error');
  }
}

function sanitizeFilename(text) {
  return String(text || 'github-export')
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'github-export';
}

function downloadMarkdown() {
  const markdown = buildExportMarkdown(false);
  if (!markdown) {
    showToast('Nothing to download', 'error');
    return;
  }

  const presetSuffix = currentSettings.exportPreset && currentSettings.exportPreset !== 'standard'
    ? `-${currentSettings.exportPreset}`
    : '';
  const filename = `${sanitizeFilename(pageTitle || `${currentPageType}-export`)}${presetSuffix}.md`;

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  showToast(`Downloaded ${filename}`, 'success');
}

/**
 * Send markdown content to an AI assistant URL
 */
function handleSendTo(target) {
  const content = buildExportMarkdown(false);
  if (!content) {
    showToast('Nothing to send', 'error');
    return;
  }
  const encoded = encodeURIComponent(content);
  let url;
  if (target === 'claude') {
    url = `https://claude.ai/new?q=${encoded}`;
  } else if (target === 'chatgpt') {
    url = `https://chatgpt.com/?q=${encoded}`;
  }
  if (url) chrome.tabs.create({ url });
}

function handleCustomSendTo(urlTemplate) {
  const content = buildExportMarkdown(false);
  if (!content) {
    showToast('Nothing to send', 'error');
    return;
  }
  const url = urlTemplate.replace('{prompt}', encodeURIComponent(content));
  chrome.tabs.create({ url });
}

/**
 * Render custom targets inside the Send To dropdown menu
 */
function renderCustomTargetsMenu() {
  if (!customTargetsMenuItems) return;
  customTargetsMenuItems.innerHTML = '';
  const targets = currentSettings.customTargets || [];
  targets.forEach(target => {
    const btn = document.createElement('button');
    btn.className = 'send-to-option';
    btn.textContent = target.name;
    btn.addEventListener('click', () => {
      handleCustomSendTo(target.url);
      sendToMenu.classList.add('hidden');
    });
    customTargetsMenuItems.appendChild(btn);
  });
}

/**
 * Render the custom targets list in the settings view
 */
function renderCustomTargetsList() {
  if (!customTargetsList) return;
  customTargetsList.innerHTML = '';
  const targets = currentSettings.customTargets || [];
  if (targets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'custom-targets-empty';
    empty.textContent = 'No custom targets yet.';
    customTargetsList.appendChild(empty);
    return;
  }
  targets.forEach((target, index) => {
    const item = document.createElement('div');
    item.className = 'custom-target-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'custom-target-name';
    nameEl.textContent = target.name;

    const urlEl = document.createElement('span');
    urlEl.className = 'custom-target-url';
    urlEl.textContent = target.url;
    urlEl.title = target.url;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'custom-target-remove';
    removeBtn.title = 'Remove';
    removeBtn.setAttribute('aria-label', `Remove ${target.name}`);
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.addEventListener('click', () => removeCustomTarget(index));

    item.appendChild(nameEl);
    item.appendChild(urlEl);
    item.appendChild(removeBtn);
    customTargetsList.appendChild(item);
  });
}

async function handleAddCustomTarget() {
  const name = (customTargetNameInput.value || '').trim();
  const url = (customTargetUrlInput.value || '').trim();

  if (!name) {
    showToast('Please enter a name', 'error');
    customTargetNameInput.focus();
    return;
  }
  if (!url) {
    showToast('Please enter a URL', 'error');
    customTargetUrlInput.focus();
    return;
  }
  if (!url.includes('{prompt}')) {
    showToast('URL must contain {prompt}', 'error');
    customTargetUrlInput.focus();
    return;
  }

  const targets = [...(currentSettings.customTargets || []), { name, url }];
  await saveSettings({ customTargets: targets });

  customTargetNameInput.value = '';
  customTargetUrlInput.value = '';

  renderCustomTargetsList();
  renderCustomTargetsMenu();
  showToast(`Added "${name}"`, 'success');
}

async function removeCustomTarget(index) {
  const targets = [...(currentSettings.customTargets || [])];
  const [removed] = targets.splice(index, 1);
  await saveSettings({ customTargets: targets });
  renderCustomTargetsList();
  renderCustomTargetsMenu();
  if (removed) showToast(`Removed "${removed.name}"`, 'success');
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  // Clear existing toasts
  toastContainer.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');

  if (type === 'success') {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
  } else if (type === 'error') {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);

  toastContainer.appendChild(toast);

  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function setupTooltips() {
  const GAP = 6;
  const MARGIN = 8;

  document.querySelectorAll('.info-btn').forEach(btn => {
    const tooltip = btn.nextElementSibling;
    if (!tooltip || !tooltip.classList.contains('setting-tooltip')) return;

    function show() {
      const btnRect = btn.getBoundingClientRect();
      const tipWidth = tooltip.offsetWidth || 270;
      const tipHeight = tooltip.offsetHeight || 80;

      // Center horizontally over button, clamped to viewport
      let left = btnRect.left + btnRect.width / 2 - tipWidth / 2;
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - tipWidth - MARGIN));

      // Prefer above; fall back to below if not enough room
      let top = btnRect.top - GAP - tipHeight;
      if (top < MARGIN) top = btnRect.bottom + GAP;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add('visible');
    }

    function hide() {
      tooltip.classList.remove('visible');
    }

    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('blur', hide);
  });
}
