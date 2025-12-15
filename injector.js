// Injector script for GitHub to Markdown
// Creates and manages the popup iframe with rounded corners

(function () {
  'use strict';

  const POPUP_ID = 'gh-to-md-popup-iframe';
  const BACKDROP_ID = 'gh-to-md-backdrop';

  // Check if popup already exists (toggle behavior)
  const existingPopup = document.getElementById(POPUP_ID);
  if (existingPopup) {
    closePopup();
    return;
  }

  // Detect system dark mode preference to match iframe background
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bgColor = isDarkMode ? '#0D1117' : '#FFFFFF';

  // Create backdrop for click-outside-to-close functionality
  const backdrop = document.createElement('div');
  backdrop.id = BACKDROP_ID;
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2147483645;
    opacity: 0;
    transition: opacity 0.2s ease-out;
  `;
  backdrop.addEventListener('click', closePopup);
  document.body.appendChild(backdrop);

  // Fade in backdrop
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
  });

  // Create the iframe
  const iframe = document.createElement('iframe');
  iframe.id = POPUP_ID;
  iframe.src = chrome.runtime.getURL('popup/popup.html');
  // Allow clipboard access in the iframe
  iframe.allow = 'clipboard-write';
  iframe.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 380px;
    height: 560px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 2147483646;
    overflow: hidden;
    background-color: ${bgColor};
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
  `;

  // Show iframe with animation after it's fully loaded
  iframe.addEventListener('load', () => {
    requestAnimationFrame(() => {
      iframe.style.opacity = '1';
      iframe.style.transform = 'translateY(0) scale(1)';
    });
  });

  document.body.appendChild(iframe);

  // Listen for close messages from the popup
  window.addEventListener('message', handleMessage);

  // Listen for Escape key to close popup
  document.addEventListener('keydown', handleKeydown);

  function handleMessage(event) {
    // Verify the message is from our extension
    if (event.data && event.data.type === 'GH_TO_MD_CLOSE') {
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
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(-10px) scale(0.98)';
    }

    if (backdrop) {
      backdrop.style.opacity = '0';
    }

    // Remove elements after animation
    setTimeout(() => {
      if (popup) popup.remove();
      if (backdrop) backdrop.remove();
    }, 200);

    // Clean up event listeners
    window.removeEventListener('message', handleMessage);
    document.removeEventListener('keydown', handleKeydown);
  }
})();
