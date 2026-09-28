# ROG Xbox Ally X – Measurement Checklist

The model renders out of the box, but **only 4 numbers are verified** (published
specs). Every other device dimension in `cad/params.scad` is tagged `[MEASURE]` and
is a **placeholder estimate**. Measure your Ally X and replace them before you
print anything bigger than the test pieces.

## What is verified vs. what is not

| Status | Value | Source |
|---|---|---|
| ✅ Verified | Overall size 290.8 × 121.5 × 50.7 mm, 715 g | ASUS/Microsoft spec sheet (quoted in reviews and retailer listings) |
| ✅ Verified | All I/O is on the **top edge**: USB4 (TB4-compatible) Type-C, USB-C 3.2 Gen 2, microSD UHS-II, 3.5 mm jack, power button with fingerprint reader, volume buttons | Reviews (Windows Central, TechPowerUp, Stevivor) |
| ✅ Verified | Cooling: intake through **two large grilles on the back** (with dust filters, one shaped like the ROG logo), exhaust through the **top edge**, including a centre vent | TechPowerUp / teardown write-ups |
| ✅ Verified | **Bottom edge has no ports**. Speakers are **front-facing**. Two programmable **rear buttons** on the grip backs. Impulse triggers. | Reviews |
| ❌ Not verified | *Positions and sizes* of every port, button, grille and vent; body thickness; grip shape; corner radii; centre of mass | → measure (this document) |

> Wherever I could not verify a number I did **not** present it as confirmed. It is a
> clearly labeled parameter, and this sheet tells you how to measure it.

## Tools

* Digital calipers (essential)
* A ruler, a pencil, sheets of paper, tape
* A radius gauge set **or** some coins (US quarter Ø24.26 mm, US penny Ø19.05 mm,
  €1 Ø23.25 mm, €2 Ø25.75 mm) to match curves
* Optional: a contour (profile) gauge – very helpful for the grips
* A phone camera held straight above the device (for tracing)

## Coordinate reminders

* **X** = width, measured from the centre. **+X = right side while you look at the screen.**
* **Y** = height, **0 = the lowest point of the grips** (put the device face-down on the
  table with the grips toward you; the grip bottoms touch a ruler laid along the table).
* **Z** = depth, 0 = the front face (screen plane), going backwards.
* "from end" = measured inward from the outer end (left or right tip) of the device.

## Step 0 – confirm the specs (2 min)

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M0a | Overall width (tip to tip) | `device_width` | 290.8 | |
| M0b | Overall height (grip bottom to top edge) | `device_height` | 121.5 | |
| M0c | Maximum thickness (front face to deepest point of the grip) | `device_depth` | 50.7 | |

If yours differ by more than 0.5 mm, use your values.

## Step 1 – trace the front outline (10 min)

Lay the device **screen down** on a sheet of paper (put a microfibre cloth under the screen
first) and trace around it with a sharp pencil held vertically. Remove the device. You now
have the front silhouette. Take M2, M3, M6–M10 from the tracing.

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M2 | Height of the **centre body** at X = 0 (top edge to centre bottom edge). Enter `device_height − this` | `body_bottom_y` | 18.0 | |
| M3 | Radius of the top-outer corners (match a coin/radius gauge) | `body_top_corner_r` | 14 | |
| M6 | Radius of the rounded grip bottom | `grip_bottom_r` | 26 | |
| M7 | From the outer end to the lowest point of the grip (X) | `grip_bottom_from_end` | 40 | |
| M8 | Height (Y) where the straight outer end starts to curve into the grip bottom | `grip_end_low_y` | 50 | |
| M9 | Radius of that lower-outer corner | `grip_end_r` | 16 | |
| M10 | From the outer end to where the grip's inner edge meets the straight centre bottom edge | `grip_blend_from_end` | 100 | |

## Step 2 – calipers on the body (5 min)

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M1 | Thickness at the centre (front face to the flat back, X = 0, mid-height) | `body_depth` | 25.0 | |
| M4 | Edge radius where the front face turns into the edges (small, 1–2 mm) | `body_front_edge_r` | 1.5 | |
| M5 | Edge radius where the flat back turns into the top/bottom edges | `body_back_edge_r` | 6 | |
| M11 | Grip thickness near its bottom (front face to back, ~10 mm above the lowest point) | `grip_slab_depth` | 30 | |
| M12 | Edge radius around the back of the grip bottom | `grip_edge_r` | 8 | |

**Tip for radii:** if unsure, choose the **smaller** radius. A smaller radius makes the
cavity slightly roomier at that edge, never tighter.

## Step 3 – the grip backs (10 min, contour gauge helps)

The grip backs are modelled as an ellipsoid. Look at the device **from the side** (outer end)
and **from below**.

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M13 | From the outer end to the deepest point of the grip back (X) | `grip_bulge_from_end` | 45 | |
| M14 | Height (Y) of that deepest point | `grip_bulge_y` | 48 | |
| M15 | Half the X-width of the rounded grip back (seen from below) | `grip_bulge_rx` | 30 | |
| M16 | Half the height of the rounded grip back (seen from the side) | `grip_bulge_ry` | 36 | |
| M17 | How far the rounded part reaches forward from the deepest point (side view) | `grip_bulge_rz` | 22 | |

The shell does **not** cover the grip backs (they stay open for your hands and the rear
buttons), so these values mainly control the edge bands and the kickstand calculator.

## Step 4 – shoulders, triggers, bumpers (5 min)

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M18 | Thickness at the top-outer corner, front face to the back of the trigger housing (triggers released, not counting the trigger itself) | `shoulder_depth` | 32 | |
| M19 | X-extent of that deeper region, from the end | `shoulder_w` | 75 | |
| M20 | Y-extent of that region, from the top edge down | `shoulder_h` | 28 | |
| M21 | Its rounding radius | `shoulder_r` | 10 | |
| M22 | Width of plastic at the very tip of the top edge **before** the bumper starts (set 0 if the bumper reaches the tip) | `shoulder_cut_from_end_outer` | 6 | |
| M23 | From the end to the inner edge of the bumper/trigger zone (**add 3 mm**) | `shoulder_cut_from_end_inner` | 82 | |
| M24 | How far down the back a **fully pulled** trigger reaches from the top edge (**add 3 mm**) | `shoulder_cut_drop` | 30 | |

## Step 5 – vents, rear buttons, top edge (10 min)

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M25 | Each rear intake grille: centre X, centre Y, width, height, corner radius | `rear_vents` | `[±44, 92, 40, 30, 6]` | |
| M26 | Confirm the grilles are the only intake openings on the back | – | – | |
| M27 | Each rear button: distance from end to its centre, centre Y, width, height | `rear_buttons` | `[42, 70, 16, 22]` | |
| M28 | Anything on the left/right ends? (lanyard hole, vent, mic) | `end_features` | none | |
| M29 | Anything on the bottom edge? (mic hole, vent) | `bottom_features` | none | |
| M34 | **Only for `top_wall_mode = "features"`:** each top-edge feature: centre X, width, depth centre Z (negative), height | `top_features` | placeholders | |

By default `top_wall_mode = "open"` leaves the whole top edge between the shoulders open,
so M34 is **not** needed for a first build. Cooling and port access are guaranteed; only the
top-edge coverage is reduced.

## Step 6 – front-face margins (3 min)

The retaining clips hook `clip_lip_reach` = 2.6 mm onto the front face.

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M30 | At the bottom-centre clip positions (X = ±30): flat plastic from the bottom edge to the nearest screen glass, speaker grille or button | `front_margin_bottom` | 4 | |
| M31 | At the outer ends (Y = 92): flat plastic from the end to the nearest control | `front_margin_end` | 5 | |

If a margin is under 3.6 mm, reduce `clip_lip_reach` or move the clip (`clip_positions`).
The shell report warns you when a clip would reach too far.

## Step 7 – centre of mass (for the kickstand calculator, 5 min)

| # | Measure | Param | Default | Yours |
|---|---|---|---|---|
| M32 | Lay the device screen-down on a round pencil placed parallel to the top edge. Slide it until it balances. Measure from the grip bottoms (Y = 0) to the pencil. | `com_y` | 60 | |
| M33 | Depth of the centre of mass behind the front face. It is hard to measure; **leave 16** unless you have a better estimate. The report shows the stability margins, so you can see how sensitive the result is. | `com_depth` | 16 | |

## After measuring

1. Enter every value in `cad/params.scad`.
2. Open `cad/assembly.scad` with `DEBUG_MODE = true`. Check that the ghost device looks like
   your Ally X and that the red, orange, yellow and purple keep-clear zones are open.
3. Read the console reports (SHELL, KICKSTAND, HINGE). Fix every `WARNING`.
4. Print the test pieces (`README.md` → Test-fit strategy).
