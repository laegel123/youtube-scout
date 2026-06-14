import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only`은 Next 빌드에서만 alias 되고 node resolver에는 없다.
      // 테스트에서는 빈 모듈(no-op)로 매핑해 import 'server-only' 부작용을 무력화한다.
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
});
