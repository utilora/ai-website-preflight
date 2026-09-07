import type { Metadata } from "next";
import { appOrigin } from "../site";
import { getTool } from "./registry";
import type { ToolId } from "./types";

export function toolPageMetadata(id: ToolId): Metadata {
  const tool = getTool(id);
  const url = `${appOrigin()}/tools/${id}`;
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title: tool.title, description: tool.description, url, type: "website" },
  };
}
