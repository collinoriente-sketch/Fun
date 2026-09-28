// =====================================================================
//  device.scad - parametric envelope of the ROG Xbox Ally X.
//
//  The device is modelled as a union of CONVEX hulls of rounded
//  primitives (tori = rounded slab corners, ellipsoids = grip backs).
//  device_envelope(d) returns the device grown outward by d mm, which is
//  exact for the tori and very close for the ellipsoids. The shell is
//  simply  envelope(clearance + thickness) - envelope(clearance).
//
//  All the numbers come from params.scad sections 1-3.
// =====================================================================

W = device_width;
H = device_height;
D = device_depth;

// ---- derived primitive lists ----------------------------------------
// Front-view circles of the RIGHT grip lobe: [x, y, R]
function grip_lobe_circles() = [
    [W/2 - grip_bottom_from_end, grip_bottom_r,                 grip_bottom_r],   // bottom
    [W/2 - grip_end_r,           grip_end_low_y,                grip_end_r],      // lower-outer
    [W/2 - body_top_corner_r,    H - body_top_corner_r,         body_top_corner_r], // top-outer
    [W/2 - grip_blend_from_end,  body_bottom_y + max(body_front_edge_r, grip_edge_r) + 0.1,
                                 max(body_front_edge_r, grip_edge_r) + 0.1]       // blend
];

// Front-view corner circles of the centre body: [x, y, R]
function body_circles() = [
    for (sx = [-1, 1], y = [body_bottom_y + body_top_corner_r, H - body_top_corner_r])
        [sx * (W/2 - body_top_corner_r), y, body_top_corner_r]
];

function shoulder_circles() = [
    [W/2 - shoulder_w + shoulder_r, H - shoulder_r,              shoulder_r],
    [W/2 - shoulder_r,              H - shoulder_r,              shoulder_r],
    [W/2 - shoulder_r,              H - shoulder_h + shoulder_r, shoulder_r],
    [W/2 - shoulder_w + shoulder_r, H - shoulder_h + shoulder_r, shoulder_r],
];

// Ellipsoid of the right grip back: [cx, cy, cz, rx, ry, rz]
function grip_bulge() = [W/2 - grip_bulge_from_end, grip_bulge_y,
                         -D + grip_bulge_rz, grip_bulge_rx, grip_bulge_ry, grip_bulge_rz];


// ---- 3D envelope ----------------------------------------------------
// A rounded "slab corner": torus at (x,y) with front-view radius R, edge
// radius r, whose outermost surface in -Z touches z = zfront/zback.
module _disc_front(c, r, d) {
    translate([c[0], c[1], -r]) rdisc(c[2] + d, r + d);
}
module _disc_back(c, depth, r, d) {
    translate([c[0], c[1], -depth + r]) rdisc(c[2] + d, r + d);
}

module device_body(d = 0) {
    hull() for (c = body_circles()) {
        _disc_front(c, body_front_edge_r, d);
        _disc_back(c, body_depth, body_back_edge_r, d);
    }
}

// Right grip; the left one is mirrored in device_envelope().
module device_grip(d = 0) {
    b = grip_bulge();
    hull() {
        for (c = grip_lobe_circles()) {
            _disc_front(c, body_front_edge_r, d);
            _disc_back(c, grip_slab_depth, grip_edge_r, d);
        }
        // hull with the body slice next to the grip -> fills the concave
        // blend (conservative: slightly more room than the real fillet)
        for (c = body_circles()) if (c[0] > 0)
            _disc_back(c, body_depth, body_back_edge_r, d);
        for (c = shoulder_circles())
            _disc_back(c, shoulder_depth, min(body_back_edge_r, c[2]), d);
        translate([b[0], b[1], b[2]]) ellipsoid(b[3] + d, b[4] + d, b[5] + d);
    }
}

module device_envelope(d = 0) {
    union() {
        device_body(d);
        device_grip(d);
        mirror([1, 0, 0]) device_grip(d);
    }
}

// ---- 2D front outline (projection of the front face) ------------------
module grip_lobe_2d(d = 0) {
    hull() for (c = grip_lobe_circles())
        translate([c[0], c[1]]) circle(r = c[2] + d, $fn = FN_BIG);
}
module front_outline_2d(d = 0) {
    union() {
        hull() for (c = body_circles())
            translate([c[0], c[1]]) circle(r = c[2] + d, $fn = FN_BIG);
        grip_lobe_2d(d);
        mirror([1, 0]) grip_lobe_2d(d);
    }
}

// ---- side-profile data for the kickstand calculator ------------------
// Everything is converted to "device frame" v = Y (up), w = -Z (depth
// behind the front face). Returns circles [v, w, r] and ellipses
// [v, w, rv, rw] whose convex hull is the side silhouette grown by d.
function _torus_side(c, zc, r, d) =
    [[c[1] - (c[2] - r), -zc, r + d], [c[1] + (c[2] - r), -zc, r + d]];

function side_circles(d = 0) = concat(
    [for (c = body_circles())      each _torus_side(c, -body_front_edge_r, body_front_edge_r, d)],
    [for (c = body_circles())      each _torus_side(c, -body_depth + body_back_edge_r, body_back_edge_r, d)],
    [for (c = grip_lobe_circles()) each _torus_side(c, -body_front_edge_r, body_front_edge_r, d)],
    [for (c = grip_lobe_circles()) each _torus_side(c, -grip_slab_depth + grip_edge_r, grip_edge_r, d)],
    [for (c = shoulder_circles())  each _torus_side(c, -shoulder_depth + min(body_back_edge_r, c[2]),
                                                    min(body_back_edge_r, c[2]), d)]
);
function side_ellipses(d = 0) =
    let(b = grip_bulge()) [[b[1], -b[2], b[4] + d, b[5] + d]];


// ---- ghost + debug overlays --------------------------------------------
module device_ghost() {
    %color([0.2, 0.2, 0.25, 0.35]) device_envelope(0);
}

// Coloured "keep clear" volumes (DEBUG_MODE)
module debug_zones() {
    // rear intake grilles
    for (v = rear_vents)
        color([1, 0, 0, 0.45])
            translate([0, 0, -body_depth - 12])
                rbox_z(v[0] - v[2]/2, v[1] - v[3]/2, 0, v[0] + v[2]/2, v[1] + v[3]/2, 12, v[4]);
    // top features
    for (f = top_features)
        color([1, 0.5, 0, 0.5])
            translate([f[1] - f[2]/2, H, f[3] - f[4]/2]) cube([f[2], 10, f[4]]);
    // shoulder buttons
    for (s = [-1, 1])
        color([1, 1, 0, 0.35])
            translate([s > 0 ? W/2 - shoulder_cut_from_end_inner : -W/2 + shoulder_cut_from_end_outer,
                       H - shoulder_cut_drop, -D])
                cube([shoulder_cut_from_end_inner - shoulder_cut_from_end_outer,
                      shoulder_cut_drop + 8, D + 2]);
    // rear buttons
    for (b = rear_buttons, s = [-1, 1])
        color([0.7, 0, 1, 0.5])
            translate([s * (W/2 - b[0]) - b[2]/2, b[1] - b[3]/2, -D - 2]) cube([b[2], b[3], 6]);
    // centre of mass
    color("magenta") translate([0, com_y, -com_depth]) sphere(r = 3, $fn = 16);
}
