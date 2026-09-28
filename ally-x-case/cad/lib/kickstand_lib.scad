// =====================================================================
//  kickstand_lib.scad - folding kickstand (K frame, see hinge_lib.scad)
//
//  Plate lies along -Y when closed, inner face at Z = KZ_IN (towards the
//  shell), outer face at Z = KZ_OUT. Knuckles on the axis:
//    outer knuckle (L, bolt head) | [cheek] | cam | [cheek] | outer knuckle (R, nut)
//  The cam carries one notch per solved kickstand angle.
// =====================================================================

// half width of the plate at K-frame y (y <= 0)
function kick_half_w(y) = KICK_WIDTH_TOP / 2 +
    (kick_width_foot - KICK_WIDTH_TOP) / 2 * (-y) / (kick_length - FOOT_R);

FOOT_Y = -(kick_length - FOOT_R);        // foot round centre (y)

// Solid plate incl. the full-round foot
module kick_plate_solid() {
    rc = 3;
    hull() {
        for (sx = [-1, 1]) {
            translate([sx * (KICK_WIDTH_TOP / 2 - rc), -rc, KZ_IN])
                cylinder(r = rc, h = kick_thickness, $fn = FN_SMALL);
            translate([sx * (kick_width_foot / 2 - FOOT_R), FOOT_Y, KZ_MID])
                sphere(r = FOOT_R, $fn = FN_SMALL * 2);
        }
    }
}

// Region of the foot covered by the TPU sleeve, grown by d
FOOT_PAD_W   = kick_width_foot - 2 * FOOT_R - 8;
FOOT_PAD_LEN = 8;
FOOT_PAD_T   = 0.8;
module foot_pad_region(d = 0) {
    hull() {
        translate([-FOOT_PAD_W / 2, FOOT_Y, KZ_MID]) rotate([0, 90, 0])
            cylinder(r = FOOT_R + d, h = FOOT_PAD_W, $fn = FN_SMALL * 2);
        translate([-FOOT_PAD_W / 2, FOOT_Y, KZ_IN - d])
            cube([FOOT_PAD_W, FOOT_PAD_LEN + 5, kick_thickness + 2 * d]);
    }
}
// C-shaped skin around the foot between offsets d_in and d_out, open at the top
module foot_pad_skin(d_out, d_in) {
    intersection() {
        difference() { foot_pad_region(d_out); foot_pad_region(d_in); }
        translate([-BIG / 2, -BIG + FOOT_Y + FOOT_PAD_LEN, -BIG / 2]) cube(BIG);
    }
}

// Window in the plate (open frame -> lighter, lets air reach the back)
module kick_window_cut() {
    fw = kick_frame_width;
    y_top = -(R_NOTCH + fw);
    y_bot = FOOT_Y + FOOT_R + fw - kick_thickness / 2;
    if (kick_window && y_top - y_bot > 8)
        translate([0, 0, KZ_IN - 1]) linear_extrude(kick_thickness + 2)
            offset(r = 4) offset(delta = -4)
                polygon([
                    [-(kick_half_w(y_top) - fw), y_top], [kick_half_w(y_top) - fw, y_top],
                    [kick_half_w(y_bot) - fw, y_bot],   [-(kick_half_w(y_bot) - fw), y_bot]]);
}

// Detent notch (2D, in the (y, z) plane) at local angle a (deg, from +y to +z)
module detent_notch_2d(a) {
    wt = (detent_notch_depth + 1) / tan(NOTCH_FLANK_DEG) + 0.35;
    rotate(a) hull() {
        translate([R_CAM - detent_notch_depth + 0.35, 0]) circle(r = 0.35, $fn = 12);
        translate([R_CAM + 1, -wt]) square([0.01, 2 * wt]);
    }
}

module cam_profile_2d() {
    difference() {
        circle(r = R_CAM, $fn = FN_BIG);
        detent_notch_2d(KICK_CLOSED_NOTCH_DEG);
        for (p = KICK_PHIS) detent_notch_2d(p);
    }
}

module kickstand_k() {
    color("SlateGray")
    intersection() {
        difference() {
            union() {
                kick_plate_solid();
                // outer knuckles
                for (sx = [-1, 1])
                    translate([sx > 0 ? X_OUT_IN : -X_OUT_OUT, 0, 0]) rotate([0, 90, 0])
                        cylinder(r = R_K, h = outer_knuckle_width, $fn = FN_SMALL * 2);
                // cam knuckle
                k_yz_extrude(-X_CAM, X_CAM) cam_profile_2d();
            }
            // clearance around the cheeks (plate only beyond R_NOTCH)
            for (sx = [-1, 1]) {
                x0 = sx > 0 ? X_CAM : -X_OUT_IN;
                translate([x0, 0, 0]) {
                    rotate([0, 90, 0]) cylinder(r = R_NOTCH, h = X_OUT_IN - X_CAM, $fn = FN_SMALL * 2);
                    translate([0, 0, -BIG / 2]) cube([X_OUT_IN - X_CAM, BIG, BIG]);
                }
            }
            // pin bore (snug: the pin turns with the stand), teardrop for printing
            teardrop_x(PIN_D + pin_clearance_snug, BIG);
            // bolt head counterbore (left) and nyloc hex pocket (right)
            translate([-X_OUT_OUT - 1, 0, 0]) rotate([0, 90, 0])
                cylinder(d = pin_head_d + 0.5, h = HEAD_RECESS + 1, $fn = 24);
            translate([X_OUT_OUT - NUT_RECESS, 0, 0]) rotate([0, 90, 0]) rotate([0, 0, 30])
                hex_prism(nut_af + 0.3, NUT_RECESS + 1);
            kick_window_cut();
            // TPU foot sleeve recess
            if (kick_foot_pad)
                foot_pad_skin(0.5, -FOOT_PAD_T);
        }
        // flat bottom for printing (inner face on the bed)
        translate([-BIG / 2, -BIG / 2, KZ_IN]) cube(BIG);
    }
}

// TPU sleeve that clips over the foot (anti-slip)
module kick_foot_sleeve() {
    color("Black")
    intersection() {
        foot_pad_skin(0.05, -FOOT_PAD_T - 0.05);
        translate([-FOOT_PAD_W / 2 + 0.3, -BIG / 2, -BIG / 2]) cube([FOOT_PAD_W - 0.6, BIG, BIG]);
    }
}
