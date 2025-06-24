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

if u wanna use this, copy `peedeeeff.js` to where ever you host yr other stuff. then on whatever page include the web-component tag and a `<script />` (u could just copy/paste peedeeeff.js and inline it in a `<script>` on yr page) like:

```html
<pee-dee-eff
    last-page="6"
    base-path="example/undoinganddoing"
    loop="false"
    background="white"
    single-boundary="false"
    scroll-mode="false"
    horizontal-scroll-mode="false"
>
    <div
        class="scroll-message"
        slot="scroll-message"
        title="i'm scrollin' ovah heeeere!"
    >
        scroll down 👇
    </div>
</pee-dee-eff>

<script src="peedeeeff.js"></script>
```

---
made with 💖 in nyc
