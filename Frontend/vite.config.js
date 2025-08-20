import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

// Vite configuration for the employee welfare project.
// This setup enables Vue support, Vuetify auto-imports and
// configures global SCSS styles for Vuetify.
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "vuetify/styles" as *;'
      }
    }
  }
});