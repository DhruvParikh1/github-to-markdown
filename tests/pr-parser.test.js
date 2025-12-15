/**
 * Pull Request Parser Tests
 * Reference: github.com/openai/codex/pull/7999
 * Tests against reference-pr-example/ files
 * 
 * Run: npm run test:pr
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Setup JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;

// Load the parser
const parserCode = fs.readFileSync(path.join(__dirname, '..', 'parser.js'), 'utf8');
eval(parserCode);

// Test utilities
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${error.message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, message = '') {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}\n   Expected to include: ${JSON.stringify(needle)}\n   In: ${JSON.stringify(haystack.substring(0, 300))}...`);
  }
}

function assertNotIncludes(haystack, needle, message = '') {
  if (haystack.includes(needle)) {
    throw new Error(`${message}\n   Expected NOT to include: ${JSON.stringify(needle)}`);
  }
}

function assertMatch(text, regex, message = '') {
  if (!regex.test(text)) {
    throw new Error(`${message}\n   Expected to match: ${regex}\n   In: ${JSON.stringify(text.substring(0, 300))}...`);
  }
}

// Load reference files
const referenceDir = path.join(__dirname, '..', 'reference-pr-example');
const inputHTML = fs.readFileSync(path.join(referenceDir, 'pr-example.html'), 'utf8');
const expectedOutput = fs.readFileSync(path.join(referenceDir, 'pr-converted.md'), 'utf8');

console.log('\n🧪 GitHub Pull Request Parser Tests\n');
console.log('='.repeat(50));

// ============================================
// Test Suite: Basic Parsing
// ============================================
console.log('\n📋 Basic Parsing Tests\n');

test('Should parse reference HTML without errors', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertEqual(result.error, null, 'Should have no error');
});

test('Should find comments in reference HTML', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  if (result.commentCount === 0) {
    throw new Error('Should find at least one comment');
  }
});

test('Should return markdown string', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  if (typeof result.markdown !== 'string' || result.markdown.length === 0) {
    throw new Error('Should return non-empty markdown string');
  }
});

// ============================================
// Test Suite: PR Body Extraction
// ============================================
console.log('\n📄 PR Body Extraction Tests\n');

test('Should extract PR author "Chriss4123"', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '**Chriss4123**', 'Should include author name');
});

test('Should include "commented" with date', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML, { includeTimestamps: true });
  assertMatch(result.markdown, /commented.*Dec 1\d, 2025/, 'Should include commented date');
});

test('Should extract "Fixes #7998" issue link', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  // Whitespace may exist between "Fixes" and "#7998" due to HTML structure
  assertMatch(result.markdown, /Fixes[\s\S]*#7998/, 'Should include fixes reference');
});

test('Should extract markdown headers (## Problem)', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '## Problem', 'Should include Problem header');
});

test('Should extract markdown headers (## What changed)', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '## What changed', 'Should include What changed header');
});

test('Should extract markdown headers (## Testing)', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '## Testing', 'Should include Testing header');
});

test('Should extract bullet list items', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '- Expose the current in-flight history', 'Should include bullet points');
});

test('Should preserve inline code backticks', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '`active_cell`', 'Should include inline code');
});

test('Should preserve code blocks', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '`cargo test -p codex-tui`', 'Should include code block content');
});

test('Should handle images with full URLs', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertMatch(result.markdown, /!\[pr-issue-1\]\(https:\/\//, 'Should include image with URL');
});

// ============================================
// Test Suite: Collapsible Details
// ============================================
console.log('\n📦 Collapsible Details Tests\n');

test('Should handle <details> blocks', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '<details>', 'Should include details tag');
});

test('Should handle <summary> in details', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '<summary>', 'Should include summary tag');
});

test('Should extract video links from details', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertMatch(result.markdown, /\[Video\]\(https:\/\//, 'Should include video link');
});

// ============================================
// Test Suite: Comment Extraction with Roles
// ============================================
console.log('\n💬 Comment Extraction Tests\n');

test('Should extract bot comments (github-actions)', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '**github-actions**', 'Should include bot comment');
});

test('Should extract Author role comments', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertMatch(result.markdown, /\*\*Chriss4123\*\*.*Author/, 'Should include author role');
});

test('Should include CLA signed comment content', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'CLA', 'Should include CLA content');
});

test('Should include comment separators', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '---', 'Should include separators');
});

// ============================================
// Test Suite: Commit Timeline
// ============================================
console.log('\n🔄 Commit Timeline Tests\n');

test('Should parse commit entries', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'added 1 commit', 'Should include commit entry');
});

test('Should include commit message', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'fix: show active exec cell in transcript overlay', 'Should include commit message');
});

test('Should include commit SHA', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertMatch(result.markdown, /79da190|`79da190`/, 'Should include commit SHA');
});

// ============================================
// Test Suite: Timeline Events
// ============================================
console.log('\n🏷️ Timeline Events Tests\n');

test('Should parse "added a commit that referenced" events', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'has signed the CLA', 'Should include CLA reference event');
});

// ============================================
// Test Suite: Merge Info
// ============================================
console.log('\n🔀 Merge Info Tests\n');

test('Should extract merge info section', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '## Merge info', 'Should include merge info header');
});

test('Should extract review status', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'Review required', 'Should include review status');
});

test('Should extract checks status', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'All checks have passed', 'Should include checks status');
});

test('Should include check count', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '26 successful checks', 'Should include check count');
});

test('Should include individual check items in details', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, 'cargo-deny', 'Should include individual check name');
});

test('Should show check pass/fail with emoji', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '✅', 'Should include success emoji');
});

test('Should mark required checks', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML);
  assertIncludes(result.markdown, '**Required**', 'Should mark required checks');
});

// ============================================
// Test Suite: Edge Cases
// ============================================
console.log('\n🔧 Edge Case Tests\n');

test('Should handle empty HTML gracefully', () => {
  const result = window.GitHubToMarkdown.parsePullRequest('');
  if (result.error === null && result.commentCount !== 0) {
    throw new Error('Should report error or zero comments for empty HTML');
  }
});

test('Should handle HTML with no PR content', () => {
  const result = window.GitHubToMarkdown.parsePullRequest('<div>No PR here</div>');
  assertEqual(result.commentCount, 0, 'Should find zero comments');
});

test('Should handle malformed HTML', () => {
  const result = window.GitHubToMarkdown.parsePullRequest('<div><p>Unclosed');
  // Should not throw, should return gracefully
  if (typeof result.error === 'undefined') {
    throw new Error('Should return result object');
  }
});

// ============================================
// Test Suite: Options
// ============================================
console.log('\n⚙️ Options Tests\n');

test('Should include timestamps when enabled', () => {
  const result = window.GitHubToMarkdown.parsePullRequest(inputHTML, { includeTimestamps: true });
  assertMatch(result.markdown, /Dec 1\d, 2025/, 'Should include date');
});

test('Should produce shorter output without timestamps', () => {
  const withTimestamps = window.GitHubToMarkdown.parsePullRequest(inputHTML, { includeTimestamps: true });
  const withoutTimestamps = window.GitHubToMarkdown.parsePullRequest(inputHTML, { includeTimestamps: false });

  // Without timestamps should be shorter
  if (withoutTimestamps.markdown.length >= withTimestamps.markdown.length) {
    throw new Error('Markdown without timestamps should be shorter');
  }
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  process.exit(1);
}
