import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const SUPABASE_URL = "https://fgdskfvmcjdruiguzebd.supabase.co";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy SEO files to Supabase Edge Functions in development
      "/llms.txt": {
        target: `${SUPABASE_URL}/functions/v1/serve-llms-txt`,
        changeOrigin: true,
        rewrite: () => "",
      },
      "/sitemap.xml": {
        target: `${SUPABASE_URL}/functions/v1/serve-sitemap-xml`,
        changeOrigin: true,
        rewrite: () => "",
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
