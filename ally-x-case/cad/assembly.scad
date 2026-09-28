// =====================================================================
//  ROG Xbox Ally X  -  FULL ASSEMBLY PREVIEW (not for printing)
//  assembly.scad
//
//  Shows the shell, clips, hinge and kickstand on a ghost of the device.
//  Set DEBUG_MODE = true in params.scad (or here via the override below)
//  to also see the keep-clear zones:
//     red     rear intake grilles          orange  top-edge features
//     yellow  bumpers / triggers           purple  rear buttons
//     magenta centre of mass               red line hinge axis
//  and the dimension / stability / hinge reports in the console.
// =====================================================================

include <params.scad>
include <lib/all.scad>

/* [View] */
// -1 = kickstand closed, 0.. = index into kick_target_angles
SHOW_ANGLE_INDEX = -1;
// "none", "x" (cut at X = SECTION_AT, look from the side), "y" (cut at Y = SECTION_AT)
SECTION = "none";
SECTION_AT = 0;
EXPLODE = 0;           // mm, pulls the parts apart
SHOW_DEVICE = true;

phi = (SHOW_ANGLE_INDEX < 0 || SHOW_ANGLE_INDEX >= len(KICK_PHIS)) ? 0 : KICK_PHIS[SHOW_ANGLE_INDEX];

module scene() {
    color("#2b2d31") {
        translate([0, 0, -EXPLODE]) shell_center();
        translate([ EXPLODE, 0, -EXPLODE]) shell_cap_right();
        translate([-EXPLODE, 0, -EXPLODE]) shell_cap_left();
    }
    translate([0, 0, EXPLODE]) mounting_clips();
    translate([0, 0, -2 * EXPLODE]) kickstand_assembly(phi);
}

module section_cut() {
    if (SECTION == "x") translate([SECTION_AT, -BIG / 2, -BIG / 2]) cube(BIG);
    if (SECTION == "y") translate([-BIG / 2, SECTION_AT, -BIG / 2]) cube(BIG);
}

difference() { scene(); section_cut(); }
if (SHOW_DEVICE) %color([0.2, 0.2, 0.25, 0.35]) difference() { device_envelope(0); section_cut(); }
if (DEBUG_MODE) debug_overlay();

shell_report();
stand_report();
hinge_report();
