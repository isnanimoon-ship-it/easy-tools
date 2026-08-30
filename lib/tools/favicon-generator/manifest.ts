export type ManifestOptions = {
  siteName: string;
  themeColor: string;
};

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveSiteName(siteName: string): string {
  return siteName.trim() || "My Website";
}

export function buildManifest(options: ManifestOptions): string {
  const name = resolveSiteName(options.siteName);
  const shortName = name.length > 12 ? name.slice(0, 12) : name;
  const manifest = {
    name,
    short_name: shortName,
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: options.themeColor,
    background_color: options.themeColor,
    display: "standalone",
  };
  return JSON.stringify(manifest, null, 2);
}

export function buildHtmlSnippet(options: ManifestOptions): string {
  const lines = [
    '<link rel="icon" href="/favicon.ico" sizes="any" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    '<link rel="manifest" href="/site.webmanifest" />',
  ];
  const name = options.siteName.trim();
  if (name) {
    lines.push(`<meta name="application-name" content="${escapeHtmlAttribute(name)}" />`);
  }
  lines.push(`<meta name="theme-color" content="${escapeHtmlAttribute(options.themeColor)}" />`);
  return lines.join("\n");
}

export function buildZipFilename(siteName: string): string {
  const slug = slugify(siteName.trim());
  return slug ? `${slug}-favicon-package.zip` : "favicon-package.zip";
}
