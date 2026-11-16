/* Furniture and fittings, built from simple shapes and sized to each room.
   Loose pieces are made facing "front" (+z) and then turned and placed.
   Built-ins (kitchen, wardrobes, panels) are drawn straight in plan coordinates. */
(function () {
  const A = (window.APP = window.APP || {});
  const T = THREE;

  A.buildFurniture = function (scene) {
    const P = A.plan, M = A.M, H = P.H, GF = P.GF;
    const root = new T.Group();
    root.name = 'furniture';
    A.groups.furn = root;
    A.blockers = [];
    const B = new A.Batcher();
    const pb = (mk, x0, y0, x1, y1, z0, z1) => B.box(mk, x0, y0, x1, y1, z0, z1, 'furn');
    const block = (x0, y0, x1, y1, lvl) => A.blockers.push([x0 - 0.35, y0 - 0.35, x1 + 0.35, y1 + 0.35, lvl || 0]);

    // --- kit -----------------------------------------------------------------
    const cache = {};
    function fix(geo, mat) { if (mat.userData && mat.userData.s) A.kit.worldUV(geo, mat.userData.s); return geo; }
    function mesh(geo, mat, x, y, z) {
      const m = new T.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      m.position.set(x || 0, y || 0, z || 0);
      return m;
    }
    function bx(w, h, d, mat, x, y, z) { // y = height of the underside
      return mesh(fix(new T.BoxGeometry(w, h, d), mat), mat, x, (y || 0) + h / 2, z);
    }
    function rgeo(w, h, d, r) {
      const key = [w, h, d, r].map((v) => v.toFixed(3)).join('_');
      if (cache[key]) return cache[key];
      r = Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.005);
      const b = r * 0.6, hw = w / 2 - b, hd = d / 2 - b, rr = Math.max(r - b, 0.01);
      const s = new T.Shape();
      s.moveTo(-hw + rr, -hd); s.lineTo(hw - rr, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + rr);
      s.lineTo(hw, hd - rr); s.quadraticCurveTo(hw, hd, hw - rr, hd);
      s.lineTo(-hw + rr, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - rr);
      s.lineTo(-hw, -hd + rr); s.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
      const g = new T.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 5 });
      g.rotateX(-Math.PI / 2);
      g.translate(0, b, 0);
      return (cache[key] = g);
    }
    function rb(w, h, d, r, mat, x, y, z) { return mesh(rgeo(w, h, d, r), mat, x, y || 0, z); }
    function cyl(r0, r1, h, mat, x, y, z, seg) {
      return mesh(new T.CylinderGeometry(r0, r1, h, seg || 24), mat, x, (y || 0) + h / 2, z);
    }
    function put(obj, X, Y, rot, z, solid) {
      obj.position.set(X, z || 0, Y);
      obj.rotation.y = ((rot || 0) * Math.PI) / 180;
      root.add(obj);
      if (solid !== false) {
        obj.updateMatrixWorld(true);
        const b = new T.Box3().setFromObject(obj);
        block(b.min.x, b.min.z, b.max.x, b.max.z, z || 0);
      }
      return obj;
    }

    // --- style variants: each style has its own furniture shapes, lights, frames and fittings ---
    const STYLE = A.style || 'luxury';
    const HW = { modern: 'black', scandi: 'black', luxury: 'brass' }[STYLE];    // cabinet handles
    const TAP = { modern: 'black', scandi: 'chrome', luxury: 'brass' }[STYLE];  // taps, rails, shower fittings
    const FRAME = { modern: 'black', scandi: 'teak', luxury: 'brass' }[STYLE];  // picture frames
    function legs(g, w, d, h, mat, r, splay) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const l = cyl(r, r * 0.6, h, mat, sx * (w / 2 - 0.2), 0, sz * (d / 2 - 0.2), 10);
        if (splay) { l.rotation.z = -sx * splay; l.rotation.x = sz * splay; }
        g.add(l);
      }
    }
    function sofaV(w, fab, pA, pB, d) {
      d = d || 3.0;
      const g = new T.Group();
      if (STYLE === 'modern') { // low and square on a recessed plinth
        g.add(bx(w - 0.5, 0.22, d - 0.5, M.black, 0, 0, 0));
        g.add(rb(w, 0.4, d, 0.04, fab, 0, 0.22, 0));
        g.add(rb(w - 1.5, 0.42, d - 0.8, 0.05, fab, 0, 0.62, 0.3));
        g.add(rb(w, 1.25, 0.55, 0.05, fab, 0, 0.62, -d / 2 + 0.275));
        for (const sx of [-1, 1]) g.add(rb(0.75, 0.75, d, 0.05, fab, sx * (w / 2 - 0.375), 0.62, 0));
        if (pA) { const p = rb(1.5, 0.75, 0.4, 0.12, pA, -w / 2 + 1.7, 1.06, -d / 2 + 0.85); p.rotation.x = -0.25; g.add(p); }
      } else { // light, on tapered timber legs, loose cushions and a throw
        legs(g, w, d, 0.65, M.teak, 0.09, 0.12);
        g.add(rb(w, 0.32, d, 0.1, fab, 0, 0.65, 0));
        const n = Math.max(1, Math.round((w - 0.6) / 2.3)), cw = (w - 0.6) / n;
        for (let i = 0; i < n; i++) {
          const x = -(w - 0.6) / 2 + cw * (i + 0.5);
          g.add(rb(cw - 0.05, 0.42, d - 0.6, 0.16, fab, x, 0.95, 0.22));
          const b = rb(cw - 0.08, 1.15, 0.42, 0.2, fab, x, 1.3, -d / 2 + 0.5);
          b.rotation.x = -0.16;
          g.add(b);
        }
        g.add(rb(w, 1.3, 0.22, 0.08, fab, 0, 0.9, -d / 2 + 0.11));
        for (const sx of [-1, 1]) g.add(rb(0.26, 1.0, d, 0.1, fab, sx * (w / 2 - 0.13), 0.9, 0));
        if (pA) {
          g.add(rb(0.5, 0.06, d * 0.9, 0.02, pA, w / 2 - 0.4, 1.92, 0));
          const p = rb(1.2, 1.2, 0.38, 0.18, pB || pA, -w / 2 + 1.0, 1.4, -d / 2 + 0.95);
          p.rotation.set(-0.3, 0.2, 0);
          g.add(p);
        }
      }
      return g;
    }
    function tableV(r, h, top) {
      const g = new T.Group();
      if (STYLE === 'modern') { // stone slab on a dark block
        if (h < 1.5) { g.add(bx(r * 1.7, h - 0.22, r * 1.0, M.black, 0, 0, 0)); g.add(bx(r * 2.3, 0.14, r * 1.35, M.quartz, 0, h - 0.2, 0)); }
        else { g.add(cyl(r * 0.75, r * 0.75, h, M.black, 0, 0, 0, 32)); g.add(cyl(r * 0.8, r * 0.8, 0.05, M.quartz, 0, h, 0, 32)); }
      } else { // round timber top on three splayed legs
        g.add(cyl(r, r, 0.09, top, 0, h - 0.09, 0, 40));
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI * 2) / 3, l = cyl(0.06, 0.04, h - 0.05, M.teak, Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55, 8);
          l.rotation.z = -Math.cos(a) * 0.16; l.rotation.x = Math.sin(a) * 0.16;
          g.add(l);
        }
      }
      return g;
    }
    function lampV() {
      const g = new T.Group();
      if (STYLE === 'modern') { // thin black stem with a small directed head
        g.add(cyl(0.45, 0.45, 0.05, M.black, 0, 0, 0)); g.add(cyl(0.03, 0.03, 5.4, M.black, 0, 0.05, 0, 8));
        g.add(bx(1.5, 0.05, 0.05, M.black, 0.72, 5.4, 0)); g.add(cyl(0.28, 0.34, 0.3, M.black, 1.45, 5.1, 0, 20));
        const d = cyl(0.26, 0.26, 0.03, M.glow, 1.45, 5.08, 0, 20); d.castShadow = false; g.add(d);
      } else { // timber tripod with a linen drum shade
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI * 2) / 3, l = cyl(0.04, 0.05, 4.4, M.teak, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 8);
          l.rotation.z = Math.cos(a) * 0.2; l.rotation.x = -Math.sin(a) * 0.2;
          g.add(l);
        }
        const sh = cyl(0.7, 0.7, 1.0, M.glowSoft, 0, 4.2, 0, 28); sh.castShadow = false; g.add(sh);
      }
      return g;
    }
    function chairV(fab) {
      const g = new T.Group();
      if (STYLE === 'modern') { // slim seat and low back on a black frame
        for (const sx of [-1, 1]) { g.add(bx(0.07, 1.3, 0.07, M.black, sx * 0.66, 0, 0.6)); g.add(bx(0.07, 2.6, 0.07, M.black, sx * 0.66, 0, -0.62)); g.add(bx(0.07, 0.07, 1.3, M.black, sx * 0.66, 0, 0)); }
        g.add(rb(1.4, 0.16, 1.4, 0.05, fab, 0, 1.3, 0)); g.add(rb(1.4, 0.75, 0.14, 0.05, fab, 0, 1.9, -0.62));
      } else { // timber chair with spindles, a top rail and a seat pad
        legs(g, 1.5, 1.45, 1.34, M.teak, 0.06, 0.08);
        g.add(rb(1.4, 0.1, 1.35, 0.04, M.teak, 0, 1.32, 0)); g.add(rb(1.2, 0.09, 1.15, 0.04, fab, 0, 1.42, 0.02));
        for (const sx of [-1, 1]) g.add(cyl(0.045, 0.045, 1.35, M.teak, sx * 0.6, 1.4, -0.62, 8));
        for (const sx of [-0.3, 0, 0.3]) g.add(cyl(0.025, 0.025, 1.1, M.teak, sx, 1.4, -0.62, 6));
        g.add(rb(1.45, 0.28, 0.12, 0.05, M.teak, 0, 2.55, -0.62));
      }
      return g;
    }
    function diningV() {
      const g = new T.Group();
      if (STYLE === 'modern') { // stone top on two dark slab legs
        g.add(bx(4.8, 0.12, 3.0, M.quartz, 0, 2.38, 0));
        for (const sx of [-1, 1]) g.add(bx(0.22, 2.38, 2.2, M.black, sx * 1.6, 0, 0));
        g.add(bx(1.6, 0.06, 0.5, M.black, 0, 2.5, 0));
        for (const sx of [-0.45, 0, 0.45]) g.add(mesh(new T.SphereGeometry(0.16, 14, 10), M.ceramic, sx, 2.72, 0));
      } else { // soft-cornered timber table, a vase of branches
        g.add(rb(4.6, 0.13, 3.0, 0.5, M.teak, 0, 2.37, 0));
        legs(g, 4.2, 2.6, 2.37, M.teak, 0.11, 0.1);
        g.add(cyl(0.2, 0.28, 0.75, M.potWhite, 0, 2.5, 0, 16));
        for (let k = 0; k < 5; k++) {
          const b = cyl(0.012, 0.012, 1.3, M.trunk, (k - 2) * 0.05, 3.2, 0, 5);
          b.rotation.z = (k - 2) * 0.16;
          g.add(b);
          g.add(mesh(new T.IcosahedronGeometry(0.14, 0), M.leaf2, (k - 2) * 0.24, 4.45 - Math.abs(k - 2) * 0.08, 0));
        }
      }
      for (const sx of [-1.1, 1.1]) {
        const c1 = chairV(M.fabSand); c1.position.set(sx, 0, -1.95); g.add(c1);
        const c2 = chairV(M.fabSand); c2.position.set(sx, 0, 1.95); c2.rotation.y = Math.PI; g.add(c2);
        for (const sz of [-0.98, 0.98]) {
          g.add(cyl(0.44, 0.44, 0.03, M.ceramic, sx, 2.5, sz, 28));
          const gl = cyl(0.09, 0.07, 0.36, M.glass, sx + 0.48, 2.5, sz - Math.sign(sz) * 0.3, 12);
          gl.castShadow = false;
          g.add(gl);
        }
      }
      return g;
    }
    function bedV() {
      const g = new T.Group(), W = 6, L = 6.75;
      if (STYLE === 'modern') { // low platform, wide flat headboard with a ledge
        g.add(bx(W + 1.8, 0.45, L + 0.9, M.walnut, 0, 0.12, 0.3)); g.add(bx(W + 1.0, 0.12, L + 0.2, M.black, 0, 0, 0.3));
        g.add(rb(W, 0.7, L - 0.15, 0.08, M.fabWhite, 0, 0.57, 0.05));
        g.add(rb(W + 0.1, 0.24, L * 0.62, 0.06, M.fabGrey, 0, 1.2, L / 2 - L * 0.31 + 0.08));
        for (const sx of [-1, 1]) {
          g.add(rb(2.6, 0.38, 1.5, 0.12, M.fabWhite, sx * 1.45, 1.27, -L / 2 + 0.95));
          g.add(rb(2.2, 0.32, 1.1, 0.1, sx < 0 ? M.fabTeal : M.fabTerra, sx * 1.3, 1.6, -L / 2 + 1.2));
        }
        g.add(bx(W + 3.4, 2.9, 0.22, M.walnut, 0, 0.12, -L / 2 - 0.2)); g.add(bx(W + 3.4, 0.08, 0.5, M.black, 0, 3.02, -L / 2 - 0.06));
      } else { // timber frame on legs, slatted headboard, layered linen
        legs(g, W + 0.2, L, 0.7, M.teak, 0.1, 0);
        g.add(bx(W + 0.3, 0.3, L + 0.15, M.teak, 0, 0.7, 0)); g.add(rb(W, 0.75, L - 0.15, 0.14, M.fabWhite, 0, 1.0, 0.05));
        g.add(rb(W + 0.2, 0.28, L * 0.6, 0.12, M.fabIvory, 0, 1.7, L / 2 - L * 0.3 + 0.08)); g.add(rb(W + 0.26, 0.1, 1.6, 0.04, M.fabTeal, 0, 1.97, L / 2 - 1.2));
        for (const sx of [-1, 1]) {
          const p = rb(2.5, 1.25, 0.5, 0.22, M.fabWhite, sx * 1.45, 1.72, -L / 2 + 0.55); p.rotation.x = -0.3; g.add(p);
          const q = rb(1.6, 0.95, 0.4, 0.2, sx < 0 ? M.fabTerra : M.fabMustard, sx * 1.2, 1.76, -L / 2 + 1.12); q.rotation.x = -0.36; g.add(q);
        }
        for (let k = 0; k < 11; k++) g.add(bx(0.2, 2.6, 0.1, M.teak, -3.0 + k * 0.6, 1.0, -L / 2 - 0.1));
        g.add(bx(W + 0.5, 0.22, 0.16, M.teak, 0, 3.6, -L / 2 - 0.1));
      }
      return g;
    }
    function pendantV(X, Y, drop, r, shadeMat) {
      const g = new T.Group();
      g.add(cyl(0.012, 0.012, H - drop, M.black, 0, drop, 0, 6));
      if (STYLE === 'modern') { // slim black tube
        const len = shadeMat ? 1.2 : 0.7;
        g.add(cyl(0.085, 0.085, len, M.black, 0, drop - len, 0, 14));
        const d = cyl(0.075, 0.075, 0.04, M.glow, 0, drop - len - 0.03, 0, 12); d.castShadow = false; g.add(d);
      } else if (shadeMat) { // wide white dome
        g.add(cyl(0.16, r * 1.7, r * 1.15, M.white, 0, drop - r * 1.15, 0, 28));
        const d = cyl(r * 1.3, r * 1.3, 0.03, M.glow, 0, drop - r * 1.15 - 0.01, 0, 20); d.castShadow = false; g.add(d);
      } else { // paper globe
        const sp = mesh(new T.SphereGeometry(r * 1.35, 20, 14), M.glowSoft, 0, drop - r * 1.35, 0); sp.castShadow = false; g.add(sp);
      }
      g.position.set(X, 0, Y);
      root.add(g);
    }

    // --- loose pieces --------------------------------------------------------
    function sofa(w, fab, pillowA, pillowB, d) {
      if (STYLE !== 'luxury') return sofaV(w, fab, pillowA, pillowB, d);
      d = d || 3.0;
      const g = new T.Group(), arm = 0.5;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.16, 0.36, 0.16, M.walnut, sx * (w / 2 - 0.25), 0, sz * (d / 2 - 0.25)));
      g.add(rb(w, 0.55, d, 0.12, fab, 0, 0.35, 0));
      g.add(rb(w, 2.0, 0.42, 0.14, fab, 0, 0.35, -d / 2 + 0.21));
      for (const sx of [-1, 1]) g.add(rb(arm, 1.5, d, 0.16, fab, sx * (w / 2 - arm / 2), 0.35, 0));
      const inner = w - 2 * arm, n = Math.max(1, Math.round(inner / 2.1)), cw = inner / n;
      for (let i = 0; i < n; i++) {
        const x = -inner / 2 + cw * (i + 0.5);
        g.add(rb(cw - 0.04, 0.5, d - 0.75, 0.14, fab, x, 0.88, 0.3));
        const bk = rb(cw - 0.06, 1.2, 0.5, 0.18, fab, x, 1.32, -d / 2 + 0.68);
        bk.rotation.x = -0.14;
        g.add(bk);
      }
      if (pillowA) {
        const p1 = rb(1.25, 1.25, 0.42, 0.18, pillowA, -inner / 2 + 0.75, 1.36, -d / 2 + 1.12);
        p1.rotation.set(-0.3, 0.25, 0);
        g.add(p1);
        const p2 = rb(1.15, 1.15, 0.4, 0.18, pillowB || pillowA, inner / 2 - 0.7, 1.36, -d / 2 + 1.12);
        p2.rotation.set(-0.3, -0.3, 0);
        g.add(p2);
      }
      return g;
    }
    function roundTable(r, h, top, base) {
      if (STYLE !== 'luxury') return tableV(r, h, top);
      const g = new T.Group();
      g.add(cyl(r, r, 0.12, top, 0, h - 0.12, 0, 40));
      g.add(cyl(0.09, 0.09, h - 0.16, base, 0, 0.04, 0, 12));
      g.add(cyl(r * 0.55, r * 0.6, 0.06, base, 0, 0, 0, 32));
      return g;
    }
    function floorLamp() {
      if (STYLE !== 'luxury') return lampV();
      const g = new T.Group();
      g.add(cyl(0.5, 0.55, 0.08, M.brass, 0, 0, 0));
      g.add(cyl(0.04, 0.04, 4.7, M.brass, 0, 0.08, 0, 8));
      const sh = cyl(0.55, 0.75, 0.95, M.glowSoft, 0, 4.5, 0, 28);
      sh.castShadow = false;
      g.add(sh);
      return g;
    }
    function tableLamp() {
      const g = new T.Group();
      g.add(cyl(0.16, 0.24, 0.7, M.pot, 0, 0, 0));
      const sh = cyl(0.3, 0.45, 0.55, M.glowSoft, 0, 0.72, 0, 24);
      sh.castShadow = false;
      g.add(sh);
      return g;
    }
    function plant(h, pot, big) {
      const g = new T.Group(), R = big ? 0.8 : 0.55;
      g.add(cyl(R, R * 0.72, R * 1.7, pot || M.pot, 0, 0, 0, 20));
      const geo = cache.ico || (cache.ico = new T.IcosahedronGeometry(1, 1));
      const n = big ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, rr = (i % 3) * R * 0.45, m = mesh(geo, i % 2 ? M.leaf : M.leaf2);
        const s = R * (0.75 + ((i * 37) % 10) / 22);
        m.scale.set(s, s * 1.5, s);
        m.position.set(Math.cos(a) * rr, R * 1.7 + (h - R * 1.7) * (0.25 + (i / n) * 0.7), Math.sin(a) * rr);
        g.add(m);
      }
      return g;
    }
    function chair(fab) {
      if (STYLE !== 'luxury') return chairV(fab);
      const g = new T.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.11, 1.32, 0.11, M.walnut, sx * 0.62, 0, sz * 0.6));
      g.add(rb(1.45, 0.24, 1.45, 0.08, fab, 0, 1.3, 0));
      const bk = rb(1.45, 1.5, 0.2, 0.08, fab, 0, 1.5, -0.66);
      bk.rotation.x = -0.1;
      g.add(bk);
      return g;
    }
    function dining() {
      if (STYLE !== 'luxury') return diningV();
      const g = new T.Group();
      g.add(rb(4.6, 0.15, 3.0, 0.06, M.teak, 0, 2.35, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.2, 2.35, 0.2, M.teak, sx * 1.95, 0, sz * 1.15));
      for (const sx of [-1.1, 1.1]) {
        const c1 = chair(M.fabSand); c1.position.set(sx, 0, -1.95); g.add(c1);
        const c2 = chair(M.fabSand); c2.position.set(sx, 0, 1.95); c2.rotation.y = Math.PI; g.add(c2);
      }
      g.add(cyl(0.55, 0.35, 0.3, M.brass, 0, 2.52, 0, 24));
      g.add(bx(4.1, 0.014, 0.95, M.fabTerra, 0, 2.5, 0)); // table runner
      for (const sx of [-1.1, 1.1]) for (const sz of [-0.98, 0.98]) { // four place settings
        g.add(cyl(0.44, 0.44, 0.03, M.ceramic, sx, 2.5, sz, 28));
        g.add(cyl(0.27, 0.27, 0.03, M.fabSand, sx, 2.53, sz, 20));
        const gl = cyl(0.09, 0.07, 0.36, M.glass, sx + 0.48, 2.5, sz - Math.sign(sz) * 0.3, 12);
        gl.castShadow = false;
        g.add(gl);
      }
      return g;
    }
    function bed() {
      if (STYLE !== 'luxury') return bedV();
      const g = new T.Group(), W = 6, L = 6.75;
      g.add(bx(W + 0.3, 0.75, L + 0.2, M.walnut, 0, 0.25, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.2, 0.25, 0.2, M.black, sx * (W / 2 - 0.2), 0, sz * (L / 2 - 0.2)));
      g.add(rb(W, 0.8, L - 0.15, 0.12, M.fabWhite, 0, 1.0, 0.05));
      g.add(rb(W + 0.24, 0.3, L * 0.6, 0.1, M.fabSand, 0, 1.72, L / 2 - L * 0.3 + 0.08));
      g.add(rb(W + 0.24, 0.2, 0.9, 0.08, M.fabIvory, 0, 1.86, L / 2 - L * 0.6 - 0.3));
      g.add(rb(W + 0.3, 0.12, 1.5, 0.05, M.fabTerra, 0, 2.02, L / 2 - 1.15));
      for (const sx of [-1, 1]) {
        const p = rb(2.6, 1.35, 0.5, 0.2, M.fabWhite, sx * 1.45, 1.75, -L / 2 + 0.55);
        p.rotation.x = -0.28;
        g.add(p);
        const q = rb(1.9, 1.0, 0.42, 0.18, sx < 0 ? M.fabTeal : M.fabMustard, sx * 1.25, 1.78, -L / 2 + 1.15);
        q.rotation.x = -0.35;
        g.add(q);
      }
      g.add(bx(W + 2.8, 4.5, 0.2, M.walnut, 0, 0.2, -L / 2 - 0.2));
      const n = 7, cw = (W + 0.7) / n;
      for (let i = 0; i < n; i++) g.add(rb(cw - 0.05, 3.3, 0.3, 0.1, M.fabSand, -(W + 0.7) / 2 + cw * (i + 0.5), 1.15, -L / 2 - 0.02));
      return g;
    }
    function bench(fab) {
      const g = new T.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.1, 0.95, 0.1, M.brass, sx * 1.9, 0, sz * 0.5));
      g.add(rb(4.2, 0.45, 1.3, 0.14, fab, 0, 0.95, 0));
      return g;
    }
    function wc() {
      const g = new T.Group();
      g.add(rb(1.2, 1.1, 1.75, 0.4, M.ceramic, 0, 0.25, 0.02));
      g.add(rb(1.16, 0.1, 1.5, 0.35, M.white, 0, 1.36, 0.1));
      g.add(bx(0.9, 0.55, 0.05, M[TAP], 0, 3.1, -0.86));
      return g;
    }
    function curtain(w, h) {
      const geo = new T.PlaneGeometry(w, h, Math.max(8, Math.round(w * 14)), 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9.5) * 0.09 + Math.sin(p.getX(i) * 23) * 0.02);
      geo.computeVertexNormals();
      const m = new T.Mesh(geo, M.sheer);
      m.receiveShadow = true;
      m.renderOrder = 7;
      return m;
    }
    function hang(c, X, Y, rot, top) { // curtain placed by its centre, top edge at "top"
      const h = c.geometry.parameters.height;
      c.position.set(X, top - h / 2, Y);
      c.rotation.y = ((rot || 0) * Math.PI) / 180;
      root.add(c);
    }
    function rugAt(mat, X, Y, w, d, z) {
      const m = mesh(new T.BoxGeometry(w, 0.04, d), mat, X, (z || 0) + 0.02, Y);
      m.castShadow = false;
      root.add(m);
    }
    function artAt(mat, ax, a0, a1, face, dir, z0, z1) {
      if (STYLE === 'scandi' && a1 - a0 > 2.6 && !artAt.inner) { // a row of three smaller frames
        artAt.inner = true;
        const gap = 0.25, w3 = (a1 - a0 - 2 * gap) / 3;
        for (let k = 0; k < 3; k++) artAt(mat, ax, a0 + k * (w3 + gap), a0 + k * (w3 + gap) + w3, face, dir, z0 + (k === 1 ? 0 : 0.35), z1 - (k === 1 ? 0 : 0.35));
        artAt.inner = false;
        return;
      }
      if (STYLE === 'luxury') { // a brass picture light over each painting
        const m = (a0 + a1) / 2, e0 = Math.min(face, face + 0.16 * dir), e1 = Math.max(face, face + 0.16 * dir);
        if (ax === 'x') { pb('brass', m - 0.7, e0, m + 0.7, e1, z1 + 0.3, z1 + 0.38); pb('glow', m - 0.6, e0, m + 0.6, e1, z1 + 0.27, z1 + 0.3); }
        else { pb('brass', e0, m - 0.7, e1, m + 0.7, z1 + 0.3, z1 + 0.38); pb('glow', e0, m - 0.6, e1, m + 0.6, z1 + 0.27, z1 + 0.3); }
      } // framed canvas on a wall face
      const f = 0.09, t = 0.1;
      if (ax === 'x') {
        const y0 = dir > 0 ? face : face - t, y1 = dir > 0 ? face + t : face;
        pb(FRAME, a0 - f, y0, a1 + f, y1, z0 - f, z1 + f);
        const m = mesh(new T.PlaneGeometry(a1 - a0, z1 - z0), mat, (a0 + a1) / 2, (z0 + z1) / 2, dir > 0 ? y1 + 0.006 : y0 - 0.006);
        if (dir < 0) m.rotation.y = Math.PI;
        m.castShadow = false;
        root.add(m);
      } else {
        const x0 = dir > 0 ? face : face - t, x1 = dir > 0 ? face + t : face;
        pb(FRAME, x0, a0 - f, x1, a1 + f, z0 - f, z1 + f);
        const m = mesh(new T.PlaneGeometry(a1 - a0, z1 - z0), mat, dir > 0 ? x1 + 0.006 : x0 - 0.006, (z0 + z1) / 2, (a0 + a1) / 2);
        m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        m.castShadow = false;
        root.add(m);
      }
    }
    function pendant(X, Y, drop, r, shadeMat) {
      if (STYLE !== 'luxury') return pendantV(X, Y, drop, r, shadeMat); // hangs from the ceiling
      const g = new T.Group();
      g.add(cyl(0.012, 0.012, H - drop, M.black, 0, drop, 0, 6));
      if (shadeMat) {
        g.add(cyl(0.12, r, r * 1.1, shadeMat, 0, drop - r * 1.1, 0, 24));
        const d = cyl(r * 0.8, r * 0.8, 0.03, M.glow, 0, drop - r * 1.1 - 0.01, 0, 20);
        d.castShadow = false;
        g.add(d);
      } else {
        const s = mesh(new T.SphereGeometry(r, 20, 14), M.glow, 0, drop - r, 0);
        s.castShadow = false;
        g.add(s);
        g.add(cyl(0.07, 0.07, 0.12, M.brass, 0, drop - 0.02, 0, 10));
      }
      g.position.set(X, 0, Y);
      root.add(g);
    }
    // a run of cabinet doors on a face. ax = direction the run goes along.
    function cabRun(mk, ax, a0, a1, face, dir, z0, z1, depth, doorW) {
      if (ax === 'x') pb(mk, a0, dir > 0 ? face - depth : face, a1, dir > 0 ? face : face + depth, z0, z1);
      else pb(mk, dir > 0 ? face - depth : face, a0, dir > 0 ? face : face + depth, a1, z0, z1);
      const n = Math.max(1, Math.round((a1 - a0) / doorW)), w = (a1 - a0) / n, g = 0.012, e = 0.012 * dir;
      for (let i = 0; i <= n; i++) {
        const u = a0 + i * w;
        if (ax === 'x') pb('black', u - g, Math.min(face, face + e), u + g, Math.max(face, face + e), z0, z1);
        else pb('black', Math.min(face, face + e), u - g, Math.max(face, face + e), u + g, z0, z1);
      }
      if (STYLE === 'modern') return; // handleless fronts
      for (let i = 0; i < n; i++) {
        const u = a0 + (i + 0.5) * w, hz = z1 - z0 > 4 ? (z0 + z1) / 2 : z0 > 3 ? z0 + 0.25 : z1 - 0.3, hh = STYLE === 'scandi' ? 0.05 : z1 - z0 > 4 ? 0.5 : 0.04, hw = STYLE === 'scandi' ? 0.05 : z1 - z0 > 4 ? 0.03 : 0.4; // small knobs or long bars
        const f0 = Math.min(face, face + 0.06 * dir), f1 = Math.max(face, face + 0.06 * dir);
        const off = z1 - z0 > 4 ? (i % 2 ? -w / 2 + 0.14 : w / 2 - 0.14) : 0;
        if (ax === 'x') pb(HW, u + off - hw, f0, u + off + hw, f1, hz - hh, hz + hh);
        else pb(HW, f0, u + off - hw, f1, u + off + hw, hz - hh, hz + hh);
      }
    }

    // ===== Living and dining (open to the lounge) ==============================
    pb('fluted', 5.6, 0.375, 9.36, 0.45, 0, H);
    pb('walnut', 5.7, 0.45, 9.3, 1.75, 0.55, 1.6);
    pb('black', 5.9, 0.6, 9.1, 1.6, 0.25, 0.55);
    pb('screen', 5.78, 0.45, 9.18, 0.57, 3.0, 4.95);
    block(5.6, 0.4, 9.36, 1.75);
    put(sofa(6, M.fabIvory, M.fabTerra, M.fabMustard), 7.0, 8.6, 180);
    put(sofa(2.9, M.fabTeal, null, null, 2.8), 2.2, 5.1, 70);
    put(roundTable(1.35, 1.25, M.teak, M.brass), 7.0, 5.1, 0);
    rugAt(M.rugLiving, 6.6, 5.9, 8.6, 6.4);
    put(floorLamp(), 0.6, 1.4, 0, 0, false);
    put(plant(4.6, M.potWhite, true), 0.9, 12.0, 0);
    put(dining(), 14.3, 7.9, 0);
    pendant(13.3, 7.9, 6.5, 0.42, M.brass);
    pendant(14.3, 7.9, 6.2, 0.42, M.brass);
    pendant(15.3, 7.9, 6.5, 0.42, M.brass);
    pb('walnut', 13.3, 0.75, 18.6, 2.1, 0.55, 2.8);
    pb('black', 13.5, 0.9, 18.4, 2.0, 0.25, 0.55);
    block(13.3, 0.75, 18.6, 2.1);
    put(tableLamp(), 17.7, 1.4, 0, 2.8, false);
    artAt(M.art1, 'x', 14.1, 17.3, 0.75, 1, 4.0, 6.5);
    artAt(M.art2, 'y', 11.0, 13.9, -0.25, 1, 3.8, 6.4);
    hang(curtain(1.2, 7.7), 0.02, 3.0, 90, 7.9);

    // ===== Kitchen: main room plus a utility leg along the south wall =========
    pb('black', 19.3, 0.75, 29.625, 2.6, 0, 0.3);
    cabRun('sage', 'x', 19.3, 27.625, 2.75, 1, 0.3, 2.75, 2.0, 1.9);
    pb('sage', 27.625, 0.75, 29.625, 5.2, 0.3, 2.75);
    cabRun('sage', 'y', 2.75, 5.2, 27.625, -1, 0.3, 2.75, 0.02, 1.25);
    pb('quartz', 19.25, 0.75, 29.625, 2.82, 2.75, 2.9);
    pb('quartz', 27.56, 2.82, 29.625, 5.26, 2.75, 2.9);
    pb('steel', 23.6, 1.15, 25.6, 2.4, 2.9, 2.915);
    pb('black', 23.75, 1.3, 25.45, 2.25, 2.905, 2.92);
    pb(TAP, 24.55, 0.95, 24.65, 1.05, 2.9, 3.85);
    pb(TAP, 24.55, 0.95, 24.65, 1.75, 3.78, 3.85);
    pb('black', 20.2, 1.1, 21.9, 2.3, 2.9, 2.93);      // hob
    pb('steel', 20.1, 0.78, 22.0, 2.0, 5.3, 5.75);     // hood
    pb('steel', 20.7, 0.78, 21.4, 1.4, 5.75, H);
    cabRun('teak', 'x', 26.95, 29.625, 1.95, 1, 4.6, 7.2, 1.2, 1.35);
    cabRun('teak', 'y', 1.95, 5.2, 28.45, -1, 4.6, 7.2, 1.175, 1.1);
    pb('bathwall', 19.3, 0.75, 29.625, 0.78, 2.9, 3.5);
    pb('bathwall', 19.3, 0.75, 22.37, 0.78, 3.5, 5.3);
    pb('bathwall', 26.87, 0.75, 29.625, 0.78, 3.5, 4.6);
    pb('bathwall', 29.595, 0.75, 29.625, 5.2, 2.9, 4.6);
    block(19.25, 0.75, 29.625, 2.82);
    block(27.56, 2.75, 29.625, 5.26);
    pb('teak', 22.3, 1.25, 23.3, 2.05, 2.9, 2.95);      // counter styling
    pb('ceramic', 26.0, 1.0, 26.35, 1.35, 2.9, 3.5);
    pb('pot', 26.5, 1.0, 26.8, 1.3, 2.9, 3.35);
    root.add(cyl(0.42, 0.28, 0.2, M.ceramic, 28.6, 2.9, 3.6, 24));
    for (const [fx, fy] of [[28.5, 3.55], [28.72, 3.68], [28.6, 3.78]]) root.add(mesh(new T.SphereGeometry(0.13, 12, 10), M.fabMustard, fx, 3.14, fy));
    // the utility leg is left clear: the wardrobe drawn there in the editor fills its end

    // ===== Common washroom ====================================================
    pb('bathwall', 19.2085, 14.215, 26.75, 14.25, 0, H);
    pb('bathwall', 19.2085, 8.125, 26.75, 8.16, 0, H);
    pb('bathwall', 26.715, 8.125, 26.75, 14.25, 0, H);
    pb('bathwall', 19.2085, 10.4, 19.245, 14.25, 0, H);
    pb('bathwall', 19.2085, 8.125, 19.245, 10.4, 7, H);
    pb('walnut', 22.0, 8.16, 25.5, 9.85, 1.3, 2.6);
    pb('quartz', 21.95, 8.16, 25.55, 9.9, 2.6, 2.75);
    root.add(cyl(0.6, 0.45, 0.4, M.ceramic, 23.75, 2.75, 9.05, 32));
    pb(TAP, 23.7, 8.3, 23.8, 8.4, 2.75, 3.6);
    pb(TAP, 23.7, 8.3, 23.8, 8.8, 3.52, 3.6);
    pb('mirror3', 22.2, 8.16, 25.3, 8.2, 3.5, 6.5);
    pb('glow', 22.2, 8.16, 25.3, 8.215, 6.58, 6.7);
    block(22.0, 8.16, 25.5, 9.9);
    put(wc(), 20.9, 13.34, 180);
    pb('glass', 23.55, 11.7, 23.6, 14.215, 0.05, 7);    // shower corner
    pb('glass', 24.9, 10.95, 26.715, 11.0, 0.05, 7);
    pb(TAP, 23.55, 11.7, 23.6, 14.215, 7, 7.08);
    pb(TAP, 24.9, 10.95, 26.715, 11.0, 7, 7.08);
    pb(TAP, 25.4, 12.6, 26.715, 12.7, 7.4, 7.48);
    root.add(cyl(0.5, 0.5, 0.06, M[TAP], 25.3, 7.28, 12.65, 28));
    pb(TAP, 26.64, 12.4, 26.715, 12.9, 3.6, 4.4);

    // ===== Family lounge ======================================================
    put(sofa(5, M.fabSand, M.fabTeal, M.fabTerra), 1.97, 21.25, 90);
    put(sofa(2.9, M.fabTerra, null, null, 2.8), 2.7, 17.3, 40);
    put(roundTable(0.8, 1.7, M.teak, M.brass), 4.5, 18.9, 0);
    rugAt(M.rugLounge, 3.7, 21.0, 5.2, 7.6);
    put(floorLamp(), 0.95, 24.7, 0, 0, false);
    put(plant(4.2, M.pot, true), 1.2, 26.95, 0);
    put(plant(3.2, M.potWhite), 0.95, 15.25, 0);
    artAt(M.art3, 'y', 15.3, 17.5, 0.375, 1, 3.8, 6.4);
    put(plant(4.4, M.pot, true), 12.2, 15.9, 0);
    hang(curtain(1.15, 7.7), 0.62, 17.55, 90, 7.9);
    hang(curtain(1.15, 7.7), 0.62, 24.98, 90, 7.9);
    artAt(M.art4, 'x', 13.05, 15.15, 27.875, -1, 3.5, 6.3);

    // chandelier dropping into the void
    {
      const cx = P.voidCenter[0], cy = P.voidCenter[1];
      root.add(cyl(1.5, 1.5, 0.08, M.brass, cx, H - 0.08, cy, 40));
      for (let i = 0; i < 13; i++) {
        const a = i * 2.39996, rr = 0.35 + 0.115 * i;
        pendant(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 7.2 - i * 0.44, 0.27 + (i % 3) * 0.05, null);
      }
    }

    // ===== Master bedroom =====================================================
    put(bed(), 18.6, 34.9, -90);
    put(bench(M.fabTerra), 14.25, 34.9, -90);
    put(roundTable(0.75, 1.9, M.teak, M.brass), 21.3, 30.8, 0);
    put(roundTable(0.75, 1.9, M.teak, M.brass), 21.3, 39.0, 0);
    pendant(21.3, 30.8, 4.9, 0.3, null);
    pendant(21.3, 39.0, 4.9, 0.3, null);
    rugAt(M.rugBed, 17.0, 34.9, 9.2, 8.6);
    pb('fluted', 9.25, 31.3, 9.31, 38.5, 0, H);
    pb('walnut', 9.31, 32.0, 10.55, 37.8, 0.55, 1.7);
    pb('black', 9.45, 32.2, 10.4, 37.6, 0.25, 0.55);
    pb('screen', 9.31, 32.9, 9.43, 36.9, 2.9, 5.2);
    block(9.25, 32.0, 10.55, 37.8);
    put(sofa(2.9, M.fabMustard, null, null, 2.8), 11.3, 43.7, 35);
    put(roundTable(0.65, 1.6, M.teak, M.brass), 13.6, 44.9, 0);
    put(floorLamp(), 9.95, 45.5, 0, 0, false);
    artAt(M.art2, 'y', 33.3, 36.5, 22.25, -1, 5.7, 7.5);
    hang(curtain(1.0, 7.7), 9.85, 46.0, 0, 7.9);
    hang(curtain(1.0, 7.7), 14.4, 46.0, 0, 7.9);

    // ===== Dress ==============================================================
    // wardrobes come from the plan (they can be added and moved in the editor)
    for (const w of P.wardrobes) {
      const [x0, y0, x1, y1] = w.r, alongX = w.face === 'rear' || w.face === 'front', dir = w.face === 'front' || w.face === 'south' ? 1 : -1;
      const a0 = alongX ? x0 : y0, a1 = alongX ? x1 : y1, depth = alongX ? y1 - y0 : x1 - x0;
      const face = alongX ? (dir > 0 ? y1 : y0) : (dir > 0 ? x1 : x0);
      if (a1 - a0 < 0.5 || depth < 0.3) continue;
      cabRun('teakV', alongX ? 'x' : 'y', a0, a1, face, dir, 0, w.h, depth, 1.6);
      if (w.mirror) {
        const m0 = a0 + (a1 - a0) * 0.26, m1 = a0 + (a1 - a0) * 0.74, f0 = Math.min(face, face + 0.035 * dir), f1 = Math.max(face, face + 0.035 * dir), top = Math.min(w.h - 0.3, 7.4);
        if (alongX) pb('mirror', m0, f0, m1, f1, 0.4, top); else pb('mirror', f0, m0, f1, m1, 0.4, top);
      }
      block(x0, y0, x1, y1);
    }
    { const pf = new T.Group(); pf.add(cyl(0.6, 0.55, 1.3, M.fabMustard, 0, 0, 0, 28)); put(pf, 24.2, 43.3, 0, 0, false); }

    // ===== Master toilet ======================================================
    pb('bathwall', 22.625, 28.25, 22.66, 37.875, 0, H);
    pb('bathwall', 22.625, 28.25, 29.625, 28.285, 0, H);
    pb('bathwall', 29.59, 31.25, 29.625, 37.875, 0, H);
    pb('bathwall', 29.215, 28.25, 29.25, 31.25, 0, H);
    pb('bathwall', 22.625, 37.84, 24.0, 37.875, 0, H);
    pb('bathwall', 26.75, 37.84, 29.625, 37.875, 0, H);
    pb('walnut', 27.95, 33.4, 29.59, 37.4, 1.3, 2.6);
    pb('quartz', 27.9, 33.35, 29.59, 37.45, 2.6, 2.75);
    root.add(cyl(0.62, 0.45, 0.42, M.ceramic, 28.72, 2.75, 35.4, 32));
    pb(TAP, 29.3, 35.35, 29.4, 35.45, 2.75, 3.6);
    pb(TAP, 28.9, 35.35, 29.4, 35.45, 3.52, 3.6);
    pb('mirror2', 29.55, 33.6, 29.59, 37.2, 3.4, 6.7);
    pb('glow', 29.535, 33.6, 29.59, 37.2, 6.78, 6.9);
    block(27.95, 33.4, 29.625, 37.4);
    put(wc(), 23.54, 33.9, 90);
    pb('glass', 22.66, 31.55, 27.0, 31.6, 0.05, 7);
    pb(TAP, 22.66, 31.53, 27.0, 31.62, 7, 7.08);
    pb(TAP, 25.75, 28.285, 25.85, 30.0, 7.4, 7.48);
    root.add(cyl(0.5, 0.5, 0.06, M[TAP], 25.8, 7.28, 30.0, 28));
    pb(TAP, 24.6, 28.285, 25.0, 28.36, 3.6, 4.4);
    pb(TAP, 22.66, 35.5, 22.74, 37.3, 4.2, 4.27);
    pb('fabWhite', 22.68, 35.7, 22.8, 37.0, 2.6, 4.25);

    // ===== Terrace and balconies ==============================================
    put(sofa(5, M.fabGrey, M.fabTerra, M.fabIvory), 1.97, 33.6, 90);
    put(roundTable(1.1, 1.25, M.teak, M.metal), 4.6, 33.6, 0);
    put(plant(4.4, M.pot, true), 1.3, 29.8, 0);
    pb('pot', 0.95, 45.75, 5.35, 46.5, 0, 1.3);
    block(0.95, 45.75, 5.35, 46.5);
    for (let i = 0; i < 6; i++) {
      const s = mesh(cache.ico, i % 2 ? M.leaf : M.leaf2, 1.1 + i * 0.72, 1.75 + (i % 3) * 0.12, 46.12);
      s.scale.set(0.55, 0.62, 0.45);
      root.add(s);
    }
    put(plant(3.4, M.potWhite), 8.3, 38.2, 0);
    put(roundTable(1.5, 2.4, M.teak, M.metal), 4.2, 42.3, 0); // outdoor dining under the pergola
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.6; put(chair(M.fabGrey), 4.2 + Math.sin(a) * 2.35, 42.3 + Math.cos(a) * 2.35, (a * 180) / Math.PI + 180); }
    put(plant(4.0, M.pot, true), 8.15, 45.2, 0);
    put(sofa(2.7, M.fabGrey, null, null, 2.5), 23.6, 48.75, 205);
    put(sofa(2.7, M.fabGrey, null, null, 2.5), 27.3, 48.75, 155);
    put(roundTable(0.7, 1.5, M.teak, M.metal), 25.45, 49.5, 0);
    put(plant(3.6, M.pot, true), 6.4, 49.7, 0);
    put(plant(3.0, M.potWhite), 12.3, 49.95, 0);
    put(plant(3.0, M.pot), 21.3, 49.95, 0, 0, false);
    put(plant(3.2, M.potWhite), -2.3, 1.2, 0);
    put(plant(3.6, M.pot, true), -2.3, 12.9, 0);
    put(plant(3.0, M.pot), 6.5, -1.1, 0);
    put(plant(3.2, M.potWhite), 20.5, -1.1, 0);

    // ===== Placeholder room under the void ====================================
    put(sofa(7, M.fabGrey, M.fabSand, M.fabSand), 15.5, 16.3, 0, GF);
    put(sofa(2.9, M.fabSand, null, null, 2.8), 10.9, 20.2, 90, GF);
    put(roundTable(1.5, 1.25, M.teak, M.metal), 15.5, 20.2, 0, GF);
    rugAt(M.rugGF, 15.5, 19.6, 10.5, 7.2, GF);
    put(plant(6, M.potWhite, true), 22.2, 23.0, 0, GF);

    // ===== Accessories, different in each style ================================
    if (STYLE === 'modern') { // sculptural vase and sphere, a tray, one block sculpture
      root.add(cyl(0.12, 0.2, 1.3, M.black, 6.2, 1.6, 1.1, 18));
      root.add(mesh(new T.SphereGeometry(0.28, 16, 12), M.ceramic, 8.6, 1.88, 1.1));
      pb('black', 14.2, 1.0, 15.6, 1.9, 2.8, 2.86);
      root.add(cyl(0.3, 0.3, 0.5, M.ceramic, 14.9, 2.86, 1.45, 20));
      pb('black', 9.6, 33.6, 10.3, 34.3, 1.7, 2.6);
    } else if (STYLE === 'scandi') { // more plants, a basket with a throw, books, candles
      put(plant(3.6, M.potWhite, true), 12.2, 22.9, 0);
      put(plant(2.6, M.potWhite), 16.2, 1.4, 0, 2.8, false);
      put(plant(3.0, M.potWhite), 21.6, 45.4, 0);
      { const bk = new T.Group(); bk.add(cyl(0.7, 0.55, 1.1, M.fabSand, 0, 0, 0, 20)); bk.add(rb(1.0, 0.5, 1.0, 0.2, M.fabIvory, 0, 0.85, 0)); put(bk, 3.2, 9.4, 0); }
      for (let k = 0; k < 4; k++) pb(k % 2 ? 'fabTeal' : 'fabIvory', 14.0 + k * 0.32, 1.0, 14.26 + k * 0.32, 1.7, 2.8, 3.55 - k * 0.08);
      root.add(cyl(0.09, 0.09, 0.5, M.white, 6.2, 1.6, 1.1, 12));
      root.add(cyl(0.09, 0.09, 0.7, M.white, 6.55, 1.6, 1.15, 12));
    } else { // brass vase, a tray with candles, a ceramic urn
      root.add(cyl(0.18, 0.3, 1.1, M.brass, 6.2, 1.6, 1.1, 20));
      root.add(cyl(0.6, 0.6, 0.04, M.brass, 7.0, 1.25, 5.1, 28));
      root.add(cyl(0.1, 0.1, 0.45, M.white, 6.8, 1.29, 5.0, 12));
      root.add(cyl(0.1, 0.1, 0.3, M.white, 7.2, 1.29, 5.2, 12));
      root.add(cyl(0.22, 0.14, 0.8, M.pot, 14.4, 2.8, 1.4, 18));
      pb('brass', 9.6, 33.7, 10.3, 34.2, 1.7, 1.76);
    }

    B.flush(A.groups);
    scene.add(root);
    return root;
  };
})();
