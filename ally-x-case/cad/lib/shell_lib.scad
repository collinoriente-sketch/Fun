// =====================================================================
//  shell_lib.scad - protective shell (rear cradle), cut-outs, clips,
//  pads, split joints.
//
//  CONCEPT
//   * rear_shell()  : a cradle that wraps the back, edges, corners and grip
//                     edges. It has NO undercuts: the Ally X drops in from
//                     the front (along -Z). Grip backs, vents, ports and
//                     shoulder buttons are left open.
//   * front_shell() : the front retention = small replaceable clips that
//                     slide into channels on the outside of the walls and
//                     hook 2-3 mm over the front face (never the screen).
//   * The cradle prints as 3 parts (centre + 2 grip caps) joined by
//     dovetail keys in the back plate, so it fits a 220 mm bed.
// =====================================================================

// ---------------------------------------------------------------------
// frames
// ---------------------------------------------------------------------
// Back-local frame B: x = X, y = Y, z = outward from the centre back.
module to_back_local() { translate([0, 0, Z_BACK_OUT]) mirror([0, 0, 1]) children(); }
// Hinge K frame inside B
module to_hinge_k()    { to_back_local() translate([0, kick_hinge_y, HA]) children(); }

// Clip frame: u along the wall, n = outward normal (device surface n = 0),
// z = world Z (front = +).
module clip_frame(wall, pos) {
    if (wall == "bottom") translate([pos, body_bottom_y, 0]) mirror([0, 1, 0]) children();
    else if (wall == "top")   translate([pos, H, 0]) children();
    else if (wall == "right") translate([W / 2, pos, 0]) rotate([0, 0, -90]) children();
    else if (wall == "left")  translate([-W / 2, pos, 0]) rotate([0, 0, 90]) children();
}

// ---------------------------------------------------------------------
// clip geometry (local frame, profile in (n, z), extruded along u)
// ---------------------------------------------------------------------
CLIP_CH     = 1.0;                                 // channel depth in the wall
CLIP_NS     = CT - CLIP_CH + 0.05;                 // spine inner face
CLIP_ZL     = clip_lip_gap;                        // lip underside
CLIP_ZEND   = CLIP_ZL - clip_spine_len;            // spine end
CLIP_DZ     = clip_catch_depth / tan(clip_catch_angle);
CLIP_RAMP   = clip_catch_depth / tan(30);
CLIP_ZCATCH = CLIP_ZEND + CLIP_RAMP + CLIP_DZ + 0.8;

function clip_barb_pts() = [
    [CLIP_NS, CLIP_ZCATCH],
    [CLIP_NS - clip_catch_depth, CLIP_ZCATCH - CLIP_DZ],
    [CLIP_NS, CLIP_ZCATCH - CLIP_DZ - CLIP_RAMP],
];

// zl = lip underside height (test variants change only this; the barb stays
// where the window in the shell is)
module clip_profile_2d(zl = CLIP_ZL) {
    r = clip_lip_t / 2;
    union() {
        // spine
        translate([CLIP_NS, CLIP_ZEND]) square([clip_thickness, zl + clip_lip_t - CLIP_ZEND]);
        // barb
        polygon(clip_barb_pts());
        // lip over the front face (rounded tip)
        hull() {
            translate([-clip_lip_reach + r, zl + r]) circle(r = r, $fn = 16);
            translate([CLIP_NS, zl]) square([clip_thickness, clip_lip_t]);
        }
    }
}

// map (n,z) profile + u extrusion properly: local x = u, local y = n, z = z
module _local_uNZ(w) {
    rotate([90, 0, 90]) translate([0, 0, -w / 2]) linear_extrude(w) children();
}

// Clip for printing: lying flat on its profile face
module mounting_clip_print() {
    linear_extrude(clip_width) clip_profile_2d();
}

// Cuts in the shell for one clip (local frame)
module clip_cut_local() {
    w = clip_width + 2 * snap_clearance;
    _local_uNZ(w) {
        // channel for the spine
        translate([CT - CLIP_CH, CLIP_ZEND - 1]) square([BIG, BIG]);
        // window through the wall for the barb (its top edge is the catch)
        translate([C - 1, CLIP_ZCATCH - CLIP_DZ - CLIP_RAMP - snap_clearance])
            square([CLIP_NS - (C - 1) + 0.01, CLIP_DZ + CLIP_RAMP + 2 * snap_clearance]);
        // notch in the rim so the lip can sit on the front face
        translate([-(clip_lip_reach + 1), CLIP_ZL - 0.15]) square([BIG, BIG]);
    }
}

// ---------------------------------------------------------------------
// cut-out modules (requested names)
// ---------------------------------------------------------------------
// Rear intake grilles
module vent_cutouts() {
    for (v = rear_vents) {
        x0 = v[0] - v[2] / 2 - vent_margin; x1 = v[0] + v[2] / 2 + vent_margin;
        y0 = v[1] - v[3] / 2 - vent_margin; y1 = v[1] + v[3] / 2 + vent_margin;
        translate([0, 0, -BIG]) linear_extrude(BIG - body_depth / 2)
            if (vent_window_style == "honeycomb")
                intersection() {
                    rrect2d(x0, y0, x1, y1, v[4] + vent_margin);
                    honeycomb_2d(x0, y0, x1, y1, 7, 1.6);
                }
            else
                rrect2d(x0, y0, x1, y1, v[4] + vent_margin);
    }
}

module honeycomb_2d(x0, y0, x1, y1, cell, wall) {
    dx = cell * 1.5; dy = cell * sqrt(3);
    for (i = [0 : ceil((x1 - x0) / dx) + 1], j = [0 : ceil((y1 - y0) / dy) + 1])
        translate([x0 + i * dx, y0 + j * dy + (i % 2) * dy / 2])
            circle(r = cell - wall / sqrt(3), $fn = 6);
}

// Top edge: ports, card slot, jack, power, volume, exhaust
module port_cutouts() {
    if (top_wall_mode == "open")
        // cut just below the front-edge radius so no loose sliver remains on
        // the front-top edge; the back keeps a short curl over the top-back edge
        rbox_y(-top_open_half_width, H - body_front_edge_r - 0.3, -BIG,
                top_open_half_width, H + 60, BIG, 3);
    else
        // U-notches open towards the front face: every remaining piece of top
        // wall stays attached to the back, however closely the features sit
        for (f = top_features)
            rbox_y(f[1] - f[2] / 2 - feature_margin, H - 2, f[3] - f[4] / 2 - feature_margin,
                   f[1] + f[2] / 2 + feature_margin, H + 60, BIG, 1.5);
    for (f = end_features, s = [-1, 1])
        translate([s * (W / 2 + 30), 0, 0])
            rbox_x(-30, f[0] - f[2] / 2 - feature_margin, f[1] - f[3] / 2 - feature_margin,
                    30, f[0] + f[2] / 2 + feature_margin, f[1] + f[3] / 2 + feature_margin, 1.5);
    for (f = bottom_features)
        rbox_y(f[0] - f[2] / 2 - feature_margin, -60, f[1] - f[3] / 2 - feature_margin,
               f[0] + f[2] / 2 + feature_margin, body_bottom_y + 2, f[1] + f[3] / 2 + feature_margin, 1.5);
}

// Shoulder buttons (bumpers + impulse triggers). Rear buttons, sticks, ABXY,
// D-pad, View/Menu/Xbox buttons are never covered: the front is open inside
// the rim and the grip backs are open (grip_windows).
module button_clearances() {
    for (s = [-1, 1]) mirror([s < 0 ? 1 : 0, 0, 0])
        rbox_z(W / 2 - shoulder_cut_from_end_inner, H - shoulder_cut_drop, -BIG,
               W / 2 - shoulder_cut_from_end_outer, H + 60, BIG, 4);
}

// Grip backs: open (hands, rear buttons, and they are the hardest surface
// to fit from caliper measurements). A band of edge_wrap stays around them.
module grip_windows() {
    for (s = [-1, 1]) mirror([s < 0 ? 1 : 0, 0, 0])
        translate([0, 0, -BIG / 2]) linear_extrude(BIG)
            offset(r = grip_window_round) offset(r = -grip_window_round)
                intersection() {
                    offset(r = -edge_wrap) front_outline_2d(0);
                    translate([W / 2 - grip_window_from_end, -BIG / 2]) square(BIG);
                }
}

module front_opening() {
    linear_extrude(BIG) front_outline_2d(C);                      // front skin
    translate([-BIG / 2, -BIG / 2, wall_top_z]) cube(BIG);        // above the rim
}

module pad_pockets() {
    zi = -(body_depth + C);
    for (p = back_pads)
        rbox_z(p[0] - pad_size[0] / 2, p[1] - pad_size[1] / 2, zi - pad_pocket_depth,
               p[0] + pad_size[0] / 2, p[1] + pad_size[1] / 2, zi + 1, 2);
    for (p = end_pads_yz, s = [-1, 1])
        rbox_x(s > 0 ? W / 2 + C - 1 : -W / 2 - C - pad_pocket_depth,
               p[0] - pad_size[0] / 2, p[1] - pad_size[1] / 2,
               s > 0 ? W / 2 + C + pad_pocket_depth : -W / 2 - C + 1,
               p[0] + pad_size[0] / 2, p[1] + pad_size[1] / 2, 2);
}

// Holes in the shell for the hinge cheeks + cam relief groove
module hinge_mount_cuts() {
    to_hinge_k() {
        // countersunk head opens towards the device (-Z in the K frame) and
        // sits mount_head_recess below the inner surface
        cheek_mount_points()
            translate([0, 0, -HA - T]) csk_hole(mount_screw_d, mount_csk_d, 20, mount_head_recess);
        rotate([0, 90, 0]) cylinder(r = R_CAM + 0.4, h = 2 * X_CAM + 0.6, center = true, $fn = FN_BIG);
    }
}

// Reinforced impact corners (not beyond the end plane -> caps print flat)
module corner_boost_solid() {
    zones = [
        [W / 2 - 14, 18,    -grip_slab_depth / 2],
        [W / 2 - 3,  H - 3, -shoulder_depth / 2],
    ];
    intersection() {
        device_envelope(CT + corner_boost);
        union() for (z = zones, s = [-1, 1])
            translate([s * z[0], z[1], z[2]]) sphere(r = corner_zone_r, $fn = FN_SMALL * 2);
        translate([-(W / 2 + CT), -BIG / 2, -BIG / 2]) cube([W + 2 * CT, BIG, BIG]);
    }
}

// ---------------------------------------------------------------------
// rear shell = the full cradle (one piece, before splitting)
// ---------------------------------------------------------------------
module rear_shell() {
    difference() {
        union() {
            device_envelope(CT);
            if (corner_boost > 0) corner_boost_solid();
        }
        device_envelope(C);
        front_opening();
        grip_windows();
        vent_cutouts();
        port_cutouts();
        button_clearances();
        for (c = clip_positions) clip_frame(c[0], c[1]) clip_cut_local();
        pad_pockets();
        hinge_mount_cuts();
    }
}

// ---------------------------------------------------------------------
// split into centre + grip caps with dovetail keys in the back plate
// ---------------------------------------------------------------------
module joint_key_2d(d) {
    n = joint_key[0]; hd = joint_key[1]; l = joint_key[2];
    for (y = joint_keys_y)
        offset(delta = d)
            polygon([[split_x + 0.6, y - n / 2], [split_x + 0.6, y + n / 2],
                     [split_x - l, y + hd / 2], [split_x - l, y - hd / 2]]);
}
// right-side keys, extruded through the back plate region only
module joint_keys_3d(d) {
    translate([0, 0, -(D + 10)]) linear_extrude(D + 10 - body_depth - C + 0.01)
        joint_key_2d(d);
}

// If a rear grille crosses a split line, the strip of back plate above it
// (between the split and the shoulder cut-out) would be an island in the
// cap. The centre part owns that strip instead (its back is flat there).
_CROSS_TOPS = [for (v = rear_vents)
    if (abs(v[0]) - v[2] / 2 - vent_margin < split_x && abs(v[0]) + v[2] / 2 + vent_margin > split_x)
        v[1] + v[3] / 2 + vent_margin];
CENTER_STRIP_Y = len(_CROSS_TOPS) > 0 ? max(_CROSS_TOPS) - 0.3 : undef;
module center_region() {
    translate([-split_x, -BIG / 2, -BIG / 2]) cube([2 * split_x, BIG, BIG]);
    if (!is_undef(CENTER_STRIP_Y))
        translate([-(W / 2 - shoulder_cut_from_end_inner + 0.5), CENTER_STRIP_Y, -BIG / 2])
            cube([W - 2 * shoulder_cut_from_end_inner + 1, BIG, BIG]);
}

module shell_center() {
    difference() {
        intersection() {
            rear_shell();
            center_region();
        }
        joint_keys_3d(joint_clearance);
        mirror([1, 0, 0]) joint_keys_3d(joint_clearance);
    }
}

module _cap_region() {
    difference() {
        translate([split_x, -BIG / 2, -BIG / 2]) cube(BIG);
        center_region();
    }
    joint_keys_3d(-joint_clearance);
}
module shell_cap_right() {
    intersection() { rear_shell(); _cap_region(); }
}
module shell_cap_left() {
    intersection() { rear_shell(); mirror([1, 0, 0]) _cap_region(); }
}

// ---------------------------------------------------------------------
// front retention (clips in place) + complete shell preview
// ---------------------------------------------------------------------
module mounting_clips() {
    for (c = clip_positions) clip_frame(c[0], c[1])
        color("Orange") _local_uNZ(clip_width) clip_profile_2d();
}
module front_shell() { mounting_clips(); }

// TPU pads (for printing)
module tpu_pad() {
    rbox_z(0, 0, 0, pad_size[0] - 0.2, pad_size[1] - 0.2, pad_thickness, 1.9);
}

module shell() {
    color("#2b2d31") rear_shell();
    front_shell();
}

// ---------------------------------------------------------------------
// checks / report
// ---------------------------------------------------------------------
module shell_report() {
    echo("====================== SHELL REPORT =======================");
    echo(str("inner clearance ", C, " mm, wall ", T, " mm, corners +", corner_boost,
             " mm. Case outer size ~ ", W + 2 * CT, " x ", H + 2 * CT, " x ", D + CT + wall_top_z, " mm"));
    echo(str("split: centre part |X| <= ", split_x, " mm (", 2 * split_x, " mm wide); caps ",
             W / 2 + CT - split_x, " mm long"));
    cap_len = W / 2 + CT - split_x; cap_h = H + 2 * CT; cap_d = D + CT + wall_top_z;
    ctr_w = is_undef(CENTER_STRIP_Y) ? 2 * split_x : W - 2 * shoulder_cut_from_end_inner + 1;
    if (max(cap_h, cap_d) > max(print_bed) || min(cap_h, cap_d) > min(print_bed))
        echo(str("  WARNING: grip cap (", cap_d, " x ", cap_h, " mm footprint) is larger than print_bed"));
    if (max(ctr_w, H) > max(print_bed))
        echo(str("  WARNING: centre part (", ctr_w, " mm wide) is larger than print_bed"));
    if (split_x > W / 2 - grip_blend_from_end - 8)
        echo("  WARNING: split_x reaches the grip blend - the centre part will not sit flat on the bed");
    for (c = clip_positions) {
        m = c[0] == "bottom" ? front_margin_bottom : front_margin_end;
        if (clip_lip_reach > m - 1 && (c[0] == "bottom" || c[0] == "left" || c[0] == "right"))
            echo(str("  WARNING: clip on ", c[0], " reaches ", clip_lip_reach,
                     " mm onto the front face but the margin there is only ", m, " mm"));
        if (c[0] == "top" && top_wall_mode == "open")
            echo("  WARNING: a top clip needs top_wall_mode = \"features\"");
    }
    // rear buttons must be inside the grip windows
    for (b = rear_buttons) {
        ok = b[0] + b[2] / 2 < grip_window_from_end - 2 && b[0] - b[2] / 2 > edge_wrap + 1;
        echo(str("  rear button at ", b[0], " mm from end: ", ok ? "inside grip window - OK"
                                                               : "WARNING: may be covered"));
    }
    // kickstand plate (closed) and hinge cheeks vs rear vents
    zones = [[kick_width_foot / 2 + 1, kick_hinge_y - kick_length, kick_hinge_y],   // plate
             [X_OUT_OUT + 1,  kick_hinge_y - R_K, kick_hinge_y + R_K + 1],        // knuckles
             [X_CHEEK_OUT + 2, kick_hinge_y, kick_hinge_y + cheek_len + 1]];      // cheeks+screws
    for (v = rear_vents) {
        vx0 = abs(v[0]) - v[2] / 2 - vent_margin;
        vy0 = v[1] - v[3] / 2 - vent_margin; vy1 = v[1] + v[3] / 2 + vent_margin;
        ov = len([for (z = zones) if (vx0 < z[0] && vy0 < z[2] && vy1 > z[1]) 1]) > 0;
        echo(str("  rear vent at x=", v[0], ": ", ov ? "WARNING: overlaps kickstand/hinge zone"
                                                     : "clear of kickstand and hinge"));
    }
    if (kick_width_foot / 2 + 2 > split_x)
        echo("  WARNING: kickstand wider than the centre part");
    echo("===========================================================");
}
