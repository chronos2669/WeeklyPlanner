# Weekly Planner

A sleek, interactive weekly planner desktop app. Seven days of the week with nested tasks, weekly goals, drag-to-reorder, and a landscape A4 PNG export. All data persists locally.

## Prerequisites

- **Node.js 18 or newer** — download from https://nodejs.org
- **npm** (comes with Node.js)

Verify with:
```
node --version
npm --version
```

## First-time setup

From inside this project folder:

```
npm install
```

This downloads all dependencies (Electron, React, Vite, etc.) into `node_modules/`. Takes a minute or two.

## Running in development

```
npm run dev
```

This starts the Vite dev server and opens the Electron window pointing at it. Changes to source files hot-reload automatically. DevTools open in a detached window.

## Running the built app (no packaging)

```
npm run build
npm start
```

`build` bundles the React app into `dist/`. `start` launches Electron pointing at the built files.

## Packaging into an installer

The commands below produce a distributable installer in the `release/` folder.

**Important caveat:** you build for the OS you're running on. You cannot build a `.exe` on macOS without extra setup (cross-compilation is possible with `wine`, but fiddly). Build Windows installers on Windows, Mac `.dmg` files on Mac, and so on.

### Windows

```
npm run package:win
```

Produces `release/Weekly Planner-1.0.0-Setup.exe` — a standard Windows installer (NSIS) with a Start Menu entry and optional desktop shortcut. Installed size is ~200 MB because Electron bundles Chromium.

### macOS

```
npm run package:mac
```

Produces `release/Weekly Planner-1.0.0.dmg`. For distribution beyond your own machine you'd need an Apple Developer certificate to sign and notarize, but for personal use the unsigned `.dmg` works fine (Gatekeeper will ask you to right-click → Open the first time).

### Linux

```
npm run package:linux
```

Produces `release/Weekly Planner-1.0.0.AppImage` — a portable executable that runs on most Linux distros. Make it executable with `chmod +x` and double-click.

### All three at once

```
npm run package
```

Builds whatever targets your OS supports.

## Project structure

```
weekly-planner/
├── electron/
│   ├── main.js         # Electron main process — creates the window
│   └── preload.js      # (empty, reserved for future IPC)
├── src/
│   ├── main.jsx        # React entry
│   └── WeeklyPlanner.jsx  # The whole app component
├── index.html          # Vite HTML entry
├── vite.config.js      # Vite build config
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## How persistence works

Tasks and weekly goals are saved to `localStorage` under these keys:

- `weekly-planner:tasks-v1` — the seven-day tasks object
- `weekly-planner:goals-v1` — the weekly goals array

Saves happen automatically whenever you change anything. Electron stores localStorage in a Chromium profile on disk, so your data survives app restarts, reinstalls of the same app, and OS reboots.

**Where the data lives on disk:**
- **Windows:** `%APPDATA%\Weekly Planner\`
- **macOS:** `~/Library/Application Support/Weekly Planner/`
- **Linux:** `~/.config/Weekly Planner/`

To wipe everything and start fresh, delete that folder.

## Customizing the icon

Drop a file called `icon.png` (512×512 or larger), `icon.icns` (macOS), or `icon.ico` (Windows) into the `build/` folder. `electron-builder` will pick it up automatically on the next package run.

## Troubleshooting

**`npm install` fails with native module errors** — most likely a missing build toolchain. On Windows install "Desktop development with C++" from Visual Studio Installer; on macOS run `xcode-select --install`; on Linux install `build-essential`.

**The packaged app shows a blank screen** — check that `vite.config.js` has `base: "./"`. Absolute paths break inside Electron's `file://` protocol.

**DevTools won't open in the packaged app** — by design; they only open in dev mode. Remove the `if (isDev)` guard in `electron/main.js` if you need them in production.
