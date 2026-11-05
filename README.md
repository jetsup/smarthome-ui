# smarthome-ui

Vue 3 + Vite web dashboard for the SmartHome hub: gateways, nodes (modules, NeoPixel patterns, sensors), automation rules, displays and their appearance, profile/two-step verification, activity log.

In production it is **not run separately**: you build it once and the `smarthome-hub` Go server serves the built files (`dist/`) on the same port as the API, so no URL needs configuring.

## Installation

Requires **Node.js 18+**.

```bash
npm install
npm run build          # writes dist/ — the hub finds ../smarthome-ui/dist automatically
```

Then start the hub (`../smarthome-hub/README.md`) and open `http://<HUB_IP>:9000`. Rebuild (`npm run build`) after every change to the UI; no hub restart is needed.

If the hub runs from another folder, point it at the build with `UI_DIR=/path/to/smarthome-ui/dist` in the hub's `.env`.

## Development with hot reload

```bash
npm run dev            # http://localhost:5173
```

The page calls `/api` on its own origin by default, which the dev server does not have. Point it at your hub with an environment variable:

```bash
VITE_API_URL=http://<HUB_IP>:9000/api npm run dev
```

and make sure the hub allows the dev origin (`CORS_ORIGINS`, default `http://localhost:5173`). Or just build and use the hub's own address.

## ⚠️ Things to check

| What | Where | Notes |
|---|---|---|
| `VITE_API_URL` | shell env / `.env.local` (dev server only) | the built UI uses the page's own address and needs no change |
| `CORS_ORIGINS` | hub `.env` | add your dev origin if it is not `http://localhost:5173` |
| `UI_DIR` | hub `.env` | only if the hub cannot find `../smarthome-ui/dist` |

## Structure

- `src/views/` pages, `src/components/` shared parts (dialog host, capability editor, rules panel…), `src/services/` API/catalog/dialog helpers, `src/theme.css` colours and custom scrollbars (light/dark follow the system).
- Module forms and controls are generated from the hub's `/api/capabilities/catalog`, so new hardware types need no UI work.
