import type { MetadataRoute } from "next";
import { appOrigin } from "@/server/site";
import { TOOLS } from "@/server/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appOrigin();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tools`, changeFrequency: "weekly", priority: 0.8 },
    ...TOOLS.map((tool) => ({ url: `${base}/tools/${tool.id}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
