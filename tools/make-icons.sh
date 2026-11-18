#!/bin/sh
# Render tools/icon.svg into the PNG icons the web app manifest uses.
# Needs ImageMagick (brew install imagemagick).
set -e
cd "$(dirname "$0")/.."
mkdir -p icons
for size in 512 192 180; do
  magick -background none -density 300 tools/icon.svg -resize "${size}x${size}" "icons/icon-$size.png"
done
# Root-level copies for things that look for icons at fixed paths without
# running the page's JavaScript (Amazon Kids web tiles, bookmarks, crawlers).
cp icons/icon-180.png apple-touch-icon.png
magick icons/icon-512.png -define icon:auto-resize=48,32,16 favicon.ico
echo "Wrote icons/icon-512.png, icon-192.png, icon-180.png, apple-touch-icon.png, favicon.ico"
