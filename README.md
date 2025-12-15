# GitHub to Markdown

A Chrome extension that converts GitHub discussion threads to clean, copyable markdown with one click.

## Features

- 📋 **One-click conversion** - Convert any GitHub discussion to markdown instantly
- 🔄 **Preserves formatting** - Maintains code blocks, lists, headers, links, and more
- 💬 **Nested replies** - Properly indents nested comment threads
- ⚙️ **Configurable** - Toggle timestamps and nested replies on/off
- 🌙 **Dark mode** - Automatically matches your system theme

## Installation

### Load Unpacked (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `github-to-markdown` folder
6. The extension icon should appear in your toolbar

## Usage

### Using the Popup

1. Navigate to any GitHub discussion or issue page
2. Click the extension icon in your toolbar
3. The markdown will automatically be extracted and displayed
4. Click **Copy to Clipboard** to copy the markdown
5. Paste anywhere you need it!

### Using the Page Button

1. Navigate to any GitHub discussion or issue page
2. Look for the **📋 Copy as Markdown** button near the header
3. Click it to copy the content directly to your clipboard

## Settings

- **Include timestamps** - Toggle to show/hide comment timestamps
- **Include nested replies** - Toggle to show/hide nested reply threads

## Supported Conversions

| GitHub Element | Markdown Output |
|----------------|-----------------|
| Code blocks    | ` ```code``` `  |
| Inline code    | `` `code` ``    |
| Bold text      | `**bold**`      |
| Italic text    | `_italic_`      |
| Headers        | `# ## ### ...`  |
| Lists          | `- item` / `1. item` |
| Links          | `[text](url)`   |
| Blockquotes    | `> quote`       |
| Images         | `![alt](url)`   |

## Example Output

```markdown
**username** (Author) - Dec 13, 2025

This is the main discussion content with **bold** and `code`.

  **reply-user** - Dec 13, 2025

  This is a nested reply that gets indented.

---

**another-user** - Dec 13, 2025

Another top-level comment.

---
```

## Current Limitations

This extension currently supports **GitHub Discussions and Issues**. The following are planned for future releases:

- ✅ GitHub Discussions
- ✅ GitHub Issues
- ❌ Pull Request comments (Phase 3)
- ❌ Commit comments
- ❌ Release notes

## Troubleshooting

### Extension not working?

1. Make sure you're on a GitHub discussion page (URL should contain `/discussions/`)
2. Try refreshing the GitHub page
3. Reopen the extension popup

### "Refresh the page" message?

The extension needs to be loaded when the page opens. Simply refresh the GitHub page and try again.

### Copy button disabled?

This means no markdown was found. Make sure you're on a valid GitHub discussion page with at least one comment.

## Privacy

This extension:
- ✅ Only runs on `github.com`
- ✅ Never transmits any data
- ✅ Processes everything locally
- ✅ Requires minimal permissions

## Development

### Running Tests

The extension includes a test suite that validates the parser against reference examples:

```bash
cd github-to-markdown
npm install
npm test
```

Tests use the HTML from a real GitHub discussion (`reference-successful-example/discussion_element.html`) and verify:
- Author name extraction
- Timestamp formatting
- Markdown conversion (headers, code blocks, links)
- Nested reply handling
- Error handling

## License

MIT License.

## Contributing

Issues and pull requests are welcome!
