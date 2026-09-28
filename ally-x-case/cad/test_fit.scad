// =====================================================================
//  ROG Xbox Ally X  -  QUICK TEST-FIT PRINTS
//  test_fit.scad
//
//  Print these BEFORE the full shell. Every test is cut from the REAL
//  model, so what fits here fits in the final print. When a test tells
//  you to change a value, change it in params.scad and re-export - the
//  new tolerance flows into every part automatically.
//
//   TEST = 1  corner / side fit      -> wall_clearance, grip & end [MEASURE]s
//   TEST = 2  snap-fit clip on the    -> snap_clearance, clip_lip_gap,
//             device's bottom edge       clip_catch_depth, clip_catch_angle
//   TEST = 3  top edge / ports /      -> top_features, shoulder_cut_*,
//             shoulder buttons           top_wall_mode
//   TEST = 4  hinge pin fit coupon    -> pin_clearance_rot, pin_clearance_snug
//   TEST = 5  hinge + detent + stop   -> detent_strip_t, detent_preload,
//             mechanism                  detent_notch_depth, knuckle_gap
//   TEST = 6  dovetail joint coupon   -> joint_clearance
// =====================================================================

include <params.scad>
include <lib/all.scad>

/* [Test selection] */
TEST = 1;              // 1..6
TEST1_CORNER = "bottom";  // "bottom" (grip bottom + end) or "top" (shoulder corner)
TEST1_SIDE   = "right";   // "right" or "left"
TEST3_SIDE   = "right";   // "right" or "left" half of the top edge

// ---------------------------------------------------------------------
// TEST 1 - corner / side fit (~25-40 min). Press it onto the device corner.
//   * slides on with light pressure, no rocking  -> keep values
//   * rocks / gaps > 0.5 mm                     -> lower wall_clearance or fix the
//                                                  grip [MEASURE]s it points to
//   * does not go on / creaks                   -> raise wall_clearance by 0.1
// ---------------------------------------------------------------------
module test1_piece() {
    box = TEST1_CORNER == "bottom"
        ? [W / 2 - 50, -10, -BIG / 2, 100, 62, BIG]
        : [W / 2 - 95, H - 42, -BIG / 2, 100, 60, BIG];
    intersection() {
        shell_cap_right();
        translate([box[0], box[1], box[2]]) cube([box[3], box[4], box[5]]);
    }
}
module test1() {
    if (TEST1_SIDE == "right") translate([0, 0, W / 2 + CT]) rotate([0, 90, 0]) test1_piece();
    else translate([0, 0, W / 2 + CT]) rotate([0, -90, 0]) mirror([1, 0, 0]) test1_piece();
}

// ---------------------------------------------------------------------
// TEST 2 - snap-fit clip on the real bottom edge (~30 min).
//   Slice of the centre shell around the first "bottom" clip position +
//   3 clips with different lip gaps (engraved -1 / 0 / +1 on the lip).
//   Put the slice on the device's bottom edge, push each clip in:
//   * clip clicks, lip sits flat on the front face, no wobble  -> use it
//   * lip lifts / wobbles  -> use the tighter clip (-1) or lower clip_lip_gap
//   * clip won't seat      -> raise snap_clearance by 0.05
//   * clip pulls out too easily -> raise clip_catch_angle (max 90) or depth
// ---------------------------------------------------------------------
TEST2_GAPS = [clip_lip_gap - 0.15, clip_lip_gap, clip_lip_gap + 0.15];
module test2() {
    cx = [for (c = clip_positions) if (c[0] == "bottom") c[1]][0];
    // slice (back plate down, like the real centre part)
    translate([0, 0, -Z_BACK_OUT])
        intersection() {
            rear_shell();
            // stay inside the flat centre back so the slice sits flat on the bed
            let(x0 = max(cx - 11, -split_x), x1 = min(cx + 11, split_x))
                translate([x0, -10, -BIG / 2]) cube([x1 - x0, body_bottom_y + 28, BIG]);
        }
    // clips, lying flat. Variant marks: 1, 2 or 3 small notches at the spine end
    for (i = [0 : 2])
        translate([cx + 32 + i * 20, body_bottom_y, 0]) rotate([0, 0, 90])
            difference() {
                linear_extrude(clip_width) clip_profile_2d(TEST2_GAPS[i]);
                for (k = [0 : i])
                    translate([CLIP_NS + clip_thickness, CLIP_ZEND + 1.5 + k * 1.6, -1])
                        rotate([0, 0, 45]) cube([0.8, 0.8, clip_width + 2]);
            }
}

// ---------------------------------------------------------------------
// TEST 3 - top edge (~40-60 min per half). Slide it onto the top edge.
//   Every port, the card slot, jack, power, volume, all exhaust openings and
//   both bumpers/triggers must be fully clear, with a USB-C cable and a
//   3.5 mm plug inserted, and the triggers pulled all the way.
// ---------------------------------------------------------------------
module test3() {
    s = TEST3_SIDE == "right" ? 1 : -1;
    // cut face on the bed, top edge up
    translate([0, 0, -(H - 16)]) rotate([90, 0, 0])
        intersection() {
            rear_shell();
            translate([s > 0 ? -1 : -W / 2 - 10, H - 16, -BIG / 2]) cube([W / 2 + 11, 40, BIG]);
        }
}

// ---------------------------------------------------------------------
// TEST 4 - pin fit coupon (~15 min). Two rows of holes, clearance
//   +0.0 / +0.1 / +0.2 / +0.3 / +0.4 mm (engraved 0..4).
//   Row V (vertical holes)   = how the CHEEKS print   -> pick the smallest hole
//          the pin ROTATES freely in without play     -> pin_clearance_rot
//   Row H (horizontal holes) = how the KICKSTAND prints -> pick the hole the pin
//          pushes into firmly and does NOT turn in    -> pin_clearance_snug
// ---------------------------------------------------------------------
module test4() {
    n = 5; pitch = 9;
    difference() {
        cube([n * pitch + 4, 36, 10]);
        for (i = [0 : n - 1]) {
            x = 4 + i * pitch + 2;
            // row V: vertical holes (as printed in the cheeks)
            translate([x, 7, -1]) cylinder(d = PIN_D + i * 0.1, h = 12, $fn = FN_SMALL * 2);
            // row H: horizontal teardrop holes (as printed in the kickstand)
            translate([x, 37, 4.5]) rotate([0, 0, -90]) teardrop_x(PIN_D + i * 0.1, 21, center = false);
            translate([x, 13.5, 9.4]) linear_extrude(1) text(str(i), size = 4, halign = "center", valign = "center");
        }
        translate([0.8, 1.5, 9.4]) linear_extrude(1) text("V", size = 3);
        translate([0.8, 31.5, 9.4]) linear_extrude(1) text("H", size = 3);
    }
}

// ---------------------------------------------------------------------
// TEST 5 - complete hinge on a small piece of shell back (~1.5 h total).
//   Parts: coupon (with the real mount holes + cam relief), 2 cheeks,
//   short kickstand stub, detent strip. Assemble exactly as the final.
//   * clicks positively into every position, holds the stub + ~200 g at
//     the tip -> keep values
//   * too weak   -> tighten the preload screws, then detent_strip_t +0.1
//   * too stiff / strip cracks -> detent_strip_t -0.1 or detent_notch_depth -0.1
//   * stop face must meet the stub flat at the last position
// ---------------------------------------------------------------------
TEST5_PART = "all";   // all | coupon | stub | cheeks | strip
module test5_coupon() {
    // shell back piece in the K frame, printed back-down
    difference() {
        translate([-X_OUT_OUT - 6, -24, -HA - T]) cube([2 * X_OUT_OUT + 12, 24 + cheek_len + 6, T]);
        cheek_mount_points() translate([0, 0, -HA - T]) csk_hole(mount_screw_d, mount_csk_d, 20, mount_head_recess);
        rotate([0, 90, 0]) cylinder(r = R_CAM + 0.4, h = 2 * X_CAM + 0.6, center = true, $fn = FN_BIG);
    }
}
module test5_stub() {
    intersection() {
        kickstand_k();
        translate([-BIG / 2, -26, -BIG / 2]) cube(BIG);
    }
}
module test5() {
    if (TEST5_PART == "all" || TEST5_PART == "coupon")
        translate([0, 0, HA + T]) test5_coupon();
    if (TEST5_PART == "all" || TEST5_PART == "stub")
        translate([0, -40, -KZ_IN]) test5_stub();
    if (TEST5_PART == "all" || TEST5_PART == "cheeks") {
        translate([-X_OUT_OUT - 20, 0, X_CHEEK_OUT]) rotate([0, 90, 0]) hinge_cheek();
        translate([ X_OUT_OUT + 20, 0, X_CHEEK_OUT]) rotate([0, -90, 0]) mirror([1, 0, 0]) hinge_cheek();
    }
    if (TEST5_PART == "all" || TEST5_PART == "strip")
        translate([0, 40 - STRIP_Y0, detent_strip_w / 2]) detent_strip();
}

// ---------------------------------------------------------------------
// TEST 6 - dovetail joint coupon (~20 min). Three key pairs at
//   joint_clearance -0.05 / +0 / +0.05 (engraved -, 0, +).
//   Pick the pair that presses together by hand and does not fall apart.
// ---------------------------------------------------------------------
module test6() {
    n = joint_key[0]; hd = joint_key[1]; l = joint_key[2];
    for (i = [0 : 2]) translate([i * 26, 0, 0]) {
        c = joint_clearance - 0.05 + i * 0.05;
        key = [[0.6, -n / 2], [0.6, n / 2], [-l, hd / 2], [-l, -hd / 2]];
        // socket half
        difference() {
            translate([-20, -10, 0]) cube([20, 20, T]);
            translate([0, 0, -1]) linear_extrude(T + 2) offset(delta = c) polygon(key);
            translate([-14, 5, T - 0.4]) linear_extrude(1) text(i == 0 ? "-" : (i == 1 ? "0" : "+"), size = 4);
        }
        // key half
        translate([0, 25, 0]) {
            translate([0, -10, 0]) cube([14, 20, T]);
            linear_extrude(T) offset(delta = -c) polygon(key);
        }
    }
}

// ---------------------------------------------------------------------
if (TEST == 1) test1();
else if (TEST == 2) test2();
else if (TEST == 3) test3();
else if (TEST == 4) test4();
else if (TEST == 5) test5();
else if (TEST == 6) test6();

