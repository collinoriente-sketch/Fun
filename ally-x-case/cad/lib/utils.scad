// =====================================================================
//  utils.scad - small geometry helpers. No top-level geometry.
// =====================================================================

// Facet counts, switched by QUALITY
FN_BIG   = (QUALITY == "final") ? 96 : 40;   // large revolutions
FN_SMALL = (QUALITY == "final") ? 32 : 16;   // small tubes / holes (multiple of 4 -> exact flats)
FN_ELL   = (QUALITY == "final") ? 48 : 20;   // ellipsoids (multiple of 4)

EPS = 0.01;
BIG = 1000;

function clamp(x, a, b) = min(max(x, a), b);
function deg(r) = r * 180 / PI;

// Torus "rounded disc" hull element: outer radius R, edge (tube) radius r.
// Centred at the origin, axis = Z. hull() of several of these gives a
// rounded slab with front-view corner radius R and edge radius r.
module rdisc(R, r) {
    if (R - r < 0.05)
        sphere(r = max(r, R), $fn = FN_SMALL);
    else
        // filled profile (it is always used inside hull()), clipped to x >= 0
        rotate_extrude($fn = FN_BIG)
            intersection() {
                hull() {
                    translate([R - r, 0]) circle(r = r, $fn = FN_SMALL);
                    translate([0, -r]) square([EPS, 2 * r]);
                }
                translate([0, -BIG / 2]) square(BIG);
            }
}

// Ellipsoid
module ellipsoid(rx, ry, rz) {
    scale([rx, ry, rz]) sphere(r = 1, $fn = FN_ELL);
}

// 2D rounded rectangle, corner radius r, from (x0,y0) to (x1,y1)
module rrect2d(x0, y0, x1, y1, r) {
    rr = min(r, (x1 - x0) / 2 - EPS, (y1 - y0) / 2 - EPS);
    if (rr <= 0.01)
        translate([x0, y0]) square([x1 - x0, y1 - y0]);
    else
        hull() for (x = [x0 + rr, x1 - rr], y = [y0 + rr, y1 - rr])
            translate([x, y]) circle(r = rr, $fn = FN_SMALL);
}

// Rounded box whose vertical (Z) edges are rounded
module rbox_z(x0, y0, z0, x1, y1, z1, r) {
    translate([0, 0, z0]) linear_extrude(z1 - z0) rrect2d(x0, y0, x1, y1, r);
}

// Rounded box whose Y-direction edges are rounded (used for top-edge cut-outs)
module rbox_y(x0, y0, z0, x1, y1, z1, r) {
    // profile in X-Z, extruded along Y
    translate([0, y1, 0]) rotate([90, 0, 0])
        linear_extrude(y1 - y0) rrect2d(x0, z0, x1, z1, r);
}

// Rounded box whose X-direction edges are rounded
module rbox_x(x0, y0, z0, x1, y1, z1, r) {
    translate([x0, 0, 0]) rotate([90, 0, 90])
        linear_extrude(x1 - x0) rrect2d(y0, z0, y1, z1, r);
}

// Horizontal hole along X that prints without support when +Z is up:
// a circle with a 45-degree "teardrop" point towards +Z.
module teardrop_x(d, h, center = true) {
    rotate([0, 90, 0]) rotate([0, 0, 0])
        linear_extrude(h, center = center)
            teardrop2d(d);
}
// 2D teardrop in the plane that becomes Y/Z after rotate([0,90,0]);
// the point faces -X of the 2D plane, which maps to +Z in 3D.
module teardrop2d(d) {
    r = d / 2;
    hull() {
        circle(r = r, $fn = FN_SMALL);
        translate([-r * sqrt(2), 0]) square(EPS, center = true);
    }
}

// Hexagon (nut) prism, axis Z, af = across flats
module hex_prism(af, h, center = false) {
    cylinder(d = af / cos(30), h = h, $fn = 6, center = center);
}

// Countersunk M3 screw clearance, head at z=0 opening towards -Z,
// shank towards +Z. csk = 90 degrees.
module csk_hole(d, head_d, len, recess = 0) {
    union() {
        translate([0, 0, -BIG / 2]) cylinder(d = head_d, h = BIG / 2 + recess, $fn = FN_SMALL);
        translate([0, 0, recess]) cylinder(d1 = head_d, d2 = 0, h = head_d / 2, $fn = FN_SMALL);
        cylinder(d = d, h = len, $fn = FN_SMALL);
    }
}

// Engraved / embossed label
module label(txt, size = 4, h = 0.6) {
    linear_extrude(h)
        text(txt, size = size, halign = "center", valign = "center",
             font = "Liberation Sans:style=Bold");
}

// Quick axis-aligned debug arrow for DEBUG_MODE
module debug_line(p0, p1, d = 0.6) {
    hull() {
        translate(p0) sphere(d = d, $fn = 8);
        translate(p1) sphere(d = d, $fn = 8);
    }
}
