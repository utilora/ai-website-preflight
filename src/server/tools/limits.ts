import { createSafeFetcher, type ScanLimits } from "../scan-engine";

export const toolScanLimits: ScanLimits = {
  pages: 1,
  redirects: 4,
  timeoutMs: 8_000,
  htmlBytes: 500_000,
  textBytes: 128_000,
  sitemapBytes: 256_000,
  sitemapUrls: 50,
};

export const toolLimits = {
  exampleUrls: 10,
  robotsPreviewChars: 4_000,
  brokenLinkMax: 20,
  brokenLinkConcurrency: 2,
  imageBytes: 256_000,
};

export const fetchTool = createSafeFetcher({ limits: toolScanLimits });
