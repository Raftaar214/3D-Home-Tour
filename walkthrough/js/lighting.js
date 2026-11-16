/* Sky, late-afternoon west sun with shadows, and warm interior lights. */
(function () {
  const A = (window.APP = window.APP || {});
  const T = THREE;

  A.buildLighting = function (scene, renderer) {
    const P = A.plan, H = P.H, GF = P.GF;
    // The front of the house faces west (+z here). About 4:30 pm: low sun, west-south-west.
    const sunDir = new T.Vector3(0.36, 0.42, 0.83).normalize();
    A.sunDir = sunDir;

    const skyMat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: { sun: { value: sunDir }, gain: { value: 1 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec3 vDir; uniform vec3 sun; uniform float gain;',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  vec3 zen = vec3(0.23,0.42,0.74); vec3 hor = vec3(0.95,0.78,0.60); vec3 gnd = vec3(0.50,0.46,0.40);',
        '  vec3 c = mix(hor, zen, pow(clamp(d.y,0.0,1.0), 0.5));',
        '  c = mix(c, gnd, smoothstep(0.0,-0.10,d.y));',
        '  float s = max(dot(d,sun),0.0);',
        '  c += vec3(1.0,0.70,0.40)*pow(s,5.0)*0.45 + vec3(1.0,0.92,0.78)*pow(s,600.0)*6.0;',
        '  gl_FragColor = vec4(c*gain,1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });
    const sky = new T.Mesh(new T.SphereGeometry(1200, 32, 16), skyMat);
    sky.name = 'sky';
    scene.add(sky);

    // A dimmed copy of the sky drives reflections on glass, marble and metal.
    try {
      const pm = new T.PMREMGenerator(renderer);
      const envScene = new T.Scene();
      const envMat = skyMat.clone();
      envMat.uniforms = { sun: { value: sunDir }, gain: { value: 0.34 } };
      envScene.add(new T.Mesh(sky.geometry, envMat));
      scene.environment = pm.fromScene(envScene, 0, 1, 3000).texture;
      pm.dispose();
    } catch (err) { console.warn('environment map skipped', err); }

    const hemi = new T.HemisphereLight(0xdde7ff, 0xcbb596, 0.42);
    scene.add(hemi);

    const sun = new T.DirectionalLight(0xffd0a0, 5.2);
    const target = new T.Vector3(14, 0, 26);
    sun.position.copy(target).addScaledVector(sunDir, 130);
    sun.target.position.copy(target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 20; sc.far = 260;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);
    A.sun = sun;

    // Interior lights: [x, y, height, intensity, reach]
    const lamps = [
      [5, 6, 8.3, 46, 24],         // living seating
      [14.3, 7.9, 6.1, 34, 20],    // dining pendant
      [23.2, 5.6, 8.8, 32, 17],    // kitchen
      [23, 11.3, 8.8, 20, 13],     // common washroom
      [4.6, 21, 8.4, 34, 20],      // lounge
      [P.voidCenter[0], P.voidCenter[1], 3.4, 95, 34], // chandelier in the void
      [14, 26.2, 8.6, 16, 14],     // gallery
      [15.5, 36.5, 8.4, 40, 24],   // master bedroom
      [25.6, 41.4, 8.6, 15, 12],   // dress
      [25.6, 34, 8.6, 22, 14],     // master toilet
      [16, 20, GF + 7.5, 38, 26],  // placeholder room below
    ];
    /* Only the few lamps nearest the viewer are switched on at any moment. The
       picture looks the same, but each frame costs much less to draw. A lamp
       fades out as it becomes the furthest of the set, so nothing pops. */
    const POOL = 4, pool = [], order = lamps.map((l, i) => i), dist = lamps.map(() => 0);
    for (let k = 0; k < POOL; k++) { const l = new T.PointLight(0xffd8a8, 0, 30, 2); scene.add(l); pool.push(l); }
    const OVERVIEW = [0, 4, 5, 7];
    A.updateLights = function (p, overview) {
      for (let i = 0; i < lamps.length; i++) dist[i] = overview ? (OVERVIEW.indexOf(i) < 0 ? 1e6 : OVERVIEW.indexOf(i)) : Math.hypot(lamps[i][0] - p.x, lamps[i][2] - p.y, lamps[i][1] - p.z);
      order.sort((a, b) => dist[a] - dist[b]);
      const edge = dist[order[POOL]];
      for (let k = 0; k < POOL; k++) {
        const L = lamps[order[k]], w = overview ? 1 : Math.max(0, Math.min(1, (edge - dist[order[k]]) / 6));
        pool[k].position.set(L[0], L[2], L[1]);
        pool[k].intensity = L[3] * w;
        pool[k].distance = L[4];
      }
    };
    A.updateLights(new T.Vector3(17, 5, 26), false);

    // Recessed downlights (visual only) as small glowing squares in the ceiling.
    const B = new A.Batcher();
    const spots = [];
    const grid = (x0, y0, x1, y1, nx, ny) => {
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++)
        spots.push([x0 + ((x1 - x0) * (i + 0.5)) / nx, y0 + ((y1 - y0) * (j + 0.5)) / ny]);
    };
    grid(0.5, 1.2, 18.5, 13.4, 4, 3);     // living
    grid(20, 3.3, 27.2, 7.7, 3, 2);       // kitchen
    grid(20.2, 9, 26, 13.6, 2, 2);        // common washroom
    spots.push([28.4, 10.5]);
    grid(1, 15.6, 8.6, 27, 2, 3);         // lounge
    grid(10.4, 25.2, 26, 27.2, 4, 1);     // gallery and stair
    grid(10.2, 29.4, 21.4, 45.2, 3, 4);   // bedroom
    grid(23.4, 39, 28.4, 43.6, 2, 2);     // dress
    grid(23.4, 29.2, 28.6, 37, 2, 3);     // master toilet
    for (const [x, y] of spots) B.box('glow', x - 0.17, y - 0.17, x + 0.17, y + 0.17, H - 0.035, H + 0.01, 'ceil');
    B.flush(A.groups);
  };
})();
