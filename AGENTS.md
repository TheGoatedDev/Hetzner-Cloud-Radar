<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy

Push to `main` deploys the app via GitHub Actions CD (`.github/workflows/cd.yml` → `pnpm cf:deploy`). No manual `wrangler deploy` unless CD broken or emergency.
