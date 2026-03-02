# TODO

## P0 - Reliability and Trust
- [ ] Fix test fixture paths so `npm test` runs successfully in CI.
- [ ] Fix popup copy flow runtime error (`statusEl` is undefined in `popup/popup.js`).
- [ ] Normalize UTF-8 text in README/UI to remove mojibake.
- [ ] Remove remote icon/font dependency from popup and bundle assets locally.

## P1 - Requested Product Features
- [ ] Add export presets in popup:
  - [ ] LLM context
  - [ ] Changelog
  - [ ] Incident report
  - [ ] Meeting notes
- [ ] Add frontmatter export options in popup (copy + frontmatter).
- [ ] Add download as `.md` action in popup.
- [ ] Add GitHub Enterprise host support with configurable hosts and permissions.

## P2 - Parser and Coverage Expansion
- [ ] Add parser support for additional markdown structures (tables, task lists, strikethrough, etc.).
- [ ] Add PR export mode including review threads from Files changed.
- [ ] Add filters for bot comments, resolved threads, and timeline verbosity.
- [ ] Add reference fixtures for multiple GitHub DOM variants and regression tests.

## P3 - Scale and UX Enhancements
- [ ] Add keyboard shortcut and context menu export.
- [ ] Add parse/output caching keyed by URL + last activity.
- [ ] Debounce/throttle mutation observer work on SPA navigations.
- [ ] Add export templates for changelog/release notes and customizable output sections.

## P4 - Platform Breadth
- [ ] Add support for Releases, commit pages, gists, and wiki exports.
- [ ] Add optional export profiles per destination (Slack, Notion, docs, LLM prompts).
