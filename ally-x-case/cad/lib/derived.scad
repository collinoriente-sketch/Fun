// =====================================================================
//  derived.scad - values computed from params.scad. Do not edit;
//  change params.scad instead.
// =====================================================================

C  = wall_clearance;
T  = shell_thickness;
CT = C + T;

// Outer surface of the centre back (device frame Z, negative)
Z_BACK_OUT = -(body_depth + CT);
W_BASE     = body_depth + CT;          // same, as a positive depth

// ---- hinge ----
PIN_D      = hinge_pin_diameter;
R_K        = PIN_D / 2 + pin_clearance_rot / 2 + knuckle_wall;  // knuckle radius
HA         = R_K + 0.4;                // hinge axis height above the shell back
R_CAM      = R_K + cam_extra_r;        // detent cam radius
KG         = use_friction_washers ? washer_t : knuckle_gap;

// X layout of the hinge, from the centre outwards (K frame, symmetric)
X_CAM      = cam_width / 2;
X_CHEEK_IN = X_CAM + KG;
X_CHEEK_OUT= X_CHEEK_IN + cheek_width;
X_OUT_IN   = X_CHEEK_OUT + KG;
X_OUT_OUT  = X_OUT_IN + outer_knuckle_width;
HINGE_SPAN = 2 * X_OUT_OUT;

// pin (bolt) recesses so the bolt end is flush with the nut side
HEAD_RECESS = HINGE_SPAN - pin_bolt_length;
NUT_RECESS  = nyloc_h + 0.2;

// kickstand plate in the K frame (axis = origin, closed plate along -Y,
// outward = +Z)
KZ_IN   = kick_gap - HA;                    // inner face (towards the shell)
KZ_OUT  = kick_gap + kick_thickness - HA;   // outer face
KZ_MID  = (KZ_IN + KZ_OUT) / 2;
FOOT_R  = kick_thickness / 2;
KICK_WIDTH_TOP = HINGE_SPAN;

// Detent strip (K frame: above the cam, +Y)
STRIP_Y0   = R_CAM + detent_nub_h;          // strip underside at zero preload
STRIP_Y1   = STRIP_Y0 + detent_strip_t;     // strip top
STRIP_SPAN = cam_width + 2 * KG + detent_pocket_depth;  // between preload screws
STRIP_LEN  = cam_width + 2 * KG + 2 * detent_pocket_depth - 0.6;

// Detent notch geometry
NOTCH_FLANK_DEG = 50;                        // flank angle of the V notch
NOTCH_HALF_W    = detent_notch_depth / tan(NOTCH_FLANK_DEG) + 0.5;

// Plate notch radius around the cheeks (plate material only beyond this)
R_NOTCH    = R_K + 0.4;
NUB_HALF_W = detent_nub_h / tan(NOTCH_FLANK_DEG) + 0.35;

// mass incl. an estimated case mass
CASE_MASS_EST_G = 140;
MASS_N = (device_mass_g + CASE_MASS_EST_G) / 1000 * 9.81;
