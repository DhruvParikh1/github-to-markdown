/**
 * GitHub to Markdown - Popup Script
 * Handles popup UI logic and communication with content script
 */

document.addEventListener('DOMContentLoaded', init);

// DOM Elements
let statusEl, statusIconEl, statusTextEl;
let markdownTextarea, commentCountEl;
let refreshBtn, copyBtn, copyBtnText;
let includeTitleCheckbox, includeTimestampsCheckbox, includeNestedCheckbox;
let showPageButtonCheckbox;
let toastContainer;

// State
let currentMarkdown = '';
let discussionTitle = '';

// Default settings
const DEFAULT_SETTINGS = {
  includeTitle: true,
  includeTimestamps: true,
  includeNested: true,
  showPageButton: true
};

async function init() {
  // Get DOM elements
  statusEl = document.getElementById('status');
  statusIconEl = statusEl.querySelector('.status-icon');
  statusTextEl = statusEl.querySelector('.status-text');

  markdownTextarea = document.getElementById('markdown-output');
  commentCountEl = document.getElementById('comment-count');

  refreshBtn = document.getElementById('refresh-btn');
  copyBtn = document.getElementById('copy-btn');
  copyBtnText = document.getElementById('copy-btn-text');

  includeTitleCheckbox = document.getElementById('include-title');
  includeTimestampsCheckbox = document.getElementById('include-timestamps');
  includeNestedCheckbox = document.getElementById('include-nested');
  showPageButtonCheckbox = document.getElementById('show-page-button');

  toastContainer = document.getElementById('toast-container');

  // Load saved settings
  await loadSettings();

  // Attach event listeners
  refreshBtn.addEventListener('click', fetchMarkdown);
  copyBtn.addEventListener('click', copyToClipboard);

  // Settings that affect markdown output - re-fetch on change
  includeTitleCheckbox.addEventListener('change', () => {
    saveSettings();
    updateMarkdownDisplay();
  });
  includeTimestampsCheckbox.addEventListener('change', () => {
    saveSettings();
    fetchMarkdown();
  });
  includeNestedCheckbox.addEventListener('change', () => {
    saveSettings();
    fetchMarkdown();
  });

  // Settings that affect content script - notify content script on change
  showPageButtonCheckbox.addEventListener('change', async () => {
    saveSettings();
    await notifyContentScriptOfSettings();
  });

  // Initial fetch
  fetchMarkdown();
}

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };

    includeTitleCheckbox.checked = settings.includeTitle;
    includeTimestampsCheckbox.checked = settings.includeTimestamps;
    includeNestedCheckbox.checked = settings.includeNested;
    showPageButtonCheckbox.checked = settings.showPageButton;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings() {
  try {
    const settings = {
      includeTitle: includeTitleCheckbox.checked,
      includeTimestamps: includeTimestampsCheckbox.checked,
      includeNested: includeNestedCheckbox.checked,
      showPageButton: showPageButtonCheckbox.checked
    };
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Notify content script of settings change
 */
async function notifyContentScriptOfSettings() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url?.includes('github.com')) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        showPageButton: showPageButtonCheckbox.checked
      });
    }
  } catch (error) {
    // Content script may not be loaded yet, that's okay
    console.log('Could not notify content script:', error.message);
  }
}

/**
 * Fetch markdown from the current tab
 */
async function fetchMarkdown() {
  setStatus('info', '🔍', 'Checking page...');
  copyBtn.disabled = true;
  currentMarkdown = '';
  discussionTitle = '';
  markdownTextarea.value = '';
  commentCountEl.textContent = '';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      setStatus('error', '❌', 'No active tab found');
      return;
    }

    // Check if we're on GitHub
    if (!tab.url || !tab.url.includes('github.com')) {
      setStatus('warning', '⚠️', 'Navigate to a GitHub page');
      markdownTextarea.placeholder = 'This extension only works on GitHub discussion pages.\n\nNavigate to a GitHub discussion and try again.';
      return;
    }

    // Check if it's a discussion page
    if (!tab.url.includes('/discussions/')) {
      setStatus('warning', '⚠️', 'Not a discussion page');
      markdownTextarea.placeholder = 'This page is not a GitHub discussion.\n\nNavigate to a discussion page (URL should contain /discussions/) to convert it to markdown.';
      return;
    }

    // Request markdown from content script
    setStatus('info', '⏳', 'Converting...');

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getDiscussionMarkdown',
      includeTimestamps: includeTimestampsCheckbox.checked,
      includeNested: includeNestedCheckbox.checked
    });

    if (!response) {
      setStatus('error', '❌', 'No response from page');
      markdownTextarea.placeholder = 'Could not communicate with the page.\n\nTry refreshing the GitHub page and reopening this popup.';
      return;
    }

    if (!response.success) {
      setStatus('error', '❌', response.error || 'Conversion failed');
      markdownTextarea.placeholder = response.error || 'Failed to convert the discussion.';
      return;
    }

    // Store the title and markdown
    discussionTitle = response.title || '';
    currentMarkdown = response.markdown;

    // Update display with title if enabled
    updateMarkdownDisplay();

    commentCountEl.textContent = `${response.commentCount} comment${response.commentCount !== 1 ? 's' : ''}`;
    setStatus('success', '✓', `Found ${response.commentCount} comment${response.commentCount !== 1 ? 's' : ''}`);
    copyBtn.disabled = false;

  } catch (error) {
    console.error('Popup error:', error);

    // Handle specific errors
    if (error.message?.includes('Receiving end does not exist')) {
      setStatus('warning', '⚠️', 'Refresh the page');
      markdownTextarea.placeholder = 'The extension needs to be reloaded on this page.\n\nPlease refresh the GitHub discussion page and try again.';
    } else {
      setStatus('error', '❌', 'Connection error');
      markdownTextarea.placeholder = `Error: ${error.message}\n\nTry refreshing the GitHub page.`;
    }
  }
}

/**
 * Update the markdown display based on current settings
 */
function updateMarkdownDisplay() {
  if (!currentMarkdown) {
    markdownTextarea.value = '';
    return;
  }

  let displayMarkdown = '';

  // Prepend title if enabled and available
  if (includeTitleCheckbox.checked && discussionTitle) {
    displayMarkdown = `# ${discussionTitle}\n\n`;
  }

  displayMarkdown += currentMarkdown;
  markdownTextarea.value = displayMarkdown;
}

/**
 * Copy markdown to clipboard
 */
async function copyToClipboard() {
  // Get the currently displayed markdown (with or without title)
  const markdownToCopy = markdownTextarea.value;

  if (!markdownToCopy) {
    showToast('Nothing to copy', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(markdownToCopy);

    // Visual feedback
    copyBtn.classList.add('btn-success');
    copyBtn.classList.remove('btn-primary');
    copyBtnText.textContent = '✓ Copied!';

    showToast('Copied to clipboard!', 'success');

    // Reset after delay
    setTimeout(() => {
      copyBtn.classList.remove('btn-success');
      copyBtn.classList.add('btn-primary');
      copyBtnText.textContent = 'Copy to Clipboard';
    }, 2000);

  } catch (error) {
    console.error('Copy error:', error);
    showToast('Failed to copy', 'error');
  }
}

/**
 * Set the status badge
 */
function setStatus(type, icon, text) {
  statusEl.className = `status-badge status-${type}`;
  statusIconEl.textContent = icon;
  statusTextEl.textContent = text;
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  // Clear existing toasts
  toastContainer.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
