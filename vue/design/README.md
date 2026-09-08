# Brand assets

`logo-icon.svg` is the master app mark: the "diver in trim" figure (from
`public/leaflet/diver-trim.svg`, recoloured white) inside a `#0b1220` disc — the
same navy as the PWA `theme_color` / `background_color`.

Nothing here is served or bundled. Regenerate the app icons from it with
ImageMagick (`brew install imagemagick`):

```sh
cd vue
SVG=design/logo-icon.svg
magick -background none -density 640 "$SVG" -resize 1024x1024 /tmp/logo-hi.png

# round badges (transparent corners)
magick /tmp/logo-hi.png -resize 512x512 -depth 8 -strip public/images/logo.png
magick /tmp/logo-hi.png -resize 512x512 -depth 8 -strip public/pwa/pwa-512x512.png
magick /tmp/logo-hi.png -resize 192x192 -depth 8 -strip public/pwa/pwa-192x192.png
magick /tmp/logo-hi.png -resize 64x64  -channel A -morphology Close Disk:1  +channel -depth 8 -strip public/pwa/pwa-64x64.png
magick /tmp/logo-hi.png -resize 32x32  -channel A -morphology Close Disk:1  +channel -depth 8 -strip public/images/logo_32x32.png
magick /tmp/logo-hi.png -resize 256x256 -depth 8 -strip -define webp:lossless=true public/images/logo_with_name.webp

# favicon (multi-res, thickened at small sizes)
for s in 16 32 48; do magick /tmp/logo-hi.png -resize ${s}x${s} -channel A -morphology Close Disk:1.5 +channel /tmp/fav$s.png; done
magick /tmp/fav16.png /tmp/fav32.png /tmp/fav48.png public/favicon.ico

# opaque navy square variants (iOS masks corners; Android masks the maskable one)
magick -size 180x180 xc:'#0b1220' \( /tmp/logo-hi.png -resize 180x180 \) -composite -depth 8 -strip public/pwa/apple-touch-icon-180x180.png
magick -size 512x512 xc:'#0b1220' \( /tmp/logo-hi.png -resize 328x328 \) -gravity center -composite -depth 8 -strip public/pwa/maskable-icon-512x512.png
```
