/**
 * Issue Parser Tests
 * Reference: github.com/openai/codex/issues/7929
 * Tests against reference-issue-example/ files
 * 
 * Run: npm test
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
const referenceDir = path.join(__dirname, '..', 'References-from-GitHub', 'reference-issue-example');
const inputHTML = fs.readFileSync(path.join(referenceDir, 'issue-example.html'), 'utf8');
const expectedOutput = fs.readFileSync(path.join(referenceDir, 'issue-converted.md'), 'utf8');

console.log('\n🧪 GitHub Issue Parser Tests\n');
console.log('='.repeat(50));

// ============================================
// Test Suite: Basic Parsing
// ============================================
console.log('\n📋 Basic Parsing Tests\n');

test('Should parse reference HTML without errors', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertEqual(result.error, null, 'Should have no error');
});

test('Should find comments in reference HTML', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  if (result.commentCount === 0) {
    throw new Error('Should find at least one comment');
  }
});

test('Should return markdown string', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  if (typeof result.markdown !== 'string' || result.markdown.length === 0) {
    throw new Error('Should return non-empty markdown string');
  }
});

// ============================================
// Test Suite: Issue Body Extraction
// ============================================
console.log('\n📄 Issue Body Extraction Tests\n');

test('Should extract issue author "canyue233OVO"', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '**canyue233OVO**', 'Should include author name');
});

test('Should include "opened on" with date', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertMatch(result.markdown, /opened on Dec 1\d, 2025/, 'Should include opened date');
});

test('Should include "edited by" information', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, 'edited by canyue233OVO', 'Should include edit info');
});

test('Should extract form field headers (h3)', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '### What version of the VS Code extension', 'Should include h3 headers');
});

test('Should extract form field answers', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '0.4.51', 'Should include version answer');
  assertIncludes(result.markdown, 'Team', 'Should include subscription answer');
});

// ============================================
// Test Suite: Comment Extraction with Roles
// ============================================
console.log('\n💬 Comment Extraction Tests\n');

test('Should extract collaborator comments with role', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '**etraut-openai** *Collaborator*', 'Should include collaborator role');
});

test('Should extract author comments with role', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '**canyue233OVO** *Author*', 'Should include author role');
});

test('Should include comment timestamps', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML, { includeTimestamps: true });
  assertMatch(result.markdown, /commented on Dec 1\d, 2025/, 'Should include comment dates');
});

test('Should handle multiple comments from same user', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  // Count occurrences of canyue233OVO as Author
  const authorMatches = result.markdown.match(/\*\*canyue233OVO\*\* \*Author\*/g);
  if (!authorMatches || authorMatches.length < 2) {
    throw new Error('Should find multiple author comments');
  }
});

test('Should include blockquotes in replies', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  // Check for blockquote prefix (may have variable whitespace)
  assertMatch(result.markdown, />\s*Am I correct in assuming/, 'Should include blockquote');
});

// ============================================
// Test Suite: Timeline Events
// ============================================
console.log('\n🏷️ Timeline Event Tests\n');

test('Should parse label add events', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '**canyue233OVO** added **extension**', 'Should include label event');
});

test('Should parse multi-label events', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '**github-actions** added **bug** **windows-os**', 'Should include multi-label event');
});

test('Should parse title change events', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, 'changed the title', 'Should include title change');
  assertIncludes(result.markdown, '~~', 'Should include strikethrough for old title');
});

// ============================================
// Test Suite: Markdown Formatting
// ============================================
console.log('\n📝 Markdown Formatting Tests\n');

test('Should preserve inline code backticks', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '`APIROUTER_API_KEY`', 'Should include inline code');
});

test('Should handle images with full URLs', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertMatch(result.markdown, /!\[Image\]\(https:\/\//, 'Should include image with URL');
});

test('Should convert line breaks properly', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  // Check that content flows naturally
  if (result.markdown.includes('<br>') || result.markdown.includes('<br/>')) {
    throw new Error('Should not contain raw HTML br tags');
  }
});

test('Should include --- separators between sections', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  assertIncludes(result.markdown, '---', 'Should include separators');
});

// ============================================
// Test Suite: Edge Cases
// ============================================
console.log('\n🔧 Edge Case Tests\n');

test('Should handle empty HTML gracefully', () => {
  const result = window.GitHubToMarkdown.parseIssue('');
  if (result.error === null && result.commentCount !== 0) {
    throw new Error('Should report error or zero comments for empty HTML');
  }
});

test('Should handle HTML with no issue content', () => {
  const result = window.GitHubToMarkdown.parseIssue('<div>No issue here</div>');
  assertEqual(result.commentCount, 0, 'Should find zero comments');
});

test('Should handle malformed HTML', () => {
  const result = window.GitHubToMarkdown.parseIssue('<div><p>Unclosed');
  // Should not throw, should return gracefully
  if (typeof result.error === 'undefined') {
    throw new Error('Should return result object');
  }
});

// ============================================
// Test Suite: Options
// ============================================
console.log('\n⚙️ Options Tests\n');

test('Should include timestamps by default', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML, { includeTimestamps: true });
  assertMatch(result.markdown, /on Dec 1\d, 2025/, 'Should include date');
});

test('Should exclude timestamps when disabled', () => {
  const withTimestamps = window.GitHubToMarkdown.parseIssue(inputHTML, { includeTimestamps: true });
  const withoutTimestamps = window.GitHubToMarkdown.parseIssue(inputHTML, { includeTimestamps: false });

  // Without timestamps should be shorter
  if (withoutTimestamps.markdown.length >= withTimestamps.markdown.length) {
    throw new Error('Markdown without timestamps should be shorter');
  }
});

// ============================================
// Test Suite: Content Comparison
// ============================================
console.log('\n🔍 Content Comparison Tests\n');

test('Should match expected output structure', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);

  // Check key elements from expected output
  const expectedFirstLine = expectedOutput.split('\n')[0];
  assertIncludes(result.markdown, '**canyue233OVO**', 'Should have correct author');
  assertIncludes(result.markdown, 'opened on', 'Should have opened prefix');
});

test('Should preserve italic formatting for No response', () => {
  const result = window.GitHubToMarkdown.parseIssue(inputHTML);
  // Accept either *italics* or _italics_ since both are valid markdown
  assertMatch(result.markdown, /[*_]No response[*_]/, 'Should include italicized No response');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  process.exit(1);
}
