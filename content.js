/**
 * GitHub to Markdown - Content Script
 * Detects GitHub discussion pages and provides conversion functionality
 */

(function () {
  'use strict';

  // Settings state
  let showPageButton = true;

  // Check if we're on a GitHub discussion page
  function isDiscussionPage() {
    return window.location.pathname.includes('/discussions/');
  }

  // Check if we're on a GitHub issue page
  function isIssuePage() {
    return window.location.pathname.includes('/issues/');
  }

  // Check if we're on a supported page (discussion or issue)
  function isSupportedPage() {
    return isDiscussionPage() || isIssuePage();
  }

  // Detect the current page type
  function detectPageType() {
    const path = window.location.pathname;
    if (path.includes('/discussions/')) return 'discussion';
    if (path.includes('/issues/')) return 'issue';
    if (path.includes('/pull/')) return 'pr';
    return 'unknown';
  }

  // Get the discussion HTML container
  function getDiscussionHTML() {
    const discussionContainer = document.querySelector('.discussion, .js-discussion');
    if (discussionContainer) {
      return discussionContainer.outerHTML;
    }

    // Fallback: try to get the timeline
    const timeline = document.querySelector('.js-discussion-timeline, .discussion-timeline');
    if (timeline) {
      return timeline.outerHTML;
    }

    return null;
  }

  // Get the issue HTML container
  function getIssueHTML() {
    // Primary selector from issue page structure
    const issueContainer = document.querySelector(
      '.IssueViewer-module__contentArea--IpMnd, [data-testid="issue-viewer-issue-container"]'
    );
    if (issueContainer) {
      return issueContainer.outerHTML;
    }

    // Fallback: try to get the comments container
    const commentsContainer = document.querySelector('[data-testid="issue-viewer-comments-container"]');
    if (commentsContainer) {
      // Get parent to include issue body
      const parent = commentsContainer.closest('[data-testid="issue-viewer-issue-container"]');
      if (parent) {
        return parent.outerHTML;
      }
    }

    return null;
  }

  // Unified function to get page HTML based on page type
  function getPageHTML() {
    const pageType = detectPageType();
    if (pageType === 'discussion') return getDiscussionHTML();
    if (pageType === 'issue') return getIssueHTML();
    return null;
  }

  // Get the discussion title
  function getDiscussionTitle() {
    // Primary selector from user-provided HTML
    const titleEl = document.querySelector('#partial-discussion-header span.js-issue-title.markdown-title');
    if (titleEl) {
      return titleEl.textContent.trim();
    }

    // Fallback selectors
    const fallbackSelectors = [
      '.js-issue-title',
      '.markdown-title',
      'h1.gh-header-title span',
      '[data-hovercard-type="discussion"] .markdown-title'
    ];

    for (const selector of fallbackSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.textContent.trim();
      }
    }

    return '';
  }

  // Get the issue title
  function getIssueTitle() {
    // Primary selector from issue page structure
    const titleEl = document.querySelector('[data-testid="issue-title"]');
    if (titleEl) {
      return titleEl.textContent.trim();
    }

    // Fallback selectors
    const fallbackSelectors = [
      'h1 bdi.markdown-title',
      '.js-issue-title',
      '.markdown-title'
    ];

    for (const selector of fallbackSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.textContent.trim();
      }
    }

    return '';
  }

  // Unified function to get page title based on page type
  function getPageTitle() {
    const pageType = detectPageType();
    if (pageType === 'discussion') return getDiscussionTitle();
    if (pageType === 'issue') return getIssueTitle();
    return '';
  }

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        showPageButton = result.settings.showPageButton !== false;
      }
    } catch (error) {
      console.log('Could not load settings:', error);
    }
  }

  // Create and inject the "Copy as Markdown" button
  function injectButton() {
    // Don't inject if not on a supported page (discussion or issue)
    if (!isSupportedPage()) {
      return;
    }

    // Don't inject if setting is disabled
    if (!showPageButton) {
      removeButton();
      return;
    }

    // Don't inject if button already exists
    if (document.querySelector('.gh-to-md-btn')) {
      return;
    }

    // Find a good place to inject the button
    // Try the discussion header actions area first
    const headerActions = document.querySelector('.discussion-header-actions, .gh-header-actions');

    if (headerActions) {
      const button = createButton();
      headerActions.prepend(button);
      return;
    }

    // Fallback: try to find the share button area
    const shareArea = document.querySelector('.js-share-button')?.parentElement;
    if (shareArea) {
      const button = createButton();
      shareArea.prepend(button);
      return;
    }

    // Last fallback: inject at the top of the discussion
    const discussion = document.querySelector('.discussion, .js-discussion');
    if (discussion) {
      const button = createButton();
      button.style.marginBottom = '16px';
      discussion.parentElement.insertBefore(button, discussion);
    }
  }

  // Remove the button from the page
  function removeButton() {
    const button = document.querySelector('.gh-to-md-btn');
    if (button) {
      button.remove();
    }
  }

  // Create the button element
  function createButton() {
    const button = document.createElement('button');
    button.className = 'gh-to-md-btn btn btn-sm';
    button.innerHTML = '📋 Copy as Markdown';
    button.title = 'Convert this page to markdown and copy to clipboard';
    button.style.cssText = `
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      margin-right: 8px;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)';
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
      button.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', handleButtonClick);

    return button;
  }

  // Handle button click - parse and copy to clipboard
  async function handleButtonClick(event) {
    const button = event.target.closest('.gh-to-md-btn');
    const originalText = button.innerHTML;

    try {
      button.innerHTML = '⏳ Converting...';
      button.disabled = true;

      const pageType = detectPageType();
      const html = getPageHTML();
      if (!html) {
        throw new Error(`Could not find ${pageType} content`);
      }

      // Get settings for button click (use defaults, respecting stored settings)
      let settings = { includeTitle: true, includeTimestamps: true, includeNested: true };
      try {
        const result = await chrome.storage.local.get('settings');
        if (result.settings) {
          settings = { ...settings, ...result.settings };
        }
      } catch (e) {
        // Use defaults
      }

      // Parse the HTML to markdown using appropriate parser
      let result;
      if (pageType === 'discussion') {
        result = window.GitHubToMarkdown.parse(html, {
          includeTimestamps: settings.includeTimestamps,
          includeNested: settings.includeNested
        });
      } else if (pageType === 'issue') {
        result = window.GitHubToMarkdown.parseIssue(html, {
          includeTimestamps: settings.includeTimestamps
        });
      } else {
        throw new Error('Unsupported page type');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      // Build final markdown with optional title
      let finalMarkdown = '';
      if (settings.includeTitle) {
        const title = getPageTitle();
        if (title) {
          finalMarkdown = `# ${title}\n\n`;
        }
      }
      finalMarkdown += result.markdown;

      // Copy to clipboard
      await navigator.clipboard.writeText(finalMarkdown);

      // Show success
      button.innerHTML = '✓ Copied!';
      button.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';

      showToast(`Copied ${result.commentCount} comments to clipboard!`, 'success');

      // Reset after delay
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
        button.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('GitHub to Markdown error:', error);
      button.innerHTML = '❌ Error';
      button.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';

      showToast(error.message || 'Failed to convert', 'error');

      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
        button.disabled = false;
      }, 2000);
    }
  }

  // Show a toast notification
  function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.gh-to-md-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'gh-to-md-toast';

    const colors = {
      success: { bg: '#10B981', text: '#FFFFFF' },
      error: { bg: '#EF4444', text: '#FFFFFF' },
      info: { bg: '#6366F1', text: '#FFFFFF' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${color.bg};
      color: ${color.text};
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: ghToMdSlideUp 0.3s ease-out;
    `;

    toast.textContent = message;

    // Add animation keyframes if not already added
    if (!document.querySelector('#gh-to-md-styles')) {
      const style = document.createElement('style');
      style.id = 'gh-to-md-styles';
      style.textContent = `
        @keyframes ghToMdSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // New unified action for both discussions and issues
    if (request.action === 'getMarkdown') {
      const pageType = detectPageType();
      const html = getPageHTML();

      if (!html) {
        sendResponse({
          success: false,
          error: `Could not find ${pageType} content on this page`,
          pageType: pageType
        });
        return true;
      }

      // Route to appropriate parser
      let result;
      if (pageType === 'discussion') {
        result = window.GitHubToMarkdown.parse(html, {
          includeTimestamps: request.includeTimestamps !== false,
          includeNested: request.includeNested !== false
        });
      } else if (pageType === 'issue') {
        result = window.GitHubToMarkdown.parseIssue(html, {
          includeTimestamps: request.includeTimestamps !== false
        });
      } else {
        sendResponse({
          success: false,
          error: 'Unsupported page type',
          pageType: pageType
        });
        return true;
      }

      sendResponse({
        success: !result.error,
        markdown: result.markdown,
        title: getPageTitle(),
        commentCount: result.commentCount,
        error: result.error,
        pageType: pageType
      });

      return true;
    }

    // Legacy action - kept for backward compatibility
    if (request.action === 'getDiscussionMarkdown') {
      const html = getDiscussionHTML();

      if (!html) {
        sendResponse({
          success: false,
          error: 'Not on a GitHub discussion page or could not find discussion content',
          isDiscussionPage: isDiscussionPage()
        });
        return true;
      }

      const result = window.GitHubToMarkdown.parse(html, {
        includeTimestamps: request.includeTimestamps !== false,
        includeNested: request.includeNested !== false
      });

      // Get the discussion title
      const title = getDiscussionTitle();

      sendResponse({
        success: !result.error,
        markdown: result.markdown,
        title: title,
        commentCount: result.commentCount,
        error: result.error,
        isDiscussionPage: true
      });

      return true;
    }

    if (request.action === 'checkPage') {
      const pageType = detectPageType();
      sendResponse({
        pageType: pageType,
        isSupportedPage: isSupportedPage(),
        isDiscussionPage: isDiscussionPage(),
        isIssuePage: isIssuePage(),
        hasContent: !!getPageHTML()
      });
      return true;
    }

    if (request.action === 'updateSettings') {
      showPageButton = request.showPageButton !== false;
      if (showPageButton) {
        injectButton();
      } else {
        removeButton();
      }
      sendResponse({ success: true });
      return true;
    }
  });

  // Listen for storage changes (for when popup updates settings)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings) {
        showPageButton = newSettings.showPageButton !== false;
        if (showPageButton) {
          injectButton();
        } else {
          removeButton();
        }
      }
    }
  });

  // Initialize
  async function init() {
    // Load settings first
    await loadSettings();

    // Inject button when DOM is ready (if enabled)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (showPageButton) {
          injectButton();
        }
      });
    } else {
      if (showPageButton) {
        injectButton();
      }
    }

    // Re-inject button on navigation (SPA support)
    const observer = new MutationObserver(() => {
      if (isSupportedPage() && showPageButton && !document.querySelector('.gh-to-md-btn')) {
        injectButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
