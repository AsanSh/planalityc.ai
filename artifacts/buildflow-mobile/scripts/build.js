#!/usr/bin/env node
/**
 * Production static export for Expo web + manifests for serve.js.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const staticBuild = path.join(root, "static-build");

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || "https://planalityc-api.vercel.app/api";

if (fs.existsSync(staticBuild)) {
  fs.rmSync(staticBuild, { recursive: true, force: true });
}

console.log(`Building mobile web bundle (API: ${apiUrl})…`);

execSync("pnpm exec expo export --platform web --output-dir static-build", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiUrl,
    NODE_ENV: "production",
  },
});

// serve.js ищет manifest.json для Expo Go deep links
for (const platform of ["ios", "android"]) {
  const dir = path.join(staticBuild, platform);
  fs.mkdirSync(dir, { recursive: true });
  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          id: appJson.expo?.slug ?? "buildflow-mobile",
          createdAt: new Date().toISOString(),
          runtimeVersion: appJson.expo?.version ?? "1.0.0",
          launchAsset: { key: "bundle", contentType: "application/javascript", url: "../_expo/static/js/web/index.js" },
          assets: [],
          metadata: {},
          extra: { expoClient: appJson.expo },
        },
        null,
        2,
      ),
    );
  }
}

console.log("Static build ready in static-build/");
