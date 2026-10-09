import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const generatedDirectories = ['_astro', 'archive', 'gallery', 'lilith', 'login', 'world'];

for (const directory of generatedDirectories) {
  const destination = path.join(root, directory);
  await rm(destination, { recursive: true, force: true });
  await cp(path.join(dist, directory), destination, { recursive: true });
}

await mkdir(path.join(root, 'assets'), { recursive: true });
await cp(path.join(dist, 'assets'), path.join(root, 'assets'), { recursive: true });
await cp(path.join(dist, 'index.html'), path.join(root, 'index.html'));
await cp(path.join(dist, '_headers'), path.join(root, '_headers'));
await cp(path.join(dist, '_routes.json'), path.join(root, '_routes.json'));

console.log('Published Astro dist to the repository root for Cloudflare Pages.');
