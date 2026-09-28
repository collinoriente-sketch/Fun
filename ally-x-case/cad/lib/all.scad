// Includes every library in dependency order. Include params.scad first.
include <utils.scad>
include <device.scad>
include <derived.scad>
include <stand_solver.scad>
include <hinge_lib.scad>
include <kickstand_lib.scad>
include <shell_lib.scad>

// Kickstand + hinge in place on the shell (world frame), opened to phi
module kickstand_assembly(phi = 0) {
    to_hinge_k() {
        hinge_cheeks();
        detent_strip();
        hinge_pin();
        rotate([-phi, 0, 0]) { kickstand_k(); if (kick_foot_pad) kick_foot_sleeve(); }
    }
}
module kickstand(phi = 0) { to_hinge_k() rotate([-phi, 0, 0]) kickstand_k(); }
module hinge()            { to_hinge_k() { hinge_cheeks(); detent_strip(); hinge_pin(); } }

// DEBUG overlays in the world frame
module debug_overlay() {
    device_ghost();
    debug_zones();
    // hinge axis
    color("red") to_hinge_k() rotate([0, 90, 0]) cylinder(d = 0.8, h = 80, center = true, $fn = 8);
}
