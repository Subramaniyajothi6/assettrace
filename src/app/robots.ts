import type { MetadataRoute } from "next";

/**
 * /robots.txt. Without it the URL served the 404 page, which Lighthouse flags as an invalid robots.txt.
 * Everything except the sign-in page needs an account anyway; API routes are kept out of crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
