**Chriss4123** commented 15 hours ago

Fixes #7998

## Problem

The TUI coalesces "exploring" commands (reads/searches/lists) into an in-flight `active_cell` so the main view shows a single grouped `• Exploring` / `• Explored` block. That cell is not committed into `App::transcript_cells` until a later flush boundary, but the `Ctrl+T` transcript overlay was rendered only from `App::transcript_cells`.

Result: mid-turn, transcript view can appear to drop the "Explored" tool calls until something later forces a flush.

![pr-issue-1](https://private-user-images.githubusercontent.com/87142779/526246081-e74373ca-d0f4-41a5-a4f5-9fa202084ae2.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU3MzkzOTUsIm5iZiI6MTc2NTczOTA5NSwicGF0aCI6Ii84NzE0Mjc3OS81MjYyNDYwODEtZTc0MzczY2EtZDBmNC00MWE1LWE0ZjUtOWZhMjAyMDg0YWUyLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjE0VDE5MDQ1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI5NzI0M2YxYWFhM2JhZjc0ZmY0MTFjMWEwYWE0ODFjYWNjODZjNTJlNzQ5NzUwYjRmMjNiMjVjYjhkNmNmYzgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.DoP9StlrMWgb9cURIDUK-S8ZlyMnca_iBVzi5_UOOLw)

![pr-issue-2](https://private-user-images.githubusercontent.com/87142779/526246117-e80ddd8e-289a-47ca-9c6b-879acc663d21.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU3MzkzOTUsIm5iZiI6MTc2NTczOTA5NSwicGF0aCI6Ii84NzE0Mjc3OS81MjYyNDYxMTctZTgwZGRkOGUtMjg5YS00N2NhLTljNmItODc5YWNjNjYzZDIxLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjE0VDE5MDQ1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI0MmFhMWVhZWVlMDMzM2QzZTI0NDMyNjA1MGU4OGZhYzk0ZDJiMmYxNWEyNzA2NjU5OGY1YzA0Y2ViYWEwMTEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.UXtd-Cqha2JRz8IbDCpX94YtmHN1q13XfnlCfOwvK8U)

## What changed

- Expose the current in-flight history cell's transcript render:
  - `ChatWidget::active_cell_transcript_lines(width)` returns `(Vec<Line>, is_stream_continuation)` for the current `active_cell` when it has visible transcript lines.
- Add a render-only "live tail" to the transcript overlay:
  - `TranscriptOverlay::set_live_tail/clear_live_tail` appends the active cell's transcript lines after committed transcript cells, matching existing blank-line separation rules and preserving "pinned to bottom" scrolling when applicable.
- Keep the live tail synchronized while the overlay is open:
  - On each `TuiEvent::Draw` while `Overlay::Transcript` is active, `App::overlay_forward_event` updates (or clears) the live tail from the current `active_cell`.
- Implemented for both `codex-rs/tui` and `codex-rs/tui2` to keep feature parity.
- Added snapshot tests + snapshots for the live-tail rendering behavior.

![pr-fixed-1](https://private-user-images.githubusercontent.com/87142779/526246163-f6b2ebb2-b603-4749-900d-515220f69804.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU3MzkzOTUsIm5iZiI6MTc2NTczOTA5NSwicGF0aCI6Ii84NzE0Mjc3OS81MjYyNDYxNjMtZjZiMmViYjItYjYwMy00NzQ5LTkwMGQtNTE1MjIwZjY5ODA0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjE0VDE5MDQ1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWZkYTAzM2U3N2EzOWM4MjQ2YTJjN2M1MGQyNTUxMGQwZGM0NGYyMzAxNzdmZjQ5ODk0YTQ3MDQ3MmMwNGE4Y2EmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.dvvuV_76ki984dO8jGeALoUrKI6drydLXZvJbgk-n2g)

![pr-fixed-2](https://private-user-images.githubusercontent.com/87142779/526246187-6c35332c-f8e0-42e7-948b-4dbe430d2b17.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU3MzkzOTUsIm5iZiI6MTc2NTczOTA5NSwicGF0aCI6Ii84NzE0Mjc3OS81MjYyNDYxODctNmMzNTMzMmMtZjhlMC00MmU3LTk0OGItNGRiZTQzMGQyYjE3LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjE0VDE5MDQ1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWNjNTUyZDA4YWZmNDYyMDAzZGI1YzM0OGFmYjJjYmUzMTI0MjUyNTBlNGU3ZTQ5NWJlM2I3YjliNTJjNWYzM2UmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.wqfP_xZpwp-jNxdcFGlc3-bJeUPdzcwOt9_GBUzsSZo)

<details>
<summary>fixed-demo.mp4</summary>

[Video](https://private-user-images.githubusercontent.com/87142779/526246215-b71b84ba-75b9-4219-bae4-87217499ae22.mp4?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU3MzkzOTUsIm5iZiI6MTc2NTczOTA5NSwicGF0aCI6Ii84NzE0Mjc3OS81MjYyNDYyMTUtYjcxYjg0YmEtNzViOS00MjE5LWJhZTQtODcyMTc0OTlhZTIyLm1wND9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMTQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjE0VDE5MDQ1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTA0ZTFjM2ZmZDVmOWJlYzI5ZGIzODlhYzU1OThkNDU2NTY0MzYxYzE0YjM5ZDJhN2IwZmYyNGY4YTZjZTYzNDkmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.0LZwAdM6L-xPCjg4piP65KLcLxQULPLfZNoH5_ZXmsM)

</details>

## Why this is the best approach

- Preserves the intentional "exploring" coalescing behavior (no change to when/why exec groups are flushed).
- Avoids correctness hazards from forcing a flush while a command is in-flight (which can split one logical exec group across multiple history cells).
- Keeps backtrack/highlighting semantics stable by not injecting the live tail into `transcript_cells` (it's render-only).

## Testing

- `cargo test -p codex-tui`
- `cargo test -p codex-tui2`

---

**Chriss4123** added 1 commit 15 hours ago

[fix: show active exec cell in transcript overlay](https://github.com/openai/codex/pull/7999/commits/79da1905bee6e1b77842dbff70de0c4dd2af2058) `79da190`

---

**github-actions** bot commented 15 hours ago • edited

All contributors have signed the CLA  ✍️ ✅
<sub>Posted by the **CLA Assistant Lite bot**.</sub>

---

**Chriss4123** commented 15 hours ago

I have read the CLA Document and I hereby sign the CLA

---

**github-actions** bot added a commit that referenced this pull request 15 hours ago

[@Chriss4123](https://github.com/Chriss4123) [has signed the CLA in](https://github.com/openai/codex/commit/77f0084a295021a91ebb1fbfa17ad135a774c75d) [#7999](https://github.com/openai/codex/pull/7999) `77f0084`

---

## Merge info

### Review required

At least 1 approving review is required by reviewers with write access.

### All checks have passed

26 successful checks

<details>
<summary>Show all checks</summary>

- ✅ cargo-deny / cargo-deny (pull_request) — Successful in 1m
- ✅ ci / build-test (pull_request) — Successful in 37s **Required**
- ✅ CLA Assistant / cla (pull_request_target) — Successful in 8s **Required**
- ✅ Codespell / Check for spelling errors (pull_request) — Successful in 15s **Required**
- ✅ rust-ci / cargo shear (pull_request) — Successful in 30s
- ✅ rust-ci / CI results (required) (pull_request) — Successful in 4s **Required**
- ✅ rust-ci / Detect changed areas (pull_request) — Successful in 7s
- ✅ rust-ci / Format / etc (pull_request) — Successful in 17s **Required**
- ✅ rust-ci / Lint/Build — macos-14 - aarch64-apple-darwin (pull_request) — Successful in 2m
- ✅ rust-ci / Lint/Build — macos-14 - aarch64-apple-darwin (release) (pull_request) — Successful in 7m
- ✅ rust-ci / Lint/Build — macos-14 - x86_64-apple-darwin (pull_request) — Successful in 3m
- ✅ rust-ci / Lint/Build — ubuntu-24.04 - x86_64-unknown-linux-gnu (pull_request) — Successful in 11m
- ✅ rust-ci / Lint/Build — ubuntu-24.04 - x86_64-unknown-linux-musl (pull_request) — Successful in 3m
- ✅ rust-ci / Lint/Build — ubuntu-24.04 - x86_64-unknown-linux-musl (release) (pull_request) — Successful in 2m
- ✅ rust-ci / Lint/Build — ubuntu-24.04-arm - aarch64-unknown-linux-gnu (pull_request) — Successful in 2m
- ✅ rust-ci / Lint/Build — ubuntu-24.04-arm - aarch64-unknown-linux-musl (pull_request) — Successful in 3m
- ✅ rust-ci / Lint/Build — windows-11-arm - aarch64-pc-windows-msvc (pull_request) — Successful in 5m
- ✅ rust-ci / Lint/Build — windows-11-arm - aarch64-pc-windows-msvc (release) (pull_request) — Successful in 7m
- ✅ rust-ci / Lint/Build — windows-latest - x86_64-pc-windows-msvc (pull_request) — Successful in 6m
- ✅ rust-ci / Lint/Build — windows-latest - x86_64-pc-windows-msvc (release) (pull_request) — Successful in 8m
- ✅ rust-ci / Tests — macos-14 - aarch64-apple-darwin (pull_request) — Successful in 8m
- ✅ rust-ci / Tests — ubuntu-24.04 - x86_64-unknown-linux-gnu (pull_request) — Successful in 6m
- ✅ rust-ci / Tests — ubuntu-24.04-arm - aarch64-unknown-linux-gnu (pull_request) — Successful in 9m
- ✅ rust-ci / Tests — windows-11-arm - aarch64-pc-windows-msvc (pull_request) — Successful in 14m
- ✅ rust-ci / Tests — windows-latest - x86_64-pc-windows-msvc (pull_request) — Successful in 14m
- ✅ sdk / sdks (pull_request) — Successful in 4m

</details>
