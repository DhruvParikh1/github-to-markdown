// Background service worker for GitHub to Markdown
// Handles extension icon clicks and injects the popup iframe

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject into this tab
    if (!tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://')) {
      console.log('[GitHub to Markdown] Cannot inject into restricted page:', tab.url);
      return;
    }

    // Inject the injector script into the current tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injector.js']
    });

    console.log(`[GitHub to Markdown] Popup injected into tab ${tab.id}`);
  } catch (error) {
    console.error('[GitHub to Markdown] Failed to inject script:', error);
  }
});
