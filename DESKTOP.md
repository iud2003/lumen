# Lumen Desktop for Windows

Run `Lumen-Setup-1.3.1.exe` to install the application and create desktop and Start menu shortcuts. Alternatively, run `Lumen-Portable-1.3.1.exe` without installing. Both builds include their own runtime: Node.js, XAMPP, and a browser are not required on the target computer.

The black dashboard opens as a Windows application. Connect your second display in Windows **Extend** mode, then click **Extended Screen**. A separate native output window opens fullscreen on the secondary display while the editing dashboard stays on the primary display. Press **Esc** in the output to close it. Upload and drag media, edit layers, and click a clip thumbnail to play it in Composition, or click its title to preview it separately.

Shows and uploaded files are stored in `%APPDATA%\Lumen Desktop\data`. They remain there across updates and application restarts, including when using the portable executable. Use **File → Open data folder** to find them. Close the app before copying that folder for a backup. The desktop workspace works offline and is separate from the hosted website's cloud workspace.

## Build from source

```powershell
npm ci
npm run desktop
npm run desktop:package
```

`npm run desktop` builds the client and starts Electron. `npm run desktop:package` builds the client and produces the Windows installer and portable executable in `desktop-release/studio-1.3.1/`. `npm run desktop:unpacked` builds an unpacked Windows application for testing.

The application starts its own authenticated server on `127.0.0.1:18787`. Its local SQLite database and filesystem media adapter reuse the existing API and state validation. The hosted and browser versions remain available through their existing build and development commands.

## Import this computer's browser workspace

With the existing development website running on port 8787, close Lumen Desktop and run:

```powershell
npm run desktop:import
```

The importer copies shows and uploaded media into desktop storage. Existing desktop show IDs are skipped; the browser workspace is preserved.

## Verification

`npm test` includes desktop storage persistence, upload, byte-range playback, and local request authorization checks. The native two-display smoke check can run with isolated storage:

```powershell
node desktop/launch.cjs --desktop-smoke --desktop-data=outputs/desktop-smoke
```

It opens test windows, verifies real video playback and the output heartbeat, writes `outputs/desktop-smoke/smoke-result.json`, and exits. If a second display is available, the test uses it; otherwise the test records that limitation and checks playback on the primary display. Normal use requires a second display in Extend mode for Extended Screen.

## Studio 1.1 workspace

Performance provides an eight-column clip launcher, column cueing, a persistent layer inspector, transform and blend controls, and staged brightness, contrast, and saturation effects.

Output Mapping provides up to 32 rectangular slices on one processor canvas. Configure input crops and output regions in pixels, drag to move, resize with the corner handle, rotate, flip, enable or disable slices, and generate common LED wall layouts. Export and import JSON presets to reuse layouts. Save a mapping to Preview, then Take Live to apply it. Numbered test patterns use the same staged workflow. The software mapping does not configure receiving cards or processor wiring.

`npm run test:studio` verifies real browser interactions and pixel output against an isolated local workspace, including mapped media, flips, color correction, staging, and mobile layouts. It uses the installed Microsoft Edge browser and writes screenshots to `qa-output/`.

## Studio 1.2 columns

Use + Column to expand a composition from the default eight columns up to 64. Open a column?s arrow menu or right-click its header to rename, color-tag, duplicate, move, clear, or remove it. Drag headers to reorder all matching clip slots together. Click a header to cue its clips across all layers, then Take Live to apply. Clearing slots or removing columns preserves the currently cued and live clips and the media library.

The deck offers Compact and Comfortable sizing and a monitor visibility toggle. Layer controls stay fixed while scrolling horizontally through columns. Existing compositions retain their clips and gain column metadata only when edited.

## Studio 1.3 direct-live workflow

Clip thumbnails launch in Composition immediately. Clip titles select media for Preview only. Column launchers play the populated slots across layers. The Take Live button is removed.

Layer opacity, volume, transform, blend, color, pause, mute, loop, Fit/Fill, and blackout controls update the live layer as they change. Layer parameters are shared with Preview, but changing a Preview clip does not replace the live clip. Numeric values update while typing a valid value, and sliders send coalesced live adjustments while dragging. Native output receives committed changes directly over desktop IPC; same-media parameter edits preserve the existing video element and playback position.

Each layer row has Fit and Fill buttons. Test Card (keyboard T) toggles the live calibration pattern without clearing media or restarting videos. Mapping edits autosave directly to output. Live clip launches still wait for assets to decode at the output, keeping the prior composition visible while loading.

The recommended AI chat design is described in [AI-COPILOT.md](AI-COPILOT.md).

## Lumen Split Signal test card

Test Card now displays a custom resolution-aware Lumen design: canvas width and height in pixels, reduced aspect ratio, megapixel count, an LKT clock and animated pulse, alignment circle and diagonals, grid and safe-area guides, corner pixel coordinates, chroma ramps, pure RGB/CMY patches, 16 grayscale levels, and a one-pixel cadence strip. The main resolution is the composition canvas size; mapped slice labels show destination dimensions.

The card is drawn at native canvas resolution and adapts to wide or portrait layouts. Static geometry is cached; clock and pulse updates stay live. Use `npm run test:card` to verify several canvas shapes and export PNG examples into `outputs/test-cards/`.
