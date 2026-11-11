# Lumen — Live Visual Control

A React + TypeScript live visuals dashboard and locally rendered venue output, backed by authenticated cloud state and file storage.

See [SETUP.md](SETUP.md) for deployment, local development, controls, limitations, and the two-laptop acceptance test.

- `src/`: dashboard, venue setup, composition renderer, cached playback engine
- `worker/`: authenticated API, SSE state feed, uploads, pairing, transition gate
- `drizzle/`: persistent database migration
- `tests/`: state and real API checks
- `scripts/browser-qa.mjs`: end-to-end Edge test including fullscreen and offline video

Build: `npm ci` then `npm run build`.

Windows desktop application: see [DESKTOP.md](DESKTOP.md) for installation, local storage, and executable builds.
