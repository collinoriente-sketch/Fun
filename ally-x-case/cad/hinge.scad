// =====================================================================
//  ROG Xbox Ally X  -  KICKSTAND HINGE COMPONENTS
//  hinge.scad
//
//  Dimensions: params.scad section 9 (HINGE)
//     hinge_pin_diameter (3.0 = M3 bolt / 3 mm rod), pin_bolt_length,
//     pin_clearance_rot, pin_clearance_snug, knuckle_gap,
//     detent_strip_t, detent_notch_depth, detent_preload ...
//
//  Parts
//    cheek_left / cheek_right : bolted to the shell (4x M3x10 CSK + nuts)
//    detent_strip             : replaceable PETG leaf spring (the "click")
//    detent_strip_set         : soft / medium / firm strips
//    pin_rod_caps             : only if you use a plain 3 mm rod
//    friction_washers         : optional TPU washers
//
//  EXPORT: choose PART, F6, F7. Parts are placed in print orientation.
// =====================================================================

include <params.scad>
include <lib/all.scad>

/* [Part to render] */
// preview | cheek_left | cheek_right | cheeks_pair | detent_strip | detent_strip_set | pin_rod_caps | friction_washers
PART = "preview";

module cheek_right_print() { translate([0, 0, X_CHEEK_OUT]) rotate([0, 90, 0]) hinge_cheek(); }
module cheek_left_print()  { translate([0, 0, X_CHEEK_OUT]) rotate([0, -90, 0]) mirror([1, 0, 0]) hinge_cheek(); }
// strip stands on its long edge: bending happens in the layer plane
module strip_print(t = detent_strip_t) { translate([0, -STRIP_Y0, detent_strip_w / 2]) detent_strip(t); }

if (PART == "preview") {
    hinge_cheeks(); detent_strip(); hinge_pin();
    kickstand_k();
    if (DEBUG_MODE) %translate([-40, -60, -HA - T]) cube([80, 90, T]);
}
else if (PART == "cheek_right")      cheek_right_print();
else if (PART == "cheek_left")       cheek_left_print();
else if (PART == "cheeks_pair")      { cheek_right_print(); translate([0, cheek_len + 12, 0]) cheek_left_print(); }
else if (PART == "detent_strip")     strip_print();
else if (PART == "detent_strip_set")
    for (i = [0 : 2]) translate([0, i * 8, 0]) strip_print(detent_strip_t - 0.2 + i * 0.2);
else if (PART == "pin_rod_caps")     for (i = [0, 1]) translate([i * 9, 0, 0]) pin_rod_cap();
else if (PART == "friction_washers") for (i = [0 : 3]) translate([i * 10, 0, 0]) friction_washer();

hinge_report();
