# PEE-DEE-EFF

just a lil' pdf -> webp converter & carousel web-component for viewing!

## quickstart

open `index.html` in your browser! get a handle on the different view options by fiddle'n with the controlz.

### gen your own

```sh
./pdf2webp.sh path/to/some.pdf
```

now there should be .webp files in `gen/` (one for each page of yr pdf).

edit `really-simple.html` and change the `base-path="gen/whatever-folder-of-webp-images"`

note: .webp images need to follow format `page-000.web` (where 000 is the page number).

if u wanna use this, copy `pee-dee-eff.js` to where ever you host yr other stuff. then on whatever page include the web-component tag and a `<script />` (u could just copy/paste pee-dee-eff.js and inline it in a `<script>` on yr page) like:

```html

<pee-dee-eff
    base-path="example/undoinganddoing"
    pages-per-view="4"
    direction="horizontal"
    loop="true"
    1up-first-and-last="false"
    background="black"
>
    <div
        class="scroll-message"
        slot="scroll-message"
        title="i'm scrollin' ovah heeeere!"
    >
        scroll down 👇
    </div>
</pee-dee-eff>


<script src="pee-dee-eff.js"></script>
```

### web component props

| attribute            | type      | options / example values       | default        | required | description                                                                              |
| -------------------- | --------- | ------------------------------ | -------------- | -------- | ---------------------------------------------------------------------------------------- |
| `base-path`          | `string`  | `"./slides"`, `"assets/pdf1"`  | `"."`          | No       | Directory where image files like `page-000.webp`, `page-001.webp`, etc. are loaded from. |
| `pages-per-view`     | `number`  | `1`, `2`, `4`, `6`, etc.       | `2`            | No       | Number of images shown per slide. Determines the grid layout automatically.              |
| `direction`          | `string`  | `"horizontal"`, `"vertical"`   | `"horizontal"` | No       | Chooses between swipe-to-slide and scroll-down-to-browse modes.                          |
| `loop`               | `boolean` | `"true"`                       | `false`        | No       | Whether to loop back to the first slide after the last one, and vice versa.              |
| `1up-first-and-last` | `boolean` | `"true"`                       | `false`        | No       | Not currently used in logic, but may be intended for showing single pages at start/end.  |
| `background`         | `string`  | `"white"`, `"#000"`, `"black"` | `"white"`      | No       | Background color of each image cell in the grid.                                         |


## offline cache

The app now supports offline caching for better performance and offline viewing! 

### cache features

- **Service Worker**: Automatically caches images as you view them
- **Bulk Cache**: Cache all images at once via the CACHE tab in the UI
- **Persistent Storage**: Requests persistent storage for longer cache retention
- **PWA Support**: Add to home screen on mobile for app-like experience

### using the cache

1. Open the app and click the **CACHE** tab in the navigation
2. Click **"Cache All Images"** to download and cache all .webp files
3. The app will discover all images dynamically (just like the carousel does)
4. Once cached, images load instantly and work offline
5. Click **"Clear Cache"** to remove all cached images

### storage info

- The cache uses the browser's Cache API (not localStorage or IndexedDB)
- Storage usage is shown as a percentage in the cache panel
- On iOS Safari, add to home screen for better cache persistence
- The app requests persistent storage automatically for longer retention

### pwa features

- Web App Manifest for "Add to Home Screen" support
- Standalone display mode when launched from home screen
- Offline-first image loading with network fallback
- Background caching of images as you browse

### generating icons & favicon

The app includes an SVG icon, but for better PWA support you may want PNG icons:

1. Open `generate-icons.html` in your browser
2. Click the download buttons to get `icon-192.png` and `icon-512.png`
3. Update `manifest.json` to reference the PNG files instead of the SVG

For the favicon:

1. Open `generate-favicon.html` in your browser 🥹
2. Preview different sizes (16x16, 32x32, 48x48)
3. Download `favicon.ico` and PNG variants
4. The favicon uses "P" for 16px, "PDF" for 32px, and "PEE/DEE/EFF" for larger sizes

For immediate use, `favicon-data-url.js` creates a data URL favicon that can be applied instantly.

Alternatively, use the `create-icon.js` script in a browser console to generate data URLs.

---
made with 💖 in nyc
