import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/**
 * Custom raw shader loader plugin to import GLSL shaders seamlessly
 * for liquid-gl refractive optical glass physics.
 */
function glslPlugin(): Plugin {
  return {
    name: 'vite-plugin-glsl-raw',
    transform(code, id) {
      if (id.endsWith('.glsl') || id.endsWith('.vert') || id.endsWith('.frag')) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: { mappings: '' },
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    glslPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'tenants/**/assets/*'],
      manifest: {
        name: 'Apex Detailing Studio & Wash',
        short_name: 'ApexStudio',
        description: 'Премиальная онлайн-запись на автомойку и в студию детейлинга',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff2,glsl}'],
        runtimeCaching: [
          {
            // Cache tenant static assets (images, logos, heroes)
            urlPattern: ({ url }) => url.pathname.includes('/tenants/') || url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tenant-media-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache public APIs (services, working hours) with StaleWhileRevalidate
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/services') || url.pathname.includes('/rest/v1/boxes'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-catalog-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 1, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tenants': path.resolve(__dirname, './tenants'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
