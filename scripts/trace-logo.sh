#!/usr/bin/env bash
# Turn a generated PNG into a clean SVG. Usage: scripts/trace-logo.sh public/logo-ideas/03.png public/logo.svg
set -e
python3 - "$1" "$2" <<'PY'
import sys, vtracer
vtracer.convert_image_to_svg_py(sys.argv[1], sys.argv[2], colormode="color", mode="polygon", filter_speckle=8, color_precision=4, corner_threshold=60, path_precision=2)
print("wrote", sys.argv[2])
PY
