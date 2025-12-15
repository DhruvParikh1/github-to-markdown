document.addEventListener('DOMContentLoaded', () => {
  const MAX_CHAR = 3800;

  // Cache DOM elements
  const sendButton = document.getElementById('send-button');
  const contentBox = document.getElementById('content-box');
  const statusMessage = document.getElementById('status-message');
  const mainView = document.getElementById('main-view');
  const infoView = document.getElementById('info-view');
  const historyView = document.getElementById('history-view');
  const statsView = document.getElementById('stats-view');
  const settingsView = document.getElementById('settings-view');
  const infoButton = document.getElementById('info-button');
  const settingsButton = document.getElementById('settings-button');
  const backButton = document.getElementById('back-button');
  const backButtonSettings = document.getElementById('back-button-settings');
  const errorMessage = document.getElementById('error-message');
  const clearHistoryButton = document.getElementById('clear-history-button');

  // Segmented control elements
  const navPaste = document.getElementById('nav-paste');
  const navHistory = document.getElementById('nav-history');
  const navStats = document.getElementById('nav-stats');
  const segmentButtons = [navPaste, navHistory, navStats];
  const fileTypeSelect = document.getElementById('file-type');
  const fileDetailsRow = document.getElementById('file-details-row');
  const customFilenameInput = document.getElementById('custom-filename');
  const customExtensionInput = document.getElementById('custom-extension');
  const mascot = document.getElementById('mascot');
  const mascotZzz = document.getElementById('mascot-zzz');

  // Idle timer for sleeping mascot
  let idleTimer = null;
  const IDLE_TIMEOUT = 10000; // 10 seconds

  // Clippy image paths
  const CLIPPY_IMAGES = {
    regular: '../icons/Clippy.png',
    sleeping: '../icons/Clippy-Sleep.png',
    mad: '../icons/Clippy-Mad.png',
    happy: '../icons/Clippy-Happy.png',
    surprised: '../icons/Clippy-Surprised.png'
  };

  // Animation tier configuration - animations get crazier with more pokes
  const ANIMATION_TIERS = {
    curious: { name: 'curious', minPokes: 0, spin: 0, sparkles: 5, sparkleSize: 'small', duration: 600 },
    friendly: { name: 'friendly', minPokes: 10, spin: 360, sparkles: 8, sparkleSize: 'medium', duration: 700 },
    playful: { name: 'playful', minPokes: 25, spin: 720, sparkles: 10, sparkleSize: 'large', duration: 800 },
    chaotic: { name: 'chaotic', minPokes: 50, spin: 1080, sparkles: 12, sparkleSize: 'rainbow', duration: 900, shake: true, trail: true },
    legendary: { name: 'legendary', minPokes: 100, spin: 1080, sparkles: 15, sparkleSize: 'rainbow', duration: 1000, shake: true, trail: true, glow: true, confetti: true }
  };

  // Milestone celebration messages
  const MILESTONES = {
    10: { count: 10, title: "Clippy's New Friend!", emoji: '🤝' },
    25: { count: 25, title: 'Poke Master!', emoji: '🎯' },
    50: { count: 50, title: 'Legendary Poker!', emoji: '🏆' },
    100: { count: 100, title: 'Absolute Madlad!', emoji: '👑' }
  };

  // Settings elements
  const themeSelect = document.getElementById('theme-select');
  const historySizeSelect = document.getElementById('history-size-select');
  const defaultFiletypeSelect = document.getElementById('default-filetype-select');
  const defaultExtensionRow = document.getElementById('default-extension-row');
  const defaultExtensionInput = document.getElementById('default-extension-input');
  const mascotToggle = document.getElementById('mascot-toggle');

  // Default Type segmented control elements
  const defaultTypeText = document.getElementById('default-type-text');
  const defaultTypeFile = document.getElementById('default-type-file');
  const defaultFiletypeSetting = document.getElementById('default-filetype-setting');

  /* Logo click listener removed as it's no longer the main nav home button */
  /*
  logo.addEventListener('click', () => {
    showView(mainView);
  });
  */

  // Handle file type selection
  const fileDefaultHint = document.getElementById('file-default-hint');

  fileTypeSelect.addEventListener('change', () => {
    const value = fileTypeSelect.value;

    if (value === '') {
      // Text mode - hide everything
      fileDetailsRow.classList.add('hidden');
      fileDetailsRow.classList.remove('show-extension');
      fileDefaultHint.classList.add('hidden');
      customFilenameInput.value = '';
      customExtensionInput.value = '';
    } else if (value === 'other') {
      // Other - show filename and extension
      fileDetailsRow.classList.remove('hidden');
      fileDetailsRow.classList.add('show-extension');
      fileDefaultHint.classList.remove('hidden');
      customExtensionInput.focus();
    } else {
      // Predefined file type - show only filename
      fileDetailsRow.classList.remove('hidden');
      fileDetailsRow.classList.remove('show-extension');
      fileDefaultHint.classList.remove('hidden');
      customExtensionInput.value = '';
    }
  });

  // View management
  function showView(viewToShow) {
    [mainView, infoView, historyView, statsView, settingsView].forEach(view => {
      view.classList.add('hidden');
      if (view.classList.contains('view-container')) {
        view.scrollTop = 0;
      }
    });
    viewToShow.classList.remove('hidden');
  }

  // Segmented control: set active segment and show corresponding view
  function setActiveSegment(activeButton) {
    segmentButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-selected', 'true');
    activeButton.setAttribute('tabindex', '0');
    activeButton.focus();

    // Show the corresponding view
    if (activeButton === navPaste) {
      showView(mainView);
    } else if (activeButton === navHistory) {
      showView(historyView);
      updateHistoryView();
    } else if (activeButton === navStats) {
      showView(statsView);
      updateStatsView();
    }
  }

  // Segmented control click handlers
  navPaste.addEventListener('click', () => setActiveSegment(navPaste));
  navHistory.addEventListener('click', () => setActiveSegment(navHistory));
  navStats.addEventListener('click', () => setActiveSegment(navStats));

  // Keyboard navigation for segmented control (Left/Right arrows)
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
        setActiveSegment(segmentButtons[newIndex]);
      }
    });
  });

  infoButton.addEventListener('click', () => {
    showView(infoView);
    updatePokeCount();
    updateVersionBadge();
  });
  settingsButton.addEventListener('click', () => showView(settingsView));
  backButton.addEventListener('click', () => {
    setActiveSegment(navPaste);
  });
  backButtonSettings.addEventListener('click', () => {
    applyDefaultTypeToMainSelector();
    setActiveSegment(navPaste);
  });

  // Clear history event listener
  clearHistoryButton.addEventListener('click', () => {
    chrome.storage.local.set({ 'history': [] }, function () {
      updateHistoryView();
    });
  });

  // Error handling for active tab
  async function checkActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // console.log('Active tab URL:', tab.url); // Debugging line
    const isValidDomain = tab.url && (
      tab.url.includes('claude.ai') ||
      tab.url.includes('chatgpt.com') ||
      tab.url.includes('kimi.com') ||
      tab.url.includes('moonshot.cn') ||
      tab.url.includes('deepseek.com') ||
      tab.url.includes('grok.com') ||
      tab.url.includes('gemini.google.com')
    );

    if (isValidDomain) {
      errorMessage.textContent = '';
      errorMessage.classList.add('hidden'); // Hide the error message
      sendButton.disabled = false;
      contentBox.disabled = false;
    } else {
      errorMessage.textContent = 'Error: This extension only works on claude.ai, chatgpt.com, kimi.com, chat.deepseek.com, grok.com, and gemini.google.com.';
      errorMessage.classList.remove('hidden'); // Show the error message
      // Actually, let's keep it visible but maybe distinct styling?
      // The CSS handles #error-message style nicely now
      sendButton.disabled = true;
      contentBox.disabled = true;
      // Trigger dizzy animation on error
      triggerMascotDizzy();
    }
  }

  checkActiveTab();

  // Send content function
  function sendContent(content, callback) {
    if (!content) {
      if (callback) callback(new Error('No content provided'));
      return;
    }

    content = content.replace(/\r?\n/g, '\n');

    // Check if user wants to send as file
    let fileType = document.getElementById('file-type').value;

    // Handle custom extension
    if (fileType === 'other') {
      const customExt = customExtensionInput.value.trim().replace(/^\./, ''); // Remove leading dot if present
      if (!customExt) {
        if (callback) callback(new Error('Please enter a custom file extension'));
        return;
      }
      fileType = customExt;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const tab = tabs[0];
      try {
        if (fileType) {
          // Send as file attachment
          // Use custom filename if provided, otherwise generate timestamp-based name
          const customName = customFilenameInput.value.trim();
          const filename = customName || `paste_${Date.now()}`;
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'sendAsFile',
            data: { content, filename, fileType }
          });

          // Check if the response indicates an error
          if (response && response.status === 'error') {
            throw new Error(response.message || 'Failed to attach file. Claude may not support this file type.');
          }
        } else {
          // Send as text chunks (existing behavior)
          const chunks = splitContent(content, MAX_CHAR);
          for (const chunk of chunks) {
            await chrome.tabs.sendMessage(tab.id, { action: 'sendToChat', data: chunk });
          }
        }
        if (callback) callback(null);
      } catch (error) {
        if (callback) callback(error);
      }
    });
  }

  // Split content into chunks
  function splitContent(text, maxChars) {
    const chunks = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = currentIndex + maxChars;
      if (endIndex >= text.length) {
        chunks.push(text.substring(currentIndex));
        break;
      }

      let lastBreak = text.lastIndexOf('\n', endIndex);
      if (lastBreak <= currentIndex) lastBreak = text.lastIndexOf(' ', endIndex);
      if (lastBreak > currentIndex) {
        endIndex = lastBreak;
      }

      chunks.push(text.substring(currentIndex, endIndex));
      currentIndex = endIndex;
    }

    return chunks;
  }

  // Save content to history with timestamp
  function saveToHistory(content) {
    const timestamp = Date.now();
    chrome.storage.local.get({ 'history': [], 'historySize': '5' }, function (result) {
      let history = result.history;
      const maxSize = parseInt(result.historySize, 10) || 5;
      history.unshift({ content: content, timestamp: timestamp });
      if (history.length > maxSize) {
        history = history.slice(0, maxSize);
      }
      chrome.storage.local.set({ 'history': history });
    });
  }

  // Get history from storage
  function getHistory(callback) {
    chrome.storage.local.get({ 'history': [] }, function (result) {
      callback(result.history);
    });
  }

  // Delete a single history item by timestamp
  function deleteHistoryItem(timestamp) {
    chrome.storage.local.get({ 'history': [] }, function (result) {
      const history = result.history.filter(item => item.timestamp !== timestamp);
      chrome.storage.local.set({ 'history': history }, function () {
        updateHistoryView();
      });
    });
  }

  // Update history view
  function updateHistoryView() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    getHistory(function (history) {
      if (!Array.isArray(history) || history.length === 0) {
        historyList.innerHTML = '<li class="history-item" style="text-align: center; color: var(--text-tertiary);">No history available.</li>';
      } else {
        history.forEach((item) => {
          if (item && typeof item === 'object') {
            const listItem = document.createElement('li');
            listItem.className = 'history-item';

            // Create top row container
            const topRow = document.createElement('div');
            topRow.className = 'history-item-top';

            // Create content element
            const contentDiv = document.createElement('div');
            contentDiv.className = 'history-item-content';
            const maxContentLength = 50;
            let displayContent = item.content || '';
            if (typeof displayContent === 'string' && displayContent.length > maxContentLength) {
              displayContent = displayContent.substring(0, maxContentLength) + '...';
            }
            contentDiv.textContent = displayContent;
            contentDiv.title = item.content; // Add tooltip

            // Create timestamp element
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'history-item-time';
            const timeAgo = item.timestamp ? timeSince(item.timestamp) : 'Unknown time';
            timestampDiv.textContent = timeAgo;

            // Append content and timestamp to topRow
            topRow.appendChild(contentDiv);
            topRow.appendChild(timestampDiv);

            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'history-item-actions';

            // Resend button
            const resendButton = document.createElement('button');
            resendButton.textContent = 'Resend';
            resendButton.className = 'btn btn-primary btn-sm'; // New classes
            resendButton.addEventListener('click', () => {
              if (item.content) {
                // Return to main view to show status
                showView(mainView);
                // Pre-fill content (optional, but good UX)
                contentBox.value = item.content;

                sendContent(item.content, function (error) {
                  if (error) {
                    statusMessage.textContent = 'Failed to resend content.';
                    statusMessage.style.color = 'var(--error)';
                  } else {
                    statusMessage.textContent = 'Content resent successfully.';
                    statusMessage.style.color = 'var(--success)';
                    saveToHistory(item.content); // Should we save resend to history? Yes, updates timestamp
                    incrementUsageCount();
                  }
                });
              } else {
                alert('No content to resend.');
              }
            });

            // Copy button
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy';
            copyButton.className = 'btn btn-sm'; // New classes
            copyButton.addEventListener('click', () => {
              if (item.content) {
                navigator.clipboard.writeText(item.content).then(() => {
                  // alert('Copied to clipboard.'); // Let's use a nice toast or just change text temporarily
                  const originalText = copyButton.textContent;
                  copyButton.textContent = 'Copied!';
                  setTimeout(() => {
                    copyButton.textContent = originalText;
                  }, 1500);
                });
              } else {
                alert('No content to copy.');
              }
            });

            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-times"></i>';
            deleteButton.className = 'btn btn-sm delete-btn';
            deleteButton.title = 'Delete this item';
            deleteButton.addEventListener('click', () => {
              deleteHistoryItem(item.timestamp);
            });

            buttonContainer.appendChild(resendButton);
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(deleteButton);

            // Append elements to listItem
            listItem.appendChild(topRow);
            listItem.appendChild(buttonContainer);
            historyList.appendChild(listItem);
          }
        });
      }
    });
  }

  // Helper function to get local date string in YYYY-MM-DD format
  // This avoids the UTC conversion issue with toISOString()
  function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function updateStatsView() {
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '';
    chrome.storage.local.get({ 'usageStats': {}, 'timeSaved': { textSeconds: 0, fileSeconds: 0 } }, function (result) {
      const usageStats = result.usageStats;
      const timeSaved = result.timeSaved;

      // Get today's date (using local timezone)
      const today = new Date();
      const todayStr = getLocalDateString(today);
      const todayCount = usageStats[todayStr] || 0;

      // Get yesterday's date (using local timezone)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      const yesterdayCount = usageStats[yesterdayStr] || 0;

      // Total uses
      const totalUses = Object.values(usageStats).reduce((a, b) => a + b, 0);

      // Most active day
      let maxUses = 0;
      let maxDate = 'N/A';
      for (let date in usageStats) {
        if (usageStats[date] > maxUses) {
          maxUses = usageStats[date];
          maxDate = date;
        }
      }

      // Additional stats
      const datesUsed = Object.keys(usageStats);
      const totalDaysUsed = datesUsed.length;
      const averageUsage = totalDaysUsed > 0 ? (totalUses / totalDaysUsed).toFixed(1) : 0;

      // Calculate time saved with proper formatting
      const totalSecondsSaved = (timeSaved.textSeconds || 0) + (timeSaved.fileSeconds || 0);
      const textSeconds = timeSaved.textSeconds || 0;
      const fileSeconds = timeSaved.fileSeconds || 0;

      // Helper to format time nicely
      function formatTimeSaved(seconds) {
        if (seconds < 60) {
          return { value: seconds, label: 'sec' };
        } else if (seconds < 3600) {
          // Show one decimal place for minutes
          const mins = seconds / 60;
          // If it's a whole number, show without decimal. Otherwise show 1 decimal.
          const displayMins = Number.isInteger(mins) ? mins : mins.toFixed(1);
          return { value: displayMins, label: 'min' };
        } else {
          // Hours for really big numbers
          const hrs = seconds / 3600;
          const displayHrs = Number.isInteger(hrs) ? hrs : hrs.toFixed(1);
          return { value: displayHrs, label: 'hr' };
        }
      }

      const totalTime = formatTimeSaved(totalSecondsSaved);
      const textTime = formatTimeSaved(textSeconds);
      const fileTime = formatTimeSaved(fileSeconds);

      // Generate HTML content with new card-based layout
      const statsHtml = `
        <!-- Hero Stat -->
        <div class="stats-hero">
          <div class="stats-hero-number">${totalUses}</div>
          <div class="stats-hero-label">Total pastes sent</div>
        </div>

        <!-- Minutes Saved Stat -->
        <div class="stats-time-saved">
          <div class="time-saved-content">
            <div class="time-saved-value">${totalTime.value}</div>
            <div class="time-saved-label">${totalTime.label === 'sec' ? 'Seconds' : totalTime.label === 'min' ? 'Minutes' : 'Hours'} saved</div>
          </div>
          <div class="time-saved-info" id="time-saved-info-btn">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="time-saved-tooltip" id="time-saved-tooltip">
            <div class="tooltip-title">How time is calculated</div>
            <div class="tooltip-row">
              <span class="tooltip-category">📄 Text chunks (Claude)</span>
              <span class="tooltip-value">${textTime.value} ${textTime.label}</span>
            </div>
            <div class="tooltip-desc">~10 sec/chunk: Navigate to editor, select right amount, paste</div>
            <div class="tooltip-row">
              <span class="tooltip-category">📎 File attachments</span>
              <span class="tooltip-value">${fileTime.value} ${fileTime.label}</span>
            </div>
            <div class="tooltip-desc">~15 sec/file: Create file, decide location, name it</div>
          </div>
        </div>

        <!-- Stat Cards Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-value">${todayCount}</div>
            <div class="stat-card-label">Today</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${yesterdayCount}</div>
            <div class="stat-card-label">Yesterday</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${totalDaysUsed}</div>
            <div class="stat-card-label">Days active</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${averageUsage}</div>
            <div class="stat-card-label">Daily avg</div>
          </div>
        </div>

        <!-- Activity Chart Section -->
        <div class="stats-section">
          <div class="stats-section-header">
            <div class="stats-section-title">Activity</div>
            <div class="stats-section-subtitle">Last 7 Days</div>
          </div>
          <div id="chart-container"></div>
        </div>
        
        <!-- Daily Usage Table -->
        <div class="stats-section">
          <div class="stats-section-header">
            <div class="stats-section-title">Daily Details</div>
          </div>
          <table id="usage-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Uses</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;

      statsContent.innerHTML = statsHtml;

      // Generate bar chart data
      const chartContainer = document.getElementById('chart-container');
      const chartData = [];
      let maxCount = 1;

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = getLocalDateString(date);
        const count = usageStats[dateStr] || 0;
        if (count > maxCount) maxCount = count;
        chartData.push({ date: dateStr, count: count });
      }

      // Create bar chart with percentage-based heights
      const chartHtml = chartData.map(item => {
        const barHeight = Math.max((item.count / maxCount) * 100, 5); // Min 5% height for visibility
        const dateLabel = item.date.slice(5); // MM-DD format
        return `
        <div class="chart-bar">
          <div class="bar-value">${item.count}</div>
          <div class="bar" style="height: ${barHeight}%"></div>
          <div class="label">${dateLabel}</div>
        </div>
      `}).join('');

      chartContainer.innerHTML = `
        <div class="chart">
          ${chartHtml}
        </div>
      `;

      // Populate usage table
      const tableBody = document.querySelector('#usage-table tbody');
      let tableRows = '';

      for (let i = 0; i <= 6; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = getLocalDateString(date);
        const count = usageStats[dateStr] || 0;
        tableRows += `<tr><td>${dateStr}</td><td>${count}</td></tr>`;
      }

      tableBody.innerHTML = tableRows;
    });
  }

  // Function to calculate time since timestamp
  function timeSince(date) {
    var seconds = Math.floor((Date.now() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval + "y ago";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval + "mo ago";
    }
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval + "d ago";
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval + "h ago";
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval + "m ago";
    }
    return Math.floor(seconds) + "s ago";
  }

  // Function to save the current content
  function saveCurrentContent(content) {
    chrome.storage.local.set({ 'currentContent': content }, function () {
      // console.log('Current content saved.');
    });
  }

  // Function to load the saved content
  function loadSavedContent() {
    chrome.storage.local.get(['currentContent'], function (result) {
      if (result.currentContent) {
        contentBox.value = result.currentContent;
        // console.log('Saved content loaded.');
      }
    });
  }

  // Function to clear the saved content
  function clearSavedContent() {
    chrome.storage.local.remove('currentContent', function () {
      // console.log('Saved content cleared.');
    });
  }

  // Add event listener for input events on the textarea to save content
  contentBox.addEventListener('input', () => {
    const currentContent = contentBox.value;
    saveCurrentContent(currentContent);
  });

  // Send button event listener
  sendButton.addEventListener('click', () => {
    const content = contentBox.value;
    let fileType = document.getElementById('file-type').value;

    // Get actual file type (including custom)
    if (fileType === 'other') {
      fileType = customExtensionInput.value.trim().replace(/^\./, '');
    }

    sendContent(content, function (error) {
      if (error) {
        console.error(error);
        statusMessage.textContent = error.message || 'Failed to send content.';
        statusMessage.style.color = 'var(--error)';
        // Trigger dizzy animation on send failure
        triggerMascotDizzy();
      } else {
        if (fileType) {
          statusMessage.textContent = `File attached successfully as .${fileType}!`;
          // Track time saved for file attachment (15 seconds saved)
          trackTimeSaved('file', 15);
        } else {
          statusMessage.textContent = 'Content sent successfully!';
          // Track time saved for text paste on Claude only
          // Calculate chunks and multiply by 10 seconds per chunk
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            if (tab.url && tab.url.includes('claude.ai')) {
              const chunks = splitContent(content, MAX_CHAR);
              const secondsSaved = chunks.length * 10;
              trackTimeSaved('text', secondsSaved);
            }
          });
        }
        statusMessage.style.color = 'var(--success)';
        contentBox.value = '';
        saveToHistory(content);
        incrementUsageCount();
        clearSavedContent();

        // Mascot celebration
        if (mascot && !mascot.classList.contains('hidden')) {
          mascot.classList.add('celebrate');
          setTimeout(() => mascot.classList.remove('celebrate'), 500);
        }
      }
    });
  });

  function incrementUsageCount() {
    const today = getLocalDateString(new Date());
    chrome.storage.local.get({ 'usageStats': {} }, function (result) {
      const usageStats = result.usageStats;
      if (usageStats[today]) {
        usageStats[today]++;
      } else {
        usageStats[today] = 1;
      }
      chrome.storage.local.set({ 'usageStats': usageStats });
    });
  }

  // Track time saved based on paste type
  // type: 'text' (Claude only, 10 sec/chunk) or 'file' (any platform, 15 sec/file)
  function trackTimeSaved(type, seconds) {
    chrome.storage.local.get({ 'timeSaved': { textSeconds: 0, fileSeconds: 0 } }, function (result) {
      const timeSaved = result.timeSaved;
      if (type === 'text') {
        timeSaved.textSeconds += seconds;
      } else if (type === 'file') {
        timeSaved.fileSeconds += seconds;
      }
      chrome.storage.local.set({ 'timeSaved': timeSaved });
    });
  }

  // ==========================================
  // Settings Management
  // ==========================================

  function loadSettings() {
    chrome.storage.local.get({
      'theme': 'system',
      'historySize': '5',
      'defaultType': 'text',
      'defaultFileType': 'txt',
      'defaultExtension': '',
      'showMascot': true
    }, function (settings) {
      // Apply theme
      themeSelect.value = settings.theme;
      themeSelect.dispatchEvent(new Event('change')); // Update custom dropdown display
      applyTheme(settings.theme);

      // Apply history size
      historySizeSelect.value = settings.historySize;
      historySizeSelect.dispatchEvent(new Event('change')); // Update custom dropdown display

      // Apply default type (text vs file)
      if (settings.defaultType === 'file') {
        defaultTypeText.classList.remove('active');
        defaultTypeText.setAttribute('aria-checked', 'false');
        defaultTypeFile.classList.add('active');
        defaultTypeFile.setAttribute('aria-checked', 'true');
        defaultFiletypeSetting.classList.remove('hidden');

        // Apply default file type
        const fileType = settings.defaultFileType || 'txt';
        defaultFiletypeSelect.value = fileType;
        // Dispatch change to update custom dropdown display
        defaultFiletypeSelect.dispatchEvent(new Event('change'));

        if (fileType === 'other') {
          defaultExtensionRow.classList.remove('hidden');
          defaultExtensionInput.value = settings.defaultExtension || '';
          // Set the main file type to 'other' and fill in the extension
          fileTypeSelect.value = 'other';
          fileTypeSelect.dispatchEvent(new Event('change'));
          customExtensionInput.value = settings.defaultExtension || '';
        } else {
          // Explicitly hide extension row and clear input for non-other types
          defaultExtensionRow.classList.add('hidden');
          defaultExtensionInput.value = '';
          fileTypeSelect.value = fileType;
          fileTypeSelect.dispatchEvent(new Event('change'));
        }
      } else {
        // Text mode - keep file type selector at default (text)
        defaultTypeText.classList.add('active');
        defaultTypeText.setAttribute('aria-checked', 'true');
        defaultTypeFile.classList.remove('active');
        defaultTypeFile.setAttribute('aria-checked', 'false');
        defaultFiletypeSetting.classList.add('hidden');
        defaultExtensionRow.classList.add('hidden');
        defaultExtensionInput.value = '';
      }

      // Apply mascot visibility
      mascotToggle.checked = settings.showMascot;
      if (!settings.showMascot && mascot) {
        mascot.classList.add('hidden');
      }
    });
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'dark') {
      document.body.classList.add('theme-dark');
    }
    // 'system' uses CSS media queries, no class needed
  }

  // Settings event listeners
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    chrome.storage.local.set({ 'theme': theme });
    applyTheme(theme);
  });

  historySizeSelect.addEventListener('change', () => {
    chrome.storage.local.set({ 'historySize': historySizeSelect.value });
  });

  defaultFiletypeSelect.addEventListener('change', () => {
    const value = defaultFiletypeSelect.value;
    if (value === 'other') {
      defaultExtensionRow.classList.remove('hidden');
      defaultExtensionInput.focus();
    } else {
      defaultExtensionRow.classList.add('hidden');
      defaultExtensionInput.value = '';
      // Clear stored extension when not using 'other'
      chrome.storage.local.set({ 'defaultExtension': '' });
    }
    chrome.storage.local.set({ 'defaultFileType': value });
  });

  defaultExtensionInput.addEventListener('input', () => {
    chrome.storage.local.set({ 'defaultExtension': defaultExtensionInput.value.trim().replace(/^\./, '') });
  });

  mascotToggle.addEventListener('change', () => {
    const showMascot = mascotToggle.checked;
    chrome.storage.local.set({ 'showMascot': showMascot });
    if (mascot) {
      mascot.classList.toggle('hidden', !showMascot);
    }
  });

  // Default Type segmented control handlers
  function setDefaultType(type) {
    if (type === 'text') {
      defaultTypeText.classList.add('active');
      defaultTypeText.setAttribute('aria-checked', 'true');
      defaultTypeFile.classList.remove('active');
      defaultTypeFile.setAttribute('aria-checked', 'false');
      defaultFiletypeSetting.classList.add('hidden');

      // Reset main file type selector to text
      fileTypeSelect.value = '';
      fileTypeSelect.dispatchEvent(new Event('change'));
    } else {
      defaultTypeText.classList.remove('active');
      defaultTypeText.setAttribute('aria-checked', 'false');
      defaultTypeFile.classList.add('active');
      defaultTypeFile.setAttribute('aria-checked', 'true');
      defaultFiletypeSetting.classList.remove('hidden');

      // Set main file type selector to the default file type
      const savedFileType = defaultFiletypeSelect.value || 'txt';
      fileTypeSelect.value = savedFileType;
      fileTypeSelect.dispatchEvent(new Event('change'));
      if (savedFileType === 'other') {
        customExtensionInput.value = defaultExtensionInput.value;
      }
    }
    chrome.storage.local.set({ 'defaultType': type });
  }

  // Apply current default type settings to main file type selector
  function applyDefaultTypeToMainSelector() {
    const isFileMode = defaultTypeFile.classList.contains('active');
    if (isFileMode) {
      const fileType = defaultFiletypeSelect.value || 'txt';
      fileTypeSelect.value = fileType;
      fileTypeSelect.dispatchEvent(new Event('change'));
      if (fileType === 'other') {
        customExtensionInput.value = defaultExtensionInput.value;
      }
    } else {
      fileTypeSelect.value = '';
      fileTypeSelect.dispatchEvent(new Event('change'));
    }
  }

  defaultTypeText.addEventListener('click', () => setDefaultType('text'));
  defaultTypeFile.addEventListener('click', () => setDefaultType('file'));

  // ==========================================
  // Reset Stats Modal
  // ==========================================

  const resetStatsBtn = document.getElementById('reset-stats-btn');
  const resetStatsModal = document.getElementById('reset-stats-modal');
  const resetConfirmInput = document.getElementById('reset-confirm-input');
  const resetCancelBtn = document.getElementById('reset-cancel-btn');
  const resetConfirmBtn = document.getElementById('reset-confirm-btn');

  // Open modal
  resetStatsBtn.addEventListener('click', () => {
    resetStatsModal.classList.remove('hidden');
    resetConfirmInput.value = '';
    resetConfirmBtn.disabled = true;
    resetConfirmInput.focus();
  });

  // Close modal
  function closeResetModal() {
    resetStatsModal.classList.add('hidden');
    resetConfirmInput.value = '';
    resetConfirmBtn.disabled = true;
  }

  resetCancelBtn.addEventListener('click', closeResetModal);

  // Close on clicking overlay background
  resetStatsModal.addEventListener('click', (e) => {
    if (e.target === resetStatsModal) {
      closeResetModal();
    }
  });

  // Enable/disable confirm button based on input
  resetConfirmInput.addEventListener('input', () => {
    const inputValue = resetConfirmInput.value.trim().toLowerCase();
    resetConfirmBtn.disabled = inputValue !== 'reset stats';
  });

  // Perform reset
  resetConfirmBtn.addEventListener('click', () => {
    // Clear usage stats and time saved
    chrome.storage.local.set({
      'usageStats': {},
      'timeSaved': { textSeconds: 0, fileSeconds: 0 }
    }, () => {
      closeResetModal();
      // Show success feedback - return to settings with a brief message
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        const successMsg = document.createElement('div');
        successMsg.className = 'reset-success-msg';
        successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Stats reset successfully';
        successMsg.style.cssText = 'color: var(--success); font-size: var(--text-sm); text-align: center; padding: var(--space-2); margin-top: var(--space-2);';
        settingsContent.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      }
    });
  });

  // ==========================================
  // Mascot State Management
  // ==========================================

  function setMascotSleeping(sleeping) {
    if (!mascot || mascot.classList.contains('hidden')) return;

    if (sleeping) {
      mascot.classList.add('sleeping');
      mascot.src = CLIPPY_IMAGES.sleeping;
      mascot.title = "Zzz... 💤";
      if (mascotZzz) mascotZzz.classList.add('visible');
    } else {
      mascot.classList.remove('sleeping');
      mascot.src = CLIPPY_IMAGES.regular;
      mascot.title = "Hi! I'm Clippy 📋";
      if (mascotZzz) mascotZzz.classList.remove('visible');
    }
  }

  function triggerMascotDizzy() {
    if (!mascot || mascot.classList.contains('hidden')) return;

    // Remove sleeping state if active
    setMascotSleeping(false);

    mascot.classList.add('dizzy');
    mascot.src = CLIPPY_IMAGES.mad;
    setTimeout(() => {
      mascot.classList.remove('dizzy');
      mascot.src = CLIPPY_IMAGES.regular;
    }, 500);
  }

  function resetIdleTimer() {
    // Clear existing timer
    if (idleTimer) clearTimeout(idleTimer);

    // Wake up mascot if sleeping
    if (mascot && mascot.classList.contains('sleeping')) {
      setMascotSleeping(false);
    }

    // Start new timer
    idleTimer = setTimeout(() => {
      if (mascot && !mascot.classList.contains('hidden')) {
        setMascotSleeping(true);
      }
    }, IDLE_TIMEOUT);
  }

  // Idle detection - reset timer on user activity
  ['input', 'click', 'mousemove', 'keydown'].forEach(eventType => {
    document.addEventListener(eventType, resetIdleTimer, { passive: true });
  });

  // Start idle timer initially
  resetIdleTimer();

  // ==========================================
  // Easter Egg: Clippy Poke Counter & Animation System
  // ==========================================

  const pokeCountDisplay = document.getElementById('poke-count');
  const celebrationOverlay = document.getElementById('celebration-overlay');
  const celebrationEmoji = document.getElementById('celebration-emoji');
  const celebrationCount = document.getElementById('celebration-count');
  const celebrationMessage = document.getElementById('celebration-message');
  const celebrationSkip = document.getElementById('celebration-skip');
  const fireworksContainer = document.getElementById('fireworks-container');
  const container = document.getElementById('container');

  let celebrationTimeout = null;

  // Get animation tier based on poke count
  function getAnimationTier(pokeCount) {
    if (pokeCount >= 100) return ANIMATION_TIERS.legendary;
    if (pokeCount >= 50) return ANIMATION_TIERS.chaotic;
    if (pokeCount >= 25) return ANIMATION_TIERS.playful;
    if (pokeCount >= 10) return ANIMATION_TIERS.friendly;
    return ANIMATION_TIERS.curious;
  }

  // Create sparkle particles around mascot
  function createSparkles(tier) {
    if (!mascot) return;

    const mascotRect = mascot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const centerX = mascotRect.left - containerRect.left + mascotRect.width / 2;
    const centerY = mascotRect.top - containerRect.top + mascotRect.height / 2;

    for (let i = 0; i < tier.sparkles; i++) {
      setTimeout(() => {
        const sparkle = document.createElement('div');
        sparkle.className = `sparkle-particle ${tier.sparkleSize}`;
        if (tier.sparkleSize === 'rainbow') {
          sparkle.classList.add('rainbow');
        }

        // Random angle and distance
        const angle = (Math.PI * 2 * i) / tier.sparkles + (Math.random() - 0.5) * 0.5;
        const distance = 40 + Math.random() * 30;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        sparkle.style.left = `${centerX}px`;
        sparkle.style.top = `${centerY}px`;
        sparkle.style.setProperty('--tx', `${tx}px`);
        sparkle.style.setProperty('--ty', `${ty}px`);
        sparkle.style.animation = `sparkle-burst ${0.5 + Math.random() * 0.3}s ease-out forwards`;

        container.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 800);
      }, i * 30);
    }
  }

  // Screen shake effect for chaotic+ tiers
  function triggerScreenShake() {
    container.classList.add('screen-shake');
    setTimeout(() => container.classList.remove('screen-shake'), 400);
  }

  // Rainbow trail effect for chaotic+ tiers
  function createRainbowTrail() {
    if (!mascot) return;

    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
    const mascotRect = mascot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const trail = document.createElement('div');
        trail.className = 'mascot-trail';
        trail.style.left = `${mascotRect.left - containerRect.left + Math.random() * 10 - 5}px`;
        trail.style.top = `${mascotRect.top - containerRect.top + Math.random() * 10 - 5}px`;
        trail.style.background = colors[i % colors.length];

        container.appendChild(trail);
        setTimeout(() => trail.remove(), 500);
      }, i * 50);
    }
  }

  // Golden glow effect for legendary tier
  function triggerGoldenGlow() {
    if (!mascot) return;
    mascot.classList.add('legendary-glow');
    setTimeout(() => mascot.classList.remove('legendary-glow'), 1000);
  }

  // Confetti explosion for legendary tier
  function createConfettiExplosion() {
    const colors = ['#FFD700', '#FF6B6B', '#48DBFB', '#FF69B4', '#54A0FF', '#5F27CD', '#00CED1', '#FFA500'];
    const shapes = ['square', 'rectangle', 'circle'];

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';

        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 6 + Math.random() * 8;

        confetti.style.width = shape === 'rectangle' ? `${size * 2}px` : `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.background = color;
        confetti.style.borderRadius = shape === 'circle' ? '50%' : '2px';

        // Start from center of popup
        confetti.style.left = '50%';
        confetti.style.top = '40%';

        // Random trajectory
        const tx = (Math.random() - 0.5) * 200;
        const ty = -50 - Math.random() * 100;
        const duration = 1.5 + Math.random() * 1;

        confetti.style.setProperty('--tx', `${tx}px`);
        confetti.style.setProperty('--ty', `${ty}px`);
        confetti.style.setProperty('--duration', `${duration}s`);

        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), duration * 1000);
      }, i * 20);
    }
  }

  // Trigger the progressive click animation
  function triggerPokeAnimation(pokeCount) {
    if (!mascot || mascot.classList.contains('hidden')) return;

    const tier = getAnimationTier(pokeCount);

    // Remove any existing poke animation classes
    mascot.classList.remove('poke-curious', 'poke-friendly', 'poke-playful', 'poke-chaotic', 'poke-legendary', 'float', 'celebrate', 'sleeping');

    // Apply the tier-specific animation class
    mascot.classList.add(`poke-${tier.name}`);

    // Create sparkles
    createSparkles(tier);

    // Special effects for higher tiers
    if (tier.shake) {
      triggerScreenShake();
    }
    if (tier.trail) {
      createRainbowTrail();
    }
    if (tier.glow) {
      triggerGoldenGlow();
    }
    if (tier.confetti) {
      createConfettiExplosion();
    }

    // Remove animation class after it completes and restore float
    setTimeout(() => {
      mascot.classList.remove(`poke-${tier.name}`);
      if (!mascot.classList.contains('sleeping')) {
        mascot.classList.add('float');
      }
    }, tier.duration);
  }

  // Create firework particles
  function createFirework(x, y) {
    const colors = ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#5F27CD', '#00CED1', '#FFD700'];
    const particleCount = 12 + Math.floor(Math.random() * 8);

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];

      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 50 + Math.random() * 50;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const duration = 0.8 + Math.random() * 0.4;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.setProperty('--duration', `${duration}s`);

      fireworksContainer.appendChild(particle);
      setTimeout(() => particle.remove(), duration * 1000);
    }
  }

  // Launch multiple fireworks
  function launchFireworks() {
    const positions = [
      { x: '20%', y: '30%' },
      { x: '80%', y: '25%' },
      { x: '50%', y: '20%' },
      { x: '35%', y: '40%' },
      { x: '65%', y: '35%' }
    ];

    positions.forEach((pos, i) => {
      setTimeout(() => {
        const rect = fireworksContainer.getBoundingClientRect();
        const x = parseFloat(pos.x) / 100 * rect.width;
        const y = parseFloat(pos.y) / 100 * rect.height;
        createFirework(x, y);
      }, i * 400);
    });
  }

  // Trigger milestone celebration
  function triggerMilestoneCelebration(milestone) {
    if (!celebrationOverlay) return;

    // Update celebration content
    celebrationEmoji.textContent = milestone.emoji;
    celebrationCount.textContent = milestone.count;
    celebrationMessage.textContent = milestone.title;

    // Show overlay
    celebrationOverlay.classList.remove('hidden');

    // Change mascot to surprised then happy
    if (mascot) {
      mascot.src = CLIPPY_IMAGES.surprised;
      mascot.style.zIndex = '1001';
      setTimeout(() => {
        mascot.src = CLIPPY_IMAGES.happy;
      }, 1000);
    }

    // Launch fireworks
    launchFireworks();
    setTimeout(launchFireworks, 1500);

    // Auto-dismiss after 4 seconds
    celebrationTimeout = setTimeout(closeCelebration, 4000);
  }

  // Close celebration
  function closeCelebration() {
    if (celebrationTimeout) {
      clearTimeout(celebrationTimeout);
      celebrationTimeout = null;
    }

    if (celebrationOverlay) {
      celebrationOverlay.classList.add('hidden');
    }

    // Clear fireworks
    if (fireworksContainer) {
      fireworksContainer.innerHTML = '';
    }

    // Restore mascot
    if (mascot) {
      mascot.src = CLIPPY_IMAGES.regular;
      mascot.style.zIndex = '';
    }
  }

  // Skip button handler
  if (celebrationSkip) {
    celebrationSkip.addEventListener('click', closeCelebration);
  }

  // Check if a milestone was reached
  function checkMilestone(newCount, celebratedMilestones) {
    const milestoneKeys = [10, 25, 50, 100];
    for (const key of milestoneKeys) {
      if (newCount === key && !celebratedMilestones.includes(key)) {
        return key;
      }
    }
    return null;
  }

  // Main mascot click handler
  if (mascot) {
    mascot.addEventListener('click', () => {
      // Reset idle timer
      resetIdleTimer();

      chrome.storage.local.get({ 'pokeCount': 0, 'celebratedMilestones': [] }, (result) => {
        const newCount = result.pokeCount + 1;
        const celebratedMilestones = result.celebratedMilestones || [];

        // Check for milestone
        const milestone = checkMilestone(newCount, celebratedMilestones);

        if (milestone) {
          // Milestone reached! Celebrate!
          celebratedMilestones.push(milestone);
          chrome.storage.local.set({
            'pokeCount': newCount,
            'celebratedMilestones': celebratedMilestones
          });
          triggerMilestoneCelebration(MILESTONES[milestone]);
        } else {
          // Regular poke - trigger progressive animation
          chrome.storage.local.set({ 'pokeCount': newCount });
          triggerPokeAnimation(newCount);
        }

        // Update display if visible
        if (pokeCountDisplay) {
          pokeCountDisplay.textContent = newCount;
          pokeCountDisplay.style.transform = 'scale(1.2)';
          setTimeout(() => {
            pokeCountDisplay.style.transform = 'scale(1)';
          }, 150);
        }
      });
    });
  }

  // Load poke count when info view is shown
  function updatePokeCount() {
    chrome.storage.local.get({ 'pokeCount': 0 }, (result) => {
      if (pokeCountDisplay) {
        pokeCountDisplay.textContent = result.pokeCount;
      }
    });
  }

  // Load version from manifest
  function updateVersionBadge() {
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge) {
      const manifest = chrome.runtime.getManifest();
      versionBadge.textContent = `v${manifest.version}`;
    }
  }

  // ==========================================
  // Fun Fact Tooltip for Author Name
  // ==========================================

  const authorName = document.getElementById('author-name');
  const funFactTooltip = document.getElementById('fun-fact-tooltip');

  if (authorName && funFactTooltip) {
    authorName.addEventListener('mouseenter', () => {
      funFactTooltip.classList.add('visible');
    });

    authorName.addEventListener('mouseleave', () => {
      funFactTooltip.classList.remove('visible');
    });
  }

  // ==========================================
  // Easter Egg: Reset Pokes (10 clicks in 5 seconds)
  // ==========================================

  const infoClippyIcon = document.getElementById('info-clippy-icon');
  const resetPokesModal = document.getElementById('reset-pokes-modal');
  const resetPokesConfirm = document.getElementById('reset-pokes-confirm');
  const resetPokesCancel = document.getElementById('reset-pokes-cancel');

  let infoClickTimes = [];
  const CLICK_THRESHOLD = 10;
  const TIME_WINDOW = 5000; // 5 seconds

  if (infoClippyIcon && resetPokesModal) {
    infoClippyIcon.addEventListener('click', () => {
      const now = Date.now();

      // Add current click time
      infoClickTimes.push(now);

      // Remove clicks older than the time window
      infoClickTimes = infoClickTimes.filter(time => now - time < TIME_WINDOW);

      // Check if we've reached the threshold
      if (infoClickTimes.length >= CLICK_THRESHOLD) {
        // Reset click times
        infoClickTimes = [];
        // Show the modal
        resetPokesModal.classList.remove('hidden');
      }

      // Visual feedback - bounce the poke count
      if (pokeCountDisplay) {
        pokeCountDisplay.style.transform = 'scale(1.3)';
        setTimeout(() => {
          pokeCountDisplay.style.transform = 'scale(1)';
        }, 100);
      }
    });
  }

  // Reset pokes confirm button
  if (resetPokesConfirm) {
    resetPokesConfirm.addEventListener('click', () => {
      chrome.storage.local.set({
        'pokeCount': 0,
        'celebratedMilestones': []
      }, () => {
        // Update display
        if (pokeCountDisplay) {
          pokeCountDisplay.textContent = '0';
        }
        // Close modal
        resetPokesModal.classList.add('hidden');
      });
    });
  }

  // Reset pokes cancel button
  if (resetPokesCancel) {
    resetPokesCancel.addEventListener('click', () => {
      resetPokesModal.classList.add('hidden');
    });
  }

  // Close modal on overlay click
  if (resetPokesModal) {
    resetPokesModal.addEventListener('click', (e) => {
      if (e.target === resetPokesModal) {
        resetPokesModal.classList.add('hidden');
      }
    });
  }

  // Load saved content and settings when popup opens
  loadSavedContent();
  // Note: loadSettings() is called after custom dropdowns are initialized

  // ==========================================
  // Custom Dropdown Component
  // ==========================================

  class CustomDropdown {
    constructor(selectElement, options = {}) {
      this.select = selectElement;
      this.options = {
        compact: options.compact || false,
        onChange: options.onChange || null
      };

      this.isOpen = false;
      this.focusedIndex = -1;

      this.init();
    }

    init() {
      // Create wrapper
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'custom-dropdown';
      if (this.options.compact) {
        this.wrapper.classList.add('compact');
      }

      // Create trigger button
      this.trigger = document.createElement('button');
      this.trigger.type = 'button';
      this.trigger.className = 'custom-dropdown-trigger';
      this.trigger.innerHTML = `
        <span class="custom-dropdown-value"></span>
        <span class="custom-dropdown-arrow">▼</span>
      `;

      // Create options container
      this.optionsList = document.createElement('div');
      this.optionsList.className = 'custom-dropdown-options';

      // Insert wrapper before select
      this.select.parentNode.insertBefore(this.wrapper, this.select);
      this.wrapper.appendChild(this.trigger);
      this.wrapper.appendChild(this.optionsList);
      this.wrapper.appendChild(this.select);

      // Build options from select
      this.buildOptions();
      this.updateDisplay();

      // Event listeners
      this.trigger.addEventListener('click', (e) => this.toggle(e));
      this.trigger.addEventListener('keydown', (e) => this.handleKeydown(e));

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!this.wrapper.contains(e.target)) {
          this.close();
        }
      });

      // Sync if select changes programmatically
      this.select.addEventListener('change', () => {
        this.buildOptions();
        this.updateDisplay();
      });
    }

    buildOptions() {
      this.optionsList.innerHTML = '';

      Array.from(this.select.options).forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-dropdown-option';
        optionEl.dataset.value = option.value;
        optionEl.dataset.index = index;
        optionEl.textContent = option.textContent;

        if (option.selected) {
          optionEl.classList.add('selected');
        }

        optionEl.addEventListener('click', () => this.selectOption(index));
        optionEl.addEventListener('mouseenter', () => this.focusOption(index));

        this.optionsList.appendChild(optionEl);
      });
    }

    updateDisplay() {
      const selectedOption = this.select.options[this.select.selectedIndex];
      const valueEl = this.trigger.querySelector('.custom-dropdown-value');
      valueEl.textContent = selectedOption ? selectedOption.textContent : '';
    }

    toggle(e) {
      e.preventDefault();
      e.stopPropagation();

      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      if (this.isOpen) return;

      // Close any other open dropdowns
      document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
        if (dd !== this.wrapper) {
          dd.classList.remove('open');
        }
      });

      this.isOpen = true;
      this.wrapper.classList.add('open');
      this.focusedIndex = this.select.selectedIndex;
      this.updateFocus();
    }

    close() {
      if (!this.isOpen) return;

      this.isOpen = false;
      this.wrapper.classList.remove('open');
      this.focusedIndex = -1;
      this.updateFocus();
    }

    selectOption(index) {
      const options = this.optionsList.querySelectorAll('.custom-dropdown-option');

      // Remove previous selection
      options.forEach(opt => opt.classList.remove('selected'));

      // Add new selection
      if (options[index]) {
        options[index].classList.add('selected');
      }

      // Update native select
      this.select.selectedIndex = index;
      this.select.dispatchEvent(new Event('change', { bubbles: true }));

      this.updateDisplay();
      this.close();

      if (this.options.onChange) {
        this.options.onChange(this.select.value);
      }
    }

    focusOption(index) {
      this.focusedIndex = index;
      this.updateFocus();
    }

    updateFocus() {
      const options = this.optionsList.querySelectorAll('.custom-dropdown-option');
      options.forEach((opt, i) => {
        opt.classList.toggle('focused', i === this.focusedIndex);
      });

      // Scroll focused option into view
      if (this.focusedIndex >= 0 && options[this.focusedIndex]) {
        options[this.focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    handleKeydown(e) {
      const optionsCount = this.select.options.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
          } else {
            this.focusedIndex = Math.min(this.focusedIndex + 1, optionsCount - 1);
            this.updateFocus();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (this.isOpen) {
            this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
            this.updateFocus();
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
          } else if (this.focusedIndex >= 0) {
            this.selectOption(this.focusedIndex);
          }
          break;

        case 'Escape':
          e.preventDefault();
          this.close();
          break;

        case 'Tab':
          this.close();
          break;
      }
    }

    setValue(value) {
      const index = Array.from(this.select.options).findIndex(opt => opt.value === value);
      if (index >= 0) {
        this.selectOption(index);
      }
    }

    refresh() {
      this.buildOptions();
      this.updateDisplay();
    }
  }

  // Initialize custom dropdowns for all selects
  const dropdownInstances = new Map();

  function initCustomDropdown(selectEl, options = {}) {
    if (!dropdownInstances.has(selectEl)) {
      const instance = new CustomDropdown(selectEl, options);
      dropdownInstances.set(selectEl, instance);
      return instance;
    }
    return dropdownInstances.get(selectEl);
  }

  // Initialize dropdowns
  initCustomDropdown(fileTypeSelect);
  initCustomDropdown(themeSelect, { compact: true });
  initCustomDropdown(historySizeSelect, { compact: true });
  initCustomDropdown(defaultFiletypeSelect, { compact: true });

  // Load settings after dropdowns are initialized so they display correctly
  loadSettings();

  // ==========================================
  // Iframe Close Functionality
  // ==========================================

  // Close popup when Escape is pressed (if running in iframe)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.parent !== window) {
      window.parent.postMessage({ type: 'PASTE_OVERFLOW_CLOSE' }, '*');
    }
  });
});
