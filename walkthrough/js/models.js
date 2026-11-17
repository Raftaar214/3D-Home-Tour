/* Loads the furniture models made in Blender (models-data.js) and hands out ready meshes.
   Each model is split into parts by role; the caller says which material each role gets,
   so one model serves every style. Geometry is decoded once and shared by every copy. */
(function () {
  const A = (window.APP = window.APP || {});
  const T = THREE;
  const geos = {};

  function bytes(b64) {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  }
  function decode(part) {
    const q = new Uint16Array(bytes(part.p)), qn = new Int8Array(bytes(part.n));
    const n = q.length / 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    const lo = part.lo, sp = [part.hi[0] - lo[0], part.hi[1] - lo[1], part.hi[2] - lo[2]];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) { pos[i * 3 + k] = lo[k] + (q[i * 3 + k] / 65535) * sp[k]; nor[i * 3 + k] = qn[i * 3 + k] / 127; }
      // box-projected texture coordinates (feet), so fabric weave and grain sit at a true scale
      const ax = Math.abs(nor[i * 3]), ay = Math.abs(nor[i * 3 + 1]), x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (ay >= ax && ay >= Math.abs(nor[i * 3 + 2])) { uv[i * 2] = x; uv[i * 2 + 1] = z; }
      else if (ax >= Math.abs(nor[i * 3 + 2])) { uv[i * 2] = z; uv[i * 2 + 1] = y; }
      else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(new T.BufferAttribute(part.big ? new Uint32Array(bytes(part.i)) : new Uint16Array(bytes(part.i)), 1));
    g.computeBoundingSphere();
    return g;
  }

  A.hasModel = (name) => !!(window.FURNITURE_MODELS && window.FURNITURE_MODELS[name]);
  A.modelSize = (name) => (A.hasModel(name) ? window.FURNITURE_MODELS[name].size : null);

  /* A group with one mesh per part. mats: { role: material }; a role left out is skipped.
     The model stands on y = 0, centred on x and z (bedding: head at z = 0, mattress top at y = 0). */
  A.model = function (name, mats, opts) {
    const m = window.FURNITURE_MODELS[name], g = new T.Group();
    opts = opts || {};
    for (let i = 0; i < m.parts.length; i++) {
      const part = m.parts[i], mat = mats[part.r];
      if (!mat) continue;
      const key = name + '#' + i;
      const geo = geos[key] || (geos[key] = decode(part));
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = opts.shadow !== false && part.r !== 'bulb' && part.r !== 'pipe';
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  };
})();
