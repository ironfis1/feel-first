import type { NextConfig } from "next";

// Origins the Piece screen loads full-size images from, linked from the source institutions (D-001). A unit test
// checks that every catalog imageUrl is on one of them, so a new ingest source cannot be blocked silently.
export const imageOrigins = [
  "https://www.artic.edu",
  "https://images.metmuseum.org",
  "https://iiif.micr.io",
  "https://d2pn8kiwq2w21t.cloudfront.net",
  "https://tile.loc.gov",
];

// Content Security Policy, enforcing (D-083). Static headers only: a nonce would force dynamic rendering and undo
// cacheComponents and partialPrefetching. Known weakness: script-src needs 'unsafe-inline' for the inline scripts
// Next writes into prerendered pages. style-src needs it for React style attributes. 'unsafe-eval' is added only
// for next dev, which needs it; the production policy never has it.
export function contentSecurityPolicy(dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: ${imageOrigins.join(" ")}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

// Security headers on every route (security-check C06-2, D-083). HSTS has no includeSubDomains and no preload:
// other reasinger.net subdomains are hosted elsewhere.
export function securityHeaders(dev: boolean) {
  return [
    { key: "Strict-Transport-Security", value: "max-age=31536000" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Dev server only: lets a phone on the home network load the local design review pages (D-004).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // No X-Powered-By header (security-check C06-2, D-083).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "development") }];
  },
};

export default nextConfig;
