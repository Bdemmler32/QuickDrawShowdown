# Quick Draw Showdown — v0.02

A two-player Wild West quick-draw duel for one phone or tablet, packaged as an installable Progressive Web App (PWA). It is all static files. Every path is relative, so the folder works from a domain root or any subfolder (for example `https://example.com/games/quickdraw/`).

## What's in the folder

| File | Purpose |
| --- | --- |
| `index.html` | The whole game: markup, styles and script. Contains `APP_VERSION`. |
| `sw.js` | Service worker: offline cache and updates. Contains `VERSION`. |
| `manifest.webmanifest` | App name, colours, icons, standalone display. |
| `icons/icon-192.png`, `icons/icon-512.png` | Standard icons with rounded corners. |
| `icons/icon-maskable-512.png` | Full-bleed icon for Android adaptive shapes; hat and face sit inside the central 80%. |
| `icons/apple-touch-icon.png` | 180 × 180 full-bleed icon for the iOS home screen. |
| `favicon.svg`, `favicon-32.png` | Browser tab icons. |
| `tools/make-icons.js` | Dev-only script that redraws every icon with the game's own voxel renderer. You don't need to upload it. |

## Hosting

1. Upload the folder, minus `tools/` and this README if you like, to any static host: GitHub Pages, Netlify, Cloudflare Pages, S3 with CloudFront, nginx, Apache and so on.
2. **HTTPS is required.** Service workers and installation only work over HTTPS. The one exception is `http://localhost` for local testing.
3. Serve `.webmanifest` as `application/manifest+json`. Most hosts already do; if yours doesn't, add the MIME type.
4. Recommended: send `Cache-Control: no-cache` for `sw.js` and `index.html`. The app already registers with `updateViaCache: 'none'` and fetches shell files with `?v=VERSION`, so long HTTP caching won't break updates. Still, `no-cache` makes update checks prompt.

Local test:

```sh
cd quickdraw-pwa
python3 -m http.server 8080
# open http://localhost:8080/
```

Opening `index.html` straight from disk (`file://`) still plays the game, but without offline support or installation.

## Installing

**iPhone / iPad (Safari)**
1. Open the game's URL in Safari.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Launch it from the home-screen icon. It runs full screen with the status bar over the game, and it plays offline after the first launch.

**Android (Chrome, Edge, Samsung Internet)**
1. Open the URL.
2. Tap **Install app** in the banner, or open the **⋮** menu and choose **Install app** / **Add to Home screen**.
3. The icon adapts to your launcher's shape (circle, squircle and so on).

**Desktop (Chrome, Edge)**
1. Open the URL.
2. Click the install icon at the right end of the address bar, or open **⋮**, then **Cast, save and share**, then **Install page as app**.
3. The game opens in its own window. On a desktop, the A key controls the top player and the L key the bottom player.

## Sound on iPhone and iPad

iOS only lets a page start audio once a finger lifts off the screen, so sound switches on at the end of the first tap anywhere. On iOS 17 and later the game plays sound even when the ring/silent switch is set to silent, like most games. To silence it, use the speaker button in the game or **Sound** in the menu. On older iOS versions the silent switch also mutes the game.

## Shipping an update

1. Make your changes.
2. **Bump both version strings to the same value:**
   - `index.html`: `const APP_VERSION = '0.02';`
   - `sw.js`: `const VERSION = '0.02';`
3. If you added or renamed files, update the `SHELL` list in `sw.js`. If you added a CDN library, pin its exact versioned URL in the `CDN` list.
4. Deploy all files together.

What players see:
- Open copies check for updates at launch, when the app returns to the foreground, and every 30 minutes.
- The new version downloads in the background into its own cache, `quickdraw-0.02`. If any shell file fails to download, the update is abandoned and players keep the old version intact.
- A small **A NEW VERSION IS READY · UPDATE** banner appears only on the main menu or the pause menu, never during a duel.
- Tapping **Update** activates the new version and reloads into it. The old `quickdraw-0.01` cache is deleted.
- If nobody taps Update, the new version takes over the next time every copy of the app has been fully closed.

The version number appears at the bottom of the main menu and the pause menu.

## Caching rules (sw.js)

| Request | Strategy | Cache |
| --- | --- | --- |
| App shell (the files listed in `SHELL`, plus page navigations) | Cache-first, versioned, all-or-nothing | `quickdraw-<VERSION>` |
| Pinned CDN libraries (`CDN` list; none today) | Cache-first, best-effort precache | `quickdraw-cdn`, kept across versions |
| Web-font CSS (fonts.googleapis.com) | Stale-while-revalidate | `quickdraw-fonts`, kept across versions |
| Font files (fonts.gstatic.com) | Cache-first | `quickdraw-fonts` |
| Everything else | Network | — |

## Regenerating icons

```sh
npm i playwright
node tools/make-icons.js
```

The script loads `index.html` in headless Chromium and draws Redbeard with the game's voxel renderer over a pixel-art sunset. It then writes all of the icon files listed above.
