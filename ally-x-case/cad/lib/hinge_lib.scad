// =====================================================================
//  hinge_lib.scad - printed hinge cheeks, replaceable detent strip, pin.
//
//  K FRAME (all modules here): origin on the hinge axis, X = axis,
//  closed kickstand lies along -Y, +Z = outward (away from the device).
//  The shell's outer back surface is the plane Z = -HA.
//
//  Stack along the pin (X), centre outwards:
//    cam knuckle (kickstand) | cheek | outer knuckle (kickstand)
//  The pin is clamped in the kickstand knuckles and turns in the cheeks.
//  A PETG strip spans over the cam; its nub drops into notches cut at
//  the solved kickstand angles. Two M3 screws preload the strip ends.
// =====================================================================

// 2D helpers in the K-frame Y/Z plane: 2D X -> K y, 2D Y -> K z
module k_yz_extrude(x0, x1) {
    translate([x0, 0, 0]) rotate([90, 0, 90]) linear_extrude(x1 - x0) children();
}

// half-plane { p : p . (sin phi, cos phi) >= k } in the 2D (y, z) plane
module halfplane_2d(phi, k, s = 200) {
    n = [sin(phi), cos(phi)];
    t = [cos(phi), -sin(phi)];
    p0 = k * n + s * t;
    p1 = k * n - s * t;
    polygon([p0, p1, p1 + s * n, p0 + s * n]);
}

// Cheek cross-section (y,z): eye + body resting on the shell, cut by the
// stop plane (plate outer face at the hard-stop angle).
module cheek_profile_2d() {
    intersection() {
        hull() {
            circle(r = R_K, $fn = FN_SMALL * 2);
            translate([0, -HA]) square([cheek_len, HA + R_K]);
        }
        union() {
            halfplane_2d(KICK_PHI_STOP, KZ_OUT + 0.05);
            circle(r = R_NOTCH - 0.05, $fn = FN_SMALL * 2);
        }
    }
}

// Mount screw positions in the K frame (x, y) - right cheek
function cheek_screw_pts() = [
    [X_CHEEK_IN + cheek_width - 3.5, cheek_len - 11.5],
    [X_CHEEK_IN + cheek_width - 3.5, cheek_len - 3.5],
];

// Right cheek (x > 0). The left one is mirror([1,0,0]).
module hinge_cheek() {
    xs = X_CHEEK_IN + detent_pocket_depth / 2;       // preload screw X
    difference() {
        k_yz_extrude(X_CHEEK_IN, X_CHEEK_OUT) cheek_profile_2d();
        // pin bore (rotating fit)
        rotate([0, 90, 0]) cylinder(d = PIN_D + pin_clearance_rot, h = BIG, center = true, $fn = FN_SMALL * 2);
        // strip pocket, open towards the cam
        translate([X_CHEEK_IN - 1, STRIP_Y0 - detent_travel, -detent_strip_w / 2 - 0.25])
            cube([detent_pocket_depth + 1, detent_strip_t + detent_travel + 0.2, detent_strip_w + 0.5]);
        // preload screw (self-tapping M3 pilot) from the cheek top
        translate([xs, STRIP_Y1, 0]) rotate([-90, 0, 0])
            cylinder(d = preload_screw_d, h = BIG, $fn = FN_SMALL);
        // mount screws (from inside the shell) + nut traps open to the top
        for (p = cheek_screw_pts()) translate([p[0], p[1], 0]) {
            translate([0, 0, -HA - 1]) cylinder(d = mount_screw_d, h = BIG, $fn = FN_SMALL);
            nut_z0 = -HA + (mount_screw_len - T + mount_head_recess) - 2.6;  // nut sits under screw tip
            translate([0, 0, nut_z0]) rotate([0, 0, 30]) hex_prism(nut_af + 0.3, BIG);
        }
    }
}

module hinge_cheeks() {
    color("DimGray") {
        hinge_cheek();
        mirror([1, 0, 0]) hinge_cheek();
    }
}

// Detent strip (replaceable). Nub points to -Y onto the cam.
module detent_strip(t = detent_strip_t) {
    color("Orange") {
        translate([-STRIP_LEN / 2, STRIP_Y0, -detent_strip_w / 2])
            cube([STRIP_LEN, t, detent_strip_w]);
        // nub: V ridge with a rounded tip, along X, only over the cam
        k_yz_extrude(-(cam_width / 2 - 0.6), cam_width / 2 - 0.6)
            hull() {
                translate([R_CAM + 0.3, 0]) circle(r = 0.3, $fn = 12);
                translate([STRIP_Y0, -NUB_HALF_W]) square([0.01 + 0.2, 2 * NUB_HALF_W]);
            }
    }
}

// Pin (for visualisation - use a metal M3 bolt or 3 mm rod)
module hinge_pin() {
    color("Silver") {
        translate([-X_OUT_OUT + HEAD_RECESS, 0, 0]) rotate([0, 90, 0]) {
            cylinder(d = PIN_D, h = pin_bolt_length, $fn = 16);
            translate([0, 0, -pin_head_h]) cylinder(d = pin_head_d, h = pin_head_h, $fn = 24);
        }
        if (pin_is_bolt)
            translate([X_OUT_OUT - NUT_RECESS + 0.2, 0, 0]) rotate([0, 90, 0])
                rotate([0, 0, 30]) hex_prism(nut_af, nyloc_h);
    }
}

// Optional TPU friction washer
module friction_washer() {
    difference() {
        cylinder(r = R_K - 0.3, h = washer_t, $fn = FN_SMALL * 2);
        translate([0, 0, -1]) cylinder(d = PIN_D + 0.3, h = washer_t + 2, $fn = FN_SMALL);
    }
}

// Pin retaining caps when using a plain 3 mm rod instead of a bolt
module pin_rod_cap() {
    difference() {
        cylinder(d = pin_head_d, h = 2.5, $fn = 24);
        translate([0, 0, 0.8]) cylinder(d = PIN_D - 0.05, h = 5, $fn = FN_SMALL);
    }
}

// Screw-hole pattern for the cheeks, in the K frame (used by the shell)
module cheek_mount_points() {
    for (sx = [-1, 1], p = cheek_screw_pts())
        translate([sx * p[0], p[1], 0]) children();
}

module hinge_report() {
    echo("====================== HINGE REPORT =======================");
    echo(str("knuckle radius ", R_K, " mm, axis ", HA, " mm above the shell back, cam radius ", R_CAM));
    echo(str("hinge span ", HINGE_SPAN, " mm. Pin: ",
             pin_is_bolt ? str("M", PIN_D, "x", pin_bolt_length, " SHCS + nyloc; head recess ",
                               HEAD_RECESS, " mm (need >= ", pin_head_h, ")")
                         : str(PIN_D, " mm rod, length ", HINGE_SPAN - 1.5, " mm + 2 printed caps")));
    if (pin_is_bolt && (HEAD_RECESS < pin_head_h || HEAD_RECESS > outer_knuckle_width - 2))
        echo("  WARNING: pin_bolt_length does not suit the hinge span - adjust outer_knuckle_width");
    echo(str("cheek mount screws: 4x M3x", mount_screw_len, " countersunk + 4x M3 nut"));
    pl = cheek_len - (STRIP_Y1 + 0.2);            // cheek top -> pocket ceiling
    pls = [for (L = [8, 10, 12, 16, 20, 25]) if (L >= pl + 0.5) L][0];
    echo(str("detent preload screws: 2x M3x", pls, " (self-tapping into ", preload_screw_d,
             " mm pilots; ", round((pls - pl) * 10) / 10, " mm of preload travel when fully in)"));
    echo(str("detent notches at kickstand angles (deg): ", KICK_PHIS, " + closed notch at ",
             round(KICK_CLOSED_NOTCH_DEG * 10) / 10, " (pulls the closed stand flat, no rattle)"));
    echo("===========================================================");
}
