import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const source = new URL('../../fonts/', import.meta.url);
const target = new URL('../public/fonts/', import.meta.url);

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const file of await readdir(source)) {
  if (/^PrismCode-[A-Za-z]+\.(ttf|woff2)$/.test(file)) {
    await cp(new URL(file, source), new URL(file, target));
  }
}
await cp(new URL('../../OFL.txt', import.meta.url), new URL('OFL.txt', target));
