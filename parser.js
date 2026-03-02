/**
 * GitHub Discussion to Markdown Parser
 * Converts GitHub discussion HTML to clean markdown
 */

/**
 * Main parser function - converts GitHub discussion HTML to markdown
 * @param {string} htmlString - The HTML string to parse
 * @param {Object} options - Parser options
 * @param {boolean} options.includeTimestamps - Whether to include timestamps
 * @param {boolean} options.includeNested - Whether to include nested replies
 * @returns {Object} - { markdown: string, commentCount: number, error: string|null }
 */
function parseGitHubDiscussionHTML(htmlString, options = {}) {
  const { includeTimestamps = true, includeNested = true } = options;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Find all top-level comment containers (excluding nested)
    let commentContainers = doc.querySelectorAll(
      '.discussion-timeline-item:not(.discussion-nested-comment-timeline-item)'
    );

    // Fallback: find all elements with js-comment-body that aren't nested
    if (commentContainers.length === 0) {
      const allBodies = doc.querySelectorAll('.js-comment-body');
      commentContainers = Array.from(allBodies)
        .map(body => {
          let parent = body.closest('.TimelineItem, .discussion-timeline-item, .js-timeline-item');
          return parent;
        })
        .filter((container, index, arr) => {
          return arr.indexOf(container) === index &&
            container &&
            !container.classList.contains('discussion-nested-comment-timeline-item');
        });
    }

    if (commentContainers.length === 0) {
      return {
        markdown: '',
        commentCount: 0,
        error: 'No comments found. Make sure you are on a GitHub discussion page.'
      };
    }

    let markdownResult = '';
    let commentCount = 0;

    // Process each top-level comment
    commentContainers.forEach((container) => {
      const bodyElement = container.querySelector('.js-comment-body');
      if (!bodyElement) return;

      commentCount++;

      // Extract comment info
      const authorLink = container.querySelector('[data-hovercard-type="user"]');
      const timestampElement = container.querySelector('relative-time');
      const isAuthorBadge = container.querySelector('[title*="author of this discussion"]');

      const author = authorLink ? authorLink.textContent.trim() : 'Unknown';
      const timestamp = timestampElement ? timestampElement.getAttribute('datetime') : '';
      const authorLabel = isAuthorBadge ? ' (Author)' : '';

      // Format header
      let header = `**${author}**${authorLabel}`;
      if (includeTimestamps && timestamp) {
        const date = new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        header += ` - ${date}`;
      }

      // Extract body
      const body = extractMarkdownFromBody(bodyElement);

      // Add to result
      markdownResult += header + '\n\n' + body + '\n\n';

      // Process nested replies within this comment
      if (includeNested) {
        const nestedContainer = container.querySelector('[data-child-comments]');
        if (nestedContainer) {
          const nestedComments = nestedContainer.querySelectorAll(
            '.discussion-nested-comment-timeline-item > .discussions-timeline-scroll-target'
          );

          nestedComments.forEach((nestedComment) => {
            const nestedBody = nestedComment.querySelector('.js-comment-body');
            const nestedAuthorLink = nestedComment.querySelector('[data-hovercard-type="user"]');
            const nestedTimestamp = nestedComment.querySelector('relative-time');

            if (nestedBody && nestedAuthorLink) {
              const nestedAuthor = nestedAuthorLink.textContent.trim();
              const nestedDate = nestedTimestamp?.getAttribute('datetime');

              let nestedHeader = `  **${nestedAuthor}**`;
              if (includeTimestamps && nestedDate) {
                const date = new Date(nestedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                nestedHeader += ` - ${date}`;
              }

              const nestedBodyText = extractMarkdownFromBody(nestedBody);
              markdownResult += nestedHeader + '\n\n';

              // Indent nested content
              const indentedBody = nestedBodyText
                .split('\n')
                .map(line => line ? '  ' + line : '')
                .join('\n');

              markdownResult += indentedBody + '\n\n';
            }
          });
        }
      }

      markdownResult += '---\n\n';
    });

    return {
      markdown: markdownResult.trim(),
      commentCount: commentCount,
      error: null
    };
  } catch (err) {
    return {
      markdown: '',
      commentCount: 0,
      error: `Parse error: ${err.message}`
    };
  }
}

function normalizeEventVerbosity(value) {
  if (value === 'none' || value === 'important') {
    return value;
  }
  return 'full';
}

function isLikelyBotAuthor(author, element) {
  const normalizedAuthor = String(author || '').trim().toLowerCase();
  if (!normalizedAuthor) return false;
  if (normalizedAuthor.endsWith('[bot]')) return true;
  if (normalizedAuthor.includes('github-actions')) return true;

  const href = element?.getAttribute?.('href') || '';
  if (href.includes('/apps/')) return true;
  if (href.includes('[bot]')) return true;
  return false;
}

function shouldIncludeEvent(eventType, eventVerbosity) {
  if (eventVerbosity === 'none') {
    return false;
  }
  if (eventVerbosity === 'full') {
    return true;
  }

  // important
  return eventType === 'title-change' || eventType === 'merge-info';
}

/**
 * Parser function for GitHub Issues - converts issue HTML to markdown
 * @param {string} htmlString - The HTML string to parse
 * @param {Object} options - Parser options
 * @param {boolean} options.includeTimestamps - Whether to include timestamps
 * @returns {Object} - { markdown: string, commentCount: number, error: string|null }
 */
function parseGitHubIssueHTML(htmlString, options = {}) {
  const {
    includeTimestamps = true,
    includeBotComments = true,
    eventVerbosity = 'full'
  } = options;
  const resolvedEventVerbosity = normalizeEventVerbosity(eventVerbosity);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    let markdownResult = '';
    let commentCount = 0;
    let hasAnyContent = false;

    // Helper to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // ========================================
    // 1. Extract Issue Body (first comment)
    // ========================================
    const issueBody = doc.querySelector('[data-testid="issue-body"]');
    if (issueBody) {
      // Get author
      const authorEl = doc.querySelector('[data-testid="issue-body-header-author"]');
      const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
      const isBotAuthor = isLikelyBotAuthor(author, authorEl);

      // Get timestamp
      const timestampEl = issueBody.querySelector('relative-time');
      const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

      if (includeBotComments || !isBotAuthor) {
      // Get edit info
      const editContainer = issueBody.querySelector('.MarkdownLastEditedBy-module__lastEditInfoContainer--EN_Qz');
      let editInfo = '';
      if (editContainer) {
        const editorLink = editContainer.querySelector('a');
        if (editorLink) {
            editInfo = ` - edited by ${editorLink.textContent.trim()}`;
        }
      }

      // Build header
      let header = `**${author}** opened`;
      if (includeTimestamps && timestamp) {
        header += ` on ${formatDate(timestamp)}`;
      }
      header += editInfo;

      // Get body content
      const bodyContent = issueBody.querySelector('.markdown-body');
      const body = bodyContent ? extractMarkdownFromBody(bodyContent) : '';

      markdownResult += header + '\n\n' + body + '\n\n---\n\n';
      commentCount++;
      hasAnyContent = true;
      }
    }

    // ========================================
    // 2. Process Timeline Events and Comments
    // ========================================
    const timelineContainer = doc.querySelector('[data-testid="issue-timeline-container"], [data-testid="issue-viewer-comments-container"]');

    if (timelineContainer) {
      // Get all timeline elements (events and comments)
      const timelineElements = timelineContainer.querySelectorAll('[data-wrapper-timeline-id]');

      timelineElements.forEach((element) => {
        // Check if it's a comment
        const comment = element.querySelector('.react-issue-comment');
        if (comment) {
          // Get author
          const authorEl = element.querySelector('[data-testid="avatar-link"], .ActivityHeader-module__AuthorLink--D7Ojk');
          const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
          const isBotAuthor = isLikelyBotAuthor(author, authorEl);
          if (!includeBotComments && isBotAuthor) {
            return;
          }
          commentCount++;

          // Get role (Collaborator or Author)
          let role = '';
          const collaboratorBadge = element.querySelector('[data-testid="comment-author-association"]');
          const authorBadge = element.querySelector('[data-testid="comment-subject-author"]');
          if (collaboratorBadge) {
            role = ` *${collaboratorBadge.textContent.trim()}*`;
          } else if (authorBadge) {
            role = ` *${authorBadge.textContent.trim()}*`;
          }

          // Get timestamp
          const timestampEl = element.querySelector('relative-time');
          const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

          // Get edit info
          const editContainer = element.querySelector('.MarkdownLastEditedBy-module__lastEditInfoContainer--EN_Qz');
          let editInfo = '';
          if (editContainer) {
            const editorLink = editContainer.querySelector('a');
            if (editorLink) {
              editInfo = ` - edited by ${editorLink.textContent.trim()}`;
            }
          }

          // Build header
          let header = `**${author}**${role} commented`;
          if (includeTimestamps && timestamp) {
            header += ` on ${formatDate(timestamp)}`;
          }
          header += editInfo;

          // Get body content
          const bodyContent = element.querySelector(
            '[data-testid="markdown-body"], .IssueCommentViewer-module__IssueCommentBody .markdown-body, .markdown-body'
          );
          const body = bodyContent ? extractMarkdownFromBody(bodyContent) : '';

          markdownResult += header + '\n\n' + body + '\n\n---\n\n';
          hasAnyContent = true;
          return;
        }

        // Check if it's a label event
        const labelContainer = element.querySelector('.labels-module__labelContainer--gEfYq');
        if (labelContainer) {
          if (!shouldIncludeEvent('label', resolvedEventVerbosity)) {
            return;
          }

          const actorEl = element.querySelector('[data-testid="actor-link"] .row-module__eventProfileReference--CiANK');
          const actor = actorEl ? actorEl.textContent.trim() : 'Unknown';

          // Get all labels
          const labels = element.querySelectorAll('.labels-module__labelContainer--gEfYq');
          const labelNames = Array.from(labels).map(l => {
            const textEl = l.querySelector('.prc-Text-Text-0ima0');
            return textEl ? `**${textEl.textContent.trim()}**` : '';
          }).filter(Boolean);

          // Get timestamp
          const timestampEl = element.querySelector('relative-time');
          const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

          let eventText = `**${actor}** added ${labelNames.join(' ')}`;
          if (includeTimestamps && timestamp) {
            eventText += ` on ${formatDate(timestamp)}`;
          }

          markdownResult += eventText + '\n\n---\n\n';
          hasAnyContent = true;
          return;
        }

        // Check if it's a title rename event
        const titleChange = element.querySelector('.RenamedTitleEvent-module__defaultColor--yf7kG');
        if (titleChange) {
          if (!shouldIncludeEvent('title-change', resolvedEventVerbosity)) {
            return;
          }

          const actorEl = element.querySelector('[data-testid="actor-link"] .row-module__eventProfileReference--CiANK');
          const actor = actorEl ? actorEl.textContent.trim() : 'Unknown';

          // Get old title (strikethrough)
          const oldTitleEl = element.querySelector('del');
          const oldTitle = oldTitleEl ? oldTitleEl.textContent.replace(/\[\-\]|\[\/\-\]/g, '').trim() : '';

          // Get new title
          const newTitleEl = element.querySelector('ins');
          const newTitle = newTitleEl ? newTitleEl.textContent.replace(/\[\+\]|\[\/\+\]/g, '').trim() : '';

          // Get timestamp
          const timestampEl = element.querySelector('relative-time');
          const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

          let eventText = `**${actor}** changed the title ~~${oldTitle}~~ ${newTitle}`;
          if (includeTimestamps && timestamp) {
            eventText += ` on ${formatDate(timestamp)}`;
          }

          markdownResult += eventText + '\n\n---\n\n';
          hasAnyContent = true;
          return;
        }
      });
    }

    // If no content found, return error
    if (!hasAnyContent) {
      return {
        markdown: '',
        commentCount: 0,
        error: 'No issue content found. Make sure you are on a GitHub issue page.'
      };
    }

    return {
      markdown: markdownResult.trim(),
      commentCount: commentCount,
      error: null
    };
  } catch (err) {
    return {
      markdown: '',
      commentCount: 0,
      error: `Parse error: ${err.message}`
    };
  }
}

/**
 * Parser function for GitHub Pull Requests - converts PR HTML to markdown
 * @param {string} htmlString - The HTML string to parse
 * @param {Object} options - Parser options
 * @param {boolean} options.includeTimestamps - Whether to include timestamps
 * @returns {Object} - { markdown: string, commentCount: number, error: string|null }
 */
function parsePullRequest(htmlString, options = {}) {
  const {
    includeTimestamps = true,
    includeBotComments = true,
    eventVerbosity = 'full'
  } = options;
  const resolvedEventVerbosity = normalizeEventVerbosity(eventVerbosity);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    let markdownResult = '';
    let commentCount = 0;
    let hasAnyContent = false;

    // Helper to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // ========================================
    // 1. Extract PR Body (first comment)
    // ========================================
    const prBody = doc.querySelector('.js-comment-container .comment-body, .js-comment-body');
    if (prBody) {
      // Get author from pr body header
      const authorEl = doc.querySelector('.author.Link--primary');
      const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
      const isBotAuthor = isLikelyBotAuthor(author, authorEl);

      // Get timestamp
      const timestampEl = doc.querySelector('.timeline-comment-header relative-time, .js-comment-container relative-time');
      const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

      if (includeBotComments || !isBotAuthor) {
        // Build header
        let header = `**${author}** commented`;
        if (includeTimestamps && timestamp) {
          header += ` ${formatDate(timestamp)}`;
        }

        // Get body content
        const body = extractMarkdownFromBody(prBody);

        markdownResult += header + '\n\n' + body + '\n\n---\n\n';
        commentCount++;
        hasAnyContent = true;
      }
    }

    // ========================================
    // 2. Process Timeline Items
    // ========================================
    const timelineItems = doc.querySelectorAll('.js-timeline-item');

    timelineItems.forEach((item) => {
      // Skip the first item if it's the PR body we already processed
      if (item.querySelector('.js-command-palette-pull-body')) {
        return;
      }

      // Check for commit entries
      const commitLink = item.querySelector('.TimelineItem-body code a.Link--secondary[href*="/commits/"]');
      if (commitLink) {
        if (!shouldIncludeEvent('commit', resolvedEventVerbosity)) {
          return;
        }

        const commitMessage = item.querySelector('.TimelineItem-body code a.markdown-title');
        const avatarLink = item.querySelector('.AvatarStack-body a');

        if (commitMessage) {
          const author = avatarLink ? avatarLink.getAttribute('href').replace('/', '').replace('/apps/', '') : 'Unknown';
          const message = commitMessage.textContent.trim();
          const sha = commitLink.textContent.trim();
          const commitUrl = commitLink.getAttribute('href');
          const fullUrl = commitUrl.startsWith('/') ? 'https://github.com' + commitUrl : commitUrl;

          let commitEntry = `**${author}** added 1 commit`;
          if (includeTimestamps) {
            const timestampEl = item.querySelector('relative-time');
            if (timestampEl) {
              commitEntry += ` ${formatDate(timestampEl.getAttribute('datetime'))}`;
            }
          }
          commitEntry += '\n\n';
          commitEntry += `[${message}](${fullUrl}) \`${sha}\`\n\n---\n\n`;

          markdownResult += commitEntry;
          hasAnyContent = true;
          return;
        }
      }

      // Check for comments (from bots or users)
      const commentBody = item.querySelector('.comment-body, .js-comment-body');
      if (commentBody) {
        const authorEl = item.querySelector('.author.Link--primary, a[href*="/apps/"]');
        let author = 'Unknown';
        let isBot = false;

        if (authorEl) {
          author = authorEl.textContent.trim() || authorEl.getAttribute('href').replace('/apps/', '');
          isBot = isLikelyBotAuthor(author, authorEl);
        }

        if (!includeBotComments && isBot) {
          return;
        }

        // Check for Author role badge
        const authorBadge = item.querySelector('.Label');
        const role = authorBadge?.textContent?.trim() === 'Author' ? ' *Author*' : '';

        // Get timestamp
        const timestampEl = item.querySelector('relative-time');
        const timestamp = timestampEl ? timestampEl.getAttribute('datetime') : '';

        // Check for edited
        let editInfo = '';
        const editedEl = item.querySelector('.js-comment-edit-history');
        if (editedEl) {
          editInfo = ' - edited';
        }

        // Build header
        let header = `**${author}**`;
        if (isBot) header += ' bot';
        header += role;
        header += ' commented';
        if (includeTimestamps && timestamp) {
          header += ` ${formatDate(timestamp)}`;
        }
        header += editInfo;

        // Get body content
        const body = extractMarkdownFromBody(commentBody);

        markdownResult += header + '\n\n' + body + '\n\n---\n\n';
        commentCount++;
        hasAnyContent = true;
        return;
      }

      // Check for reference events (e.g., "added a commit that referenced this pull request")
      const refCommit = item.querySelector('.TimelineItem-body[id^="ref-commit"]');
      if (refCommit) {
        if (!shouldIncludeEvent('reference', resolvedEventVerbosity)) {
          return;
        }

        const actorEl = item.querySelector('.author.Link--primary, a[href*="/apps/"]');
        let actor = 'Unknown';
        let isBot = false;

        if (actorEl) {
          actor = actorEl.textContent.trim() || actorEl.getAttribute('href').replace('/apps/', '');
          isBot = actorEl.getAttribute('href')?.includes('/apps/');
        }

        // Get the description and links
        const codeEl = refCommit.querySelector('.mt-3 code');
        if (codeEl) {
          const userMention = codeEl.querySelector('.user-mention');
          const titleLink = codeEl.querySelector('a.markdown-title');
          const issueLink = codeEl.querySelector('.issue-link');
          const shaLink = refCommit.querySelector('.mt-3 code a.Link--secondary');

          if (userMention && titleLink) {
            const userName = userMention.textContent.trim();
            const userUrl = userMention.getAttribute('href');
            const title = titleLink.textContent.trim();
            const titleUrl = titleLink.getAttribute('href');
            const issue = issueLink ? issueLink.textContent.trim() : '';
            const issueUrl = issueLink ? issueLink.getAttribute('href') : '';
            const sha = shaLink ? shaLink.textContent.trim() : '';

            let refEntry = `**${actor}**`;
            if (isBot) refEntry += ' bot';
            refEntry += ' added a commit that referenced this pull request';

            if (includeTimestamps) {
              const timestampEl = item.querySelector('relative-time');
              if (timestampEl) {
                refEntry += ` ${formatDate(timestampEl.getAttribute('datetime'))}`;
              }
            }
            refEntry += '\n\n';

            // Build the reference line
            const fullUserUrl = userUrl?.startsWith('/') ? 'https://github.com' + userUrl : userUrl;
            const fullTitleUrl = titleUrl?.startsWith('/') ? 'https://github.com' + titleUrl : titleUrl;

            refEntry += `[${userName}](${fullUserUrl}) [${title}](${fullTitleUrl})`;
            if (issue && issueUrl) {
              refEntry += ` [${issue}](${issueUrl})`;
            }
            if (sha) {
              refEntry += ` \`${sha}\``;
            }
            refEntry += '\n\n---\n\n';

            markdownResult += refEntry;
            hasAnyContent = true;
          }
        }
        return;
      }
    });

    // ========================================
    // 3. Extract Merge Info
    // ========================================
    const mergeBox = doc.querySelector('[data-testid="mergebox-partial"], .merge-pr');
    if (mergeBox && shouldIncludeEvent('merge-info', resolvedEventVerbosity)) {
      markdownResult += '## Merge info\n\n';
      hasAnyContent = true;

      // Review status
      const reviewSection = mergeBox.querySelector('section[aria-label="Reviews"]');
      if (reviewSection) {
        const reviewTitle = reviewSection.querySelector('h3');
        const reviewDesc = reviewSection.querySelector('p.fgColor-muted');

        if (reviewTitle) {
          markdownResult += `### ${reviewTitle.textContent.trim()}\n\n`;
        }
        if (reviewDesc) {
          markdownResult += `${reviewDesc.textContent.trim()}\n\n`;
        }
      }

      // Checks status
      const checksSection = mergeBox.querySelector('section[aria-label="Checks"]');
      if (checksSection) {
        const checksTitle = checksSection.querySelector('h3');
        const checksDesc = checksSection.querySelector('p.fgColor-muted');

        if (checksTitle) {
          markdownResult += `### ${checksTitle.textContent.trim()}\n\n`;
        }
        if (checksDesc) {
          markdownResult += `${checksDesc.textContent.trim()}\n\n`;
        }

        // Get individual checks for full verbosity only
        const checkItems = checksSection.querySelectorAll('li[aria-label]');
        if (resolvedEventVerbosity === 'full' && checkItems.length > 0) {
          markdownResult += '<details>\n<summary>Show all checks</summary>\n\n';

          checkItems.forEach((checkItem) => {
            const label = checkItem.getAttribute('aria-label');
            if (label) {
              // Parse the label to extract name and status
              const titleEl = checkItem.querySelector('.Title-module__heading--s7YnL a span');
              const descEl = checkItem.querySelector('.StatusCheckRow-module__titleDescription--sgUXB span');
              const requiredEl = checkItem.querySelector('.StatusCheckRow-module__requiredLabel--cYbp_');

              const name = titleEl ? titleEl.textContent.trim() : label.split(' successful')[0];
              const desc = descEl ? descEl.textContent.trim() : '';
              const isRequired = !!requiredEl;

              // Determine if successful (from aria-label)
              const isSuccess = label.toLowerCase().includes('successful');
              const statusText = isSuccess ? '\u2705' : '\u274C';

              let checkLine = `- ${statusText} ${name}`;
              if (desc) {
                checkLine += ` \u2014 ${desc}`;
              }
              if (isRequired) {
                checkLine += ' **Required**';
              }
              checkLine += '\n';

              markdownResult += checkLine;
            }
          });

          markdownResult += '\n</details>\n';
        }
      }
    }

    // If no content found, return error
    if (!hasAnyContent) {
      return {
        markdown: '',
        commentCount: 0,
        error: 'No pull request content found. Make sure you are on a GitHub pull request page.'
      };
    }

    return {
      markdown: markdownResult.trim(),
      commentCount: commentCount,
      error: null
    };
  } catch (err) {
    return {
      markdown: '',
      commentCount: 0,
      error: `Parse error: ${err.message}`
    };
  }
}

/**
 * Extract markdown from a comment body element
 * @param {Element} element - The DOM element containing comment content
 * @returns {string} - Markdown string
 */
function extractMarkdownFromBody(element) {
  let result = '';

  // Clone to avoid modifying original
  const clone = element.cloneNode(true);

  // Process each child node
  for (let node of clone.childNodes) {
    result += processNode(node);
  }

  // Clean up whitespace while preserving structure
  return result
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

function normalizeInlineMarkdown(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeMarkdownTableCell(text) {
  return normalizeInlineMarkdown(text)
    .replace(/\|/g, '\\|');
}

function convertTableToMarkdown(tableEl) {
  if (!tableEl) return '';

  // GitHub uses presentation tables for non-table markdown UI (e.g., comment wrappers).
  if (tableEl.getAttribute('data-paste-markdown-skip') !== null) {
    return '';
  }
  if (tableEl.getAttribute('role') === 'presentation') {
    return '';
  }

  const rows = Array.from(tableEl.querySelectorAll('tr'))
    .map((row) => Array.from(row.children).filter((cell) => {
      const tag = cell.tagName.toLowerCase();
      return tag === 'th' || tag === 'td';
    }))
    .filter((cells) => cells.length > 0);

  if (!rows.length) {
    return '';
  }

  const tableRows = rows.map((cells) => cells.map((cell) => {
    let content = '';
    for (const child of cell.childNodes) {
      content += processNode(child);
    }
    return escapeMarkdownTableCell(content);
  }));

  const headerCells = tableRows[0];
  const bodyRows = tableRows.slice(1);
  const columnCount = headerCells.length;
  const separator = Array.from({ length: columnCount }, () => '---');

  const lines = [];
  lines.push(`| ${headerCells.join(' | ')} |`);
  lines.push(`| ${separator.join(' | ')} |`);
  bodyRows.forEach((row) => {
    const padded = row.concat(Array.from({ length: Math.max(0, columnCount - row.length) }, () => ''));
    lines.push(`| ${padded.join(' | ')} |`);
  });

  return `\n${lines.join('\n')}\n`;
}

/**
 * Recursively process a DOM node and convert to markdown
 * @param {Node} node - The DOM node to process
 * @returns {string} - Markdown string
 */
function processNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tag = node.tagName.toLowerCase();

  // Handle details blocks (collapsible content)
  if (tag === 'details') {
    const summary = node.querySelector('summary');
    const summaryText = summary ? summary.textContent.trim() : 'Details';
    let content = '<details>\n<summary>' + summaryText + '</summary>\n\n';
    // Process non-summary children
    for (let child of node.childNodes) {
      if (child.tagName?.toLowerCase() !== 'summary') {
        content += processNode(child);
      }
    }
    content += '\n</details>\n';
    return content;
  }

  // Handle video elements
  if (tag === 'video') {
    const src = node.getAttribute('src') || '';
    return `[Video](${src})\n`;
  }

  // Handle code blocks specially to preserve formatting
  if (tag === 'pre') {
    const code = node.querySelector('code');
    const codeContent = code ? code.textContent : node.textContent;
    // Try to detect language from class
    let language = '';
    if (code) {
      const langClass = Array.from(code.classList).find(c => c.startsWith('language-') || c.startsWith('highlight-source-'));
      if (langClass) {
        language = langClass.replace('language-', '').replace('highlight-source-', '');
      }
    }
    return '\n```' + language + '\n' + codeContent.trim() + '\n```\n';
  }

  if (tag === 'code') {
    return '`' + node.textContent + '`';
  }

  if (tag === 'strong' || tag === 'b') {
    return '**' + node.textContent + '**';
  }

  if (tag === 'em' || tag === 'i') {
    return '_' + node.textContent + '_';
  }

  if (tag === 'del' || tag === 's' || tag === 'strike') {
    return '~~' + node.textContent + '~~';
  }

  if (tag === 'h1') {
    return '\n# ' + node.textContent + '\n';
  }

  if (tag === 'h2') {
    return '\n## ' + node.textContent + '\n';
  }

  if (tag === 'h3') {
    return '\n### ' + node.textContent + '\n';
  }

  if (tag === 'h4') {
    return '\n#### ' + node.textContent + '\n';
  }

  if (tag === 'h5') {
    return '\n##### ' + node.textContent + '\n';
  }

  if (tag === 'h6') {
    return '\n###### ' + node.textContent + '\n';
  }

  if (tag === 'p') {
    let content = '';
    for (let child of node.childNodes) {
      content += processNode(child);
    }
    return content + '\n';
  }

  if (tag === 'br') {
    return '\n';
  }

  if (tag === 'hr') {
    return '\n---\n';
  }

  if (tag === 'blockquote') {
    let content = '';
    for (let child of node.childNodes) {
      content += processNode(child);
    }
    // Prefix each line with >
    return content.split('\n').map(line => '> ' + line).join('\n') + '\n';
  }

  if (tag === 'ul') {
    let content = '\n';
    for (let child of node.childNodes) {
      if (child.tagName?.toLowerCase() === 'li') {
        content += '- ' + processNode(child).trim() + '\n';
      }
    }
    return content;
  }

  if (tag === 'ol') {
    let content = '\n';
    let index = 1;
    for (let child of node.childNodes) {
      if (child.tagName?.toLowerCase() === 'li') {
        content += `${index}. ` + processNode(child).trim() + '\n';
        index++;
      }
    }
    return content;
  }

  if (tag === 'li') {
    let content = '';
    for (let child of node.childNodes) {
      content += processNode(child);
    }
    return content;
  }

  if (tag === 'input') {
    const type = (node.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox') {
      const checked = node.hasAttribute('checked') || node.checked === true;
      return checked ? '[x] ' : '[ ] ';
    }
    return '';
  }

  if (tag === 'table') {
    return convertTableToMarkdown(node);
  }

  if (tag === 'a') {
    const href = node.getAttribute('href');

    // Check if link contains an image
    const img = node.querySelector('img');
    if (img) {
      // If link contains image, render as image (not linked image for simplicity)
      const alt = img.getAttribute('alt') || '';
      const src = img.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }

    const text = node.textContent;
    if (href) {
      // Make relative URLs absolute
      let fullHref = href;
      if (href.startsWith('/')) {
        fullHref = 'https://github.com' + href;
      }
      return `[${text}](${fullHref})`;
    }
    return text;
  }

  if (tag === 'img') {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    return `![${alt}](${src})`;
  }

  // Handle div containers - common in GitHub markdown
  if (tag === 'div') {
    let content = '';
    for (let child of node.childNodes) {
      content += processNode(child);
    }
    return content;
  }

  // For other tags, recurse through children
  let content = '';
  for (let child of node.childNodes) {
    content += processNode(child);
  }
  return content;
}

// Export for use in content script and popup
if (typeof window !== 'undefined') {
  window.GitHubToMarkdown = {
    parse: parseGitHubDiscussionHTML,
    parseIssue: parseGitHubIssueHTML,
    parsePullRequest: parsePullRequest,
    extractMarkdownFromBody,
    processNode
  };
}

