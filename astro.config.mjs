// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://quickbmicalculator.com',
  output: 'server',

  session: {
    driver: sessionDrivers.lruCache()
  },

  devToolbar: {
    enabled: false
  },

  integrations: [
    react(), 
    sitemap({
      filter: (page) => {
        const url = new URL(page);
        const path = url.pathname;
        
        // Normalize path by stripping trailing slash
        const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
        
        // Exclude system pages and authenticated/admin/tracker zones
        const excludedExact = [
          '/403', '/404', '/500',
          '/login', '/logout', '/signup',
          '/admin-login', '/forgot-password', '/reset-password',
          '/tracker', '/admin', '/auth'
        ];
        
        if (excludedExact.includes(normalizedPath)) return false;
        
        // Exclude wildcards/sub-paths
        if (
          normalizedPath.startsWith('/admin/') || 
          normalizedPath.startsWith('/auth/') || 
          normalizedPath.startsWith('/tracker/')
        ) {
          return false;
        }
        
        return true;
      }
    })
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false
    }
  },

  adapter: cloudflare({
    imageService: 'passthrough'
  })
});