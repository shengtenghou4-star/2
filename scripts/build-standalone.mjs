import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const output = path.join(root, 'standalone');
const source = await readFile(path.join(dist, 'index.html'), 'utf8');

const cssMatch = source.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
const jsMatch = source.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/);

if (!cssMatch || !jsMatch) {
  throw new Error('无法从生产构建中定位 CSS 或 JavaScript 入口。');
}

const localPath = (asset) => path.join(dist, asset.replace(/^\/2\//, '').replace(/^\//, ''));
const css = (await readFile(localPath(cssMatch[1]), 'utf8')).replace(/<\/style/gi, '<\\/style');
const js = (await readFile(localPath(jsMatch[1]), 'utf8')).replace(/<\/script/gi, '<\\/script');

// 必须使用函数式替换。压缩后的 JavaScript 可能包含 $&、$'、$` 等字符；
// 若把大段脚本直接作为 replacement 字符串，String.replace 会将它们解释为
// “完整匹配、匹配后文本、匹配前文本”，从而把原 HTML 重复注入脚本中。
const html = source
  .replace(cssMatch[0], () => `<style>${css}</style>`)
  .replace(jsMatch[0], () => `<script type="module">${js}</script>`);

const count = (pattern) => html.match(pattern)?.length ?? 0;
const checks = [
  [count(/<!doctype html>/gi) === 1, '文档必须且只能包含一个 doctype'],
  [count(/<div id="root"><\/div>/g) === 1, '文档必须且只能包含一个 React root'],
  [count(/<script type="module">/g) === 1, '文档必须且只能包含一个内联模块脚本'],
  [count(/<\/script>/g) === 1, '文档必须且只能包含一个脚本闭合标签'],
  [!/<script[^>]+src=/i.test(html), '单文件网页不得残留外部 JavaScript 路径'],
  [!/<link[^>]+\.css/i.test(html), '单文件网页不得残留外部 CSS 路径'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  throw new Error(`单文件网页结构校验失败：${failed.join('；')}`);
}

await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'index.html'), html, 'utf8');
await writeFile(path.join(output, '.nojekyll'), '', 'utf8');

console.log(`standalone/index.html: ${Buffer.byteLength(html)} bytes`);
console.log('standalone structural audit: passed');
