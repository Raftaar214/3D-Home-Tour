/* Builds the building shell from APP.plan: walls with openings, floors, ceilings,
   both stairs, railings, windows and doors, plus simple surroundings. */
(function () {
  const A = (window.APP = window.APP || {});
  const T = THREE;

  // --- small geometry kit -------------------------------------------------
  function worldUV(g, s) {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      let u, v;
      if (ny > 0.5) { u = p.getX(i); v = p.getZ(i); }
      else if (nx > 0.5) { u = p.getZ(i); v = p.getY(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv.setXY(i, u / s, v / s);
    }
  }
  function merge(geos) {
    let nV = 0, nI = 0;
    for (const g of geos) { nV += g.attributes.position.count; nI += g.index.count; }
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const idx = new Uint32Array(nI);
    let vo = 0, io = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      const gi = g.index.array;
      for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
      vo += g.attributes.position.count;
      io += gi.length;
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setIndex(new T.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    out.computeBoundingBox();
    return out;
  }
  A.kit = { worldUV, merge };

  /* A batcher collects axis-aligned boxes per material and turns them into one
     mesh each, which keeps the draw-call count low. */
  function Batcher() {
    this.b = {};
  }
  Batcher.prototype.box = function (mk, x0, y0, x1, y1, z0, z1, grp) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const g = new T.BoxGeometry(x1 - x0, z1 - z0, y1 - y0);
    g.translate((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
    worldUV(g, A.S[mk] || 4);
    const key = (grp || 'main') + '|' + mk;
    (this.b[key] = this.b[key] || []).push(g);
  };
  Batcher.prototype.flush = function (groups) {
    for (const key in this.b) {
      const [grp, mk] = key.split('|');
      const m = new T.Mesh(merge(this.b[key]), A.M[mk]);
      const see = mk === 'glass' || mk === 'railglass';
      m.castShadow = !see && grp !== 'ctx'; // the houses around do not shade this one, so low sun still reaches it
      m.receiveShadow = !see;
      if (see) m.renderOrder = 5;
      m.name = key;
      groups[grp].add(m);
    }
    this.b = {};
  };
  A.Batcher = Batcher;

  A.buildShell = function (scene) {
    const P = A.plan, M = A.M, GR = P.ground;
    const { H, SLAB, GF, RISE, TREAD } = P;
    /* main = first floor, gmain = ground floor, both = pieces that run through
       both floors (stairs, the tall void wall), ceil = roof, ctx = surroundings. */
    const groups = { main: new T.Group(), gmain: new T.Group(), both: new T.Group(), ceil: new T.Group(), ctx: new T.Group() };
    groups.main.name = 'shell';
    groups.gmain.name = 'ground-shell';
    groups.both.name = 'stairs';
    groups.ceil.name = 'ceilings';
    groups.ctx.name = 'context';
    const B = new Batcher();
    const extra = []; // meshes that are not boxes (glass panels, rails)
    let G = 'main'; // the group new pieces go into
    const box = (mk, x0, y0, x1, y1, z0, z1, grp) => B.box(mk, x0, y0, x1, y1, z0, z1, grp || G);
    // wall-local box: u along the wall, v across its thickness
    const lb = (mk, ax, u0, u1, v0, v1, z0, z1) =>
      ax === 'x' ? box(mk, u0, v0, u1, v1, z0, z1) : box(mk, v0, u0, v1, u1, z0, z1);

    // --- door leaves (fl = floor level the door stands on) --------------------
    function leaf(ax, u0, u1, v0, v1, z0, z1, glazed, fl) {
      const alongU = u1 - u0 > v1 - v0;
      if (!glazed) {
        lb('teakV', ax, u0, u1, v0, v1, z0, z1);
        // handle
        if (alongU) lb('brass', ax, u1 - 0.42, u1 - 0.3, v0 - 0.12, v1 + 0.12, fl + 3.25, fl + 3.75);
        else lb('brass', ax, u0 - 0.12, u1 + 0.12, v1 - 0.42, v1 - 0.3, fl + 3.25, fl + 3.75);
        return;
      }
      const st = 0.3, bot = 0.6;
      if (alongU) {
        lb('teakV', ax, u0, u0 + st, v0, v1, z0, z1);
        lb('teakV', ax, u1 - st, u1, v0, v1, z0, z1);
        lb('teakV', ax, u0 + st, u1 - st, v0, v1, z0, z0 + bot);
        lb('teakV', ax, u0 + st, u1 - st, v0, v1, z1 - st, z1);
        const c = (v0 + v1) / 2;
        lb('glass', ax, u0 + st, u1 - st, c - 0.015, c + 0.015, z0 + bot, z1 - st);
        lb('brass', ax, u1 - 0.22, u1 - 0.1, v0 - 0.12, v1 + 0.12, fl + 3.2, fl + 3.9);
      } else {
        lb('teakV', ax, u0, u1, v0, v0 + st, z0, z1);
        lb('teakV', ax, u0, u1, v1 - st, v1, z0, z1);
        lb('teakV', ax, u0, u1, v0 + st, v1 - st, z0, z0 + bot);
        lb('teakV', ax, u0, u1, v0 + st, v1 - st, z1 - st, z1);
        const c = (u0 + u1) / 2;
        lb('glass', ax, c - 0.015, c + 0.015, v0 + st, v1 - st, z0 + bot, z1 - st);
      }
    }

    // --- openings ---------------------------------------------------------
    function opening(ax, t0, t1, o, fl) {
      const c = (t0 + t1) / 2, a = o.a, b = o.b, sill = fl + (o.sill || 0), head = fl + o.head;
      if (o.type === 'win' || o.type === 'vent') {
        const f = 0.13, d = 0.11;
        lb('frame', ax, a, b, c - d, c + d, sill, sill + f);
        lb('frame', ax, a, b, c - d, c + d, head - f, head);
        lb('frame', ax, a, a + f, c - d, c + d, sill + f, head - f);
        lb('frame', ax, b - f, b, c - d, c + d, sill + f, head - f);
        if (o.type === 'win') {
          const panes = Math.max(1, Math.round((b - a) / 2.3));
          for (let i = 1; i < panes; i++) {
            const u = a + ((b - a) * i) / panes;
            lb('frame', ax, u - 0.05, u + 0.05, c - d, c + d, sill + f, head - f);
          }
          lb('glass', ax, a + f, b - f, c - 0.015, c + 0.015, sill + f, head - f);
          lb('quartz', ax, a - 0.12, b + 0.12, t0 - 0.1, t1 + 0.1, sill - 0.09, sill);
        } else {
          lb('frost', ax, a + f, b - f, c - 0.02, c + 0.02, sill + f, head - f);
        }
        return;
      }
      // doors and cased openings: a teak lining (from the opening's own sill, for one high up a tall wall)
      fl = fl + (o.sill || 0);
      const j = 0.1;
      lb('teakV', ax, a, a + j, t0 - 0.03, t1 + 0.03, fl, head);
      lb('teakV', ax, b - j, b, t0 - 0.03, t1 + 0.03, fl, head);
      lb('teakV', ax, a + j, b - j, t0 - 0.03, t1 + 0.03, head - j, head);
      if (o.type === 'open') return;
      const glazed = o.type === 'gdoor', th = 0.07, z0 = fl + 0.03, z1 = head - j;
      if (o.leaves === 2) { // double door: one leaf hinged at each side
        const m = (a + b) / 2, w2 = (b - a - 2 * j) / 2;
        if (!o.isOpen) {
          leaf(ax, a + j, m - 0.01, c - th, c + th, z0, z1, glazed, fl);
          leaf(ax, m + 0.01, b - j, c - th, c + th, z0, z1, glazed, fl);
        } else {
          for (const h of [a + j + th, b - j - th]) {
            if (o.swing > 0) leaf(ax, h - th, h + th, t1, t1 + w2, z0, z1, glazed, fl);
            else leaf(ax, h - th, h + th, t0 - w2, t0, z0, z1, glazed, fl);
          }
        }
        return;
      }
      const w = b - a - 2 * j;
      if (!o.isOpen) {
        leaf(ax, a + j, b - j, c - th, c + th, z0, z1, glazed, fl);
      } else {
        const h = o.hinge === 'a' ? a + j + th : b - j - th;
        if (o.swing > 0) leaf(ax, h - th, h + th, t1, t1 + w, z0, z1, glazed, fl);
        else leaf(ax, h - th, h + th, t0 - w, t0, z0, z1, glazed, fl);
      }
    }

    // --- walls ------------------------------------------------------------
    function buildWalls(list) {
      for (const w of list) {
        const [x0, y0, x1, y1] = w.r, fl = w.base || 0;
        let z0 = w.z ? w.z[0] : 0;
        const z1 = w.z ? w.z[1] : H, mk = w.mat || 'wall', ax = w.ax;
        if (z0 === fl) z0 = fl - 0.02;
        const lo = ax === 'x' ? x0 : y0, hi = ax === 'x' ? x1 : y1;
        const t0 = ax === 'x' ? y0 : x0, t1 = ax === 'x' ? y1 : x1;
        const ops = (w.ops || []).slice().sort((p, q) => p.a - q.a);
        // cut the wall at every opening edge; in each stretch build only the solid heights,
        // so openings can sit one above the other (a door on each floor of a tall wall)
        const cuts = Array.from(new Set([lo, hi].concat(ops.flatMap((o) => [o.a, o.b])).filter((v) => v >= lo && v <= hi))).sort((p, q) => p - q);
        for (let i = 0; i < cuts.length - 1; i++) {
          const a = cuts[i], b = cuts[i + 1], mid = (a + b) / 2;
          const holes = ops.filter((o) => o.a < mid && o.b > mid).map((o) => [fl + (o.sill || 0), fl + o.head]).sort((p, q) => p[0] - q[0]);
          let cur = z0;
          for (const [h0, h1] of holes) { if (h0 - cur > 0.03) lb(mk, ax, a, b, t0, t1, cur, h0); cur = Math.max(cur, h1); }
          if (z1 - cur > 1e-3) lb(mk, ax, a, b, t0, t1, cur, z1);
        }
        for (const o of ops) opening(ax, t0, t1, o, fl);
      }
    }
    buildWalls(P.walls);
    for (const p of P.pillars) box(p.mat, p.r[0], p.r[1], p.r[2], p.r[3], p.z[0] === 0 ? -0.02 : p.z[0], p.z[1]);

    // --- slabs, floors, ceilings -------------------------------------------
    for (const s of P.slabs) box('marble', s[0], s[1], s[2], s[3], -SLAB, -0.02);
    for (const f of P.floors) box(f[4], f[0], f[1], f[2], f[3], -0.02, 0);
    for (const c of P.ceilings) box('ceiling', c[0], c[1], c[2], c[3], H, H + SLAB, 'ceil');

    // --- main stair (round the void, joins the two floors) -------------------
    const TH = 0.56; // step thickness: reads as a folded-plate stair
    G = 'both';
    for (let i = 0; i < 7; i++) { // flight 1, heading south
      const top = -(i + 1) * RISE;
      box('stair', 20.29 + i * TREAD, 24.375, 20.29 + (i + 1) * TREAD + 0.02, 27.875, top - TH, top);
    }
    box('stair', 26.125, 23.96, 29.625, 27.875, -8 * RISE - TH, -8 * RISE);
    for (let j = 0; j < 7; j++) { // flight 2, heading east
      const top = -(9 + j) * RISE;
      box('stair', 26.125, 23.96 - (j + 1) * TREAD - 0.02, 29.625, 23.96 - j * TREAD, top - TH, top);
    }
    box('stair', 26.125, 14.625, 29.625, 18.125, -16 * RISE - TH, -16 * RISE);
    for (let k = 0; k < 3; k++) { // flight 3, heading north
      const top = -(17 + k) * RISE;
      box('stair', 26.125 - (k + 1) * TREAD - 0.02, 14.625, 26.125 - k * TREAD, 18.125, top - TH, top);
    }
    // --- feature finishes ---------------------------------------------------
    box('cladding', 29.56, 14.625, 29.625, 27.875, GF, H);            // tall south wall of the void
    G = 'main';

    if (!GR) {
      // --- placeholder ground floor (no ground floor drawing) -----------------
      box('marble', 9, 14.25, 29.625, 28.25, GF - 0.3, GF);
      box('wall', -1, 0, 29.625, 14.25, GF, -SLAB);           // solid mass under the rear block
      box('wall', -0.375, 14.625, 9, 28.625, GF, -SLAB);      // under the lounge
      box('wall', 8.875, 28.25, 29.625, 47, GF, -SLAB);       // under the master suite
    } else {
      // --- ground floor, from its own plan -----------------------------------
      G = 'gmain';
      const PL = GF + GR.PORCH;
      buildWalls(GR.walls);
      for (const p of GR.pillars) box(p.mat, p.r[0], p.r[1], p.r[2], p.r[3], p.z[0] === GF ? GF - 0.02 : p.z[0], p.z[1]);
      for (const r of GR.indoor) { box('stone', r[0], r[1], r[2], r[3], PL - 0.6, GF - 0.035); box('marble', r[0], r[1], r[2], r[3], GF - 0.035, GF - 0.02); }
      for (const r of GR.plinth) box('stone', r[0], r[1], r[2], r[3], PL - 0.6, GF - 0.02);
      box('stonefloor', 19, 47, 29.625, 52.75, GF - 0.02, GF);                  // floor of the front stair
      for (const f of GR.floors) box(f[4], f[0], f[1], f[2], f[3], f[5] - 0.02, f[5]);
      for (const a of GR.areaList) if (a.kind === 'porch') box('stone', a.r[0], a.r[1], a.r[2], a.r[3], PL - 0.6, PL - 0.02);
      for (const s of GR.steps) box('stone', s[0], s[1], s[2], s[3], PL - 0.3, GF + s[4]);
      // ceiling finish under the first floor slabs
      for (const s of P.slabs) box('ceiling', s[0], s[1], s[2], s[3], -SLAB - 0.03, -SLAB);

      // front stair, as drawn on the ground floor: up, round a winder landing, and back
      G = 'both';
      const N = 16, RF = (0 - GF) / N, TF = 9.5 / 12, X0 = 22.13, X1 = X0 + 6 * TF;
      const fbA = P.areaById['front-balcony'];
      const yU = fbA && fbA.r[3] > 50 && fbA.r[3] < 52.3 && fbA.r[2] > X0 ? fbA.r[3] + 0.02 : 50.01; // upper flight clears the balcony slab
      for (let k = 1; k <= 6; k++) box('stair', X0 + (k - 1) * TF, 47, X0 + k * TF + 0.02, 49.76, GF + k * RF - TH, GF + k * RF);
      const wy = [47, 48.9, 50.85, 52.75];
      for (let k = 0; k < 3; k++) box('stair', X1, wy[k], 29.625, wy[k + 1] + (k < 2 ? 0.02 : 0), GF + (7 + k) * RF - TH, GF + (7 + k) * RF);
      for (let k = 1; k <= 6; k++) box('stair', X1 - k * TF - 0.02, yU, X1 - (k - 1) * TF, 52.75, GF + (9 + k) * RF - TH, GF + (9 + k) * RF);
      // second run, from the landing beside the balcony up to the roof
      const TOPL = H + SLAB, RT = TOPL / N;
      for (let k = 1; k <= 6; k++) box('stair', X0 + (k - 1) * TF, 47, X0 + k * TF + 0.02, 49.76, k * RT - TH, k * RT);
      for (let k = 0; k < 3; k++) box('stair', X1, wy[k], 29.625, wy[k + 1] + (k < 2 ? 0.02 : 0), (7 + k) * RT - TH, (7 + k) * RT);
      for (let k = 1; k <= 6; k++) box('stair', X1 - k * TF - 0.02, 50.01, X1 - (k - 1) * TF, 52.75, (9 + k) * RT - TH, (9 + k) * RT);
      box('stone', 19.375, 47, X0, 52.75, TOPL - SLAB, TOPL - 0.02);           // landing on the roof
      box('stonefloor', 19.375, 47, X0, 52.75, TOPL - 0.02, TOPL);
      box('wall', X0, 49.76, X1, 50.01, GF, TOPL);                              // wall between the flights, full height
      G = 'main';
      // railings on the open sides of the upper run and its landings
      const R0 = 0.07;
      const tall = (id) => GR.walls.some((w) => w.id === id && w.z[1] > TOPL - 0.5);
      if (!tall('g-stair-south')) glassRun([29.52, 47.05, 6 * RT], [29.52, 52.68, 9 * RT], 0, 'both');   // winders, south side
      if (!tall('g-stair-front')) {
        glassRun([29.52, 52.66, 9 * RT], [X1, 52.66, 9 * RT], 0, 'both');         // winders, road side
        glassRun([X1, 52.66, 9 * RT], [X0, 52.66, 15 * RT], 0, 'both');          // top flight, road side
        glassRun([X0, 52.66, 0], [19.45, 52.66, 0], 0, 'both');                  // first floor landing, road side
      }
      if (!tall('g-stair-north')) glassRun([19.45, 52.66, 0], [19.45, 50.6, 0], 0, 'both'); // landing, north side
      glassRun([X0, 52.66, TOPL], [19.45, 52.66, TOPL], 0, 'both');            // roof landing, road side
      glassRun([19.45, 52.66, TOPL], [19.45, 47.05, TOPL], 0, 'both');         //   north side
      glassRun([X0 + R0, 47.05, TOPL], [X0 + R0, 49.76, TOPL], 0, 'both');     //   over the flight below
      // roof finish: terrace tiles on top of the roof slab
      for (const c of P.ceilings.slice(0, 4)) box('stonefloor', c[0], c[1], c[2], c[3], TOPL, TOPL + 0.02, 'ceil');
      // parapet round the roof (part of the roof, so the dollhouse view lifts it off too)
      for (const s of (A.frontStair || {}).parapet || []) {
        const t = 0.375, a = s.c - (s.n > 0 ? t : 0), b = s.c + (s.n < 0 ? t : 0);
        if (s.dir === 'y') { box('wall', a, s.a, b, s.b, TOPL, TOPL + 3, 'ceil'); box('stone', a - 0.05, s.a, b + 0.05, s.b, TOPL + 3, TOPL + 3.15, 'ceil'); }
        else { box('wall', s.a, a, s.b, b, TOPL, TOPL + 3, 'ceil'); box('stone', s.a, a - 0.05, s.b, b + 0.05, TOPL + 3, TOPL + 3.15, 'ceil'); }
      }
    }

    // --- pergola over the cut-out beside the terrace ------------------------
    // Pergola over the road end of the terrace (it used to cover an open gap there).
    const ter = P.areaById.terrace;
    if (ter && ter.r[3] - ter.r[1] > 12 && ter.r[2] - ter.r[0] > 5) {
      const pg = H - 0.45, pt = H + SLAB, x0 = ter.r[0] + 0.5, x1 = ter.r[2] - 0.35, y1 = ter.r[3] - 0.2, y0 = y1 - 7.8;
      box('teak', x0, y0, x1, y0 + 0.4, pg, pt);
      box('teak', x0, y1 - 0.4, x1, y1, pg, pt);
      box('teak', x0, y0, x0 + 0.4, y1, pg, pt);
      box('teak', x1 - 0.4, y0, x1, y1, pg, pt);
      const nb = Math.max(2, Math.round((y1 - y0) / 2.6));
      for (let k = 1; k < nb; k++) { const y = y0 + ((y1 - y0) * k) / nb; box('teak', x0, y - 0.18, x1, y + 0.18, pg, pt); }
      for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.62) box('teak', x, y0, x + 0.16, y1, pt, pt + 0.35);
      for (const [px, py] of [[x0 + 0.07, y0 + 0.07], [x1 - 0.33, y0 + 0.07], [x0 + 0.07, y1 - 0.33], [x1 - 0.33, y1 - 0.33]]) box('metal', px, py, px + 0.26, py + 0.26, 0, pg);
    }

    // --- interior glass railings --------------------------------------------
    function glassRun(p, q, h, grp) { // p, q = [x, y, height]; follows the slope
      h = h || 3.25;
      const keep = (m) => { m.userData.grp = grp || 'main'; extra.push(m); };
      P.solids.push([Math.min(p[0], q[0]) - 0.06, Math.min(p[1], q[1]) - 0.06, Math.max(p[0], q[0]) + 0.06, Math.max(p[1], q[1]) + 0.06, Math.min(p[2], q[2]) - 0.5, Math.max(p[2], q[2]) + h]);
      const g = new T.BufferGeometry();
      const v = [p[0], p[2] + 0.12, p[1], q[0], q[2] + 0.12, q[1], q[0], q[2] + h, q[1], p[0], p[2] + h, p[1]];
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      const m = new T.Mesh(g, M.railglass);
      m.renderOrder = 6;
      keep(m);
      // handrail
      const a = new T.Vector3(p[0], p[2] + h, p[1]), b = new T.Vector3(q[0], q[2] + h, q[1]);
      const len = a.distanceTo(b);
      const rail = new T.Mesh(new T.BoxGeometry(0.15, 0.1, len + 0.08), M.teak);
      rail.position.copy(a).add(b).multiplyScalar(0.5);
      rail.lookAt(b);
      rail.castShadow = true;
      keep(rail);
      // base shoe
      const a0 = new T.Vector3(p[0], p[2] + 0.07, p[1]), b0 = new T.Vector3(q[0], q[2] + 0.07, q[1]);
      const shoe = new T.Mesh(new T.BoxGeometry(0.12, 0.2, len), M.steel);
      shoe.position.copy(a0).add(b0).multiplyScalar(0.5);
      shoe.lookAt(b0);
      keep(shoe);
    }
    const e = 0.1;
    for (const s of P.rails.glass) { // floor edges beside the void and the stairwell
      const c = s.c - e * s.n;
      if (s.dir === 'y') {
        glassRun([c, s.a - e, 0], [c, s.b + e, 0]);
        box('fluted', Math.min(s.c, s.c + 0.045 * s.n), s.a, Math.max(s.c, s.c + 0.045 * s.n), s.b, -SLAB - 0.35, 0);
      } else {
        glassRun([s.a - e, c, 0], [s.b + e, c, 0]);
        box('fluted', s.a, Math.min(s.c, s.c + 0.045 * s.n), s.b, Math.max(s.c, s.c + 0.045 * s.n), -SLAB - 0.35, 0);
      }
    }
    glassRun([20.29, 24.375 + e, 0], [26.125 + e, 24.375 + e, -8 * RISE], 0, 'both');      // flight 1
    glassRun([26.125 + e, 24.375 + e, -8 * RISE], [26.125 + e, 23.96, -8 * RISE], 0, 'both');
    glassRun([26.125 + e, 23.96, -8 * RISE], [26.125 + e, 18.125 + e, -16 * RISE], 0, 'both'); // flight 2
    glassRun([26.125 + e, 18.125 - e, -16 * RISE], [23.62, 18.125 - e, GF], 0, 'both');    // flight 3

    // --- outdoor jaali railings ---------------------------------------------
    function jaaliRun(xa, ya, xb, yb, h) {
      h = h || 3.5;
      P.solids.push([Math.min(xa, xb) - 0.07, Math.min(ya, yb) - 0.07, Math.max(xa, xb) + 0.07, Math.max(ya, yb) + 0.07, 0, h]);
      const alongX = Math.abs(xb - xa) > Math.abs(yb - ya);
      const len = alongX ? Math.abs(xb - xa) : Math.abs(yb - ya);
      const t = 0.07;
      if (alongX) {
        const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        box('metal', x0, ya - t, x1, ya + t, h - 0.14, h);
        box('metal', x0, ya - t, x1, ya + t, 0.18, 0.3);
        const n = Math.max(1, Math.round(len / 4.5));
        for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; box('metal', x - 0.08, ya - 0.08, x + 0.08, ya + 0.08, 0, h); }
      } else {
        const y0 = Math.min(ya, yb), y1 = Math.max(ya, yb);
        box('metal', xa - t, y0, xa + t, y1, h - 0.14, h);
        box('metal', xa - t, y0, xa + t, y1, 0.18, 0.3);
        const n = Math.max(1, Math.round(len / 4.5));
        for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; box('metal', xa - 0.08, y - 0.08, xa + 0.08, y + 0.08, 0, h); }
      }
      const ph = h - 0.44;
      const g = new T.PlaneGeometry(len, ph);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / 2.9, uv.getY(i));
      const m = new T.Mesh(g, M.jaali);
      if (!alongX) m.rotation.y = Math.PI / 2;
      m.position.set((xa + xb) / 2, 0.3 + ph / 2, (ya + yb) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.grp = 'main';
      extra.push(m);
    }
    for (const s of P.rails.jaali) { // open edges of the terrace and balconies
      if (s.b - s.a < 0.3) continue;
      if (s.dir === 'y') jaaliRun(s.c, s.a, s.c, s.b); else jaaliRun(s.a, s.c, s.b, s.c);
    }

    // --- surroundings ---------------------------------------------------------
    // E = the level everything outside stands on (a little above the outside ground)
    const E = GR ? GF + GR.PORCH + 0.2 : GF;
    const cb = (mk, x0, y0, x1, y1, z0, z1) => box(mk, x0, y0, x1, y1, z0, z1, 'ctx');
    cb('ground', -140, -120, 170, 54.5, E - 2, E - 0.3);
    cb('road', -140, 54.5, 170, 78, E - 2, E - 0.45);
    cb('ground', -140, 78, 170, 200, E - 2, E - 0.3);
    if (!GR) {
      // compound wall and gate piers, as drawn at the front of the plot
      cb('stone', 15.88, 54.1, 30.375, 54.5, GF - 0.3, GF + 5);
      cb('stone', 0, 52.8, 0.46, 54.5, GF - 0.3, GF + 6);
      cb('stone', 13.64, 53.65, 15.88, 54.5, GF - 0.3, GF + 6);
      cb('stone', 0, 47, 0.375, 52.8, GF - 0.3, GF + 5);
      cb('stone', 0, 39, 0.375, 46.25, GF - 0.3, GF + 5);
      cb('stone', 29.625, 50.54, 30.375, 54.5, GF - 0.3, GF + 5);
      for (let x = 0.9; x < 13.5; x += 0.55) cb('metal', x, 54.2, x + 0.1, 54.32, GF, GF + 5);
      cb('metal', 0.46, 54.18, 13.64, 54.34, GF + 4.8, GF + 5);
      cb('metal', 0.46, 54.18, 13.64, 54.34, GF + 0.2, GF + 0.4);
    } else {
      // entry gate between the piers drawn on the ground floor plan (11'-3" wide)
      const PL = GF + GR.PORCH;
      // two gate leaves, standing open into the porch
      const gp = GR.pillars.find((p) => p.id === 'gp-gate'), gx0 = gp ? gp.r[2] : 0.75, gx1 = 12, half = (gx1 - gx0) / 2;
      for (const [hx, dir] of [[gx0 + 0.12, 1], [gx1 - 0.12, -1]]) {
        const y1 = 54.25, y0 = y1 - half;
        for (let y = y0 + 0.25; y < y1 - 0.1; y += 0.55) cb('metal', hx - 0.06, y, hx + 0.06, y + 0.1, PL + 0.2, PL + 5.2);
        cb('metal', hx - 0.08, y0, hx + 0.08, y1, PL + 5.0, PL + 5.2);
        cb('metal', hx - 0.08, y0, hx + 0.08, y1, PL + 0.2, PL + 0.4);
        cb('metal', hx - 0.08, y0, hx + 0.08, y0 + 0.16, PL + 0.2, PL + 5.2);
        P.solids.push([hx - 0.1, y0, hx + 0.1, y1, PL, PL + 5.2]);
      }
    }
    // neighbouring buildings (plain blocks, only for depth in the views)
    const nb = (mk, x0, y0, x1, y1, h) => cb(mk, x0, y0, x1, y1, E - 0.3, E + h);
    nb('nb1', 30.4, 2, 58, 46, 11);
    nb('nb2', -74, 2, -44, 40, 22);
    nb('nb3', -34, 84, -6, 122, 23);
    nb('nb1', 0, 86, 28, 124, 33);
    nb('nb2', 34, 84, 62, 120, 22);
    nb('nb3', 68, 86, 98, 122, 30);
    nb('nb1', -70, 84, -40, 120, 26);
    nb('nb2', -4, -86, 30, -50, 23);
    nb('nb3', 36, -88, 66, -52, 32);
    nb('nb1', -44, -84, -10, -50, 20);
    // windows on the facing sides of the houses across the road
    for (const [x0, x1, h, fy] of [[-34, -6, 23, 84], [0, 28, 33, 86], [34, 62, 22, 84], [68, 98, 30, 86], [-70, -40, 26, 84]])
      for (let fl = 0; fl * 10.5 + 9 < h; fl++)
        for (let x = x0 + 3; x + 4 < x1; x += 7.5) {
          cb('nbwin', x, fy - 0.06, x + 4, fy + 0.4, E + fl * 10.5 + 3.5, E + fl * 10.5 + 8);
          cb('nb1', x - 0.3, fy - 0.5, x + 4.3, fy + 0.2, E + fl * 10.5 + 8, E + fl * 10.5 + 8.4);
        }

    B.flush(groups);
    for (const m of extra) groups[m.userData.grp || 'main'].add(m);

    // trees along the road
    const trunkG = new T.CylinderGeometry(0.5, 0.7, 9, 8);
    const crownG = new T.IcosahedronGeometry(5.5, 1);
    for (const [x, y, s] of [[-14, 81, 1], [16, 81.5, 1.2], [44, 81, 0.9], [72, 82, 1.1], [-46, 81, 1], [-12, 58, 0.8], [40, 58.5, 0.9], [-17, 21, 1.0], [-16, -13, 0.9], [9, -21, 1.1], [27, -23, 0.95], [-19, 41, 0.85], [-30, 6, 1.1], [44, -30, 1.0]]) {
      const tr = new T.Mesh(trunkG, M.trunk);
      tr.position.set(x, E + 4.5 * s, y);
      tr.scale.setScalar(s);
      tr.castShadow = true;
      groups.ctx.add(tr);
      for (const [dx, dy, dz, r] of [[0, 12, 0, 1], [3, 10, 2, 0.75], [-3, 10.5, -1.5, 0.8], [0.5, 14.5, -1, 0.7]]) {
        const cr = new T.Mesh(crownG, dx > 0 ? M.leaf2 : M.leaf);
        cr.position.set(x + dx * s, E + dy * s, y + dz * s);
        cr.scale.setScalar(r * s);
        cr.castShadow = true;
        groups.ctx.add(cr);
      }
    }

    scene.add(groups.main, groups.gmain, groups.both, groups.ceil, groups.ctx);
    A.groups = groups;
    return groups;
  };
})();
