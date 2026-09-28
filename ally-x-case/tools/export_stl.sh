#!/usr/bin/env bash
# Export every printable part to ./stl  (needs OpenSCAD on the PATH)
#   usage:  tools/export_stl.sh            (all parts + tests)
#           tools/export_stl.sh tests      (only the test-fit prints)
# Quality is forced to "final" for smooth curves.
set -e
cd "$(dirname "$0")/.."
OUT=${OUT:-stl}; mkdir -p "$OUT"
Q=${QUALITY:-final}   # QUALITY=draft tools/export_stl.sh  -> fast check export
OS=${OPENSCAD:-openscad}

run() {  # file outname [-D var=value ...]
  local f=$1 name=$2; shift 2
  echo ">> $name"
  "$OS" -o "$OUT/$name.stl" -D "QUALITY=\"$Q\"" "$@" "cad/$f" 2>&1 | grep -E "WARNING|ERROR" || true
}

if [ "$1" != "tests" ]; then
  run main_shell.scad shell_center             -D 'PART="center"'
  run main_shell.scad shell_cap_left           -D 'PART="cap_left"'
  run main_shell.scad shell_cap_right          -D 'PART="cap_right"'
  run main_shell.scad clips_set_PETG           -D 'PART="clip_set"'
  run main_shell.scad tpu_pads_TPU             -D 'PART="tpu_pad_set"'
  run kickstand.scad  kickstand                -D 'PART="kickstand"'
  run kickstand.scad  kickstand_foot_sleeve_TPU -D 'PART="foot_sleeve"'
  run hinge.scad      hinge_cheek_left         -D 'PART="cheek_left"'
  run hinge.scad      hinge_cheek_right        -D 'PART="cheek_right"'
  run hinge.scad      detent_strips_soft_med_firm_PETG -D 'PART="detent_strip_set"'
fi
run test_fit.scad test1_corner_bottom_right -D 'TEST=1' -D 'TEST1_CORNER="bottom"'
run test_fit.scad test1_corner_top_right    -D 'TEST=1' -D 'TEST1_CORNER="top"'
run test_fit.scad test2_snap_clip           -D 'TEST=2'
run test_fit.scad test3_top_edge_right      -D 'TEST=3' -D 'TEST3_SIDE="right"'
run test_fit.scad test3_top_edge_left       -D 'TEST=3' -D 'TEST3_SIDE="left"'
run test_fit.scad test4_pin_fit             -D 'TEST=4'
run test_fit.scad test5_hinge_mechanism     -D 'TEST=5'
run test_fit.scad test6_joint_keys          -D 'TEST=6'
echo "done -> $OUT/"
