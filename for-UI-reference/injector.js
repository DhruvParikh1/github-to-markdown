// Injector script for Paste Overflow
// Creates and manages the popup iframe with rounded corners

(function () {
  const POPUP_ID = 'paste-overflow-popup-iframe';
  const BACKDROP_ID = 'paste-overflow-backdrop';

  // Check if popup already exists (toggle behavior)
  const existingPopup = document.getElementById(POPUP_ID);
  if (existingPopup) {
    closePopup();
    return;
  }

  // Detect system dark mode preference to match iframe background
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bgColor = isDarkMode ? '#17120F' : '#FFFFFF';

  // Create backdrop for click-outside-to-close functionality
  const backdrop = document.createElement('div');
  backdrop.id = BACKDROP_ID;
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: transparent;
    z-index: 2147483645;
  `;
  backdrop.addEventListener('click', closePopup);
  document.body.appendChild(backdrop);

  // Create the iframe - completely hidden until loaded
  const iframe = document.createElement('iframe');
  iframe.id = POPUP_ID;
  iframe.src = chrome.runtime.getURL('popup/popup.html');
  iframe.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 360px;
    height: 580px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 2147483646;
    overflow: hidden;
    display: none;
    background-color: ${bgColor};
  `;

  // Show iframe only after it's fully loaded
  iframe.addEventListener('load', () => {
    // Show immediately - no animation to avoid flicker
    iframe.style.display = 'block';
  });

  document.body.appendChild(iframe);

  // Listen for close messages from the popup
  window.addEventListener('message', handleMessage);

  // Listen for Escape key to close popup
  document.addEventListener('keydown', handleKeydown);

  function handleMessage(event) {
    // Verify the message is from our extension
    if (event.data && event.data.type === 'PASTE_OVERFLOW_CLOSE') {
      closePopup();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closePopup();
    }
  }

  function closePopup() {
    const popup = document.getElementById(POPUP_ID);
    const backdrop = document.getElementById(BACKDROP_ID);

    if (popup) {
      popup.remove();
    }

    if (backdrop) {
      backdrop.remove();
    }

    // Clean up event listeners
    window.removeEventListener('message', handleMessage);
    document.removeEventListener('keydown', handleKeydown);
  }
})();
