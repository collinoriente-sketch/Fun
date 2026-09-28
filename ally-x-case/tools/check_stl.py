#!/usr/bin/env python3
"""Sanity-check exported STLs: size, bed contact, watertightness, bodies.
usage: tools/check_stl.py [stl_dir] [bed_x bed_y]"""
import sys, os, struct, collections

def load(path):
    data = open(path, 'rb').read()
    tris = []
    if data[:5] == b'solid' and b'facet' in data[:300]:
        cur = []
        for line in data.decode(errors='ignore').splitlines():
            t = line.split()
            if t and t[0] == 'vertex':
                cur.append(tuple(float(x) for x in t[1:4]))
                if len(cur) == 3:
                    tris.append(cur); cur = []
    else:
        n = struct.unpack('<I', data[80:84])[0]
        for i in range(n):
            v = struct.unpack('<12f', data[84 + i * 50: 84 + i * 50 + 48])
            tris.append([v[3:6], v[6:9], v[9:12]])
    return tris

def check(path, bed):
    tris = load(path)
    key = lambda v: (round(v[0], 3), round(v[1], 3), round(v[2], 3))
    xs = [v[0] for t in tris for v in t]; ys = [v[1] for t in tris for v in t]; zs = [v[2] for t in tris for v in t]
    size = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    # watertight: every undirected edge used exactly twice
    edges = collections.Counter()
    for t in tris:
        k = [key(v) for v in t]
        for a, b in ((0, 1), (1, 2), (2, 0)):
            edges[tuple(sorted((k[a], k[b])))] += 1
    open_edges = sum(1 for c in edges.values() if c % 2)
    # connected bodies
    parent = {}
    def f(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for t in tris:
        k = [key(v) for v in t]
        parent[f(k[1])] = f(k[0]); parent[f(k[2])] = f(k[0])
    bodies = len({f(key(v)) for t in tris for v in t})
    # bed contact area (triangles lying on z=min)
    zmin = min(zs)
    def area(t):
        a = [t[1][i] - t[0][i] for i in range(3)]; b = [t[2][i] - t[0][i] for i in range(3)]
        c = (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
        return 0.5 * (c[0]**2 + c[1]**2 + c[2]**2) ** 0.5
    bed_area = sum(area(t) for t in tris if all(abs(v[2] - zmin) < 0.01 for v in t))
    # overhangs: downward-facing area steeper than 45 deg (i.e. would want support),
    # ignoring the bed face and short bridges is not attempted -> upper bound
    def normal(t):
        a = [t[1][i] - t[0][i] for i in range(3)]; b = [t[2][i] - t[0][i] for i in range(3)]
        c = (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
        l = (c[0]**2 + c[1]**2 + c[2]**2) ** 0.5 or 1
        return [x / l for x in c]
    over = sum(area(t) for t in tris
               if normal(t)[2] < -0.7072 and min(v[2] for v in t) > zmin + 0.3)
    fits = (size[0] <= bed[0] and size[1] <= bed[1]) or (size[1] <= bed[0] and size[0] <= bed[1])
    ok = open_edges == 0 and abs(zmin) < 0.01 and fits
    print(f"{'OK ' if ok else '!! '} {os.path.basename(path):42s} {size[0]:6.1f} x {size[1]:6.1f} x {size[2]:5.1f} mm "
          f"| z0={zmin:6.2f} | bed {bed_area:6.0f} mm2 | >45deg overhang {over:5.0f} mm2 | bodies {bodies} | open edges {open_edges}"
          + ("" if fits else "  <-- larger than bed"))
    return ok

if __name__ == '__main__':
    d = sys.argv[1] if len(sys.argv) > 1 else 'stl'
    bed = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (220, 220)
    res = [check(os.path.join(d, f), bed) for f in sorted(os.listdir(d)) if f.endswith('.stl')]
    print(f"{sum(res)}/{len(res)} parts pass (bed {bed[0]:.0f} x {bed[1]:.0f})")
