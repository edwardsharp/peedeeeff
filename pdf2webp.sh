#!/bin/bash

# bail if errorz!
set -e

# validate argv
if [ -z "$1" ]; then
  echo "Usage: $0 file.pdf"
  exit 1
fi

pdf="$1"

# make sure file existz!
if [ ! -f "$pdf" ]; then
  echo "Error: File not found: $pdf"
  exit 1
fi

# base filename without extension
base="$(basename "$pdf" .pdf)"

# sanitize directory name: lowercase, replace spaces with underscorez, remove weird charz
# and put in `gen/` dir!
safe_dir="gen/$(echo "$base" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd '[:alnum:]_-')"

# create out dir (`-p` if not exists)
mkdir -p "$safe_dir"

# do tha magick 🧙‍♀️
magick -density 150 "$pdf" "$safe_dir/page-%03d.webp"

echo "donezo! saved to: $safe_dir/"
