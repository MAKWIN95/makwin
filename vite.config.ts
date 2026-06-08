import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function beatsStaticPlugin(): Plugin {
  return {
    name: "beats-static-copy",
    closeBundle() {
      const src = path.join(__dirname, "mkwn-beats.html");
      const destDir = path.join(__dirname, "dist/spa/public/beats");
      
      // Only copy if the source file exists
      if (!fs.existsSync(src)) {
        console.warn(`⚠️  mkwn-beats.html not found at ${src}, skipping copy`);
        return;
      }
      
      try {
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, "index.html"));
        console.log(`✅ Copied beats page to ${path.join(destDir, "index.html")}`);
      } catch (error) {
        console.error(`❌ Error copying beats page:`, error);
        throw error;
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3002,
    fs: {
      allow: ["./client", "./shared", "./public"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin(), beatsStaticPlugin()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "./client"),
      "@shared": path.join(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
