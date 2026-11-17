/* Procedural textures and the material palette: warm contemporary with Jaipur touches. */
(function () {
  const A = (window.APP = window.APP || {});
  const T = THREE;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tex(size, draw, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    draw(g, size, rng(seed || 1));
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }

  function clouds(g, s, R, n, cols, amin, amax) {
    for (let i = 0; i < n; i++) {
      const x = R() * s, y = R() * s, r = s * (0.04 + R() * 0.14);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = cols[(R() * cols.length) | 0], a = amin + R() * (amax - amin);
      gr.addColorStop(0, `rgba(${c},${a})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  function speckle(g, s, R, n, col, a) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${col},${R() * a})`;
      g.fillRect(R() * s, R() * s, 1 + R() * 2, 1 + R() * 2);
    }
  }
  function grout(g, s, nx, ny, col, w) {
    g.fillStyle = col;
    for (let i = 0; i < nx; i++) g.fillRect((i * s) / nx - w / 2, 0, w, s);
    for (let j = 0; j < ny; j++) g.fillRect(0, (j * s) / ny - w / 2, s, w);
    g.fillRect(s - w / 2, 0, w, s);
    g.fillRect(0, s - w / 2, s, w);
  }

  function marble(g, s, R, base, vein, nx, ny) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    clouds(g, s, R, 70, ['255,255,255', '196,180,154'], 0.04, 0.1);
    for (let i = 0; i < 16; i++) {
      let x = R() * s, y = R() * s, ang = R() * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      const n = 20 + R() * 30;
      for (let k = 0; k < n; k++) {
        ang += (R() - 0.5) * 0.7;
        x += Math.cos(ang) * 14;
        y += Math.sin(ang) * 14;
        g.lineTo(x, y);
      }
      g.strokeStyle = `rgba(${vein},${0.08 + R() * 0.16})`;
      g.lineWidth = 0.6 + R() * 1.8;
      g.stroke();
    }
    grout(g, s, nx, ny, 'rgba(120,108,92,0.55)', 2);
  }

  function wood(g, s, R, hue, sat, lum, plank, gap, vary) {
    for (let y = 0; y < s; y += plank) {
      let x = -R() * s * 0.5;
      while (x < s) {
        const len = s * (0.45 + R() * 0.5);
        g.fillStyle = `hsl(${hue + (R() - 0.5) * 6},${sat}%,${lum + (R() - 0.5) * vary}%)`;
        g.fillRect(x, y, len, plank);
        for (let k = 0; k < plank * 0.5; k++) {
          const yy = y + R() * plank;
          g.strokeStyle = `rgba(50,28,10,${0.03 + R() * 0.07})`;
          g.lineWidth = 0.5 + R();
          g.beginPath();
          g.moveTo(x, yy);
          g.bezierCurveTo(x + len * 0.3, yy + (R() - 0.5) * 4, x + len * 0.6, yy + (R() - 0.5) * 4, x + len, yy + (R() - 0.5) * 3);
          g.stroke();
        }
        g.fillStyle = `rgba(25,14,6,${gap})`;
        g.fillRect(x + len - 1.5, y, 1.5, plank);
        x += len;
      }
      g.fillStyle = `rgba(25,14,6,${gap})`;
      g.fillRect(0, y, s, 1.5);
    }
  }

  function stoneTile(g, s, R, base, nx, ny) {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    clouds(g, s, R, 50, ['255,235,220', '150,95,75'], 0.03, 0.08);
    speckle(g, s, R, 5000, '90,50,35', 0.12);
    speckle(g, s, R, 3000, '255,240,230', 0.12);
    grout(g, s, nx, ny, 'rgba(110,80,66,0.6)', 3);
  }

  function cladding(g, s, R) {
    g.fillStyle = '#8f8271';
    g.fillRect(0, 0, s, s);
    let y = 0;
    while (y < s) {
      const h = 14 + R() * 22;
      let x = -R() * 80;
      while (x < s) {
        const w = 60 + R() * 150;
        const l = 62 + R() * 16;
        g.fillStyle = `hsl(${32 + R() * 8},${18 + R() * 10}%,${l}%)`;
        g.fillRect(x + 1, y + 1, w - 2, h - 2);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(x + 1, y + 1, w - 2, 2);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(x + 1, y + h - 3, w - 2, 2);
        x += w;
      }
      y += h;
    }
    speckle(g, s, R, 6000, '60,45,30', 0.1);
  }

  function fluted(g, s, R) {
    const n = 16, w = s / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
      gr.addColorStop(0, '#5f4029');
      gr.addColorStop(0.25, '#a47550');
      gr.addColorStop(0.6, '#8b603f');
      gr.addColorStop(1, '#4b301d');
      g.fillStyle = gr;
      g.fillRect(i * w, 0, w + 1, s);
    }
    speckle(g, s, R, 4000, '40,22,10', 0.08);
  }

  function rug(g, s, R, bg, fg, ac) {
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);
    speckle(g, s, R, 9000, '255,255,255', 0.06);
    g.strokeStyle = fg;
    g.lineWidth = s * 0.012;
    g.strokeRect(s * 0.04, s * 0.04, s * 0.92, s * 0.92);
    g.lineWidth = s * 0.006;
    g.strokeRect(s * 0.075, s * 0.075, s * 0.85, s * 0.85);
    const n = 5, c = (s * 0.8) / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const cx = s * 0.1 + c * (i + 0.5), cy = s * 0.1 + c * (j + 0.5), r = c * 0.36;
        g.beginPath();
        g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
        g.closePath();
        g.strokeStyle = (i + j) % 2 ? fg : ac;
        g.lineWidth = s * 0.006;
        g.stroke();
        g.fillStyle = (i + j) % 2 ? ac : fg;
        g.fillRect(cx - r * 0.14, cy - r * 0.14, r * 0.28, r * 0.28);
      }
  }

  function art(g, s, R, pal) {
    g.fillStyle = pal[0];
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = pal[1 + ((R() * (pal.length - 1)) | 0)];
      g.globalAlpha = 0.75 + R() * 0.25;
      if (R() < 0.5) {
        g.beginPath();
        g.arc(R() * s, R() * s, s * (0.1 + R() * 0.25), R() * 6.3, R() * 6.3);
        g.closePath();
        g.fill();
      } else {
        g.fillRect(R() * s * 0.8, R() * s * 0.8, s * (0.1 + R() * 0.4), s * (0.08 + R() * 0.3));
      }
    }
    g.globalAlpha = 1;
    speckle(g, s, R, 5000, '255,255,255', 0.08);
  }

  function jaali(g, s) {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#3b2f28';
    g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'destination-out';
    const n = 2, c = s / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const cx = c * (i + 0.5), cy = c * (j + 0.5), r = c * 0.36;
        // eight-point star: two overlapping squares
        for (let k = 0; k < 2; k++) {
          g.save();
          g.translate(cx, cy);
          g.rotate((k * Math.PI) / 4);
          g.fillRect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56);
          g.restore();
        }
      }
    // small diamonds at the corners of each cell
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        g.save();
        g.translate(i * c, j * c);
        g.rotate(Math.PI / 4);
        g.fillRect(-c * 0.11, -c * 0.11, c * 0.22, c * 0.22);
        g.restore();
      }
    g.globalCompositeOperation = 'source-over';
  }

  A.texKit = { tex, marble, wood, rug, art };

  A.buildMaterials = function () {
    const M = {}, S = {}; // S = feet per texture repeat, used for world-scale UVs
    const std = (o) => new T.MeshStandardMaterial(o);

    const tMarble = tex(1024, (g, s, R) => marble(g, s, R, '#e9e2d5', '140,122,98', 2, 1), 11);
    const tBath = tex(512, (g, s, R) => marble(g, s, R, '#cfc8bb', '120,112,100', 2, 2), 12);
    const tBathW = tex(512, (g, s, R) => marble(g, s, R, '#e2dccf', '150,138,120', 1, 2), 13);
    const tWoodF = tex(1024, (g, s, R) => wood(g, s, R, 30, 36, 50, 128, 0.5, 9), 21);
    const tDeck = tex(512, (g, s, R) => wood(g, s, R, 28, 16, 42, 64, 0.8, 8), 22);
    const tTeak = tex(512, (g, s, R) => wood(g, s, R, 26, 44, 36, 512, 0, 3), 23);
    const tTeakV = tTeak.clone(); tTeakV.rotation = Math.PI / 2; tTeakV.needsUpdate = true;
    const tWalnut = tex(512, (g, s, R) => wood(g, s, R, 24, 30, 20, 512, 0, 3), 24);
    const tStone = tex(1024, (g, s, R) => stoneTile(g, s, R, '#d6a48c', 2, 2), 31);
    const tStoneW = tex(1024, (g, s, R) => stoneTile(g, s, R, '#d9ab93', 1, 3), 32);
    const tClad = tex(1024, cladding, 33);
    const tFlute = tex(512, fluted, 34);
    const tJaali = tex(256, jaali, 1);
    tJaali.anisotropy = 4;

    M.wall = std({ color: 0xf2ede3, roughness: 0.93 });
    M.ceiling = std({ color: 0xfaf8f4, roughness: 0.95 });
    M.marble = std({ map: tMarble, roughness: 0.22, metalness: 0.0, envMapIntensity: 0.55 }); S.marble = 4;
    M.stair = std({ map: tMarble, color: 0xe8dcc8, roughness: 0.3, envMapIntensity: 0.5 }); S.stair = 4;
    M.bathfloor = std({ map: tBath, roughness: 0.45 }); S.bathfloor = 4;
    M.bathwall = std({ map: tBathW, roughness: 0.3, envMapIntensity: 0.5 }); S.bathwall = 4;
    M.woodfloor = std({ map: tWoodF, roughness: 0.5 }); S.woodfloor = 4;
    M.deck = std({ map: tDeck, roughness: 0.8 }); S.deck = 3;
    M.stonefloor = std({ map: tStone, roughness: 0.85 }); S.stonefloor = 4;
    M.stone = std({ map: tStoneW, roughness: 0.9 }); S.stone = 4;
    M.cladding = std({ map: tClad, roughness: 0.92 }); S.cladding = 5;
    M.teak = std({ map: tTeak, roughness: 0.55 }); S.teak = 3;
    M.teakV = std({ map: tTeakV, roughness: 0.55 }); S.teakV = 3;
    M.walnut = std({ map: tWalnut, roughness: 0.5 }); S.walnut = 3;
    M.fluted = std({ map: tFlute, roughness: 0.6 }); S.fluted = 2.2;
    M.frame = std({ color: 0x2f2a27, roughness: 0.45, metalness: 0.6 });
    M.metal = std({ color: 0x3a302a, roughness: 0.5, metalness: 0.7 });
    M.brass = std({ color: 0xc9a25a, roughness: 0.28, metalness: 1.0 });
    M.chrome = std({ color: 0xdadada, roughness: 0.12, metalness: 1.0 });
    M.glass = new T.MeshStandardMaterial({ color: 0xcfe3e6, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.2 });
    M.railglass = new T.MeshStandardMaterial({ color: 0xbfe0dc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide, envMapIntensity: 1.3 });
    M.frost = std({ color: 0xdfe9ea, roughness: 0.6, emissive: 0x9fb4b8, emissiveIntensity: 0.5 });
    // one mirror material per room: each gets its own reflection of that room (see main.js)
    for (const k of ['mirror', 'mirror2', 'mirror3', 'mirror4', 'mirror5']) M[k] = std({ color: 0xe6ecee, roughness: 0.04, metalness: 1.0, envMapIntensity: 1.0 });
    M.jaali = std({ map: tJaali, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.5, metalness: 0.6 });
    M.white = std({ color: 0xf6f4ef, roughness: 0.35 });
    M.ceramic = std({ color: 0xfbfbf8, roughness: 0.12, envMapIntensity: 0.9 });
    M.quartz = std({ color: 0xf1eee8, roughness: 0.2, envMapIntensity: 0.7 });
    M.sage = std({ color: 0x8c9a84, roughness: 0.6 });
    M.black = std({ color: 0x141414, roughness: 0.35, metalness: 0.3 });
    M.screen = std({ color: 0x07090c, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.0 });
    M.steel = std({ color: 0xb9bcbf, roughness: 0.3, metalness: 0.9 });
    M.car = std({ color: 0x8a9096, roughness: 0.32, metalness: 0.65, envMapIntensity: 0.9 });
    // fabrics
    M.fabIvory = std({ color: 0xe7dfd0, roughness: 0.97 });
    M.fabSand = std({ color: 0xc9b79c, roughness: 0.97 });
    M.fabTerra = std({ color: 0xb8674a, roughness: 0.97 });
    M.fabMustard = std({ color: 0xc99a3c, roughness: 0.97 });
    M.fabTeal = std({ color: 0x3f6f73, roughness: 0.97 });
    M.fabGrey = std({ color: 0x8c8a85, roughness: 0.97 });
    M.fabWhite = std({ color: 0xf5f2ec, roughness: 0.97 });
    M.sheer = new T.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 1, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false });
    M.leaf = std({ color: 0x4f7a45, roughness: 0.8, flatShading: true });
    M.leaf2 = std({ color: 0x6b9156, roughness: 0.8, flatShading: true });
    M.leafFine = std({ color: 0x4a7a40, roughness: 0.55, side: T.DoubleSide });
    M.leafFine2 = std({ color: 0x5f8f4c, roughness: 0.6, side: T.DoubleSide });
    M.soil = std({ color: 0x3a2c22, roughness: 1 });
    M.pot = std({ color: 0xb5694d, roughness: 0.85 });
    M.potWhite = std({ color: 0xe9e4da, roughness: 0.7 });
    M.glow = std({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 2.2, roughness: 0.6 });
    M.glowSoft = std({ color: 0xfff1d6, emissive: 0xffd39a, emissiveIntensity: 0.9, roughness: 0.8 });
    // context
    M.ground = std({ color: 0xa7a38f, roughness: 1 });
    M.road = std({ color: 0x4a4a4c, roughness: 1 });
    M.grass = std({ color: 0x7c9462, roughness: 1 });
    M.trunk = std({ color: 0x6a4e37, roughness: 1 });
    M.nb1 = std({ color: 0xe6d9c6, roughness: 0.95 });
    M.nb2 = std({ color: 0xd9b8a3, roughness: 0.95 });
    M.nb3 = std({ color: 0xcfd6d2, roughness: 0.95 });
    M.nbwin = std({ color: 0x38454d, roughness: 0.2, metalness: 0.3 });

    const rugTex = (bg, fg, ac, seed) => { const t = tex(512, (g, s, R) => rug(g, s, R, bg, fg, ac), seed); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t; };
    M.rugLiving = std({ map: rugTex('#b46a4c', '#f0e4cf', '#e3b65c', 41), roughness: 1 });
    M.rugLounge = std({ map: rugTex('#c7a04a', '#f3ead8', '#7a4a33', 42), roughness: 1 });
    M.rugBed = std({ map: rugTex('#6f8587', '#efe8da', '#d9c08a', 43), roughness: 1 });
    M.rugGF = std({ map: rugTex('#8b8478', '#e9e1d2', '#c7a877', 44), roughness: 1 });
    const artTex = (pal, seed) => { const t = tex(512, (g, s, R) => art(g, s, R, pal), seed); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t; };
    M.art1 = std({ map: artTex(['#efe6d6', '#b8674a', '#c99a3c', '#3f6f73', '#2e2a28'], 51), roughness: 0.9 });
    M.art2 = std({ map: artTex(['#e9dfd0', '#3f6f73', '#d6a48c', '#c99a3c'], 52), roughness: 0.9 });
    M.art3 = std({ map: artTex(['#f1e9db', '#b8674a', '#8c9a84', '#2e2a28'], 53), roughness: 0.9 });
    M.art4 = std({ map: artTex(['#d9c9b0', '#7a4a33', '#3f6f73', '#f3ead8'], 54), roughness: 0.9 });

    // A fine woven texture on every fabric, so cushions, bedding and curtains read as cloth up close.
    const weave = (() => {
      const s = 256, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d'), img = g.createImageData(s, s), R = rng(77);
      const cells = 32, hgt = new Float32Array(s * s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const fx = (x * cells) / s, fy = (y * cells) / s, ix = Math.floor(fx), iy = Math.floor(fy);
        const warp = (ix + iy) % 2 === 0;           // over-under weave
        const u = fx - ix, v = fy - iy;
        hgt[y * s + x] = (warp ? Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(Math.PI * v)) : Math.sin(Math.PI * v) * (0.7 + 0.3 * Math.sin(Math.PI * u))) + (R() - 0.5) * 0.25;
      }
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const hx = hgt[y * s + ((x + 1) % s)] - hgt[y * s + ((x - 1 + s) % s)], hy = hgt[((y + 1) % s) * s + x] - hgt[((y - 1 + s) % s) * s + x];
        const nx = -hx * 0.9, ny = -hy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz), o = (y * s + x) * 4;
        img.data[o] = ((nx / l) * 0.5 + 0.5) * 255; img.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255; img.data[o + 2] = ((nz / l) * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(2.5, 2.5);
      t.anisotropy = 8;
      return t;
    })();
    for (const k of ['fabIvory', 'fabSand', 'fabTerra', 'fabMustard', 'fabTeal', 'fabGrey', 'fabWhite']) {
      M[k].normalMap = weave;
      M[k].normalScale.set(0.45, 0.45);
      M[k].roughness = 0.92;
    }

    for (const k in S) M[k].userData.s = S[k];
    A.M = M;
    A.S = S;
    return M;
  };
})();
