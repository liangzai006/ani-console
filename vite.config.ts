import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 开发态可选：将 /api 代理到 Mock Server 或真实 Gateway（见 .env.development）
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:4010";

  return {
    plugins: [
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
        autoCodeSplitting: true,
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
