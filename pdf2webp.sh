#!/bin/bash

# bail if errorz!
set -e

# validate argv
if [ -z "$1" ]; then
  echo "Usage: $0 file.pdf | directory/"
  exit 1
fi

input="$1"

# function to process a single PDF file
process_pdf() {
  local pdf="$1"
  echo "Processing: $pdf"

  # make sure file existz!
  if [ ! -f "$pdf" ]; then
    echo "Error: File not found: $pdf"
    return 1
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
}

if [ -d "$input" ]; then
  echo "dir mode: walking recursively $input..."
  find "$input" -type f -name "*.pdf" | while IFS= read -r pdf; do
    process_pdf "$pdf"
  done
elif [ -f "$input" ]; then
  process_pdf "$input"
else
  echo "onoz error: not a valid file or directory? 👉 $input"
  exit 1
fi
