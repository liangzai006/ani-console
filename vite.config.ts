import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 开发态可选：通过 .env.local 中的配置将 /api 代理到 ANI Gateway。
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:4010";

  return {
    plugins: [
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
        autoCodeSplitting: true,
        // `src/routes/**/dev/**` is available through the dev server, but never enters a build graph.
        routeFileIgnorePattern: command === "build" ? "^dev$" : undefined,
      }),
      react(),
    ],
    resolve: {
      alias: {
        "@novnc/novnc/lib/rfb": path.resolve(__dirname, "./node_modules/@novnc/novnc/core/rfb.js"),
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ["@novnc/novnc/lib/rfb"],
      esbuildOptions: {
        target: "esnext",
      },
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@tanstack")) return "vendor-tanstack";
          },
        },
      },
    },
  };
});
