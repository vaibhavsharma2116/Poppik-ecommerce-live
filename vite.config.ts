
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "defer-local-css",
      apply: "build",
      transformIndexHtml(html) {
        // Convert render-blocking local CSS into a preload + media-swap pattern.
        // This works with hashed Vite asset filenames (e.g. /assets/index-XXXX.css).
        return html.replace(
          /<link\s+rel=["']stylesheet["']\s+([^>]*?)href=["'](\/assets\/[^"']+\.css)["']([^>]*?)>/g,
          (_match, preAttrs: string, href: string, postAttrs: string) => {
            const attrs = `${preAttrs || ""}${postAttrs || ""}`.trim();
            const normalizedAttrs = attrs ? ` ${attrs}` : "";

            return [
              `<link rel="preload" as="style" href="${href}">`,
              `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"${normalizedAttrs}>`,
              `<noscript><link rel="stylesheet" href="${href}"${normalizedAttrs}></noscript>`,
            ].join("\n");
          }
        );
      },
    },
    runtimeErrorOverlay(),
    // themePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@db": path.resolve(__dirname, "db"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    minify: 'terser',
    reportCompressedSize: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: true,
    // Increase chunk size limit and be smarter about splitting
    dynamicImportVarsOptions: {
      warnOnError: true,
      exclude: [/node_modules/],
    },
  },
  server: {
    port: 8085,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "attached_assets"),
      ],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter'],
    exclude: [],
  },
});
