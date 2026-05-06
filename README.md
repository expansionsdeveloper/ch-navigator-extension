# CH Navigator

Chrome extension that adds quick navigation links into the Sitecore Content Hub tenant of the current tab.

## Install (dev)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Pin the extension and click it on any Content Hub tab

## How it works

- Reads the active tab's URL.
- If the host matches a Content Hub pattern (see `links.js` → `CH_HOST_PATTERNS`), the popup builds links as `${origin}${path}` and opens them in a new tab.
- Otherwise it shows a "open this on a CH tab" hint.

## Editing the link list

All paths live in [`links.js`](./links.js). Add/remove/rename items in the `SECTIONS` array. Reload the extension in `chrome://extensions` to pick up changes.

## Banners

`banners.js` is a stub. Drop images into `banners/`, fill `BANNERS` with `{ image, href }` entries, and replace the single-image render with a slider when you need rotation.

## Icons

`icons/icon{16,48,128}.png` are placeholder solid-blue squares — replace with real artwork.
