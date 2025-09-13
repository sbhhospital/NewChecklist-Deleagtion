import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['defaults', 'ie >= 11'], // or browserslist query
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  base: "/", // Changed from "./" to "/"
  build: {
    outDir: "dist",
  },
})