/* Turns the editable plan (plan-data.js, or the copy saved by the plan editor in
   this browser) into everything the 3D model needs. Units are feet; see
   plan-data.js for the axes. Heights are measured up from the first floor finish. */
(function () {
  const A = (window.APP = window.APP || {});
  const KEY = 'arch.plan.firstfloor';
  A.PLAN_KEY = KEY;

  // Used when a plan file or a saved copy has no "areas" list yet.
  A.DEFAULT_AREAS = [
    { id: 'void', name: 'Double Height', kind: 'void', r: [9.375, 14.625, 26.125, 24.375] },
    { id: 'terrace', name: 'Terrace', kind: 'terrace', r: [0, 28.625, 8.875, 39] },
    { id: 'terrace-strip', name: 'Terrace', kind: 'terrace', r: [5.39, 39, 8.875, 47] },
    { id: 'front-balcony', name: 'Front Balcony', kind: 'balcony', r: [5.39, 47, 30.375, 50.54] },
    { id: 'rear-balcony', name: 'Rear Balcony', kind: 'balcony', r: [-3.5, -2, 30.375, 0] },
    { id: 'north-balcony', name: 'Rear Balcony', kind: 'balcony', r: [-3.5, 0, -1, 14.625] },
  ];

  A.DEFAULT_WARDROBES = [
    { id: 'dress-wardrobe-1', r: [22.625, 44.25, 29.25, 46.25], face: 'rear' },
    { id: 'dress-wardrobe-2', r: [27.25, 38.25, 29.25, 44.25], face: 'north', mirror: true },
  ];

  // --- pick the plan: the editor's saved copy wins, unless ?original=1 --------
  const base = window.PLAN_DATA;
  let D = base;
  A.planEdited = false;
  try {
    const q = new URLSearchParams(location.search);
    const s = window.PLAN_STANDALONE || q.get('original') === '1' ? null : localStorage.getItem(KEY);
    if (s) {
      const o = JSON.parse(s);
      if (o && o.version === base.version && Array.isArray(o.walls) && Array.isArray(o.pillars)) {
        D = Object.assign({}, base, { H: o.H, walls: o.walls, pillars: o.pillars, areas: o.areas || base.areas, wardrobes: o.wardrobes || base.wardrobes });
        A.planEdited = true;
      }
    }
  } catch (err) { /* storage not available: use the file as it is */ }

  const H = +D.H || 11;       // floor to ceiling
  const SLAB = D.SLAB;        // slab thickness (assumed)
  const GF = -(H + SLAB);     // ground floor level below the first floor
  const DOOR = D.DOOR;        // door and window head height (assumed)
  const zval = (v) => (v === 'GF' ? GF : v === 'H' ? H : v === 'TOP' ? H + SLAB : v === '-SLAB' ? -SLAB : +v);
  const zr = (z) => (z ? [zval(z[0]), zval(z[1])] : [0, H]);

  const walls = D.walls.map((w) => ({
    id: w.id, ax: w.ax, r: w.r.slice(), z: zr(w.z), mat: w.mat || 'wall',
    ops: (w.ops || []).map((o) => Object.assign({}, o, { head: Math.min(o.head, zr(w.z)[1]) })),
  }));
  const pillars = D.pillars.map((p) => ({ id: p.id, r: p.r.slice(), z: zr(p.z), mat: p.mat || 'wall' }));
  const areaList = (D.areas || A.DEFAULT_AREAS).map((a) => ({ id: a.id, name: a.name || a.id, kind: a.kind, r: a.r.slice() }));
  const areaById = {};
  for (const a of areaList) areaById[a.id] = a;
  // Wardrobes: footprint, the side the doors are on, and height (ceiling if not given).
  const wardrobes = (D.wardrobes || A.DEFAULT_WARDROBES).map((w) => ({ id: w.id, r: w.r.slice(), face: w.face || 'rear', h: Math.min(+w.h || H, H), mirror: !!w.mirror }));
  const voids = areaList.filter((a) => a.kind === 'void');
  const outdoor = areaList.filter((a) => a.kind !== 'void');

  // --- small rectangle kit ----------------------------------------------------
  const inRect = (x, y, r) => x > r[0] && x < r[2] && y > r[1] && y < r[3];
  function subtract(rects, hole) {
    const out = [];
    for (const r of rects) {
      const x0 = Math.max(r[0], hole[0]), y0 = Math.max(r[1], hole[1]), x1 = Math.min(r[2], hole[2]), y1 = Math.min(r[3], hole[3]);
      if (x1 <= x0 + 1e-6 || y1 <= y0 + 1e-6) { out.push(r); continue; }
      if (r[1] < y0) out.push([r[0], r[1], r[2], y0]);
      if (y1 < r[3]) out.push([r[0], y1, r[2], r[3]]);
      if (r[0] < x0) out.push([r[0], y0, x0, y1]);
      if (x1 < r[2]) out.push([x1, y0, r[2], y1]);
    }
    return out;
  }
  const uniq = (list) => Array.from(new Set(list.map((v) => Math.round(v * 1000) / 1000))).sort((a, b) => a - b);
  /* Edges of a set of floor rectangles that need a railing. needsRail(x, y, nx, ny)
     is asked about each edge piece, n being the direction away from the floor.
     Returns [{ dir, c, a, b, n }]: dir "y" runs along Y at X = c, dir "x" along X at Y = c. */
  function boundary(rects, needsRail, cutsX, cutsY) {
    const xs = uniq(rects.flatMap((r) => [r[0], r[2]]).concat(cutsX || [])), ys = uniq(rects.flatMap((r) => [r[1], r[3]]).concat(cutsY || []));
    const inside = (x, y) => rects.some((r) => inRect(x, y, r));
    const raw = [], e = 0.03;
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (!inside(cx, cy)) continue;
      if (!inside(xs[i] - e, cy) && needsRail(xs[i], cy, -1, 0)) raw.push(['y', xs[i], ys[j], ys[j + 1], -1]);
      if (!inside(xs[i + 1] + e, cy) && needsRail(xs[i + 1], cy, 1, 0)) raw.push(['y', xs[i + 1], ys[j], ys[j + 1], 1]);
      if (!inside(cx, ys[j] - e) && needsRail(cx, ys[j], 0, -1)) raw.push(['x', ys[j], xs[i], xs[i + 1], -1]);
      if (!inside(cx, ys[j + 1] + e) && needsRail(cx, ys[j + 1], 0, 1)) raw.push(['x', ys[j + 1], xs[i], xs[i + 1], 1]);
    }
    raw.sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : p[1] - q[1] || p[4] - q[4] || p[2] - q[2]));
    const out = [];
    for (const s of raw) {
      const last = out[out.length - 1];
      if (last && last.dir === s[0] && Math.abs(last.c - s[1]) < 1e-6 && last.n === s[4] && Math.abs(last.b - s[2]) < 1e-6) last.b = s[3];
      else out.push({ dir: s[0], c: s[1], a: s[2], b: s[3], n: s[4] });
    }
    return out;
  }

  // --- fixed parts of the building (not in the editor) -----------------------
  const ZONE = [-0.375, 14.625, 30.375, 27.875];   // lounge + gallery + void + main stair
  const STAIRWELL = [[20.29, 24.375, 30.375, 27.875], [26.125, 14.625, 30.375, 24.375]];
  // Floor of the middle zone: everything that is not the void or the stairwell.
  let midFloor = [ZONE];
  for (const v of voids) midFloor = subtract(midFloor, v.r);
  for (const s of STAIRWELL) midFloor = subtract(midFloor, s);

  const indoorSlabs = [
    [-1, 0, 30.375, 14.625],          // rear block
    [-0.375, 27.875, 8.875, 28.625],  // under the lounge / terrace wall
    [8.875, 27.875, 30.375, 47],      // master suite
  ];
  // Structural slab pieces (top just below finish level).
  const slabs = indoorSlabs.concat(midFloor, outdoor.map((a) => a.r));

  // Finish floors of the rooms: [x0, y0, x1, y1, material]
  const roomFloors = [
    [-0.25, 0.375, 19.25, 14.25, 'marble'],       // living and dining
    [-0.25, 14.25, 13.72, 14.625, 'marble'],      // where the wall to the lounge was taken out
    [19.25, 0.75, 29.625, 7.75, 'marble'],        // kitchen
    [27.125, 7.75, 29.625, 14.25, 'marble'],      // kitchen utility leg
    [19.2085, 8.125, 26.75, 14.25, 'bathfloor'],  // common washroom
    [9.25, 28.25, 22.25, 46.25, 'woodfloor'],     // master bedroom
    [22.625, 38.25, 29.625, 46.25, 'woodfloor'],  // dress
    [22.625, 28.25, 29.625, 37.875, 'bathfloor'], // master toilet
  ];
  const floors = roomFloors
    .concat(midFloor.map((r) => [r[0], r[1], r[2], r[3], 'marble']))
    .concat(outdoor.map((a) => [a.r[0], a.r[1], a.r[2], a.r[3], a.kind === 'terrace' ? 'deck' : 'stonefloor']));

  // Ceilings at H, plus a roof projection over the front balcony.
  const ceilings = [
    [-1, 0, 30.375, 14.625],
    [-0.375, 14.625, 30.375, 27.875],
    [-0.375, 27.875, 8.875, 28.625],
    [8.875, 27.875, 30.375, 47],
  ];
  const fb = areaById['front-balcony'];
  if (fb && fb.r[3] > 47.5) ceilings.push([Math.max(8.875, fb.r[0]), 47, fb.r[2], fb.r[3] + 0.36]);

  // Main stair down to the ground floor: 20 risers, three flights round the void.
  const RISE = (H + SLAB) / 20, TREAD = 10 / 12;

  // Rooms, for captions and the map.
  const ft = (v) => { const t = Math.round(Math.abs(v) * 24), f = Math.floor(t / 24), h = t - f * 24; return f + "'-" + Math.floor(h / 2) + (h % 2 ? '½' : '') + '"'; };
  const rooms = [
    { name: 'Living & Dining', size: "19'-6\" × 13'-10½\", open to the lounge", r: [-0.25, 0.375, 19.25, 14.625] },
    { name: 'Kitchen', size: "10'-4½\" × 7'-0\" + utility 2'-6\" × 6'-6\"", r: [19.25, 0.75, 29.625, 7.75] },
    { name: 'Kitchen', size: "10'-4½\" × 7'-0\" + utility 2'-6\" × 6'-6\"", r: [27.125, 7.75, 29.625, 14.25] },
    { name: 'Common Washroom', size: "7'-6\" × 6'-1½\"", r: [19.2085, 8.125, 26.75, 14.25] },
    { name: 'Master Bedroom', size: "13'-0\" × 18'-0\"", r: [9.25, 28.25, 22.25, 46.25] },
    { name: 'Dress', size: "7'-0\" × 8'-0\"", r: [22.625, 38.25, 29.625, 46.25] },
    { name: 'Master Toilet', size: "7'-0\" × 9'-7½\"", r: [22.625, 28.25, 29.625, 37.875] },
  ];
  for (const a of areaList) rooms.push({ name: a.name, size: ft(a.r[2] - a.r[0]) + ' × ' + ft(a.r[3] - a.r[1]), r: a.r, area: true });
  rooms.push(
    { name: 'Main Stair', size: "3'-6\" wide", r: [20.29, 24.375, 29.625, 27.875] },
    { name: 'Main Stair', size: "3'-6\" wide", r: [23.6, 14.625, 29.625, 24.375] },
    { name: 'Family Lounge', size: "12'-10\" × 13'-3\"", r: [0.375, 14.625, 13.2, 27.875] },
    { name: 'Gallery', size: "beside the double height", r: [9.375, 14.625, 29.625, 27.875] }
  );

  /* Where there is a floor to stand on: [x0, y0, x1, y1, height]. Height may be
     a function of (x, y) on the stairs. Walls, railings and furniture are
     checked separately, so these are the plain floor areas. */
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const f1 = (x) => -clamp01((x - 20.29) / 5.835) * 8 * RISE;
  const f2 = (x, y) => -8 * RISE - clamp01((23.96 - y) / 5.835) * 8 * RISE;
  const f3 = (x) => -16 * RISE - clamp01((26.125 - x) / 2.5) * 4 * RISE;
  const areas = slabs.map((s) => [s[0], s[1], s[2], s[3], 0]).concat([
    [20.29, 24.375, 26.125, 27.875, f1],      // main stair, top flight
    [26.125, 23.96, 29.625, 27.875, -8 * RISE],
    [26.125, 18.125, 29.625, 23.96, f2],
    [26.125, 14.625, 29.625, 18.125, -16 * RISE],
    [23.62, 14.625, 26.125, 18.125, f3],
    [9.375, 14.625, 23.62, 27.875, GF],       // placeholder room under the void
    [23.62, 18.125, 26.125, 27.875, GF],
  ]);

  /* Solid pieces a person cannot walk through, worked out from the walls:
     [x0, y0, x1, y1, bottom, top]. Open doors and cased openings leave a gap. */
  const solids = [];
  for (const w of walls) {
    const [x0, y0, x1, y1] = w.r, [z0, z1] = w.z;
    const lo = w.ax === 'x' ? x0 : y0, hi = w.ax === 'x' ? x1 : y1;
    const piece = (a, b, za, zb) => { if (b - a > 1e-4 && zb - za > 1e-4) solids.push(w.ax === 'x' ? [a, y0, b, y1, za, zb] : [x0, a, x1, b, za, zb]); };
    let cur = lo;
    for (const o of w.ops.slice().sort((p, q) => p.a - q.a)) {
      piece(cur, o.a, z0, z1);
      const passable = o.type === 'open' || ((o.type === 'door' || o.type === 'gdoor') && o.isOpen);
      if (!passable) piece(o.a, o.b, z0, o.head);
      cur = o.b;
    }
    piece(cur, hi, z0, z1);
  }
  for (const p of pillars) solids.push([p.r[0], p.r[1], p.r[2], p.r[3], p.z[0], p.z[1]]);

  // --- railings, worked out from the floor edges ------------------------------
  // Glass railing wherever first-floor floor meets the void or the stairwell,
  // except across the top step of the main stair.
  const holes = voids.map((v) => v.r).concat(STAIRWELL);
  const glass = boundary(midFloor, (x, y, nx, ny) => {
    const qx = x + nx * 0.05, qy = y + ny * 0.05;
    if (!holes.some((h) => inRect(qx, qy, h))) return false;
    if (nx === 1 && Math.abs(x - 20.29) < 0.01 && y > 24.375 && y < 27.875) return false;
    return true;
  });
  // Jaali railing on every open edge of a terrace or balcony: not where it meets
  // the building, another open area, or a wall / parapet / pillar.
  const guards = walls.concat(pillars).filter((w) => w.z[0] < 0.5 && w.z[1] > 3).map((w) => w.r);
  const jaali = boundary(outdoor.map((a) => a.r), (x, y, nx, ny) => {
    const ox = x + nx * 0.1, oy = y + ny * 0.1, ix = x - nx * 0.1, iy = y - ny * 0.1;
    if (slabs.some((s) => inRect(ox, oy, s))) return false;
    if (guards.some((g) => inRect(ox, oy, g) || inRect(ix, iy, g))) return false;
    return true;
  }, guards.flatMap((g) => [g[0], g[2]]), guards.flatMap((g) => [g[1], g[3]]));

  const v0 = voids[0];
  const voidCenter = v0 ? [(v0.r[0] + Math.min(v0.r[2], 24.5)) / 2, (v0.r[1] + v0.r[3]) / 2] : [17, 19.6];

  A.plan = {
    H, SLAB, GF, DOOR, RISE, TREAD, walls, pillars, slabs, floors, roomFloors, ceilings, rooms, areas, solids,
    areaList, areaById, voids, midFloor, wardrobes, ZONE, STAIRWELL, rails: { glass, jaali }, voidCenter,
  };
})();
