// =====================================================================
//  stand_solver.scad - kickstand geometry + stability calculator.
//
//  2D side-view model (the stand sits on the centre line, the device is
//  symmetric). Device frame: v = height (Y), w = depth behind the front
//  face (-Z). World frame: table is horizontal, x forward (screen side),
//  y up. "Screen angle" theta = angle between the screen and the table.
//
//  For every target angle it finds the kickstand opening angle phi whose
//  foot touches the table, then checks:
//    * the centre of mass lies between the two supports (stable)
//    * how much of the weight the stand carries
//    * the torque on the hinge vs. the estimated detent holding torque
//  The detent notches in the cam are generated from these phi values.
// =====================================================================

function _wy(v, w, t) =  v * sin(t) - w * cos(t);
function _wx(v, w, t) = -v * cos(t) - w * sin(t);
function _n180(a) = let(b = a % 360) b > 180 ? b - 360 : (b <= -180 ? b + 360 : b);

// Lowest point of the CASE (device grown by CT) at tilt t: [y, x]
function dev_lowest(t) = let(
    cs = [for (c = side_circles(CT)) [_wy(c[0], c[1], t) - c[2], _wx(c[0], c[1], t)]],
    es = [for (e = side_ellipses(CT))
            let(N  = sqrt(pow(e[2] * sin(t), 2) + pow(e[3] * cos(t), 2)),
                vv = e[0] - e[2] * e[2] * sin(t) / N,
                ww = e[1] + e[3] * e[3] * cos(t) / N)
            [_wy(vv, ww, t), _wx(vv, ww, t)]],
    all = concat(cs, es),
    ys  = [for (p = all) p[0]],
    m   = min(ys),
    i   = search(m, ys)[0]
) all[i];

// hinge axis & foot in the device frame
KS_A  = -(kick_length - FOOT_R);   // foot centre along the plate (K frame y)
KS_B  = KZ_MID;                    // foot centre K frame z
W_H   = W_BASE + HA;

function foot_vw(phi, L = kick_length) = let(a = -(L - FOOT_R), b = KS_B) [
    kick_hinge_y + a * cos(phi) + b * sin(phi),
    W_H - a * sin(phi) + b * cos(phi)
];

// all phi (deg) that put the foot on the table at screen angle t
function phi_candidates(t, L = kick_length) = let(
    low = dev_lowest(t),
    a   = -(L - FOOT_R), b = KS_B,
    K0  = _wy(kick_hinge_y, W_H, t),
    Q   = low[0] + FOOT_R - K0,
    rho = sqrt(a * a + b * b),
    dl  = atan2(b, a)
) (abs(Q / rho) > 1) ? [] :
    [ _n180(dl + asin(Q / rho) - t), _n180(dl + 180 - asin(Q / rho) - t) ];

// Evaluate one (t, phi): [phi, stable, margin_back, margin_front, F_stand_N,
//                          hinge_torque_Nmm, opens(bool), x_foot, x_contact, x_com]
function stand_eval(t, phi, L = kick_length) = let(
    low = dev_lowest(t),
    f   = foot_vw(phi, L),
    xf  = _wx(f[0], f[1], t),
    xp  = low[1],
    xc  = _wx(com_y, com_depth, t),
    xh  = _wx(kick_hinge_y, W_H, t),
    stable = (xf - xc) * (xp - xc) < 0,
    Fs  = stable ? MASS_N * (xc - xp) / (xf - xp) : 0,
    tau = Fs * abs(xf - xh),
    a   = -(L - FOOT_R), b = KS_B, psi = t + phi,
    dydphi = a * cos(psi) + b * sin(psi)
) [phi, stable, abs(xf - xc), abs(xp - xc), Fs, tau, dydphi > 0, xf, xp, xc];

// Largest opening before the plate (in the cam slab) would touch the detent
// strip: scan phi and test the strip's corner points against the plate slab.
function _slab_hits(phi, pts) =
    min([for (p = pts) p[0] * sin(phi) + p[1] * cos(phi)]) < KZ_OUT + 0.4;
_STRIP_PTS = [[R_CAM, -NUB_HALF_W], [R_CAM, NUB_HALF_W],
              [STRIP_Y0, -detent_strip_w / 2], [STRIP_Y0, detent_strip_w / 2]];
_HITS = [for (p = [60 : 0.5 : 178]) if (_slab_hits(p, _STRIP_PTS)) p];
PHI_LIMIT = (len(_HITS) > 0 ? _HITS[0] : 178) - 3;

// Best solution for one target angle (or undef)
function stand_solve(t, L = kick_length) = let(
    sols = [for (p = phi_candidates(t, L)) if (p > 2 && p < PHI_LIMIT)
                let(e = stand_eval(t, p, L)) if (e[1]) e],
    best = len(sols) == 0 ? undef :
           (len(sols) == 1 ? sols[0] :
            (min(sols[0][2], sols[0][3]) >= min(sols[1][2], sols[1][3]) ? sols[0] : sols[1]))
) best;

KICK_SOLUTIONS = [for (t = kick_target_angles) stand_solve(t)];
KICK_PHIS      = [for (s = KICK_SOLUTIONS) if (!is_undef(s)) s[0]];
KICK_PHI_MAX   = len(KICK_PHIS) > 0 ? max(KICK_PHIS) : 60;
// closed notch sits slightly "past" closed so the detent presses the stand
// onto the shell (contact near the bottom of the flat back) -> no rattle
KICK_CLOSED_NOTCH_DEG = -(atan(kick_gap / (kick_hinge_y - body_bottom_y - body_back_edge_r))
                          + kick_closed_preload_deg);
KICK_PHI_STOP  = min(KICK_PHI_MAX + kick_stop_margin_deg, PHI_LIMIT);

// ---- detent strength estimate ----------------------------------------
STRIP_I   = detent_strip_w * pow(detent_strip_t, 3) / 12;
STRIP_K   = 48 * strip_E_MPa * STRIP_I / pow(STRIP_SPAN, 3);           // N/mm
DET_N_MAX = STRIP_K * (detent_preload + detent_notch_depth);           // N
DET_MU    = 0.2;
DET_TANB  = tan(NOTCH_FLANK_DEG);
DET_TORQUE= DET_N_MAX * (DET_TANB + DET_MU) / max(0.05, 1 - DET_MU * DET_TANB) * R_CAM; // N*mm
STRIP_SIGMA = (DET_N_MAX * STRIP_SPAN / 4) * (detent_strip_t / 2) / STRIP_I;      // MPa

// ---- scan kick_length for the design assistant -------------------------
function _len_ok(L) = let(r = [for (t = kick_target_angles) stand_solve(t, L)])
    len([for (x = r) if (is_undef(x) || min(x[2], x[3]) < 4) 1]) == 0;
KICK_L_MAX_FIT = kick_hinge_y - kick_min_foot_y;
KICK_L_OK = [for (L = [24 : 2 : KICK_L_MAX_FIT]) if (_len_ok(L)) L];

module stand_report() {
    echo("==================== KICKSTAND REPORT ====================");
    echo(str("hinge axis Y=", kick_hinge_y, "  length=", kick_length,
             "  foot (closed) at Y=", kick_hinge_y - kick_length,
             "  (limit ", kick_min_foot_y, ")"));
    for (i = [0 : len(kick_target_angles) - 1]) {
        t = kick_target_angles[i];
        s = KICK_SOLUTIONS[i];
        low = dev_lowest(t);
        if (is_undef(s))
            echo(str("  ", t, " deg : NO STABLE SOLUTION  (candidates phi=",
                     phi_candidates(t), ")  -> change kick_length / kick_hinge_y"));
        else
            echo(str("  ", t, " deg : open stand to ", round(s[0] * 10) / 10,
                     " deg | back margin ", round(s[2]), " mm, front margin ", round(s[3]),
                     " mm | stand load ", round(s[4] * 10) / 10, " N | hinge torque ",
                     round(s[5]), " Nmm (", s[6] ? "opens" : "closes", ") | detent ",
                     round(DET_TORQUE), " Nmm => ",
                     DET_TORQUE >= s[5] ? "HOLDS" : "WEAK - raise preload / strip_t"));
    }
    echo(str("  hard stop (cheek wedge faces) at ", round(KICK_PHI_STOP * 10) / 10,
             " deg; geometric limit ", PHI_LIMIT, " deg"));
    echo(str("  detent strip: k=", round(STRIP_K * 10) / 10, " N/mm, peak force ",
             round(DET_N_MAX * 10) / 10, " N, bending stress ", round(STRIP_SIGMA),
             " MPa (allow ", strip_allow_MPa, ") ",
             STRIP_SIGMA > strip_allow_MPa ? "<-- TOO HIGH: thinner strip or less preload" : "OK"));
    echo(str("  kick_length values that give margin >= 4 mm at every angle: ", KICK_L_OK));
    echo("  NOTE: estimates from the [MEASURE] placeholders + COM guess. Verify with Test 5.");
    echo("===========================================================");
}
