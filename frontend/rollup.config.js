import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import del from "rollup-plugin-delete";

export default {
  input: [
    "src/voice-sending-card.ts",
    "src/voice-receiving-card.ts",
    "src/voice-streaming-card-dashboard.ts"
  ],
  output: {
    dir: "dist",
    format: "es",
    sourcemap: true,
  },
  plugins: [
    del({ targets: ["dist/*"], force: true }),
    resolve(),
    typescript(),
    terser({
      format: {
        comments: false,
      },
    }),
  ],
};
