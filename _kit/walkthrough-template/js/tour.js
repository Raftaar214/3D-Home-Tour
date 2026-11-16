/* Guided tour, free look and walking, room captions and the small map. */
(function () {
  const A = (window.APP = window.APP || {});

  A.initTour = function ({ scene, camera, renderer, canvas }) {
    const T = THREE, P = A.plan, EYE = 5.25, SPEED = 2.9;
    const L1 = -8 * P.RISE; // level of the stair landing where the tour begins

    /* Key points of the walk. p = [x, y] on plan, h = floor level there,
       look = point to face while standing, hold = seconds to pause,
       pan = further points to turn to during the pause, stop = name of the chip. */
    const K = [
      { p: [28.2, 26.2], h: L1, look: [19, 25.9, 1.6], hold: 2.4, stop: 'Stair' },
      { p: [26.0, 26.2], h: L1 },
      { p: [20.2, 26.2] },
      { p: [17.0, 26.15], look: [23.5, 18, -3.5], hold: 3.2, pan: [[14.5, 17.5, 3.4]], stop: 'Gallery' },
      { p: [13.6, 26.2] },
      { p: [10.8, 25.2], look: [2.2, 19.5, 3.4], hold: 2.8, stop: 'Lounge' },
      { p: [7.6, 26.2] },
      { p: [6.05, 28.3] },
      { p: [6.4, 30.8], look: [2.2, 38.4, 3.0], hold: 2.6, pan: [[4.5, 45, 4.5]], stop: 'Terrace' },
      { p: [6.9, 36.5], look: [4.2, 42.3, 2.6], hold: 2.2 },
      { p: [6.4, 31.0] },
      { p: [6.05, 28.2] },
      { p: [7.4, 24.5] },
      { p: [8.6, 18.5] },
      { p: [10.6, 13.6], look: [5.6, 3.6, 3], hold: 3.2, stop: 'Living' },
      { p: [11.0, 9.5] },
      { p: [11.0, 6.6], look: [14.3, 7.9, 2.8], hold: 2.4, stop: 'Dining' },
      { p: [11.4, 3.7] },
      { p: [17.3, 3.6] },
      { p: [18.2, 5.5] },
      { p: [20.2, 5.9] },
      { p: [21.7, 5.3] },
      { p: [22.9, 4.3], look: [27.6, 2.0, 3.4], hold: 3.2, pan: [[28.3, 9.5, 4]], stop: 'Kitchen' },
      { p: [21.7, 5.3] },
      { p: [20.0, 5.9] },
      { p: [18.2, 5.5] },
      { p: [17.3, 3.6] },
      { p: [11.4, 3.7] },
      { p: [11.0, 9.5] },
      { p: [10.4, 14.5] },
      { p: [9.6, 20] },
      { p: [10.2, 25.6] },
      { p: [11.0, 27.9] },
      { p: [11.6, 30.6], look: [18.4, 35, 2.6], hold: 3.2, pan: [[12.4, 45.6, 3.8]], stop: 'Bedroom' },
      { p: [12.1, 34.5] },
      { p: [12.6, 39.6] },
      { p: [15.8, 42.2] },
      { p: [18.4, 45.2] },
      { p: [18.4, 48.2], look: [13, 80, -7], hold: 3.4, pan: [[36, 62, -3]], stop: 'Balcony' },
      { p: [18.4, 45.4] },
      { p: [20.4, 43.0] },
      { p: [23.4, 42.9], look: [27.2, 40.0, 4.2], hold: 2.6, pan: [[25.8, 45.2, 4]], stop: 'Dress' },
      { p: [26.1, 42.2] },
      { p: [25.8, 39.8] },
      { p: [25.6, 36.7], look: [24.3, 30.2, 3.3], hold: 2.8, pan: [[28.9, 34.6, 4.0]], stop: 'Bath' },
      { p: [25.8, 39.8] },
      { p: [26.1, 42.2] },
      { p: [23.6, 42.9] },
      { p: [20.0, 42.9] },
      { p: [14.0, 40.0] },
      { p: [12.1, 34.0] },
      { p: [11.2, 30.0] },
      { p: [11.0, 27.6] },
      { p: [14.4, 25.75], look: [16.2, 15.2, -1.6], hold: 3.4, stop: 'Void' },
    ];
    const pts = K.map((k) => new T.Vector3(k.p[0], (k.h || 0) + EYE, k.p[1]));
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const N = K.length;
    const at = (s) => curve.getPoint(Math.min(1, Math.max(0, s / (N - 1)))); // s = key index, may be fractional

    // --- timeline: moves between keys, holds at keys --------------------------
    const items = [];
    let total = 0;
    // length tables, so the walk keeps an even pace along each curved stretch
    const TAB = 24, tabs = [];
    for (let i = 0; i < N - 1; i++) {
      const cum = [0];
      let a = at(i);
      for (let j = 1; j <= TAB; j++) { const b = at(i + j / TAB); cum.push(cum[j - 1] + a.distanceTo(b)); a = b; }
      tabs.push(cum);
    }
    const segLen = (i) => tabs[i][TAB];
    const byLength = (i, f) => { // fraction of the stretch's length -> curve parameter
      const cum = tabs[i], want = f * cum[TAB];
      let j = 1;
      while (j < TAB && cum[j] < want) j++;
      const span = cum[j] - cum[j - 1];
      return (j - 1 + (span > 1e-6 ? (want - cum[j - 1]) / span : 0)) / TAB;
    };
    for (let i = 0; i < N; i++) {
      if (K[i].hold) { items.push({ type: 'hold', i, t0: total, dur: K[i].hold }); total += K[i].hold; }
      if (i < N - 1) {
        const a = !!K[i].hold || i === 0, b = !!K[i + 1].hold || i === N - 2;
        const ease = a && b ? 'both' : a ? 'in' : b ? 'out' : 'lin';
        const dur = (segLen(i) / SPEED) * (ease === 'both' ? 1.5 : 1);
        items.push({ type: 'move', i, t0: total, dur, ease });
        total += dur;
      }
    }
    const OV = 14; // seconds of overview at the end
    const easeF = { lin: (u) => u, in: (u) => u * u * (2 - u), out: (u) => 1 - (1 - u) * (1 - u) * (1 + u), both: (u) => u * u * (3 - 2 * u) };
    const stops = K.map((k, i) => (k.stop ? { name: k.stop, i, t: items.find((it) => it.type === 'hold' && it.i === i).t0 } : null)).filter(Boolean);
    stops.push({ name: 'Overview', i: -1, t: total });

    function sample(t) { // -> { s: key position, target: point to look at }
      let it = items[items.length - 1];
      for (const c of items) if (t < c.t0 + c.dur) { it = c; break; }
      const u = Math.min(1, Math.max(0, (t - it.t0) / it.dur));
      if (it.type === 'hold') {
        const k = K[it.i], views = [k.look].concat(k.pan || []);
        const share = it.dur / views.length, vi = Math.min(views.length - 1, Math.floor((t - it.t0) / share));
        return { s: it.i, look: views[vi], holding: true };
      }
      const s = it.i + byLength(it.i, easeF[it.ease](u)), nk = K[it.i + 1];
      // while walking, look along the path; turn to the next view on arrival
      if (nk.look && s > it.i + 0.72) return { s, look: nk.look };
      const a = at(s), b = at(Math.min(N - 1, s + 0.35));
      if (a.distanceTo(b) < 0.05) return { s, look: nk.look || null };
      return { s, look: [b.x, b.z, a.y + (b.y - a.y) * 0.3 - 0.15], ahead: true };
    }

    // --- camera state ---------------------------------------------------------
    const st = { mode: 'free', playing: false, t: 0, yaw: 0, pitch: 0, floor: 0, ov: 0, ended: false };
    const pos = new T.Vector3();
    camera.rotation.order = 'YXZ';
    const angTo = (from, look) => {
      const dx = look[0] - from.x, dz = look[1] - from.z;
      // look[2] is a height above the first floor; the camera eye is at from.y
      const ddy = (look[2] === undefined ? from.y : look[2]) - from.y;
      return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(ddy, Math.hypot(dx, dz)) };
    };
    const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    function applyCam() {
      camera.position.copy(pos);
      camera.rotation.set(st.pitch, st.yaw, 0);
    }
    function poseAt(t, snap, dt) {
      const q = sample(t);
      pos.copy(at(q.s));
      st.floor = pos.y - EYE;
      if (q.look) {
        const a = angTo(pos, q.look);
        if (snap) { st.yaw = a.yaw; st.pitch = a.pitch; }
        else {
          const k = 1 - Math.exp(-(q.holding ? 1.9 : 2.6) * dt);
          st.yaw += wrap(a.yaw - st.yaw) * k;
          st.pitch += (a.pitch - st.pitch) * k;
        }
      }
    }

    // --- where can you stand? -------------------------------------------------
    const BODY = 0.45; // how close a person can get to a wall or railing
    function ground(x, y, cur) {
      let best = null;
      for (const r of P.areas) {
        if (x < r[0] || x > r[2] || y < r[1] || y > r[3]) continue;
        const h = typeof r[4] === 'function' ? r[4](x, y) : r[4];
        if (Math.abs(h - cur) < 1.7 && (best === null || Math.abs(h - cur) < Math.abs(best - cur))) best = h;
      }
      if (best === null) return null;
      // walls, pillars and railings come straight from the plan, so edits are respected
      for (const s of P.solids)
        if (x > s[0] - BODY && x < s[2] + BODY && y > s[1] - BODY && y < s[3] + BODY && s[4] < best + 4.5 && s[5] > best + 1) return null;
      for (const b of A.blockers || []) if (x > b[0] && x < b[2] && y > b[1] && y < b[3] && Math.abs(b[4] - best) < 3) return null;
      return best;
    }
    A.ground = ground;
    A.checkTour = function () { // reports any tour point that is inside a wall or furniture
      const bad = [];
      for (let s = 0; s <= N - 1; s += 0.02) {
        const p = at(s), g = ground(p.x, p.z, p.y - EYE);
        if (g === null) bad.push([+s.toFixed(2), +p.x.toFixed(2), +p.z.toFixed(2)]);
      }
      return bad;
    };

    // --- DOM ------------------------------------------------------------------
    const $ = (id) => document.getElementById(id);
    const elPlay = $('play'), elFill = $('fill'), elTime = $('time'), elStops = $('stops'), elFade = $('fade');
    const elEnd = $('end'), elHint = $('hint'), elCap = $('caption'), elMap = $('map');
    const capName = elCap.querySelector('.name'), capSize = elCap.querySelector('.size'), capTag = elCap.querySelector('.tag');
    const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const chips = stops.map((sp) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = sp.name;
      b.addEventListener('click', () => jump(sp));
      elStops.appendChild(b);
      return b;
    });

    function setPlaying(on) {
      st.playing = on;
      elPlay.textContent = on ? '❚❚ Pause' : st.t > 0.5 && !st.ended ? '▶ Resume tour' : '▶ Play tour';
      if (on) elHint.classList.add('hide');
    }
    function showOverview(on) {
      A.groups.ceil.visible = !on;
      if (A.refreshShadows) A.refreshShadows();
      st.mode = on ? 'overview' : st.mode;
      camera.fov = on ? 40 : canvas.clientWidth >= canvas.clientHeight ? 64 : 78;
      camera.updateProjectionMatrix();
    }
    function fadeThen(fn) {
      elFade.classList.remove('hide');
      elFade.style.opacity = 1;
      setTimeout(() => { fn(); elFade.style.opacity = 0; }, 560);
    }
    function enterTour(t, snap) {
      st.doll = false;
      elEnd.style.display = 'none';
      st.ended = false;
      if (st.mode === 'overview') showOverview(false);
      st.mode = 'tour';
      st.t = t;
      if (snap) poseAt(t, true, 0);
      else blend.k = 0, blend.p.copy(pos), blend.yaw = st.yaw, blend.pitch = st.pitch;
    }
    const blend = { k: 1, p: new T.Vector3(), yaw: 0, pitch: 0 };
    function jump(sp) {
      if (sp.i < 0) { // overview
        fadeThen(() => { st.t = total; st.ov = 0; showOverview(true); setPlaying(true); elEnd.style.display = 'none'; st.ended = false; });
        return;
      }
      const wasPlaying = st.playing;
      fadeThen(() => {
        enterTour(sp.t + 0.01, true);
        if (!wasPlaying) st.mode = 'free';
        setPlaying(wasPlaying);
      });
    }
    A.jump = (name) => { // instant, used for checking each stop
      const sp = stops.find((s) => s.name === name);
      if (!sp) return false;
      if (sp.i < 0) { st.t = total; st.ov = OV * 0.5; showOverview(true); setPlaying(false); return true; }
      enterTour(sp.t + 0.01, true);
      st.mode = 'free';
      setPlaying(false);
      return true;
    };
    A.tourInfo = () => ({ total: total + OV, stops: stops.map((s) => [s.name, +s.t.toFixed(1)]), t: st.t, mode: st.mode });
    A.place = (x, y, lx, ly, lh) => { // stand anywhere on the first floor, facing a point (for checking views)
      if (st.mode === 'overview') showOverview(false);
      st.mode = 'free'; setPlaying(false);
      pos.set(x, EYE, y); st.floor = 0;
      const a = angTo(pos, [lx, ly, lh === undefined ? 4 : lh]); st.yaw = a.yaw; st.pitch = a.pitch;
    };
    A.seek = (t) => { enterTour(Math.min(t, total - 0.01), true); st.mode = 'free'; setPlaying(false); };

    elPlay.addEventListener('click', () => {
      if (st.playing) { setPlaying(false); if (st.mode === 'tour') st.mode = 'free'; return; }
      if (st.ended || st.mode === 'overview') { fadeThen(() => { enterTour(0, true); setPlaying(true); }); return; }
      const far = pos.distanceTo(at(sample(st.t).s)) > 5;
      if (far) fadeThen(() => { enterTour(st.t, true); setPlaying(true); });
      else { enterTour(st.t, false); setPlaying(true); }
    });
    $('restart').addEventListener('click', () => fadeThen(() => { enterTour(0, true); setPlaying(true); }));
    $('again').addEventListener('click', () => fadeThen(() => { enterTour(0, true); setPlaying(true); }));
    $('explore').addEventListener('click', () => fadeThen(() => {
      elEnd.style.display = 'none';
      showOverview(false);
      st.mode = 'free'; st.ended = false; st.t = 0;
      pos.set(14, EYE, 26.1); st.floor = 0;
      const a = angTo(pos, [17, 19.6, 3]); st.yaw = a.yaw; st.pitch = a.pitch;
      setPlaying(false);
      elHint.classList.remove('hide');
    }));
    $('track').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, t = f * (total + OV);
      if (t >= total) { jump(stops[stops.length - 1]); return; }
      const wasPlaying = st.playing;
      fadeThen(() => { enterTour(t, true); if (!wasPlaying) st.mode = 'free'; setPlaying(wasPlaying); });
    });

    // --- dollhouse view: roof off, seen from above; one button there and back ---
    const elDoll = $('doll');
    function setDollLabel() { if (elDoll) { elDoll.textContent = st.mode === 'overview' ? 'Back to walking' : 'Dollhouse view'; elDoll.classList.toggle('on', st.mode === 'overview'); } }
    if (elDoll) elDoll.addEventListener('click', () => {
      if (document.pointerLockElement) document.exitPointerLock();
      if (st.mode !== 'overview') {
        st.back = { p: pos.clone(), yaw: st.yaw, pitch: st.pitch, floor: st.floor };
        fadeThen(() => { setPlaying(false); elEnd.style.display = 'none'; st.ended = false; st.ov = 0; st.doll = true; st.az = 0.55; st.el = 1.28; showOverview(true); setDollLabel(); });
      } else {
        fadeThen(() => {
          elEnd.style.display = 'none'; st.ended = false; st.doll = false;
          showOverview(false); st.mode = 'free'; setPlaying(false);
          if (st.back) { pos.copy(st.back.p); st.yaw = st.back.yaw; st.pitch = st.back.pitch; st.floor = st.back.floor; }
          else { pos.set(14, EYE, 26.1); st.floor = 0; const a = angTo(pos, [17, 19.6, 3]); st.yaw = a.yaw; st.pitch = a.pitch; }
          setDollLabel();
        });
      }
    });

    // --- mouse look: the pointer is captured and moving the mouse turns your head ---
    const elLook = $('mlook');
    if (elLook) {
      elLook.addEventListener('click', () => {
        if (document.pointerLockElement === canvas) { document.exitPointerLock(); return; }
        if (st.mode === 'overview') return;
        takeOver();
        if (canvas.requestPointerLock) canvas.requestPointerLock();
      });
      document.addEventListener('pointerlockchange', () => {
        const on = document.pointerLockElement === canvas;
        elLook.classList.toggle('on', on);
        elLook.textContent = on ? 'Mouse look on (Esc to release)' : 'Mouse look';
      });
      document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== canvas || st.mode === 'overview') return;
        if (st.mode === 'tour') takeOver();
        st.yaw -= e.movementX * 0.0024;
        st.pitch = Math.max(-1.25, Math.min(1.25, st.pitch - e.movementY * 0.0024));
      });
    }

    // --- free look and walking --------------------------------------------------
    const keys = {};
    let drag = null, goal = null;
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function takeOver() {
      if (st.mode === 'overview') return false;
      if (st.mode === 'tour') { st.mode = 'free'; setPlaying(false); }
      blend.k = 1;
      return true;
    }
    canvas.addEventListener('pointerdown', (e) => {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (st.mode === 'overview') { // drag turns and tilts the dollhouse
        if (!st.doll) { st.doll = true; st.az = 0.35 + 0.05 * Math.min(st.ov, OV + 60); st.el = 0.9; }
        st.az -= dx * 0.006; st.el = Math.max(0.45, Math.min(1.5, st.el + dy * 0.005));
        drag.x = e.clientX; drag.y = e.clientY; drag.moved = true;
        return;
      }
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      if (!drag.moved) { drag.moved = true; if (!takeOver()) { drag = null; return; } goal = null; }
      drag.x = e.clientX; drag.y = e.clientY;
      st.yaw += dx * 0.0042;
      st.pitch = Math.max(-1.25, Math.min(1.25, st.pitch + dy * 0.0042));
    });
    const endDrag = (e) => {
      canvas.classList.remove('dragging');
      if (drag && !drag.moved && performance.now() - drag.t < 450 && st.mode !== 'overview') {
        // a tap: walk to that spot on the floor
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(A.groups.main.children, false);
        for (const h of hits) {
          if (h.object.material && h.object.material.transparent) continue;
          if (h.face && h.face.normal.y > 0.7 && h.distance < 60) { takeOver(); goal = new T.Vector2(h.point.x, h.point.z); }
          break;
        }
      }
      drag = null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', () => { drag = null; canvas.classList.remove('dragging'); });
    const MOVE = { KeyW: 1, KeyS: 1, KeyA: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); elPlay.click(); return; }
      if (!MOVE[e.code]) return;
      e.preventDefault();
      keys[e.code] = true;
      if (takeOver()) goal = null;
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

    function tryMove(dx, dz) {
      const steps = [[dx, dz], [dx, 0], [0, dz]];
      for (const [mx, mz] of steps) {
        if (!mx && !mz) continue;
        const g = ground(pos.x + mx, pos.z + mz, st.floor);
        if (g !== null) { pos.x += mx; pos.z += mz; st.floor = g; return true; }
      }
      return false;
    }
    function freeStep(dt) {
      const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
      st.yaw += turn * 1.7 * dt;
      let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      let s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      const sp = 5.2 * dt;
      if (f || s) {
        const sn = Math.sin(st.yaw), cs = Math.cos(st.yaw), n = Math.hypot(f, s);
        tryMove(((-sn * f + cs * s) / n) * sp, ((-cs * f - sn * s) / n) * sp);
      } else if (goal) {
        const dx = goal.x - pos.x, dz = goal.y - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.25 || !tryMove((dx / d) * Math.min(sp, d), (dz / d) * Math.min(sp, d))) goal = null;
      }
      pos.y += (st.floor + EYE - pos.y) * (1 - Math.exp(-12 * dt));
    }

    // --- caption and map --------------------------------------------------------
    let lastRoom = null;
    function caption() {
      let name = '', size = '', tag = 'First floor';
      if (st.mode === 'overview') { name = 'Overview'; size = "Plot 30' × 54'-6\""; tag = 'Whole floor'; }
      else {
        for (const r of P.rooms) if (pos.x >= r.r[0] && pos.x <= r.r[2] && pos.z >= r.r[1] && pos.z <= r.r[3]) { name = r.name; size = r.size; break; }
        if (st.floor < -9) { name = 'Below the Void'; size = 'placeholder, ground floor not drawn'; tag = 'Ground floor'; }
      }
      const key = name + size;
      if (key === lastRoom) return;
      lastRoom = key;
      capName.textContent = name || ' ';
      capSize.textContent = size || ' ';
      capTag.textContent = tag;
    }
    const mctx = elMap.getContext('2d'), MW = elMap.width, MH = elMap.height;
    const MS = Math.min(MW / 35.4, MH / 54.4), MX = (x) => (x + 4.3) * MS, MY = (y) => (y + 2.8) * MS;
    const base = document.createElement('canvas');
    base.width = MW; base.height = MH;
    (function drawBase() {
      const g = base.getContext('2d');
      const tint = { marble: '#6f665b', woodfloor: '#7d6650', bathfloor: '#5f666b', deck: '#59614f', stonefloor: '#59614f' };
      g.fillStyle = '#3d3833';
      g.fillRect(MX(P.ZONE[0]), MY(P.ZONE[1]), (29.625 - P.ZONE[0]) * MS, (P.ZONE[3] - P.ZONE[1]) * MS);
      for (const f of P.floors) { g.fillStyle = tint[f[4]] || '#666'; g.fillRect(MX(f[0]), MY(f[1]), (f[2] - f[0]) * MS, (f[3] - f[1]) * MS); }
      g.strokeStyle = 'rgba(244,239,230,0.28)'; g.lineWidth = 1;
      for (let i = 0; i <= 7; i++) { const x = MX(20.29 + i * P.TREAD); g.beginPath(); g.moveTo(x, MY(24.375)); g.lineTo(x, MY(27.875)); g.stroke(); }
      for (let i = 0; i <= 7; i++) { const y = MY(23.96 - i * P.TREAD); g.beginPath(); g.moveTo(MX(26.125), y); g.lineTo(MX(29.625), y); g.stroke(); }
      g.fillStyle = '#f4efe6';
      for (const w of P.walls) {
        const z0 = w.z ? w.z[0] : 0, z1 = w.z ? w.z[1] : P.H;
        if (z1 < 3 || z0 > 1) continue;
        const [x0, y0, x1, y1] = w.r, ops = (w.ops || []).slice().sort((a, b) => a.a - b.a);
        let cur = w.ax === 'x' ? x0 : y0;
        const end = w.ax === 'x' ? x1 : y1;
        const seg = (a, b, thin) => {
          if (b - a < 0.01) return;
          g.globalAlpha = thin ? 0.45 : 1;
          if (w.ax === 'x') g.fillRect(MX(a), MY(y0), (b - a) * MS, Math.max(1.5, (y1 - y0) * MS));
          else g.fillRect(MX(x0), MY(a), Math.max(1.5, (x1 - x0) * MS), (b - a) * MS);
          g.globalAlpha = 1;
        };
        for (const o of ops) { seg(cur, o.a); if (o.type === 'win' || o.type === 'vent') seg(o.a, o.b, true); cur = o.b; }
        seg(cur, end);
      }
      for (const p of P.pillars) g.fillRect(MX(p.r[0]), MY(p.r[1]), (p.r[2] - p.r[0]) * MS, (p.r[3] - p.r[1]) * MS);
    })();
    function drawMap() {
      mctx.clearRect(0, 0, MW, MH);
      mctx.drawImage(base, 0, 0);
      if (st.mode === 'overview') return;
      const x = MX(pos.x), y = MY(pos.z), sn = -Math.sin(st.yaw), cs = -Math.cos(st.yaw);
      mctx.fillStyle = 'rgba(210,168,92,0.28)';
      mctx.beginPath();
      mctx.moveTo(x, y);
      mctx.arc(x, y, 44, Math.atan2(cs, sn) - 0.55, Math.atan2(cs, sn) + 0.55);
      mctx.closePath();
      mctx.fill();
      mctx.fillStyle = '#d2a85c';
      mctx.beginPath(); mctx.arc(x, y, 6.5, 0, 6.3); mctx.fill();
      mctx.strokeStyle = '#1d1712'; mctx.lineWidth = 2; mctx.stroke();
    }

    // --- per-frame update ---------------------------------------------------------
    const ovC = new T.Vector3(14.5, 0, 25);
    let uiTick = 0;
    function tick(dt) {
      if (st.mode === 'tour' && st.playing) {
        st.t += dt;
        if (st.t >= total) {
          st.t = total; st.mode = 'hold-end';
          fadeThen(() => { st.ov = 0; showOverview(true); });
        } else {
          poseAt(st.t, false, dt);
          if (blend.k < 1) {
            blend.k = Math.min(1, blend.k + dt / 0.9);
            const e = blend.k * blend.k * (3 - 2 * blend.k);
            pos.lerpVectors(blend.p, pos, e);
          }
        }
        applyCam();
      } else if (st.mode === 'overview') {
        if (st.playing) st.ov += dt;
        if (st.ov >= OV && !st.ended) { st.ended = true; setPlaying(false); elEnd.style.display = 'block'; }
        const az = st.doll ? st.az : 0.35 + 0.05 * Math.min(st.ov, OV + 60), el = st.doll ? st.el : 0.9, R = st.doll ? 92 : 86;
        camera.position.set(ovC.x + R * Math.cos(el) * Math.sin(az), R * Math.sin(el), ovC.z + R * Math.cos(el) * Math.cos(az));
        camera.lookAt(ovC);
      } else if (st.mode === 'free') {
        freeStep(dt);
        applyCam();
      } else {
        applyCam();
      }
      // progress, chips, caption, map (every third frame is plenty)
      if (uiTick++ % 3) return;
      setDollLabel();
      const tt = st.mode === 'overview' ? total + Math.min(st.ov, OV) : st.t;
      elFill.style.width = ((tt / (total + OV)) * 100).toFixed(2) + '%';
      elTime.textContent = fmt(tt) + ' / ' + fmt(total + OV);
      let cur = -1;
      for (let i = 0; i < stops.length; i++) if (tt >= stops[i].t - 0.05) cur = i;
      chips.forEach((c, i) => c.classList.toggle('on', i === cur && (st.playing || st.mode === 'overview')));
      caption();
      drawMap();
    }

    if (window.PLAN_SOURCE) { // single-file build: say where the layout came from
      const n0 = document.getElementById('notice');
      if (n0) {
        n0.textContent = window.PLAN_SOURCE === 'editor' ? "Layout read from the plan editor's file." : 'Layout: the copy built into this file (editor file not found).';
        n0.style.display = 'block';
        setTimeout(() => { n0.style.display = 'none'; }, 9000);
      }
    }
    if (A.planEdited) {
      const n = document.getElementById('notice');
      if (n) {
        const hit = A.checkTour().length > 0;
        n.innerHTML = (hit ? 'Edited plan in use. Part of the guided tour now passes through a wall; free walking still works. ' : 'Edited plan in use. ') + '<a href="editor.html">Open editor</a>';
        n.style.display = 'block';
      }
    }
    const ed = document.getElementById('editlink');
    if (ed) ed.addEventListener('click', () => { ed.href = 'editor.html?t=' + Date.now(); });
    // start standing on the stair landing, ready to play
    enterTour(0, true);
    st.mode = 'free';
    setPlaying(false);
    applyCam();
    const q = new URLSearchParams(location.search);
    if (q.get('stop')) A.jump(q.get('stop'));
    if (q.get('play') === '1') { st.mode = 'tour'; setPlaying(true); }
    return tick;
  };
})();
