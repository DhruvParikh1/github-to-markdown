# References from GitHub

This folder contains reference examples of GitHub pages captured for **Test-Driven Development (TDD)**.

## Purpose

When developing parsers for different GitHub page types (Issues, Pull Requests, Discussions), we need reliable test fixtures to:

1. **Write tests first** — Following TDD principles, we capture real GitHub HTML pages along with their expected markdown output
2. **Validate parser accuracy** — Compare parser output against the pre-defined expected markdown
3. **Catch regressions** — Ensure future changes don't break existing functionality
4. **Document edge cases** — Capture complex real-world examples with various formatting and elements

## Structure

Each subfolder contains two files:

| File | Description |
|------|-------------|
| `*-example.html` | Raw HTML captured from a real GitHub page |
| `*-converted.md` | Expected markdown output after parsing |

### Current References

- **`reference-issue-example/`** — GitHub Issue with comments, reactions, and timeline events
- **`reference-pr-example/`** — Pull Request with review comments, code diffs, and merge status
- **`reference-discussion-example/`** — GitHub Discussion with threaded replies and answers

## How to Use

When writing or modifying a parser:

1. Use the HTML file as test input
2. Compare your parser's output against the `-converted.md` file
3. If adding new features, update the expected output accordingly

## Adding New References

To add a new reference:

1. Navigate to the GitHub page you want to capture
2. Save the page HTML (right-click → "Save as" → HTML only)
3. Create the expected markdown output manually
4. Place both files in a new subfolder following the naming convention
