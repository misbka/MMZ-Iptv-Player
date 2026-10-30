![](https://i.ibb.co/35zzbQct/a1.png)

# MMZ IPTV PLAYER

An IPTV player for **Windows and Linux**, built with **Electron + React + TypeScript**.

Dark Mode interface inspired by the **Claro TV+ / Claro Box TV** experience, featuring **keyboard and remote control navigation** (Smart TV / Android TV style).

![status](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue) ![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20Vite-orange)

---

## ✨ Features

- 📺 **Live TV, Movies (VOD), and Series** — categorized based on **the actual content of each stream**, not just the group name: video extensions (`mp4`, `mkv`...) and `/vod/` paths are classified as Movies/Series, while `m3u8`, `/live/`, `chunklist`, etc. remain Live TV, even if the group is named "Movies and Series" (a common issue with IPTV playlists).
- 🌐 **Multi-language support** — interface available in **Portuguese (Brazil), English, and Spanish**, including translated dates, times, and error messages. The selected language is saved in Preferences and also applied to messages from the main process.
- 🖱️ **Full mouse support** — in addition to keyboard/remote navigation, everything is clickable: hovering over a card moves the focus ring (clicks and arrow keys act on the same item), Home rows and the category bar have visible scrollbars, and the player includes channel-switching buttons. Focus is **never stolen** by a stationary pointer: it only follows the mouse when it moves.
- 📋 **M3U/M3U8 Playlist Manager** — add playlists via URL or local file; automatically parses names, logos, categories (`group`), and stream URLs, with **local caching** (works offline after the first load). **URLs without file extensions are supported** (`https://pastebin.com/raw/abc123`), and when something goes wrong, the app explains why (HTML page instead of a playlist, missing file, address without `http://`, network unavailable, etc.).
- 📅 **EPG (XMLTV)** — load an XML program guide from a URL or local file. Programs are matched to channels using `tvg-id`, displaying the **current and next programs** on cards, in the player, and in the full guide (press `G`).
- 🎬 **Built-in player** — HLS/m3u8 playback via `hls.js` (with worker support) and native media playback for MP4/MKV, featuring volume control, mute, fullscreen, a VOD progress bar, and **automatic reconnection** if a stream fails.
- ⚡ **Quick channel zapping** — switch channels using `↑` / `↓` directly in the player, without leaving fullscreen mode.
- 🎮 **Keyboard-first navigation** — the entire interface can be operated using arrow keys, `Enter`, and `Esc`, with clear visual focus (glowing ring), simulating the Smart TV experience — **without sacrificing mouse support**, as both input methods perform the same actions.
- 🚀 **High performance** — playlists containing thousands of channels are displayed using **virtualization** (`react-window`), rendering only visible cards.

## 🖥️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `↑ ↓ ← →` | Navigate menus, categories, and grids |
| `Enter` / `Space` | Open / play / pause |
| `Esc` | Go back (closes guide → exits fullscreen → closes player → clears search → sidebar menu) |
| `Tab` (in grid) | Focus the sidebar menu |
| Letters + `Backspace` | Incremental channel search |
| `↑ ↓` (in player) | **Channel zapping** — switch channels |
| `← →` (in player, VOD) | Rewind / fast-forward 10 seconds |
| `+` / `-` and `M` | Volume and mute |
| `G` | Channel program guide (EPG) |
| `I` | Channel/program information |
| `F` / `F11` | Fullscreen |

### 🖱️ Mouse Usage

- **Hovering** over a card, menu item, or category chip moves the focus ring — whatever you point at is what `Enter` will open.
- **Clicking** plays a channel/movie or opens a section, exactly like pressing `Enter`.
- **Drag / scroll** through Home rows and the category bar (visible scrollbars).
- Player buttons (mute, volume, fullscreen, information, channel switching) are clickable.
- Focus only follows the mouse when it **moves**: if you're navigating with the keyboard/remote and the pointer stays still over a card, nothing changes.

---

## 🌐 Language

Go to **Settings → Preferences → App Language** and choose **Português (Brasil)**, **English**, or **Español**. The interface, error messages, dates, and times are translated immediately, and your selection is saved for future sessions.

---

## 🛠️ Technology Stack

| Layer | Technology |
| --- | --- |
| Core | Electron (latest stable) + electron-vite |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Player | `hls.js` (HLS/m3u8) + native `<video>` |
| State Management | Zustand |
| M3U Parsing | `iptv-playlist-parser` (+ manual fallback parser) |
| XMLTV Parsing | `fast-xml-parser` |
| Virtualization | `react-window` |
| Build | electron-builder (NSIS on Windows, AppImage + deb on Linux) |

---

## 📦 Installation

Requirements: **Node.js 18+** (Node.js 20 LTS recommended) and **npm**.

```bash
# 1. Clone the repository
git clone <repository-url> mmz-iptv-player
cd mmz-iptv-player

# 2. Install dependencies
npm install
```

## ▶️ Development

```bash
npm run dev
```

Starts Electron with Hot Module Replacement (renderer) via `electron-vite`.

Useful commands:

```bash
npm run typecheck      # validates types (main + renderer)
npm test               # smoke tests (M3U/XMLTV parsers + services)
npm run test:e2e       # visual E2E test (opens the app; checks keyboard, mouse, VOD, and languages)
npm run test:e2e -- 9400   # same, using a different debug port (if 9380 is already in use)
npm run build          # generates the production bundle in ./out
npm run start          # runs the generated bundle (preview)
npm run icon           # regenerates build/icon.png (512x512)
```

> 💡 **Portable mode:** set the `MMZ_USER_DATA_DIR` environment variable to redirect the data directory (playlist and EPG cache). Useful for running the app from a USB drive or during testing.

## 📦 Build / Distribution

```bash
# Windows -> NSIS installer (.exe) in ./dist
npm run dist:win

# Linux -> AppImage and .deb in ./dist
npm run dist:linux

# Both platforms (requires compatible environments)
npm run dist
```

> The Windows build should be performed on a Windows machine (or with Wine properly configured).
> The `postinstall` script runs `electron-builder install-app-deps`, rebuilding native dependencies for the Electron version being used.

---

## 📖 Usage Instructions

### 1. Adding an M3U Playlist

1. Open **Settings** (gear icon in the sidebar).
2. Under **M3U Playlists**, enter a name (optional) and your playlist **URL** (`https://server.com/playlist.m3u`) — or click **Select local file** to use an `.m3u`/`.m3u8` file from your computer.
   - The URL **does not need to end in `.m3u`/`.m3u8`**: raw content URLs such as `https://pastebin.com/raw/VTgpRK2k` or `https://server.com/get.php?...` are also supported.
   - If the app cannot add the playlist, it explains why: the response is an **HTML page** (the URL does not point directly to the playlist), the **file does not exist**, the address is **missing `http://`**, or there is a network error.
3. Click **Add Playlist**. The app automatically parses the playlist and displays how many channels were loaded.
4. Channels appear under **Live TV**, **Movies**, and **Series**, automatically grouped according to the groups defined in the file.

> 💡 **Movies and Series only appear when the playlist actually contains VOD content.** Classification is based on each stream's format: an `m3u8` linear broadcast channel remains under **Live TV**, even if it belongs to a group named "Movies and Series". If your playlist mixes VOD content "hidden" inside live TV groups, enable **Settings → Preferences → Also show linear channels whose group indicates movies/series**.

> 💡 After the first load, data is cached in the user's data directory (`userData/mmz-data`), allowing the app to remain usable **offline**. Use **Refresh** to synchronize the playlist again.

### 2. Loading the EPG (Program Guide)

1. Go to **Settings → Program Guide (EPG)** and enter the **XMLTV URL** (supports `.xml` and `.xml.gz`) or select a local file.
2. Click **Load EPG**. The app displays the number of indexed channels and programs.
3. The interface cards will start displaying the **current program**, a progress bar, and the **next program**. In the player, press `I` for details or `G` to open the channel's full guide.

> Matching is performed using the `tvg-id` attribute from the XMLTV `<channel>`/`<programme>` tags and the `tvg-id` found in the M3U playlist's `#EXTINF` entries.

### 3. Watching Content

- **Home**: featured banner + category rows (navigate using the arrow keys and `Enter`, or point and click with the mouse).
- **Channels/Movies/Series**: use `← → ↑ ↓` on the category bar and grid; press `Enter` to play. With the mouse, hover over a card and click.
- In the player: `↑ ↓` switches channels (or use the ↕ buttons on the control bar), `G` opens the guide, and `Esc` goes back.

---

## 🧭 Project Structure

```text
mmz-iptv-player/
├── build/                       # icon and installer resources
├── scripts/
│   ├── generate-icon.js         # generates the PNG icon without dependencies
│   ├── run-tests.mjs            # compiles and runs smoke tests (npm test)
│   └── _test/                   # tests: parsers.test.ts, services.test.ts, e2e.mjs (visual)
├── src/
│   ├── main/                    # MAIN process (Electron)
│   │   ├── index.ts             # window creation, app lifecycle
│   │   ├── ipc.ts               # IPC handler registration
│   │   ├── services/
│   │   │   ├── storage.ts       # persistence (store.json, channel cache, compressed EPG)
│   │   │   ├── source.ts        # downloads/reads URLs and local files (+ retry with UA)
│   │   │   ├── playlist.ts      # M3U parsing, deduplication, and live/VOD/series detection
│   │   │   ├── i18n.ts          # translates error messages from the main process
│   │   │   └── epg.ts           # XMLTV parsing, now/next index, and schedule
│   │   └── types/
│   ├── preload/
│   │   ├── index.ts             # contextBridge -> window.mmz
│   │   └── index.d.ts
│   ├── renderer/                # RENDERER process (React)
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── channels/    # ChannelCard, ChannelGrid (virtualized), CategoryBar
│   │       │   ├── layout/      # Sidebar, TopBar
│   │       │   ├── player/      # PlayerOverlay (hls.js), GuideOverlay (EPG)
│   │       │   └── ui/          # Toast, EmptyState
│   │       ├── hooks/           # useKeyHandler, useAppKeys (global keyboard + EPG sync), useT (i18n)
│   │       ├── screens/         # Home, Content (channels/VOD/series), Settings
│   │       ├── store/           # Zustand + selectors
│   │       └── utils/           # time/EPG formatting
│   └── shared/                  # shared (isomorphic) types and utilities
│       ├── channel.ts           # live/VOD/series detection based on URL and group
│       ├── i18n.ts              # pt/en/es dictionaries + translate()
│       └── types.ts             # channel, EPG, and settings types
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── package.json
```

## 🔐 Security

- `contextIsolation: true` and `nodeIntegration: false`; the renderer accesses the system only through the `window.mmz` bridge exposed by the preload script.
- External links are opened in the system's default browser (`setWindowOpenHandler`).
- Restrictive CSP in `index.html`.

## ❓ Troubleshooting

| Issue | Solution |
| --- | --- |
| Stream won't load | Check whether the URL opens in a browser; many servers require a specific network/VPN. The app automatically attempts to reconnect 4 times. |
| *"The URL responded, but the content does not appear to be an M3U/M3U8 playlist"* | The response was an **HTML page** (login page, index page, or error page), not the playlist content. Use the direct file link (on sites like Pastebin, use the `/raw/` URL). |
| *"Unrecognized address"* | Enter a complete URL starting with `http://`/`https://`, or select a local file. |
| *"File not found"* | The local path does not exist (the file may have been moved or renamed). Select it again. |
| Movies/Series tab is empty | The playlist probably does not contain VOD content — this is expected. If VOD streams are inside live TV groups, enable the **Also show linear channels whose group indicates movies/series** preference. |
| Interface is in another language | Go to **Settings → Preferences → App Language** (Português (Brasil), English, Español). |
| EPG is empty | Check whether the M3U playlist's `tvg-id` exists among the XMLTV `<channel id="...">` entries. |
| No logos | Some playlists use broken URLs; the app automatically displays the channel initials instead. |
| Playlist is too large | The grid is virtualized; however, playlists with more than 20k channels may still take a few seconds to parse the first time. |
| `npm run dist:win` fails with *"Cannot create symbolic link"* | The `winCodeSign` cache used by electron-builder extracts symlinks. Enable **Windows Developer Mode** (Settings → Privacy → For developers) or run the terminal as Administrator and try again. This does not occur on Linux. |

## 📄 License

MIT © MMZ
