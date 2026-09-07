# Architecture

AI Website Preflight is a single Next.js 15 application with a process-local scan worker and a lighter free-tool runner. Public URL scans are normalized, SSRF-checked, queued, and executed with a conservative in-process concurrency cap. Findings, Ready Score, and Fix Pack Markdown are derived from stored scan evidence. Free tools reuse the same safe fetch and return ephemeral JSON to the tool page.

The current approved stage is Phase 06 (SEO acquisition tools). Scan execution is not a durable queue: restarting the process does not recover `queued` or `running` scans. IP rate limits ignore client forwarding headers unless `TRUST_PROXY_HEADERS=true` and the reverse proxy overwrites `X-Forwarded-For` / `X-Real-IP`.
