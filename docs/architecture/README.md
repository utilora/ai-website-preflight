# Architecture

AI Website Preflight is a single Next.js 15 application with a process-local scan worker and a lighter free-tool runner. In production the public path is Internet → Nginx/Caddy → `127.0.0.1:3000` → Next.js → SQLite.

The current approved stage is Phase 07 (production deployment). Scan execution is not a durable queue: restarting the process does not recover `queued` or `running` scans. IP rate limits ignore client forwarding headers unless `TRUST_PROXY_HEADERS=true` and the reverse proxy overwrites `X-Forwarded-For` / `X-Real-IP`. GitHub Actions is CI only.
