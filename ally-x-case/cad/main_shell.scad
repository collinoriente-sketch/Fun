// =====================================================================
//  ROG Xbox Ally X  -  PROTECTIVE SHELL
//  main_shell.scad
//
//  ALL DIMENSIONS LIVE IN params.scad (included below) - edit them there
//  so the shell, kickstand, hinge and test prints always stay in sync.
//  The most important ones, for quick reference:
//     device_width / device_height / device_depth      [SPEC]
//     body_depth, body_bottom_y, grip_*                [MEASURE]
//     wall_clearance, snap_clearance, joint_clearance  [TEST]
//     shell_thickness, corner_boost, edge_wrap         [DESIGN]
//
//  Modules (lib/shell_lib.scad): shell(), rear_shell(), front_shell(),
//  vent_cutouts(), button_clearances(), port_cutouts(), mounting_clips(),
//  plus kickstand(), hinge() from lib/all.scad.
//
//  EXPORT: choose PART, press F6 (Render), then F7 (Export STL).
//  Parts are already placed in their recommended print orientation.
// =====================================================================

include <params.scad>
include <lib/all.scad>

/* [Part to render] */
// preview | center | cap_left | cap_right | one_piece | clip | clip_set | tpu_pad | tpu_pad_set
PART = "preview";
// clip variant lip gap (mm) for PART = "clip" - leave at clip_lip_gap normally
CLIP_GAP = 0.05;

// ---------------------------------------------------------------------
if (PART == "preview") {
    shell();
    kickstand_assembly(0);
    if (DEBUG_MODE) debug_overlay();
}
else if (PART == "center") {
    // back plate down on the bed
    translate([0, 0, -Z_BACK_OUT]) shell_center();
}
else if (PART == "cap_right") {
    // standing on its flat outer end
    translate([0, 0, W / 2 + CT]) rotate([0, 90, 0]) shell_cap_right();
}
else if (PART == "cap_left") {
    translate([0, 0, W / 2 + CT]) rotate([0, -90, 0]) shell_cap_left();
}
else if (PART == "one_piece") {
    // only for beds >= 300 mm. Front rim down; needs supports under the back.
    translate([0, 0, wall_top_z]) mirror([0, 0, 1]) rear_shell();
}
else if (PART == "clip") {
    mounting_clip_print();
}
else if (PART == "clip_set") {
    // one clip per clip position + 2 spares
    for (i = [0 : len(clip_positions) + 1])
        translate([i * (clip_lip_reach + CT + clip_thickness + 4), 0, 0]) mounting_clip_print();
}
else if (PART == "tpu_pad") {
    tpu_pad();
}
else if (PART == "tpu_pad_set") {
    n = len(back_pads) + 2 * len(end_pads_yz);
    for (i = [0 : n - 1]) translate([(i % 4) * (pad_size[0] + 3), floor(i / 4) * (pad_size[1] + 3), 0])
        tpu_pad();
}

if (DEBUG_MODE || PART == "preview") { shell_report(); stand_report(); }
