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
const css = await readFile(localPath(cssMatch[1]), 'utf8');
const js = (await readFile(localPath(jsMatch[1]), 'utf8')).replaceAll('</script', '<\\/script');

const html = source
  .replace(cssMatch[0], `<style>${css}</style>`)
  .replace(jsMatch[0], `<script type="module">${js}</script>`);

await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'index.html'), html, 'utf8');
await writeFile(path.join(output, '.nojekyll'), '', 'utf8');

console.log(`standalone/index.html: ${Buffer.byteLength(html)} bytes`);
