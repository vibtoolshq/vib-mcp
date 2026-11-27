import { build } from "esbuild";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(projectRoot, "dist", ".vib-mcp");
const bundlePath = join(outputDirectory, "vib-mcp.mjs");

function bundleText(result) {
  const output = result.outputFiles.find((file) => file.path === bundlePath);
  if (!output) {
    throw new Error(
      `esbuild did not produce the expected bundle: ${bundlePath}`,
    );
  }
  return output.text;
}

function normalizeShebang(text) {
  const withoutShebangs = text.replace(/^#![^\r\n]*(?:\r?\n|$)/gm, "");
  return `#!/usr/bin/env node\n${withoutShebangs.replace(/^(?:\r?\n)+/, "")}`;
}

const buildOptions = {
  absWorkingDir: projectRoot,
  entryPoints: [resolve(projectRoot, "src", "cli.ts")],
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: false,
  write: false,
};

await mkdir(outputDirectory, { recursive: true });

let result = await build(buildOptions);
let output = bundleText(result);
if (/\b__require\b|\brequire\s*\(/.test(output)) {
  result = await build({
    ...buildOptions,
    banner: {
      js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
    },
  });
  output = bundleText(result);
}

await writeFile(bundlePath, normalizeShebang(output), "utf8");
await copyFile(
  resolve(projectRoot, "templates", "servers.json"),
  join(outputDirectory, "servers.json"),
);
await copyFile(
  resolve(projectRoot, "templates", ".env.example"),
  join(outputDirectory, ".env.example"),
);

const bundleSizeKb = (await stat(bundlePath)).size / 1024;
console.log(`Portable bundle: ${bundlePath} (${bundleSizeKb.toFixed(2)} KB)`);
