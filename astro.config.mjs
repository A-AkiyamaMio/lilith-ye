import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lilith-ye.vip',
  output: 'static',
  build: {
    format: 'directory'
  }
});
