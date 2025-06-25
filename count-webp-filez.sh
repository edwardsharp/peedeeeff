#!/bin/bash

parent_dir="geozone"

# cha-check it!
if [ ! -d "$parent_dir" ]; then
  echo "owut? that dir not found, yo: $parent_dir"
  exit 1
fi

# ready bootz? well start walkin'!
find "$parent_dir" -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
  count=$(find "$dir" -type f -name "*.webp" | wc -l)
  count=$((count > 0 ? count - 1 : 0))  # subtract 1 but don't go below 0
  echo "[\"$parent_dir/$(basename "$dir")\", $count],"
done
