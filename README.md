# PEE-DEE-EFF

just a lil' pdf -> webp converter & carousel web-component for viewing!

 ![P E E  D E E  E F F](icon.png)

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
    first-last-single="false"
    background="black"
>
</pee-dee-eff>

<script src="pee-dee-eff.js"></script>
```

### web component props

| attribute            | type      | options / example values          | default        | required | description                                                                              |
| -------------------- | --------- | --------------------------------- | -------------- | -------- | ---------------------------------------------------------------------------------------- |
| `base-path`          | `string`  | `"./examples/undoinganddoing"`    | `"."`          | yes      | directory where image files like `page-000.webp`, `page-001.webp`, etc. are loaded from. |
| `pages-per-view`     | `number`  | `1`, `2`, `4`, `6`, etc.          | `2`            | no       | number of images shown per slide. determines the grid layout automatically.              |
| `direction`          | `string`  | `"horizontal"`, `"vertical"`      | `"horizontal"` | no       | chooses between swipe-to-slide and scroll-down-to-browse modes.                          |
| `loop`               | `boolean` | `"true"`                          | `false`        | no       | whether to loop back to the first slide after the last one, and vice versa.              |
| `first-last-single` | `boolean` | `"true"`                          | `false`        | no       | not currently used in logic, but may be intended for showing single pages at start/end.  |
| `background`         | `string`  | `"white"`, `"#eeddee"`, `"black"` | `"white"`      | no       | background color of each image cell in the grid.                                         |

### pwa && cache

- web app Mmanifest for "Add to Home Screen" support
- offline-first image loading with network fallback
- background caching of images as they load

### generating icons & favicon

a lil' icon generator:

1. open `generate-icons.html`
2. open `generate-favicon.html`
2. download png and favicon! 🥹

---
made with 💖 in nyc
