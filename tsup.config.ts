import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: "terser",
  terserOptions: {
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/,  // Mangle private properties (prefixed with _)
      },
    },
    compress: {
      drop_console: true,
      passes: 2,
    },
    format: {
      comments: false,
    },
  },
  external: ["react"],
});
