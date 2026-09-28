// =====================================================================
//  ROG Xbox Ally X  -  FOLDING KICKSTAND
//  kickstand.scad
//
//  Dimensions: params.scad section 8 (KICKSTAND) and 9 (HINGE).
//     kick_target_angles, kick_hinge_y, kick_length, kick_width_foot,
//     kick_thickness, kick_gap, kick_window ...
//
//  The detent notches are NOT typed in by hand: lib/stand_solver.scad
//  computes the opening angle for every target screen angle from your
//  measured device geometry and cuts one notch per angle into the cam.
//  Read the KICKSTAND REPORT in the console after every change.
//
//  EXPORT: choose PART, F6, F7. Parts are placed in print orientation.
// =====================================================================

include <params.scad>
include <lib/all.scad>

/* [Part to render] */
// preview | kickstand | foot_sleeve | stand_diagram
PART = "preview";
// preview: which target angle to show opened (index into kick_target_angles, -1 = closed)
SHOW_ANGLE_INDEX = 1;

phi_show = (SHOW_ANGLE_INDEX < 0 || SHOW_ANGLE_INDEX >= len(KICK_PHIS)) ? 0 : KICK_PHIS[SHOW_ANGLE_INDEX];

if (PART == "preview") {
    rotate([-phi_show, 0, 0]) { kickstand_k(); if (kick_foot_pad) kick_foot_sleeve(); }
    hinge_cheeks(); detent_strip(); hinge_pin();
    %translate([-45, -kick_length - 10, -HA - T]) cube([90, kick_length + 40, T]);
}
else if (PART == "kickstand") {
    // inner face on the bed; pin bore is a teardrop, no supports needed
    translate([0, 0, -KZ_IN]) kickstand_k();
}
else if (PART == "foot_sleeve") {
    // TPU. Stands on its end, C-profile up.
    translate([0, 0, FOOT_PAD_W / 2 - 0.3]) rotate([0, -90, 0]) kick_foot_sleeve();
}
else if (PART == "stand_diagram") {
    stand_diagram();
}

stand_report();
hinge_report();

// 2D side view of the device + stand at every target angle (for checking)
module stand_diagram() {
    for (i = [0 : len(kick_target_angles) - 1]) {
        t = kick_target_angles[i];
        s = KICK_SOLUTIONS[i];
        low = dev_lowest(t);
        translate([i * 220, 0, 0]) {
            // table
            color("gray") translate([-190, low[0] - 2]) square([240, 2]);
            // device silhouette (case)
            color([0.3, 0.3, 0.35]) hull() {
                for (c = side_circles(CT)) translate([_wx(c[0], c[1], t), _wy(c[0], c[1], t)]) circle(r = c[2], $fn = 16);
                for (e = side_ellipses(CT)) for (a = [0 : 15 : 359])
                    let(v = e[0] + e[2] * cos(a), w = e[1] + e[3] * sin(a))
                    translate([_wx(v, w, t), _wy(v, w, t)]) circle(r = 0.5, $fn = 6);
            }
            // centre of mass
            color("magenta") translate([_wx(com_y, com_depth, t), _wy(com_y, com_depth, t)]) circle(r = 3, $fn = 16);
            if (!is_undef(s)) {
                f = foot_vw(s[0]);
                color("orange") hull() {
                    translate([_wx(kick_hinge_y, W_H, t), _wy(kick_hinge_y, W_H, t)]) circle(r = R_K, $fn = 16);
                    translate([_wx(f[0], f[1], t), _wy(f[0], f[1], t)]) circle(r = FOOT_R, $fn = 16);
                }
            }
            color("black") translate([-100, -40]) text(str(t, "° screen / stand ",
                is_undef(s) ? "n/a" : str(round(s[0]), "°")), size = 8);
        }
    }
}
