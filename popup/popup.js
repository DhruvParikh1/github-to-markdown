/**
 * GitHub to Markdown - Popup Script
 * Handles popup UI logic and communication with content script
 */

document.addEventListener('DOMContentLoaded', init);

// DOM Elements
let markdownTextarea, charCountEl, commentCountEl;
let pageInfoCard, pageTypeBadge, pageTypeText;
let refreshBtn, copyBtn, copyBtnText;
let includeTitleCheckbox, includeTimestampsCheckbox, includeNestedCheckbox;
let showPageButtonCheckbox;
let toastContainer;

// Views
let mainView, settingsView, aboutView;
let navMain, navSettings, navAbout;
let settingsButton, infoButton;

// State
let currentMarkdown = '';
let pageTitle = '';

// Default settings
const DEFAULT_SETTINGS = {
  includeTitle: true,
  includeTimestamps: true,
  includeNested: true,
  showPageButton: true
};

async function init() {
  // Get DOM elements
  markdownTextarea = document.getElementById('markdown-output');
  charCountEl = document.getElementById('char-count');
  commentCountEl = document.getElementById('comment-count');

  pageInfoCard = document.getElementById('page-info');
  pageTypeBadge = document.getElementById('page-type-badge');
  pageTypeText = document.getElementById('page-type-text');

  refreshBtn = document.getElementById('refresh-btn');
  copyBtn = document.getElementById('copy-btn');
  copyBtnText = document.getElementById('copy-btn-text');

  includeTitleCheckbox = document.getElementById('include-title');
  includeTimestampsCheckbox = document.getElementById('include-timestamps');
  includeNestedCheckbox = document.getElementById('include-nested');
  showPageButtonCheckbox = document.getElementById('show-page-button');

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

  // Attach navigation event listeners
  setupNavigation();

  // Attach button event listeners
  refreshBtn.addEventListener('click', fetchMarkdown);
  copyBtn.addEventListener('click', copyToClipboard);

  // Settings listeners
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
  showPageButtonCheckbox.addEventListener('change', async () => {
    saveSettings();
    await notifyContentScriptOfSettings();
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
    } catch (e) {
      // Fallback
    }
  }
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
    console.log('Could not notify content script:', error.message);
  }
}

/**
 * Fetch markdown from the current tab
 */
async function fetchMarkdown() {
  copyBtn.disabled = true;
  currentMarkdown = '';
  pageTitle = '';
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

    // Check if we're on GitHub
    if (!tab.url || !tab.url.includes('github.com')) {
      showToast('Navigate to a GitHub page', 'error');
      markdownTextarea.placeholder = 'This extension works on GitHub discussions, issues, and pull requests.\n\nNavigate to a supported page and try again.';
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
      includeTimestamps: includeTimestampsCheckbox.checked,
      includeNested: includeNestedCheckbox.checked
    });

    if (!response) {
      showToast('No response from page', 'error');
      markdownTextarea.placeholder = 'Could not communicate with the page.\n\nTry refreshing the GitHub page and clicking the extension again.';
      return;
    }

    if (!response.success) {
      showToast(response.error || 'Conversion failed', 'error');
      markdownTextarea.placeholder = response.error || 'Failed to convert the page.';
      return;
    }

    // Store the title and markdown
    pageTitle = response.title || '';
    currentMarkdown = response.markdown;

    // Update page info card
    updatePageInfo(response.pageType, response.commentCount);

    // Update display with title if enabled
    updateMarkdownDisplay();

    showToast(`Converted ${response.commentCount} comment${response.commentCount !== 1 ? 's' : ''}`, 'success');
    copyBtn.disabled = false;

  } catch (error) {
    console.error('Popup error:', error);

    if (error.message?.includes('Receiving end does not exist')) {
      showToast('Please refresh the page', 'error');
      markdownTextarea.placeholder = 'The extension needs to be reloaded on this page.\n\nPlease refresh the GitHub page and try again.';
    } else {
      showToast('Connection error', 'error');
      markdownTextarea.placeholder = `Error: ${error.message}\n\nTry refreshing the GitHub page.`;
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

  let icon, label;
  if (pageType === 'discussion') {
    pageTypeBadge.classList.add('badge-discussion');
    icon = discussionIcon;
    label = 'Discussion';
  } else if (pageType === 'issue') {
    pageTypeBadge.classList.add('badge-issue');
    icon = issueIcon;
    label = 'Issue';
  } else if (pageType === 'pr') {
    pageTypeBadge.classList.add('badge-pr');
    icon = prIcon;
    label = 'Pull Request';
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

  let displayMarkdown = '';

  // Prepend title if enabled and available
  if (includeTitleCheckbox.checked && pageTitle) {
    displayMarkdown = `# ${pageTitle}\n\n`;
  }

  displayMarkdown += currentMarkdown;
  markdownTextarea.value = displayMarkdown;

  // Update character count
  const charCount = displayMarkdown.length;
  if (charCount > 1000) {
    charCountEl.textContent = `${(charCount / 1000).toFixed(1)}k chars`;
  } else {
    charCountEl.textContent = `${charCount} chars`;
  }
}

/**
 * Copy markdown to clipboard
 */
async function copyToClipboard() {
  const markdownToCopy = markdownTextarea.value;

  if (!markdownToCopy) {
    showToast('Nothing to copy', 'error');
    return;
  }

  let copySuccess = false;

  // Try using the Clipboard API first
  try {
    await navigator.clipboard.writeText(markdownToCopy);
    copySuccess = true;
  } catch (clipboardError) {
    console.log('Clipboard API failed, trying fallback:', clipboardError.message);

    // Fallback: Use execCommand (works in more contexts)
    try {
      // Select the textarea content
      markdownTextarea.select();
      markdownTextarea.setSelectionRange(0, markdownTextarea.value.length);

      // Execute copy command
      copySuccess = document.execCommand('copy');

      // Deselect
      window.getSelection()?.removeAllRanges();
    } catch (execError) {
      console.error('Fallback copy also failed:', execError);
    }
  }

  if (copySuccess) {
    // Visual feedback
    copyBtn.classList.add('btn-success');
    copyBtn.classList.remove('btn-primary');
    copyBtnText.textContent = '✓ Copied!';

    showToast('Copied to clipboard!', 'success');

    // Hide status badge after successful copy (after a short delay)
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 1500);

    // Reset button after delay
    setTimeout(() => {
      copyBtn.classList.remove('btn-success');
      copyBtn.classList.add('btn-primary');
      copyBtnText.textContent = 'Copy to Clipboard';
    }, 2000);
  } else {
    showToast('Failed to copy', 'error');
  }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  // Clear existing toasts
  toastContainer.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;

  toastContainer.appendChild(toast);

  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
