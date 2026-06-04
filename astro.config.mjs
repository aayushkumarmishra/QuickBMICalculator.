// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://quickbmicalculator.com',
  devToolbar: {
    enabled: false
  },
  integrations: [
    react(), 
    sitemap({
      filter: (page) => 
        page !== 'https://quickbmicalculator.com/403/' && 
        page !== 'https://quickbmicalculator.com/404/' && 
        page !== 'https://quickbmicalculator.com/500/'
    })
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});