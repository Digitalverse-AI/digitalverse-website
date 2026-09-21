#!/usr/bin/env node
// Builds a static landing page from landing/_template.html and a campaign JSON.
// Zero dependencies. Usage:
//   node tools/build-landing.mjs landing/ai-assessment.json
// Writes <repo>/<slug>.html and prints its path. Run it again after editing
// either the JSON or the template; the output is deterministic.
//
// Template syntax (everything a template author needs):
//   {{key}}              value from the JSON, HTML-escaped (text and attributes)
//   {{obj.key}}          nested value, HTML-escaped
//   {{key|json}}         value as a JSON literal (for JSON-LD), not HTML-escaped
//   {{#each list}}...{{/each}}
//                        repeats the block for each array item; inside it
//                        {{.}} is a scalar item, {{title}} etc. read an object
//                        item's fields, and {{@index}} is the 1-based position
//
// Any placeholder that names a missing key, an unknown filter, an unclosed
// block or a non-array in {{#each}} aborts the build with a non-zero exit.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = resolve(ROOT, 'landing', '_template.html');

function fail(message) {
  console.error(`build-landing: ${message}`);
  process.exit(1);
}

const arg = process.argv[2];
if (!arg || process.argv.length > 3) fail('usage: node tools/build-landing.mjs landing/<campaign>.json');

const jsonPath = resolve(process.cwd(), arg);
let data;
try {
  data = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (error) {
  fail(`cannot read ${arg}: ${error.message}`);
}
if (!isPlainObject(data)) fail(`${arg} must contain a JSON object at the top level`);

if (typeof data.slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(data.slug)) {
  fail(`"slug" must be lowercase letters, digits and hyphens (got ${JSON.stringify(data.slug)})`);
}

let template;
try {
  template = readFileSync(TEMPLATE_PATH, 'utf8');
} catch (error) {
  fail(`cannot read template ${relative(ROOT, TEMPLATE_PATH)}: ${error.message}`);
}

const usedRootKeys = new Set();

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Resolve a dotted path against a stack of scopes, innermost first.
function lookup(path, scopes) {
  if (path === '.' || path === '@index') {
    const scope = scopes[0];
    return scope && Object.prototype.hasOwnProperty.call(scope, path) ? scope[path] : undefined;
  }
  const parts = path.split('.');
  for (let s = 0; s < scopes.length; s += 1) {
    let current = scopes[s];
    let found = true;
    for (const part of parts) {
      if (isPlainObject(current) && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found) {
      if (s === scopes.length - 1) usedRootKeys.add(parts[0]);
      return current;
    }
  }
  return undefined;
}

function lineOf(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function render(source, scopes) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{{', i);
    if (open === -1) {
      out += source.slice(i);
      break;
    }
    out += source.slice(i, open);
    const close = source.indexOf('}}', open);
    if (close === -1) fail(`unclosed "{{" on template line ${lineOf(source, open)}`);
    const tag = source.slice(open + 2, close).trim();
    i = close + 2;

    if (tag.startsWith('#each')) {
      const path = tag.slice(5).trim();
      if (!path) fail(`{{#each}} without a list name on template line ${lineOf(source, open)}`);
      // Find the matching {{/each}}, allowing nested blocks.
      let depth = 1;
      let cursor = i;
      let bodyEnd = -1;
      let after = -1;
      while (depth > 0) {
        const nextOpen = source.indexOf('{{#each', cursor);
        const nextClose = source.indexOf('{{/each}}', cursor);
        if (nextClose === -1) fail(`{{#each ${path}}} on template line ${lineOf(source, open)} has no {{/each}}`);
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth += 1;
          cursor = nextOpen + 7;
        } else {
          depth -= 1;
          if (depth === 0) {
            bodyEnd = nextClose;
            after = nextClose + 9;
          } else {
            cursor = nextClose + 9;
          }
        }
      }
      const body = source.slice(i, bodyEnd);
      const list = lookup(path, scopes);
      if (list === undefined) fail(`{{#each ${path}}}: missing key "${path}" in ${relative(ROOT, jsonPath)}`);
      if (!Array.isArray(list)) fail(`{{#each ${path}}}: "${path}" is not an array`);
      list.forEach((item, index) => {
        const scope = isPlainObject(item) ? { ...item } : {};
        scope['.'] = item;
        scope['@index'] = index + 1;
        out += render(body, [scope, ...scopes]);
      });
      i = after;
      continue;
    }

    if (tag.startsWith('/')) fail(`unexpected {{${tag}}} on template line ${lineOf(source, open)}`);

    const [rawPath, rawFilter, ...extra] = tag.split('|');
    const path = rawPath.trim();
    const filter = rawFilter === undefined ? '' : rawFilter.trim();
    if (extra.length || !/^(\.|@index|[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*)$/.test(path)) {
      fail(`unknown placeholder {{${tag}}} on template line ${lineOf(source, open)}`);
    }
    const value = lookup(path, scopes);
    if (/(^|\.)(url|whatsapp_url)$/.test(path) && value !== undefined && !/^(https:\/\/|[a-z0-9-]+\.html$)/.test(String(value))) {
      fail(`"${path}" must be an https:// URL or a local .html file (got ${JSON.stringify(value)})`);
    }
    if (value === undefined) fail(`missing key "${path}" for {{${tag}}} (template line ${lineOf(source, open)}) in ${relative(ROOT, jsonPath)}`);

    if (filter === 'json') {
      // Escape <, > and & so a value can never terminate the <script> element; still valid JSON.
      out += JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    } else if (filter === '') {
      if (typeof value !== 'string' && typeof value !== 'number') {
        fail(`{{${tag}}} on template line ${lineOf(source, open)} resolves to ${Array.isArray(value) ? 'an array' : typeof value}; use {{#each}} or a scalar`);
      }
      out += escapeHtml(String(value));
    } else {
      fail(`unknown filter "${filter}" in {{${tag}}} on template line ${lineOf(source, open)}`);
    }
  }
  return out;
}

const rendered = render(template, [data]);

const unused = Object.keys(data).filter((key) => !usedRootKeys.has(key));
if (unused.length) console.warn(`build-landing: warning, unused JSON keys: ${unused.join(', ')}`);

const header = `<!-- Generated by tools/build-landing.mjs from ${relative(ROOT, jsonPath)} — edit the JSON or the template, then rebuild. -->\n`;
const outputPath = resolve(ROOT, `${data.slug}.html`);
writeFileSync(outputPath, header + rendered.replace(/\s*$/, '\n'), 'utf8');
console.log(outputPath);
