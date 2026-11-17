/* Ground floor furniture and fittings. Uses the kit from furniture.js (the same
   sofas, beds, tables, lamps and cabinet runs, so every piece follows the chosen
   style). Everything here is placed from the ground floor finish upward. */
(function () {
  const A = (window.APP = window.APP || {});

  A.furnishGround = function (K) {
    const { T, P, M, GF, STYLE, TAP } = K, GR = P.ground, HG = GR.H, PL = GF + GR.PORCH;
    // boxes, loose pieces and blockers, measured from the ground floor finish
    const g = (mk, x0, y0, x1, y1, z0, z1) => K.pb(mk, x0, y0, x1, y1, GF + z0, GF + z1);
    const put = (obj, X, Y, rot, solid) => K.put(obj, X, Y, rot, GF, solid);
    const block = (x0, y0, x1, y1) => K.block(x0, y0, x1, y1, GF);
    const add = (m, lvl) => { m.position.y += lvl === undefined ? GF : lvl; return K.add(m); };
    const pendant = (X, Y, drop, r, shade) => K.pendant(X, Y, drop, r, shade, GF, HG);
    const art = (mat, ax, a0, a1, face, dir, z0, z1) => K.artAt(mat, ax, a0, a1, face, dir, GF + z0, GF + z1);
    const curtainAt = (X, Y, rot) => K.hang(K.curtain(1.05, 7.7), X, Y, rot, GF + 7.9);
    const tiles = (x0, y0, x1, y1) => g('bathwall', x0, y0, x1, y1, 0, HG);

    // a single bed for the children's room
    function twin(cover) {
      const b = new T.Group(), W = 3.4, L = 6.5;
      K.legs(b, W, L, 0.4, M.teak, 0.08, 0);
      b.add(K.bx(W + 0.2, 0.4, L + 0.15, M.teak, 0, 0.4, 0));
      b.add(K.rb(W, 0.6, L - 0.1, 0.1, M.fabWhite, 0, 0.8, 0.03));
      const dv = A.hasModel && A.hasModel('bedding_twin') ? A.model('bedding_twin', { duvet: cover, runner: M.fabSand }) : null;
      if (dv) { dv.position.set(0, 1.4, -L / 2 + 0.05); b.add(dv); }
      else b.add(K.rb(W + 0.12, 0.22, L * 0.55, 0.08, cover, 0, 1.36, L / 2 - L * 0.275 + 0.05));
      const p = K.soft('bedpillow', 2.2, 1.05, 0.45, M.fabWhite, 0, 1.4, -L / 2 + 0.55);
      p.rotation.x = -0.3;
      b.add(p);
      if (STYLE === 'modern') b.add(K.bx(W + 0.9, 2.5, 0.2, M.walnut, 0, 0.4, -L / 2 - 0.14));
      else if (STYLE === 'scandi') { for (let k = 0; k < 6; k++) b.add(K.bx(0.2, 2.4, 0.1, M.teak, -1.5 + k * 0.6, 0.8, -L / 2 - 0.1)); b.add(K.bx(W + 0.3, 0.2, 0.14, M.teak, 0, 3.2, -L / 2 - 0.1)); }
      else { b.add(K.bx(W + 0.4, 3.2, 0.18, M.walnut, 0, 0.4, -L / 2 - 0.14)); b.add(K.rb(W - 0.2, 2.0, 0.26, 0.1, M.fabSand, 0, 1.4, -L / 2 - 0.02)); }
      return b;
    }

    // ===== Living / dining hall (double height over the dining end) ============
    put(K.sofa(7, M.fabIvory, M.fabTerra, M.fabMustard), 4.7, 16.35, 0);
    put(K.sofa(2.9, M.fabTeal, null, null, 2.8), 1.95, 20.6, 90);
    put(K.sofa(2.9, M.fabTerra, null, null, 2.8), 8.0, 20.6, -90);
    put(K.roundTable(1.35, 1.25, M.teak, M.brass), 4.8, 20.5, 0);
    K.rugAt(M.rugLiving, 4.8, 19.9, 8.4, 7.4, GF);
    put(K.floorLamp(), 0.95, 15.35, 0, false);
    put(K.plant(3.4, M.potWhite), 1.05, 26.7, 0);
    art(M.art1, 'x', 2.9, 6.5, 14.625, 1, 4.3, 6.9);
    curtainAt(0.62, 17.55, 90);
    curtainAt(0.62, 24.96, 90);
    // sideboard on the entrance wall
    g('walnut', 9.5, 26.55, 12.4, 27.875, 0.55, 2.9);
    g('black', 9.65, 26.7, 12.25, 27.8, 0.25, 0.55);
    block(9.5, 26.55, 12.4, 27.875);
    K.put(K.tableLamp(), 10.1, 27.2, 0, GF + 2.9, false);
    art(M.art3, 'x', 9.85, 12.05, 27.875, -1, 4.1, 6.5);
    // dining under the double height
    put(K.dining(), 17.6, 20.6, 0);
    K.rugAt(M.rugGF, 17.6, 20.6, 7.6, 8.4, GF);
    // under the main stair: a store cupboard below the landing, plants below the top flight
    K.cabRun('walnut', 'y', 24.1, 27.75, 26.2, -1, GF, GF + 5.9, 3.35, 1.2);
    block(26.2, 24.1, 29.625, 27.875);
    put(K.plant(4.0, M.pot), 22.9, 26.9, 0);
    put(K.plant(3.0, M.potWhite), 25.0, 27.0, 0);

    // ===== Kitchen: L-shaped counter along the north and road-side walls =======
    g('black', 8.5, 28.25, 10.2, 36.26, 0, 0.3);
    g('black', 8.5, 36.4, 15.875, 38.25, 0, 0.3);
    K.cabRun('sage', 'y', 28.25, 36.26, 10.37, 1, GF + 0.3, GF + 2.75, 1.87, 1.9);
    g('sage', 8.5, 36.26, 10.37, 38.25, 0.3, 2.75);
    K.cabRun('sage', 'x', 10.37, 15.875, 36.26, -1, GF + 0.3, GF + 2.75, 1.99, 1.85);
    g('quartz', 8.5, 28.25, 10.44, 38.25, 2.75, 2.9);
    g('quartz', 10.44, 36.19, 15.875, 38.25, 2.75, 2.9);
    g('black', 8.8, 30.5, 10.0, 32.2, 2.9, 2.93);          // hob
    g('steel', 8.53, 30.4, 9.8, 32.3, 5.3, 5.75);          // hood
    g('steel', 8.53, 31.0, 9.2, 31.7, 5.75, HG);
    g('steel', 12.0, 36.75, 14.0, 37.9, 2.9, 2.915);       // sink
    g('black', 12.15, 36.9, 13.85, 37.75, 2.905, 2.92);
    g(TAP, 12.95, 38.0, 13.05, 38.1, 2.9, 3.85);
    g(TAP, 12.95, 37.35, 13.05, 38.1, 3.78, 3.85);
    K.cabRun('teak', 'y', 28.35, 30.2, 9.7, 1, GF + 4.6, GF + 7.2, 1.2, 0.95);
    K.cabRun('teak', 'y', 32.5, 35.4, 9.7, 1, GF + 4.6, GF + 7.2, 1.2, 1.45);
    K.cabRun('teak', 'x', 11.6, 15.8, 37.05, -1, GF + 4.6, GF + 7.2, 1.2, 1.4);
    g('bathwall', 8.5, 28.25, 8.53, 35.6, 2.9, 4.6);
    g('bathwall', 11.3, 38.22, 15.875, 38.25, 2.9, 4.6);
    block(8.5, 28.25, 10.44, 38.25);
    block(10.44, 36.19, 15.875, 38.25);
    g('teak', 9.0, 33.2, 9.9, 34.2, 2.9, 2.95);            // counter styling
    g('ceramic', 9.1, 28.8, 9.45, 29.15, 2.9, 3.5);
    g('pot', 9.1, 29.4, 9.4, 29.7, 2.9, 3.35);
    add(K.cyl(0.42, 0.28, 0.2, M.ceramic, 15.0, 2.9, 37.2, 24));
    for (const [fx, fy] of [[14.9, 37.15], [15.12, 37.28], [15.0, 37.38]]) add(K.mesh(new T.SphereGeometry(0.13, 12, 10), M.fabMustard, fx, 3.14, fy));

    // ===== Children's bedroom: two single beds, a study desk at the window ======
    put(twin(M.fabTeal), 3.2, 6.6, 90);
    put(twin(M.fabMustard), 3.2, 12.4, 90);
    put(K.roundTable(0.6, 1.7, M.teak, M.brass), 0.75, 9.5, 0);
    K.put(K.tableLamp(), 0.75, 9.5, 0, GF + 1.7, false);
    g('teak', 7.0, 4.75, 9.3, 6.35, 2.35, 2.5);            // desk under the rear window
    g('black', 7.05, 4.8, 7.15, 6.3, 0, 2.35);
    g('black', 9.15, 4.8, 9.25, 6.3, 0, 2.35);
    block(7.0, 4.75, 9.3, 6.35);
    put(K.chair(M.fabSand), 8.15, 7.25, 180);
    g('fabTeal', 7.3, 5.0, 7.9, 5.8, 2.5, 2.62);           // books on the desk
    g('fabMustard', 7.35, 5.05, 7.85, 5.75, 2.62, 2.72);
    K.rugAt(M.rugBed, 9.3, 10.6, 4.6, 6.2, GF);
    art(M.art2, 'y', 5.4, 7.2, -0.25, 1, 4.6, 6.3);
    art(M.art4, 'y', 11.6, 13.4, -0.25, 1, 4.6, 6.3);
    curtainAt(0.02, 7.45, 90);
    curtainAt(0.02, 11.3, 90);
    pendant(8.6, 10.2, 7.4, 0.5, M.brass);

    // ===== Pooja: marble mandir on the rear wall ================================
    g('quartz', 0.3, 0.375, 4.2, 1.38, 0, 1.6);
    g('fluted', 0.3, 0.375, 4.2, 0.44, 1.6, 7.4);
    g('teak', 1.35, 0.44, 3.15, 0.56, 2.0, 5.8);
    g('brass', 1.15, 0.44, 3.35, 1.25, 6.0, 6.14);
    g('brass', 1.2, 0.5, 1.32, 0.62, 1.6, 6.0);
    g('brass', 3.18, 0.5, 3.3, 0.62, 1.6, 6.0);
    g('glow', 0.4, 0.44, 4.1, 0.5, 7.2, 7.3);
    add(K.cyl(0.32, 0.22, 0.9, M.brass, 2.25, 1.6, 0.86, 20));     // kalash
    add(K.cyl(0.14, 0.2, 0.12, M.brass, 1.2, 1.6, 1.0, 14));       // diyas
    add(K.cyl(0.14, 0.2, 0.12, M.brass, 3.3, 1.6, 1.0, 14));
    for (const dx of [1.2, 3.3]) { const f = K.mesh(new T.SphereGeometry(0.07, 10, 8), M.glow, dx, 1.8, 1.0); f.castShadow = false; add(f); }
    block(0.3, 0.375, 4.2, 1.38);
    K.rugAt(M.rugLounge, 2.25, 2.95, 3.4, 2.2, GF);

    // ===== Open court (water tank below) ========================================
    g('stone', 5.7, 0.55, 8.9, 1.9, 0, 0.14);              // tank cover
    put(K.plant(2.8, M.pot), 6.2, 1.1, 0);
    put(K.plant(2.8, M.potWhite), 8.2, 1.05, 0);

    // ===== Store: open shelving ==================================================
    for (const z of [1.4, 3.1, 4.8, 6.5]) g('teak', 13.4, 0.78, 19.2, 2.1, z, z + 0.1);
    for (const x of [13.4, 16.25, 19.1]) g('black', x, 0.78, x + 0.1, 2.1, 0, 6.6);
    g('fabSand', 13.8, 0.9, 15.4, 1.95, 1.5, 2.6);
    g('fabGrey', 16.6, 0.9, 18.6, 1.95, 3.2, 4.2);
    g('fabIvory', 14.2, 0.9, 15.9, 1.95, 4.9, 5.8);

    // ===== Common toilet with the W.C. alcove ====================================
    tiles(13.26, 9.5, 13.295, 14.25);
    tiles(13.26, 9.5, 15.26, 9.535);
    tiles(15.26, 6.75, 19.25, 6.785);
    tiles(15.26, 6.75, 15.295, 9.5);
    tiles(19.215, 6.75, 19.25, 14.25);
    g('walnut', 13.3, 10.4, 14.9, 13.3, 1.3, 2.6);
    g('quartz', 13.3, 10.35, 14.95, 13.35, 2.6, 2.75);
    add(K.cyl(0.6, 0.45, 0.4, M.ceramic, 14.1, 2.75, 11.85, 32));
    g(TAP, 13.4, 11.8, 13.5, 11.9, 2.75, 3.6);
    g(TAP, 13.4, 11.8, 13.9, 11.9, 3.52, 3.6);
    g('mirror4', 13.295, 10.6, 13.33, 13.1, 3.4, 6.4);
    g('glow', 13.295, 10.6, 13.345, 13.1, 6.48, 6.6);
    block(13.3, 10.35, 14.95, 13.35);
    put(K.wc(), 17.6, 7.72, 0);
    g(TAP, 19.13, 9.9, 19.215, 11.3, 4.2, 4.27);           // towel rail
    g('fabWhite', 19.1, 10.1, 19.2, 11.1, 2.7, 4.25);

    // ===== Guest bedroom ==========================================================
    put(K.bed(), 26.0, 6.5, -90);
    put(K.roundTable(0.7, 1.9, M.teak, M.brass), 28.5, 2.0, 0);
    put(K.roundTable(0.7, 1.9, M.teak, M.brass), 28.5, 11.0, 0);
    pendant(28.5, 2.0, 4.9, 0.3, null);
    pendant(28.5, 11.0, 4.9, 0.3, null);
    K.rugAt(M.rugBed, 24.4, 6.5, 8.2, 8.4, GF);
    art(M.art4, 'y', 3.6, 6.6, 19.625, 1, 3.9, 6.3);
    art(M.art2, 'y', 4.9, 8.1, 29.625, -1, 5.7, 7.5);
    put(K.plant(3.4, M.pot), 20.5, 1.6, 0);
    curtainAt(22.95, 1.0, 0);
    curtainAt(28.05, 1.0, 0);

    // ===== Passage ================================================================
    art(M.art1, 'y', 28.75, 30.15, 19.75, -1, 3.9, 6.3);

    // ===== Toilet beside the master bedroom =======================================
    tiles(20.125, 28.25, 29.625, 28.285);
    tiles(20.125, 33.215, 29.625, 33.25);
    tiles(29.59, 28.25, 29.625, 33.25);
    g('walnut', 21.2, 28.285, 24.5, 29.9, 1.3, 2.6);
    g('quartz', 21.15, 28.285, 24.55, 29.95, 2.6, 2.75);
    add(K.cyl(0.6, 0.45, 0.4, M.ceramic, 22.85, 2.75, 29.15, 32));
    g(TAP, 22.8, 28.4, 22.9, 28.5, 2.75, 3.6);
    g(TAP, 22.8, 28.4, 22.9, 28.9, 3.52, 3.6);
    g('mirror5', 21.4, 28.285, 24.3, 28.32, 3.4, 6.4);
    g('glow', 21.4, 28.285, 24.3, 28.335, 6.48, 6.6);
    block(21.15, 28.285, 24.55, 29.95);
    put(K.wc(), 28.7, 32.2, -90);
    g('glass', 24.95, 28.285, 25.0, 30.9, 0.05, 7);         // shower screen
    g(TAP, 24.95, 28.285, 25.0, 30.9, 7, 7.08);
    g(TAP, 26.1, 28.285, 26.2, 29.6, 7.4, 7.48);
    add(K.cyl(0.5, 0.5, 0.06, M[TAP], 26.15, 7.28, 29.6, 28));

    // ===== Master bedroom ==========================================================
    put(K.bed(), 25.7, 38.9, -90);
    put(K.bench(M.fabTerra), 21.45, 38.9, -90);
    put(K.roundTable(0.7, 1.9, M.teak, M.brass), 28.3, 34.75, 0);
    put(K.roundTable(0.65, 1.9, M.teak, M.brass), 28.3, 43.05, 0);
    pendant(28.3, 34.75, 4.9, 0.3, null);
    pendant(28.3, 43.05, 4.9, 0.3, null);
    K.rugAt(M.rugGF, 23.6, 38.9, 9.4, 8.6, GF);
    g('fluted', 16.25, 36.7, 16.31, 40.5, 0, HG);            // TV wall
    g('walnut', 16.31, 36.9, 17.5, 40.3, 0.55, 1.7);
    g('black', 16.45, 37.1, 17.35, 40.1, 0.25, 0.55);
    g('screen', 16.31, 37.2, 16.43, 40.0, 2.9, 4.9);
    block(16.25, 36.9, 17.5, 40.3);
    put(K.chair(M.fabMustard), 20.9, 45.2, 180);
    put(K.floorLamp(), 19.6, 45.6, 0, false);
    art(M.art3, 'y', 37.3, 40.5, 29.25, -1, 5.7, 7.5);
    curtainAt(16.85, 45.95, 0);
    curtainAt(19.15, 45.95, 0);

    // wardrobes come from the plan (they can be added and moved in the editor)
    K.wardrobeSet(GR.wardrobes, GF);

    // ===== Entry lobby, car porch and walkway ======================================
    put(K.plant(3.8, M.pot), 1.2, 29.6, 0);
    put(K.plant(3.8, M.pot), 7.05, 29.6, 0);
    K.rugAt(M.rugGF, 4.25, 29.8, 3.4, 1.9, GF);
    put(K.plant(3.0, M.potWhite), 12.75, 39.85, 0);
    K.put(K.plant(3.4, M.potWhite), 1.2, 52.0, 0, PL);
    { // a parked car, kept to the south side so the way to the door stays clear
      const car = new T.Group(), body = M.car || M.steel;
      car.add(K.rb(5.5, 1.7, 13.2, 0.45, body, 0, 0.75, 0));
      car.add(K.rb(4.9, 1.55, 6.6, 0.5, M.black, 0, 2.3, -0.5));
      car.add(K.rb(5.0, 0.12, 6.2, 0.05, body, 0, 3.82, -0.5));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const w = K.cyl(1.05, 1.05, 0.7, M.black, 0, 0, 0, 20);
        w.rotation.z = Math.PI / 2;
        w.position.set(sx * 2.55, 1.05, sz * 4.1);
        car.add(w);
      }
      for (const sx of [-1, 1]) { const l = K.rb(1.2, 0.35, 0.12, 0.05, M.glowSoft, sx * 1.9, 1.75, 6.56); l.castShadow = false; car.add(l); }
      K.put(car, 8.9, 46.7, 0, PL);
    }
  };
})();
