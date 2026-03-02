/**
 * Markdown Fidelity Tests
 * Focused tests for tag-level markdown conversion behavior.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;

const parserCode = fs.readFileSync(path.join(__dirname, '..', 'parser.js'), 'utf8');
eval(parserCode);

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`FAIL: ${name}`);
    console.log(`  ${error.message}`);
    failCount++;
  }
}

function assertIncludes(haystack, needle, message = '') {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}\nExpected to include: ${JSON.stringify(needle)}\nIn: ${JSON.stringify(haystack)}`);
  }
}

function assertNotIncludes(haystack, needle, message = '') {
  if (haystack.includes(needle)) {
    throw new Error(`${message}\nExpected NOT to include: ${JSON.stringify(needle)}\nIn: ${JSON.stringify(haystack)}`);
  }
}

function extractFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return window.GitHubToMarkdown.extractMarkdownFromBody(doc.body);
}

console.log('\nMarkdown Fidelity Tests\n');

test('Should convert strikethrough tags to markdown', () => {
  const markdown = extractFromHtml('<p><del>old</del> and <s>obsolete</s></p>');
  assertIncludes(markdown, '~~old~~', 'del tag should map to markdown strikethrough');
  assertIncludes(markdown, '~~obsolete~~', 's tag should map to markdown strikethrough');
});

test('Should convert task checkboxes in list items', () => {
  const markdown = extractFromHtml(`
    <ul>
      <li><input type="checkbox" checked> completed task</li>
      <li><input type="checkbox"> pending task</li>
    </ul>
  `);

  if (!/- \[x\]\s+completed task/.test(markdown)) {
    throw new Error(`Checked task should be exported with [x]\nIn: ${JSON.stringify(markdown)}`);
  }
  if (!/- \[ \]\s+pending task/.test(markdown)) {
    throw new Error(`Unchecked task should be exported with [ ]\nIn: ${JSON.stringify(markdown)}`);
  }
});

test('Should convert markdown tables', () => {
  const markdown = extractFromHtml(`
    <table>
      <thead>
        <tr><th>Name</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Parser</td><td>Ready</td></tr>
      </tbody>
    </table>
  `);

  assertIncludes(markdown, '| Name | Status |', 'Table header should be exported');
  assertIncludes(markdown, '| --- | --- |', 'Table separator should be exported');
  assertIncludes(markdown, '| Parser | Ready |', 'Table body should be exported');
});

test('Should ignore presentation tables used for non-markdown UI', () => {
  const markdown = extractFromHtml(`
    <table role="presentation" data-paste-markdown-skip="">
      <tr><td>Should not appear</td></tr>
    </table>
  `);

  assertNotIncludes(markdown, 'Should not appear', 'Presentation-only tables must be ignored');
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed\n`);
if (failCount > 0) {
  process.exit(1);
}
