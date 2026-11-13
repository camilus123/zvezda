// Packs the app into one self-contained HTML file (CSS and the bundled script
// inlined) that runs from any folder, a USB stick or an e-mail attachment,
// with no server and no network.   Usage: node tools/pack.mjs [out.html]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] || 'zvezda.html');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
// inside a <script> element the HTML parser only cares about "</script" and "<!--"
const js = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const link = '<link rel="stylesheet" href="style.css">', tag = '<script src="dist/app.js"></script>';
if (!html.includes(link) || !html.includes(tag)) throw new Error('index.html no longer has the expected <link>/<script> tags');
html = html.replace(link, () => `<style>\n${css}\n</style>`).replace(tag, () => `<script>\n${js}\n</script>`);
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
