import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { basePath } from './paths';

const config: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
};

export default config;
