import type { MetadataRoute } from "next";

/** Disallow all crawlers [D-011]. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
