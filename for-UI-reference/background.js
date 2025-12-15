// Background service worker for Paste Overflow
// Handles extension icon clicks and injects the popup iframe

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject into this tab
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      console.log('Cannot inject into restricted page:', tab.url);
      // Could show a notification here if desired
      return;
    }

    // Inject the injector script into the current tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injector.js']
    });

    console.log(`Injector script injected into tab ${tab.id}`);
  } catch (error) {
    console.error('Failed to inject script:', error);
  }
});
