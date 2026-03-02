// Background service worker for GitHub to Markdown
// Handles extension icon clicks and injects the popup iframe

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

async function getEnterpriseHosts() {
  try {
    const result = await chrome.storage.local.get('settings');
    const hosts = result?.settings?.enterpriseHosts;
    if (!Array.isArray(hosts)) return [];
    return hosts.map(normalizeHost).filter(Boolean);
  } catch (error) {
    console.error('[GitHub to Markdown] Failed to load enterprise hosts:', error);
    return [];
  }
}

async function isSupportedHost(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = normalizeHost(url.hostname);
    if (hostname === 'github.com') {
      return true;
    }

    const enterpriseHosts = await getEnterpriseHosts();
    return enterpriseHosts.some(pattern => hostMatchesPattern(hostname, pattern));
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      return;
    }

    // Check if we can inject into this tab
    if (!tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://')) {
      console.log('[GitHub to Markdown] Cannot inject into restricted page:', tab.url);
      return;
    }

    const supportedHost = await isSupportedHost(tab.url);
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
