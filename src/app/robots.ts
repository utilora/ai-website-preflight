import type { MetadataRoute } from "next";
import { appOrigin } from "@/server/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/scan/"] },
    sitemap: `${appOrigin()}/sitemap.xml`,
  };
}
