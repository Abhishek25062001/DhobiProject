// One-time source migration: preserve JSX rendering while giving its copy stable CMS keys.
// Run only for a page being migrated; already-extracted fields are left untouched.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(new URL('../client/package.json', import.meta.url));
const { parse } = require('@babel/parser');
const [file, destination] = process.argv.slice(2);
if (!file || !destination) throw new Error('Provide the source JSX and the seed dictionary path.');
const source = await readFile(file, 'utf8');
let values = {};
try { values = JSON.parse(await readFile(destination, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
function key(value) {
  const existing = Object.keys(values).find(key => values[key] === value);
  if (existing) return existing;
  const id = (value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 65) || 'text') + '_' + createHash('sha256').update(value).digest('hex').slice(0, 7);
  values[id] = value;
  return id;
}
function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => { if (/[^ \t]/.test(line)) last = index; });
  return lines.map((line, index) => {
    let clean = line.replace(/\t/g, ' ');
    if (index !== 0) clean = clean.replace(/^ +/, '');
    if (index !== lines.length - 1) clean = clean.replace(/ +$/, '');
    return clean && index !== last ? clean + ' ' : clean;
  }).join('');
}
const edits = [];
const attributes = ['placeholder', 'title', 'aria-label', 'alt', 'message'];
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
function walk(node, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  const parent = ancestors.at(-1);
  const insideFunction = ancestors.some(entry => ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(entry.type));
  let value = null; let braces = false;
  if (insideFunction && node.type === 'JSXText') { value = jsxText(node.value); braces = true; }
  if (insideFunction && node.type === 'StringLiteral') {
    const attr = ancestors.findLast(entry => entry.type === 'JSXAttribute');
    if (parent?.type === 'JSXAttribute' && attributes.includes(parent.name?.name)) { value = node.value; braces = true; }
    else if (ancestors.some(entry => entry.type === 'JSXElement') && (!attr || attributes.includes(attr.name?.name))) {
      if ((parent?.type === 'ConditionalExpression' && (parent.consequent === node || parent.alternate === node)) || (parent?.type === 'LogicalExpression' && parent.right === node) || (parent?.type === 'ObjectProperty' && parent.value === node && ['label', 'desc'].includes(parent.key?.name))) value = node.value;
    }
  }
  if (typeof value === 'string' && /[a-zA-Z]/.test(value) && !/^#[\da-f]+$/i.test(value)) {
    const call = `copy('${key(value)}')`;
    edits.push({ start: node.start, end: node.end, text: braces ? `{${call}}` : call });
    return;
  }
  for (const [name, child] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(name)) continue;
    if (Array.isArray(child)) child.forEach(entry => walk(entry, [...ancestors, node]));
    else if (child && typeof child === 'object') walk(child, [...ancestors, node]);
  }
}
walk(ast);
let output = source;
for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
await writeFile(file, output);
await writeFile(destination, JSON.stringify(values, null, 2) + '\n');
console.log(`Migrated ${edits.length} copy placements; ${Object.keys(values).length} unique fields.`);
