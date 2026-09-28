// =====================================================================
//  ROG Xbox Ally X  -  Protective Shell + Folding Kickstand
//  params.scad  -  SINGLE SOURCE OF TRUTH FOR EVERY DIMENSION
// =====================================================================
//
//  Every other .scad file includes this file first. Change numbers HERE.
//
//  Each value is tagged:
//    [SPEC]     Published by ASUS / Microsoft. Verified.
//    [MEASURE]  NOT verified. A placeholder estimate so the model renders.
//               You MUST measure your Ally X and replace it before a final
//               print. See documentation/MEASUREMENT_CHECKLIST.md.
//    [TEST]     Tolerance. Find the right value with the test_fit.scad prints.
//    [DESIGN]   Design choice. Safe to tweak.
//
//  COORDINATE SYSTEM (device frame, mm)
//    X : width.  0 = centre. +X = RIGHT side when you LOOK AT THE SCREEN.
//    Y : height. 0 = lowest point of the grips. +Y = up (top edge, ports).
//    Z : depth.  0 = front face (screen plane). The device body is at -Z.
//    So "the back of the device" is at negative Z.
// =====================================================================


// ---------------------------------------------------------------------
// 0. GLOBAL SWITCHES
// ---------------------------------------------------------------------
DEBUG_MODE = false;      // [DESIGN] true = ghost device, clearance zones,
                         //   dimension report in the console.
QUALITY    = "draft";    // [DESIGN] "draft" (fast preview) or "final" (STL export)


// ---------------------------------------------------------------------
// 1. DEVICE - OVERALL  (published specifications)
// ---------------------------------------------------------------------
device_width  = 290.8;   // [SPEC] overall width incl. grips
device_height = 121.5;   // [SPEC] overall height incl. grips
device_depth  = 50.7;    // [SPEC] overall thickness (deepest point, at the grips)
device_mass_g = 715;     // [SPEC] mass in grams


// ---------------------------------------------------------------------
// 2. DEVICE - CENTRE BODY  (the slab between the grips)
// ---------------------------------------------------------------------
body_depth        = 25.0;  // [MEASURE] M1  front face -> flat back, at X=0
body_bottom_y     = 18.0;  // [MEASURE] M2  = device_height - (centre height at X=0)
body_top_corner_r = 14.0;  // [MEASURE] M3  front-view radius of the top-outer corners
body_front_edge_r = 1.5;   // [MEASURE] M4  edge radius, front face -> side walls
body_back_edge_r  = 6.0;   // [MEASURE] M5  edge radius, flat back -> top/bottom edges


// ---------------------------------------------------------------------
// 3. DEVICE - GRIPS  (right grip; left grip is mirrored)
//    Front view = device lying screen-up, looking straight down.
//    Distances "from end" are measured inward from the outer end (X = +/-W/2).
// ---------------------------------------------------------------------
grip_bottom_r       = 26.0;  // [MEASURE] M6  front-view radius of the grip bottom curve
grip_bottom_from_end= 40.0;  // [MEASURE] M7  outer end -> lowest point of the grip (X)
grip_end_low_y      = 50.0;  // [MEASURE] M8  height where the straight outer end
                             //               starts curving into the grip bottom
grip_end_r          = 16.0;  // [MEASURE] M9  front-view radius of that lower-outer corner
grip_blend_from_end = 100.0; // [MEASURE] M10 outer end -> where the grip's inner edge
                             //               meets the centre bottom edge
grip_slab_depth     = 30.0;  // [MEASURE] M11 thickness of the grip at its bottom (side view)
grip_edge_r         = 8.0;   // [MEASURE] M12 back-edge radius around the grip bottom

// Rounded back of the grip ("bulge") - modelled as an ellipsoid
grip_bulge_from_end = 45.0;  // [MEASURE] M13 outer end -> deepest point of grip back (X)
grip_bulge_y        = 48.0;  // [MEASURE] M14 height of the deepest point of grip back
grip_bulge_rx       = 30.0;  // [MEASURE] M15 half-width of the rounded grip back (top view)
grip_bulge_ry       = 36.0;  // [MEASURE] M16 half-height of the rounded grip back (side view)
grip_bulge_rz       = 22.0;  // [MEASURE] M17 depth of the rounded part (side view)
                             //   deepest point is at Z = -device_depth

// Shoulders (top-outer region that houses the triggers)
shoulder_depth      = 32.0;  // [MEASURE] M18 depth at the top-outer corner, EXCLUDING
                             //               the moving triggers
shoulder_w          = 75.0;  // [MEASURE] M19 X extent of that deeper region, from end
shoulder_h          = 28.0;  // [MEASURE] M20 Y extent of that region, from the top edge
shoulder_r          = 10.0;  // [MEASURE] M21 rounding of that region


// ---------------------------------------------------------------------
// 4. DEVICE - FEATURES THAT MUST STAY CLEAR
// ---------------------------------------------------------------------
// 4a. Top edge.  Verified: ALL I/O is on the top edge (USB4, USB-C 3.2,
//     microSD UHS-II, 3.5 mm jack, power/fingerprint, volume) plus the
//     exhaust vents (incl. a centre display vent). Their exact positions
//     are NOT verified, so by default the whole top edge between the
//     shoulders is left OPEN (max cooling, guaranteed access).
top_wall_mode = "open";      // [DESIGN] "open"     = no top wall between shoulders
                             //          "features" = top wall with the cut-outs listed
                             //                       in top_features (measure first!)
top_open_half_width = 80;    // [DESIGN] "open" mode: |X| range opened (mm from centre)

// "features" mode list. [name, x_centre, width, z_centre, z_height]
//   x_centre : +X = right when looking at the screen
//   z_centre : negative, measured from the front face into the top edge
// ALL VALUES BELOW ARE [MEASURE] PLACEHOLDERS - check with Test 3.
top_features = [
  ["exhaust_L",   -52, 40, -15, 14],
  ["display_vent",  0, 24, -12, 10],
  ["exhaust_R",    52, 40, -15, 14],
  ["usb4",        -18, 12, -10,  7],
  ["usb_c",        18, 12, -10,  7],
  ["microsd",     -30, 16,  -6,  5],
  ["jack_3_5",     30,  9, -10,  9],
  ["power_fp",     66, 16, -12, 10],
  ["volume",       80, 22, -12, 10],
];
feature_margin = 1.5;        // [DESIGN] extra opening around every top feature
                             //          (plug housings are wider than the port!)

// 4b. Shoulder buttons (LB/RB bumpers + LT/RT impulse triggers).
//     Cut region per side, measured from the outer end.
shoulder_cut_from_end_outer = 6;   // [MEASURE] M22 keep this much corner post at the
                                   //   very end (set 0 if the bumper reaches the end)
shoulder_cut_from_end_inner = 82;  // [MEASURE] M23 inner edge of bumper+trigger zone
shoulder_cut_drop           = 30;  // [MEASURE] M24 how far down the back the triggers
                                   //   reach at full pull (+ margin)

// 4c. Rear intake grilles on the centre back.
//     [x_centre, y_centre, width, height, corner_r]  - [MEASURE] M25..M26
rear_vents = [
  [-44, 92, 40, 30, 6],
  [ 44, 92, 40, 30, 6],
];
vent_margin      = 3.0;      // [DESIGN] opening larger than the grille on every side
vent_window_style= "open";   // [DESIGN] "open" (best airflow) or "honeycomb"

// 4d. Rear programmable buttons (on the grip backs). Checked against the grip
//     windows. [x_from_end, y_centre, width, height]  - [MEASURE] M27
rear_buttons = [
  [42, 70, 16, 22],
];

// 4e. Optional features on the outer ends / bottom (none found in reviews:
//     the bottom is described as portless). [y_centre, z_centre, h, zh]
end_features    = [];        // [MEASURE] M28 confirm the ends are bare
bottom_features = [];        // [MEASURE] M29 [x_centre, z_centre, w, zh]

// 4f. Front face: how much flat margin is there between the outer edge and the
//     screen / speaker grilles / buttons at the clip locations?
front_margin_bottom = 4.0;   // [MEASURE] M30 at the bottom-centre clip positions
front_margin_end    = 5.0;   // [MEASURE] M31 at the outer-end clip positions


// ---------------------------------------------------------------------
// 5. CENTRE OF MASS  (used only by the kickstand stability calculator)
// ---------------------------------------------------------------------
com_y = 60;   // [MEASURE] M32 height of the balance point (see checklist)
com_depth = 16; // [MEASURE] M33 depth of the COM behind the front face (estimate)


// ---------------------------------------------------------------------
// 6. SHELL
// ---------------------------------------------------------------------
wall_clearance   = 0.35;  // [TEST]   gap between device and shell inner surface
shell_thickness  = 2.4;   // [DESIGN] base wall (6 perimeters @0.4)
corner_boost     = 1.2;   // [DESIGN] extra thickness on the 4 impact corners
corner_zone_r    = 24;    // [DESIGN] size of the reinforced corner zones
wall_top_z       = 0.6;   // [DESIGN] rim height above the front face
edge_wrap        = 9.0;   // [DESIGN] how far the shell wraps onto the grip backs
grip_window_from_end = 90;// [DESIGN] grip back left open from this X (from end) outward
grip_window_round = 6;    // [DESIGN] corner radius of the grip windows

split_x          = 36;    // [DESIGN] |X| of the split lines. Keep it inside the flat
                          //   centre back (< W/2 - grip_blend_from_end - 8) so the
                          //   centre part prints flat on its back.
joint_clearance  = 0.15;  // [TEST]   dovetail key clearance (per side)
joint_keys_y     = [30, 50, 68]; // [DESIGN] key positions along each split line
joint_key        = [5.5, 8.5, 6]; // [DESIGN] neck width, head width, length

// TPU anti-scratch / anti-rattle pads (pockets in the inner surface)
pad_pocket_depth = 0.6;   // [DESIGN]
pad_thickness    = 1.0;   // [TEST]   pad protrudes (pad_thickness - pad_pocket_depth)
pad_size         = [14, 10];
back_pads        = [[-30, 36], [30, 36], [0, 102]];   // [x, y] on the centre back
end_pads_yz      = [[84, -12]];                       // [y, z] on both end walls


// ---------------------------------------------------------------------
// 7. FRONT RETENTION CLIPS (replaceable)
// ---------------------------------------------------------------------
// wall: "bottom" (centre bottom edge), "top" (only with top_wall_mode="features"),
//       "left" / "right" (outer ends). pos = X for top/bottom, Y for the ends.
clip_positions = [
  ["bottom", -30], ["bottom", 30],
  ["left",   92],  ["right",  92],
];
clip_width      = 10;    // [DESIGN]
clip_thickness  = 1.8;   // [DESIGN] spine thickness (flexes on install)
clip_lip_t      = 1.6;   // [DESIGN] thickness of the lip over the front face
clip_lip_reach  = 2.6;   // [DESIGN] lip overlap onto the front face (< front margins!)
clip_lip_gap    = 0.05;  // [TEST]   lip-to-front-face gap (negative = preload)
clip_spine_len  = 14;    // [DESIGN] spine length (longer = softer snap)
clip_catch_depth= 0.9;   // [TEST]   barb engagement depth
clip_catch_angle= 60;    // [TEST]   catch face angle (90 = locked, 45 = easy release)
snap_clearance  = 0.20;  // [TEST]   clip-in-pocket clearance


// ---------------------------------------------------------------------
// 8. KICKSTAND
// ---------------------------------------------------------------------
kick_target_angles = [30, 45, 60]; // [DESIGN] screen angle from the table (deg)
kick_hinge_y     = 58;    // [DESIGN] height of the hinge axis (device frame Y)
kick_length      = 52;    // [DESIGN] hinge axis -> foot tip
kick_width_foot  = 64;    // [DESIGN] width at the foot
kick_thickness   = 6.0;   // [DESIGN]
kick_gap         = 1.0;   // [DESIGN] air gap between closed kickstand and shell back
kick_frame_width = 9;     // [DESIGN] rim width if kick_window = true
kick_window      = true;  // [DESIGN] open frame (lighter, lets air through)
kick_min_foot_y  = 3;     // [DESIGN] closed foot may hang below the centre body
                          //   (between the grips) but never below this Y
kick_closed_preload_deg = 1.5; // [DESIGN] detent pulls the closed stand onto its
                               //   stand-offs -> no rattle
kick_stop_margin_deg = 0; // [DESIGN] hard stop this far beyond the largest opening.
                          //   0 = the largest opening is held by the HARD STOP
                          //   (positive lock), the others by detents.
kick_foot_pad    = true;  // [DESIGN] groove for a TPU anti-slip foot strip


// ---------------------------------------------------------------------
// 9. HINGE  (printed cheeks + metal pin + replaceable detent spring)
// ---------------------------------------------------------------------
hinge_pin_diameter   = 3.0;  // [DESIGN] 3.0 = M3 bolt or 3 mm steel rod/drill blank
pin_is_bolt          = true; // [DESIGN] true: M3x50 SHCS + M3 nyloc. false: rod + caps
pin_bolt_length      = 50;   // [DESIGN] bolt length under the head
pin_head_d           = 5.5;  // [DESIGN] SHCS head diameter (M3 = 5.5)
pin_head_h           = 3.0;  // [DESIGN]
nut_af               = 5.5;  // [DESIGN] M3 nut across flats
nyloc_h              = 4.0;  // [DESIGN] M3 nyloc height
pin_clearance_rot    = 0.30; // [TEST] cheek bore (rotating fit)
pin_clearance_snug   = 0.10; // [TEST] kickstand knuckle bore (pin turns with stand)
knuckle_wall         = 2.6;  // [DESIGN]
knuckle_gap          = 0.30; // [TEST]   axial gap between knuckles and cheeks
cam_width            = 12;   // [DESIGN] centre (detent) knuckle width
cheek_width          = 11;   // [DESIGN]
outer_knuckle_width  = 9;    // [DESIGN]
cam_extra_r          = 1.0;  // [DESIGN] detent cam radius beyond the knuckle radius
cheek_len            = 22;   // [DESIGN] cheek length above the axis
mount_screw_d        = 3.2;  // [DESIGN] M3 countersunk, from inside the shell
mount_csk_d          = 6.4;
mount_head_recess    = 0.3;  // [DESIGN] head sits this far below the inner surface
mount_screw_len      = 10;   // [DESIGN] M3x10 countersunk

// Detent spring strip (separate, replaceable part - print in PETG)
detent_strip_t       = 1.3;  // [TEST]  thickness (1.1 soft / 1.3 med / 1.5 firm)
detent_strip_w       = 6.0;  // [DESIGN]
detent_nub_h         = 1.0;  // [DESIGN] nub height
detent_notch_depth   = 0.5;  // [TEST]  notch depth in the cam
detent_preload       = 0.2;  // [TEST]  nominal preload set with the 2 screws (mm)
detent_pocket_depth  = 4.5;  // [DESIGN] how far strip ends sit inside the cheeks
detent_travel        = 1.5;  // [DESIGN] preload screw travel
preload_screw_d      = 2.7;  // [DESIGN] M3 self-tapping pilot
strip_E_MPa          = 2000; // [DESIGN] PETG ~2000, PLA ~3000 (used in the report)
strip_allow_MPa      = 40;   // [DESIGN] PETG allowable bending stress (report)

// Friction washers (optional, TPU)
use_friction_washers = false;
washer_t             = 0.8;

// ---------------------------------------------------------------------
// 10. PRINTING
// ---------------------------------------------------------------------
print_bed = [220, 220];   // [DESIGN] your bed size - the shell report warns if a part
                          //   does not fit (use PART = "one_piece" on beds >= 300 mm)
