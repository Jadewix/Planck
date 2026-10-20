# Planck

Planck's agency portfolio: mobile development, web applications, and UI/UX web design. A static website built with semantic HTML, CSS, and small JavaScript modules. No database, API keys, or application server is required.

## Develop

Use Node.js 24 (the tested version is pinned in `.node-version`).

```sh
npm ci
npm run dev
```

Vite serves the site on port 5173. Edit `index.html` for copy and portfolio entries, `src/styles/site.css` for presentation, and `src/scripts/` for interactions. Files in `public/` are copied into the build unchanged.

```text
index.html                 Accessible page content and SEO metadata
src/main.js                Application entry point
src/scripts/navigation.js  Menu, focus management, and section navigation
src/scripts/motion.js      One-time reveals and scroll-linked project previews
src/scripts/particles.js   Hero-only particle logo with a bounded rendering budget
src/styles/site.css        Responsive styles and reduced-motion rules
public/images/             Optimized project screenshots
public/logo.svg            Brand mark
public/_headers            Cloudflare asset response headers
public/404.html             Real 404 response content
wrangler.jsonc             Cloudflare Workers static asset configuration
tests/                    Desktop and mobile browser checks
```

## Build and validate

```sh
npm run build
npm run preview
```

The production build is written to `dist/`; do not commit this folder. To test Cloudflare's actual local static asset runtime, use `npm run worker:dev` (port 8787).

```sh
npx playwright install --with-deps chromium
npm test
```

Build before running browser tests. Playwright starts the Vite production preview itself. The suite covers image loading, horizontal overflow, menu focus and Escape behavior, service accordions, one-time reveals, scroll-linked previews, live reduced-motion preferences, and content without JavaScript. The mobile project uses Chromium with iPhone viewport/touch settings; it is not a WebKit/Safari certification.

To use a preinstalled Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. To test an already-running Workers instance, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8787` before `npm test`. CI runs the production build and browser suite for pushes and pull requests.

## Deploy through Cloudflare Workers Builds

In Cloudflare, create a **Worker** connected to `Jadewix/Planck` and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root (`/`) |
| Worker name | `planck-website` (must match `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `24.19.0` (or a compatible Node 24 release) |

Cloudflare installs dependencies from `package-lock.json`. Set `NODE_VERSION=24.19.0` in build variables if needed. The deploy command reads `wrangler.jsonc` and uploads `dist/` as Workers static assets. This configuration intentionally needs no Worker entry script or database binding. If the dashboard asks for a static output folder, it is `dist`, but Workers deployment uses Wrangler's `assets.directory` setting.

Use a production branch build for the first deployment. If Cloudflare enables non-production branch deployments, disable them initially or configure the branch deploy command as `npx wrangler deploy` with a separate preview Worker name; do not use a Pages deployment command for this project.

Cloudflare supplies deployment credentials through its repository integration. Do not commit tokens or `.env` files. This repository has only been tested locally; connecting the repository, deploying, and configuring a custom domain are manual Cloudflare steps.

## Motion and content

- Headings and service rows reveal once. They remain visible when scrolling back; there are no competing observers resetting them.
- Project previews move through the long screenshots in response to scrolling. They do not run an independent endless auto-scroll.
- The particle logo is contained in the hero. It stops rendering offscreen and when the tab is hidden, and becomes static when reduced motion is requested.
- Content remains readable without JavaScript. Reduced-motion preferences are honored at startup and when changed while the page is open.
- The original designer export is preserved in the first Git commit. Current assets are optimized WebP versions of the supplied screenshots; unused export images were removed from the deployed tree.

The contact link opens an email to `plancksoftware@gmail.com`. There is no server-side form or inbox integration. Verify project descriptions, external links, and the upcoming-project list before publishing. Add canonical and social image URLs once the production domain is known; no domain or contact details have been invented.
