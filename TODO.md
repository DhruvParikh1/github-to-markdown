# TODO

## P0 - Reliability and Trust
- [x] Fix test fixture paths so `npm test` runs successfully in CI.
- [x] Fix popup copy flow runtime error (`statusEl` is undefined in `popup/popup.js`).
- [x] Normalize UTF-8 text in README/UI to remove mojibake.
- [x] Remove remote icon/font dependency from popup and bundle assets locally.

## P1 - Requested Product Features
- [x] Add export presets in popup:
  - [x] LLM context
  - [x] Changelog
  - [x] Incident report
  - [x] Meeting notes
- [x] Add frontmatter export options in popup (copy + frontmatter).
- [x] Add download as `.md` action in popup.
- [x] Add GitHub Enterprise host support with configurable hosts and permissions.

## P2 - Parser and Coverage Expansion
- [x] Add parser support for additional markdown structures (tables, task lists, strikethrough, etc.).
- [ ] Add PR export mode including review threads from Files changed.
- [ ] Add filters for bot comments, resolved threads, and timeline verbosity.
  - [x] Bot comment include/exclude
  - [x] Event verbosity (Full / Important / Comments only)
  - [ ] Resolved-only threads (deferred until PR review-thread export is implemented)
- [x] Add reference fixtures for multiple GitHub DOM variants and regression tests.

## P3 - Scale and UX Enhancements
- [x] Add keyboard shortcut and context menu export.
- [ ] Add parse/output caching keyed by URL + last activity.
- [ ] Debounce/throttle mutation observer work on SPA navigations.
- [ ] Add export templates for changelog/release notes and customizable output sections.

## P4 - Platform Breadth
- [ ] Add support for Releases, commit pages, gists, and wiki exports.
- [ ] Add optional export profiles per destination (Slack, Notion, docs, LLM prompts).
