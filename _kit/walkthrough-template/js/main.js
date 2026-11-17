/* Start-up: renderer, scene, render loop. Add ?debug=plan to the address for a
   top view with the original drawing laid over the model. */
(function () {
  const A = (window.APP = window.APP || {});

  function start() {
    const msg = document.getElementById('loadmsg');
    if (!window.THREE) {
      msg.textContent = 'The 3D library could not be loaded. Please check the internet connection and reload.';
      return;
    }
    const T = THREE;
    const canvas = document.getElementById('view');
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      msg.textContent = 'This browser could not start 3D graphics (WebGL).';
      return;
    }
    const PR_MAX = Math.min(window.devicePixelRatio || 1, 1.5);
    let pr = Math.min(PR_MAX, 1.25);
    renderer.setPixelRatio(pr);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    // Nothing in the scene moves, so the sun's shadows are drawn once, not every frame.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    A.refreshShadows = () => { renderer.shadowMap.needsUpdate = true; };
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(64, 1, 0.25, 3000);
    A.scene = scene; A.camera = camera; A.renderer = renderer;

    const params = new URLSearchParams(location.search);
    const debug = params.get('debug');

    A.buildMaterials();
    if (A.setStyle) { A.setStyle(params.get('style') || 'luxury'); A.bindStyleButtons(); }
    A.buildShell(scene);
    if (A.buildFurniture && debug !== 'plan') A.buildFurniture(scene);
    A.buildLighting(scene, renderer);

    // Mirrors: photograph each room once from its middle and use that as the reflection.
    /* What is shown: 'none' = everything, 'first' = roof off, 'ground' = the first
       floor lifted away as well, so the ground floor can be seen from above. */
    const cutPlane = new T.Plane(new T.Vector3(0, -1, 0), -A.plan.SLAB - 0.06);
    A.cut = 'none';
    A.setCut = (mode) => {
      const g = A.groups, ground = mode === 'ground' && !!A.plan.ground;
      A.cut = ground ? 'ground' : mode === 'first' ? 'first' : 'none';
      g.ceil.visible = A.cut === 'none';
      g.main.visible = !ground;
      if (g.furn) g.furn.visible = !ground;
      renderer.clippingPlanes = ground ? [cutPlane] : [];
      A.refreshShadows();
    };
    function mirrorShots() {
      const shots = [['mirror', 24.6, 41.2, 0], ['mirror2', 25.6, 34.6, 0], ['mirror3', 23.2, 12.4, 0]];
      if (A.plan.ground) shots.push(['mirror4', 16.4, 12.0, A.plan.GF], ['mirror5', 23.0, 31.2, A.plan.GF]);
      const hidden = [];
      scene.traverse((o) => { if (o.isMesh && shots.some((s) => A.M[s[0]] === o.material)) hidden.push(o); });
      hidden.forEach((o) => (o.visible = false));
      const saved = renderer.clippingPlanes;
      renderer.clippingPlanes = [];
      for (const [key, x, y, lvl] of shots) {
        if (shotRT[key]) shotRT[key].dispose();
        const rt = (shotRT[key] = new T.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter }));
        const cc = new T.CubeCamera(0.2, 400, rt);
        cc.position.set(x, lvl + 4.6, y);
        A.updateLights(cc.position, false);
        scene.add(cc);
        cc.update(renderer, scene);
        scene.remove(cc);
        A.M[key].envMap = rt.texture;
        A.M[key].needsUpdate = true;
      }
      hidden.forEach((o) => (o.visible = true));
      renderer.clippingPlanes = saved;
    }
    const shotRT = {};
    if (debug !== 'plan') { try { mirrorShots(); } catch (err) { console.warn('mirror reflections skipped', err); } }
    // A style changes the furniture itself, not only its colours: rebuild it, then refresh mirrors and shadows.
    A.onStyle = () => {
      if (debug === 'plan') return;
      const old = A.groups.furnAll;
      if (old) { scene.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      A.buildFurniture(scene);
      A.setCut(A.cut);
      nearFloor = null;
      try { mirrorShots(); } catch (err) { /* keep the old reflections */ }
      A.refreshShadows();
    };

    // after the time of day has been changed, the mirrors are photographed again
    A.onTodSettled = () => { if (debug !== 'plan') { try { mirrorShots(); } catch (err) { /* keep the old reflections */ } } };
    if (params.get('tod') !== null && A.setTod) A.setTod(Number(params.get('tod')), true);

    /* The floor you are on is drawn first, so whatever the other floor would have
       drawn behind it is skipped early: two floors then cost little more than one. */
    let nearFloor = null;
    function orderFloors() {
      if (!A.plan.ground || debug === 'plan') return;
      const f = camera.position.y < A.plan.GF / 2 ? 'ground' : 'first';
      if (f === nearFloor) return;
      nearFloor = f;
      // walls and floors first (near floor, then far), furniture after them, so furniture hidden
      // behind a wall is skipped before it is shaded
      const set = (grp, v) => { if (grp) grp.traverse((o) => { if (o.isMesh && o.renderOrder < 5) o.renderOrder = v; }); };
      set(A.groups.main, f === 'first' ? 0 : 1); set(A.groups.furn, f === 'first' ? 2 : 3);
      set(A.groups.gmain, f === 'ground' ? 0 : 1); set(A.groups.gfurn, f === 'ground' ? 2 : 3);
    }

    let render = () => { orderFloors(); renderer.render(scene, camera); };
    let tick = null;

    if (debug === 'plan') {
      document.body.classList.add('debug');
      // Top view: nearer surfaces (wall tops) are lighter, the drawing is laid over.
      A.groups.ceil.visible = false;
      A.groups.ctx.visible = false;
      scene.getObjectByName('sky').visible = false;
      const ortho = new T.OrthographicCamera(-1, 1, 1, -1, 20.2, 32.5);
      ortho.position.set(14.7, 31, 26.5);
      ortho.up.set(0, 0, -1);
      ortho.lookAt(14.7, 0, 26.5);
      scene.overrideMaterial = new T.MeshDepthMaterial();
      const over = new T.Scene();
      const img = new T.TextureLoader().load('debug/plan.png');
      img.colorSpace = T.SRGBColorSpace;
      // sheet is 595 x 842 pt; 11.307 pt per foot; plot corner at (131.6, 79.35) pt
      const K = 11.307, w = 595 / K, h = 842 / K, x0 = -131.6 / K, y0 = -79.35 / K;
      const pl = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: img, transparent: true, opacity: Number(params.get('o') || 0.55) }));
      pl.rotation.x = -Math.PI / 2;
      pl.position.set(x0 + w / 2, 10.5, y0 + h / 2);
      over.add(pl);
      const zoom = Number(params.get('z') || 1), cx = Number(params.get('cx') || 14.7), cy = Number(params.get('cy') || 26.5);
      ortho.position.set(cx, 31, cy);
      render = () => {
        const a = canvas.clientWidth / canvas.clientHeight, half = 31 / zoom;
        ortho.left = -half * a; ortho.right = half * a; ortho.top = half; ortho.bottom = -half;
        ortho.updateProjectionMatrix();
        renderer.autoClear = true;
        renderer.shadowMap.enabled = false;
        renderer.render(scene, ortho);
        renderer.autoClear = false;
        renderer.render(over, ortho);
      };
    } else if (A.initTour) {
      tick = A.initTour({ scene, camera, renderer, canvas });
    } else {
      camera.position.set(14, 5.25, 26);
      camera.lookAt(14, 4, 18);
    }

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w >= h ? 64 : 78;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    let last = performance.now(), acc = 0, count = 0, warm = 0;
    A.perf = { fps: 0, pr };
    function frame(now) {
      const raw = (now - last) / 1000, dt = Math.min(0.1, raw);
      last = now;
      if (tick) tick(dt);
      const changing = A.todStep && !debug ? A.todStep(dt) : false;
      if (A.updateLights && !debug) A.updateLights(camera.position, A.viewFloor || false);
      render();
      // Keep the motion smooth: if frames are slow, draw at a lower resolution; if
      // there is headroom, sharpen up again. (Not judged while the sun is being moved:
      // those frames redraw the shadows and are slower for a moment.)
      if (raw < 0.5 && ++warm > 40 && !changing) {
        acc += raw; count++;
        if (count >= 24) {
          const avg = acc / count;
          acc = 0; count = 0;
          A.perf.fps = Math.round(1 / avg);
          let next = pr;
          if (avg > 1 / 42 && pr > 0.6) next = Math.max(0.6, pr * 0.85);
          else if (avg < 1 / 56 && pr < PR_MAX) next = Math.min(PR_MAX, pr * 1.08);
          if (next !== pr) { pr = next; A.perf.pr = pr; renderer.setPixelRatio(pr); renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    A.renderOnce = () => { if (tick) tick(0); if (A.updateLights && !debug) A.updateLights(camera.position, A.viewFloor || false); render(); };
    A.step = (dt) => { if (tick) tick(dt); if (A.todStep && !debug) A.todStep(dt); if (A.updateLights && !debug) A.updateLights(camera.position, A.viewFloor || false); render(); }; // advance by hand, for checking

    const ld = document.getElementById('loading');
    ld.classList.add('hide');
    setTimeout(() => (ld.style.display = 'none'), 700);
    A.ready = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
