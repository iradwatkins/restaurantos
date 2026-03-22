#!/bin/bash
# Generate placeholder PWA icons using ImageMagick if available
# Otherwise these should be replaced with actual restaurant icons
for size in 192 512; do
  if command -v convert &> /dev/null; then
    convert -size ${size}x${size} xc:'#4f46e5' -fill white -gravity center \
      -pointsize $((size/4)) -annotate 0 'ROS' \
      "$(dirname "$0")/icon-${size}.png"
  fi
done
