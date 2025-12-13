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

  if (tag === 'a') {
    const href = node.getAttribute('href');
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
    extractMarkdownFromBody,
    processNode
  };
}
