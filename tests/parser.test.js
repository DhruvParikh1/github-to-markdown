/**
 * Parser Tests
 * Tests the HTML-to-Markdown parser using reference examples
 * 
 * Run: npm test (after npm install)
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
    throw new Error(`${message}\n   Expected to include: ${JSON.stringify(needle)}\n   In: ${JSON.stringify(haystack.substring(0, 200))}...`);
  }
}

function assertNotIncludes(haystack, needle, message = '') {
  if (haystack.includes(needle)) {
    throw new Error(`${message}\n   Expected NOT to include: ${JSON.stringify(needle)}`);
  }
}

// Load reference files
const referenceDir = path.join(__dirname, '..', '..', 'reference-successful-example');
const inputHTML = fs.readFileSync(path.join(referenceDir, 'discussion_element.html'), 'utf8');
const expectedOutput = fs.readFileSync(path.join(referenceDir, 'discussion-converted.md'), 'utf8');

console.log('\n🧪 GitHub to Markdown Parser Tests\n');
console.log('='.repeat(50));

// ============================================
// Test Suite: Basic Parsing
// ============================================
console.log('\n📋 Basic Parsing Tests\n');

test('Should parse reference HTML without errors', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertEqual(result.error, null, 'Should have no error');
});

test('Should find comments in reference HTML', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  if (result.commentCount === 0) {
    throw new Error('Should find at least one comment');
  }
});

test('Should return markdown string', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  if (typeof result.markdown !== 'string' || result.markdown.length === 0) {
    throw new Error('Should return non-empty markdown string');
  }
});

// ============================================
// Test Suite: Author Extraction
// ============================================
console.log('\n👤 Author Extraction Tests\n');

test('Should extract author name "guidedways"', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '**guidedways**', 'Should include author name');
});

test('Should extract author name "steve-a-jones"', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '**steve-a-jones**', 'Should include second author name');
});

// ============================================
// Test Suite: Timestamp Handling
// ============================================
console.log('\n📅 Timestamp Tests\n');

test('Should include timestamps by default', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML, { includeTimestamps: true });
  assertIncludes(result.markdown, 'Nov 25, 2025', 'Should include date');
});

test('Should exclude timestamps when disabled', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML, { includeTimestamps: false });
  assertNotIncludes(result.markdown, 'Nov 25, 2025', 'Should not include date');
});

// ============================================
// Test Suite: Markdown Formatting
// ============================================
console.log('\n📝 Markdown Formatting Tests\n');

test('Should convert headers (## Quick Setup)', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '## Quick Setup', 'Should include h2 header');
});

test('Should convert inline code (.zshrc)', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '`.zshrc`', 'Should include inline code');
});

test('Should convert code blocks with triple backticks', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '```', 'Should include code block markers');
});

test('Should preserve code block content', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, 'codex-with-instructions', 'Should include code content');
});

test('Should convert links to markdown format', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  // Check for markdown link format [text](url)
  if (!result.markdown.match(/\[.+?\]\(.+?\)/)) {
    throw new Error('Should include at least one markdown link');
  }
});

// ============================================
// Test Suite: Comment Separators
// ============================================
console.log('\n➖ Comment Separator Tests\n');

test('Should include --- separators between comments', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);
  assertIncludes(result.markdown, '---', 'Should include separators');
});

// ============================================
// Test Suite: Nested Replies
// ============================================
console.log('\n🔀 Nested Reply Tests\n');

test('Should include nested replies by default', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML, { includeNested: true });
  // Nested replies should be indented with 2 spaces
  assertIncludes(result.markdown, '  **', 'Should include indented nested reply');
});

test('Should exclude nested replies when disabled', () => {
  const withNested = window.GitHubToMarkdown.parse(inputHTML, { includeNested: true });
  const withoutNested = window.GitHubToMarkdown.parse(inputHTML, { includeNested: false });

  if (withoutNested.markdown.length >= withNested.markdown.length) {
    throw new Error('Markdown without nested should be shorter');
  }
});

// ============================================
// Test Suite: Error Handling
// ============================================
console.log('\n⚠️ Error Handling Tests\n');

test('Should handle empty HTML gracefully', () => {
  const result = window.GitHubToMarkdown.parse('');
  if (result.error === null && result.commentCount !== 0) {
    throw new Error('Should report error or zero comments for empty HTML');
  }
});

test('Should handle HTML with no discussion content', () => {
  const result = window.GitHubToMarkdown.parse('<div>No discussion here</div>');
  assertEqual(result.commentCount, 0, 'Should find zero comments');
});

test('Should handle malformed HTML', () => {
  const result = window.GitHubToMarkdown.parse('<div><p>Unclosed');
  // Should not throw, should return gracefully
  if (typeof result.error === 'undefined') {
    throw new Error('Should return result object');
  }
});

// ============================================
// Test Suite: Content Comparison
// ============================================
console.log('\n🔍 Content Comparison Tests\n');

test('Should produce output matching expected structure', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);

  // Check that first author matches expected output
  const expectedFirstLine = expectedOutput.split('\n')[0];
  const actualFirstLine = result.markdown.split('\n')[0];

  // Both should start with **guidedways**
  assertIncludes(actualFirstLine, '**guidedways**', 'First line should match expected author');
});

test('Should preserve code block formatting from reference', () => {
  const result = window.GitHubToMarkdown.parse(inputHTML);

  // Check for key code block content from reference
  assertIncludes(result.markdown, 'codex --config developer_instructions', 'Should include code from reference');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  process.exit(1);
}
