"""Furniture models for the walkthrough, made in Blender.

Run (Blender in the background, no window):
    blender --background --factory-startup --python make_furniture.py -- <out models-data.js>

What it makes (units: feet; each model sits on y = 0, centred on x and z, front toward +z
in the walkthrough's axes):
  soft upholstery  seat / back cushions with piping, throw and bed pillows with pinched corners
  bedding          duvet and runner draped over the mattress with Blender's cloth simulation
  plants           potted plants with real leaf shapes (two sizes)
  lamps            turned lamp shades, a table-lamp base, a pendant dome

Every model is split into parts by role ("fab", "pipe", "pot", "leaf", "shade", ...). The
walkthrough paints each role with a material of the chosen style, so one model serves all
three styles. The result is written as a small script (window.FURNITURE_MODELS) that the
walkthrough loads and that build.py puts inside the single HTML file.
"""
import base64
import json
import math
import os
import random
import struct
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'models-data.js')
random.seed(11)
PI = math.pi


# --------------------------------------------------------------------------------------------
# scene helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def from_bmesh(name, bm, smooth=True, sharp_deg=None):
    if sharp_deg is not None:
        lim = math.radians(sharp_deg)
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
                e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.update()
    return link(bpy.data.objects.new(name, me))


def from_data(name, verts, faces, smooth=True, sharp_deg=None):
    bm = bmesh.new()
    bv = [bm.verts.new(v) for v in verts]
    for f in faces:
        try:
            bm.faces.new([bv[i] for i in f])
        except ValueError:
            pass
    bm.normal_update()
    return from_bmesh(name, bm, smooth, sharp_deg)


# --------------------------------------------------------------------------------------------
# shapes
def soft_box(name, A, B, C, r, rz=None, cuts=5, crown=0.0, puff=0.0, sag=0.0, wobble=0.0):
    """Rounded, slightly domed box: a cushion. Half sizes A (x), B (y), C (z)."""
    rz = r if rz is None else rz
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    ease = lambda t: math.copysign(1 - (1 - abs(t)) ** 1.7, t)  # more rows near the edges
    for v in bm.verts:
        x, y, z = ease(v.co.x) * A, ease(v.co.y) * B, ease(v.co.z) * C
        ix, iy, iz = max(-(A - r), min(A - r, x)), max(-(B - r), min(B - r, y)), max(-(C - rz), min(C - rz, z))
        d = Vector(((x - ix) / r, (y - iy) / r, (z - iz) / rz))
        if d.length > 1e-9:
            d.normalize()
        q = Vector((ix + d.x * r, iy + d.y * r, iz + d.z * rz))
        fx, fy = max(0.0, 1 - (q.x / A) ** 2), max(0.0, 1 - (q.y / B) ** 2)
        if q.z > 0:
            q.z += crown * fx * fy - sag * fx * fy * fx
        else:
            q.z -= crown * 0.25 * fx * fy
        side = max(0.0, 1 - (q.z / C) ** 2)
        q.x *= 1 + puff * side * fy
        q.y *= 1 + puff * side * fx
        if wobble:
            q.z += wobble * math.sin(q.x * 3.1 + 0.7) * math.sin(q.y * 2.3) * fx * fy * (1 if q.z > 0 else 0.4)
        v.co = q
    bm.normal_update()
    return from_bmesh(name, bm)


def tube_along(name, pts, radius, sides=5, closed=True):
    """A thin tube (piping) along a path of points."""
    n = len(pts)
    verts, faces = [], []
    for i, p in enumerate(pts):
        a, b = pts[(i - 1) % n] if closed or i > 0 else pts[i], pts[(i + 1) % n] if closed or i < n - 1 else pts[i]
        t = (Vector(b) - Vector(a)).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        nrm = t.cross(up).normalized()
        bi = t.cross(nrm).normalized()
        for k in range(sides):
            ang = 2 * PI * k / sides
            verts.append(tuple(Vector(p) + (nrm * math.cos(ang) + bi * math.sin(ang)) * radius))
    rings = n if closed else n - 1
    for i in range(rings):
        j = (i + 1) % n
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((i * sides + k, i * sides + k2, j * sides + k2, j * sides + k))
    return from_data(name, verts, faces)


def rounded_rect_path(a, b, r, z, samples=32, warp=None):
    """Points round a rounded rectangle of half sizes a, b with corner radius r, at height z."""
    pts = []
    corners = [(a - r, b - r, 0), (-(a - r), b - r, 90), (-(a - r), -(b - r), 180), (a - r, -(b - r), 270)]
    per = max(3, samples // 4)
    for cx, cy, start in corners:
        for k in range(per):
            ang = math.radians(start + 90 * k / (per - 1))
            x, y = cx + r * math.cos(ang), cy + r * math.sin(ang)
            if warp:
                x, y = warp(x, y)
            pts.append((x, y, z))
    return pts


def lathe(name, prof, seg=28, cap_bottom=False, cap_top=False, smooth=True, sharp_deg=40):
    """Turn a profile [(radius, height), ...] (bottom to top) round the vertical axis."""
    verts, faces = [], []
    m = len(prof)
    for i in range(seg):
        a = 2 * PI * i / seg
        c, s = math.cos(a), math.sin(a)
        for r, z in prof:
            verts.append((r * c, r * s, z))
    for i in range(seg):
        i2 = (i + 1) % seg
        for j in range(m - 1):
            faces.append((i * m + j, i2 * m + j, i2 * m + j + 1, i * m + j + 1))
    if cap_bottom:
        verts.append((0, 0, prof[0][1]))
        c0 = len(verts) - 1
        for i in range(seg):
            faces.append((c0, ((i + 1) % seg) * m, i * m))
    if cap_top:
        verts.append((0, 0, prof[-1][1]))
        c1 = len(verts) - 1
        for i in range(seg):
            faces.append((c1, i * m + m - 1, ((i + 1) % seg) * m + m - 1))
    return from_data(name, verts, faces, smooth, sharp_deg)


def leaf(name, length, width, fold=0.25, droop=0.5, rows=7, cols=4, tip=1.0):
    """One leaf along +x from the origin: pointed tip, a fold along the midrib, drooping."""
    verts, faces = [], []
    for i in range(rows + 1):
        t = i / rows
        half = width * 0.5 * (math.sin(PI * min(1.0, t * 0.92 + 0.04)) ** 0.8) * (1 - 0.25 * t) * (1 if t < 0.999 else 0.05)
        bend = droop * t * t
        x = length * t * math.cos(bend)
        zc = -length * t * math.sin(bend) * 0.6
        for j in range(cols + 1):
            s = -1 + 2 * j / cols
            y = s * half
            z = zc + abs(s) * half * fold - (s * s) * half * 0.08
            verts.append((x, y, z))
    for i in range(rows):
        for j in range(cols):
            a = i * (cols + 1) + j
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    return from_data(name, verts, faces)


def join(objs, name):
    """Join objects into one (same role)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


# --------------------------------------------------------------------------------------------
# export
MODELS = {}


def mesh_arrays(ob):
    """Triangles of the finished object (modifiers applied), in walkthrough axes."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    mw = ob.matrix_world
    nm = mw.to_3x3().inverted().transposed()
    try:
        cn = [c.vector.copy() for c in me.corner_normals]
    except AttributeError:
        cn = [l.normal.copy() for l in me.loops]
    key_to_idx, pos, nor, idx = {}, [], [], []
    for tri in me.loop_triangles:
        for l in tri.loops:
            vi = me.loops[l].vertex_index
            n = (nm @ cn[l]).normalized()
            q = (vi, round(n.x * 63), round(n.y * 63), round(n.z * 63))
            k = key_to_idx.get(q)
            if k is None:
                co = mw @ me.vertices[vi].co
                k = key_to_idx[q] = len(pos)
                pos.append((co.x, co.z, -co.y))   # Blender z-up -> walkthrough y-up, front toward +z
                nor.append((n.x, n.z, -n.y))
            idx.append(k)
    ev.to_mesh_clear()
    # Blender's front face is wound counter-clockwise from outside, and the axis swap keeps it so.
    return pos, nor, idx


def add_model(name, parts, recentre=True):
    """parts: [(role, object)]. Centres the model on x/z and puts its base on y = 0
    (unless recentre is False: then the Blender origin is kept)."""
    arrays = [(role, mesh_arrays(o)) for role, o in parts]
    xs = [p[0] for _, (pos, _, _) in arrays for p in pos]
    ys = [p[1] for _, (pos, _, _) in arrays for p in pos]
    zs = [p[2] for _, (pos, _, _) in arrays for p in pos]
    cx, cz, y0 = ((min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2, min(ys)) if recentre else (0.0, 0.0, 0.0)
    out = []
    for role, (pos, nor, idx) in arrays:
        pos = [(x - cx, y - y0, z - cz) for x, y, z in pos]
        lo = [min(p[k] for p in pos) for k in range(3)]
        hi = [max(p[k] for p in pos) for k in range(3)]
        span = [max(hi[k] - lo[k], 1e-6) for k in range(3)]
        qp = b''.join(struct.pack('<3H', *[int(round((p[k] - lo[k]) / span[k] * 65535)) for k in range(3)]) for p in pos)
        qn = b''.join(struct.pack('<3b', *[max(-127, min(127, int(round(n[k] * 127)))) for k in range(3)]) for n in nor)
        big = len(pos) > 65535
        qi = struct.pack('<%d%s' % (len(idx), 'I' if big else 'H'), *idx)
        out.append({'r': role, 'lo': [round(v, 5) for v in lo], 'hi': [round(v, 5) for v in hi], 'big': big,
                    'p': base64.b64encode(qp).decode(), 'n': base64.b64encode(qn).decode(), 'i': base64.b64encode(qi).decode()})
    size = [round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4)]
    MODELS[name] = {'size': size, 'parts': out}
    tris = sum(len(a[1][2]) // 3 for a in arrays)
    print('model %-14s %5d triangles  size %s' % (name, tris, size))


# --------------------------------------------------------------------------------------------
# the models
def cushion(name, A, B, C, r, rz, crown, puff, piping_at=(1, -1), pipe_r=0.022, **kw):
    """A cushion and its piping, as two parts."""
    body = soft_box(name, A, B, C, r, rz, crown=crown, puff=puff, **kw)
    rings = []
    for side in piping_at:
        zz = side * (C - rz + rz * 0.707)
        k = 1 + puff * max(0.0, 1 - (zz / C) ** 2) * 0.6
        rings.append(tube_along(name + '_pipe%d' % side, rounded_rect_path((A - r + r * 0.707) * k, (B - r + r * 0.707) * k, r * 0.707, zz), pipe_r))
    return body, rings


def make_seat():
    reset()
    body, rings = cushion('seat', 1.0, 1.12, 0.25, 0.16, 0.13, crown=0.05, puff=0.035, sag=0.02, wobble=0.006)
    add_model('seat', [('fab', body), ('pipe', join(rings, 'pipe'))])


def make_back():
    reset()
    # made lying down (piping round the face), then stood up: thickness becomes depth, the face looks forward
    body, rings = cushion('back', 1.0, 0.6, 0.27, 0.2, 0.17, crown=0.045, puff=0.05, piping_at=(1,), wobble=0.006)
    body.rotation_euler = (PI / 2, 0, 0)
    for r in rings:
        r.rotation_euler = (PI / 2, 0, 0)
    bpy.context.view_layer.update()
    add_model('back', [('fab', body), ('pipe', join(rings, 'pipe'))])


def pillow_shape(name, A, B, T, ears, cuts=7):
    ob = soft_box(name, A, B, T, min(A, B) * 0.18, T * 0.98, cuts=cuts)
    me = ob.data
    for v in me.vertices:
        x, y, z = v.co
        f = max(0.0, (1 - min(1.0, abs(x) / A) ** 2.4) * (1 - min(1.0, abs(y) / B) ** 2.4)) ** 0.5
        z *= 0.18 + 0.82 * f
        nx, ny = x * (1 - ears * (1 - (y / B) ** 2)), y * (1 - ears * (1 - (x / A) ** 2))
        v.co = (nx, ny, z)
    me.update()
    warp = lambda x, y: (x * (1 - ears * (1 - (y / B) ** 2)), y * (1 - ears * (1 - (x / A) ** 2)))
    pipe = tube_along(name + '_pipe', rounded_rect_path(A * 0.995, B * 0.995, min(A, B) * 0.15, 0.0, 40, warp), 0.022)
    return ob, pipe


def make_pillows():
    for name, A, B, T, ears in (('pillow', 0.66, 0.66, 0.24, 0.07), ('bedpillow', 1.3, 0.72, 0.27, 0.045)):
        reset()
        body, pipe = pillow_shape(name, A, B, T, ears)
        for o in (body, pipe):
            o.rotation_euler = (PI / 2, 0, 0)          # standing up, facing the front
        bpy.context.view_layer.update()
        add_model(name, [('fab', body), ('pipe', pipe)])


def make_bedding(name, W, L, top_frac, hang):
    """Duvet over the foot part of the bed, and a runner across it, both draped by cloth
    simulation. Blender axes: x across the bed, head of the mattress at y = 0, foot at y = -L,
    mattress top at z = 0. Exported without re-centring: in the walkthrough the head is at
    z = 0, the foot at z = L, and the mattress top at y = 0."""
    reset()
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 80
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    mattress = from_bmesh('mattress', bm, smooth=False)
    mattress.scale = (W, L, 0.8)
    mattress.location = (0, -L / 2, -0.4)
    bpy.context.view_layer.update()
    mattress.modifiers.new('col', 'COLLISION')
    mattress.collision.thickness_outer = 0.02
    mattress.collision.cloth_friction = 8

    def cloth(nm, x0, x1, y0, y1, z0, nx, ny, mass):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=1.0)
        xs = [v.co.x for v in bm.verts]
        ys = [v.co.y for v in bm.verts]
        ax, bx, ay, by = min(xs), max(xs), min(ys), max(ys)
        for v in bm.verts:
            v.co.x = x0 + (v.co.x - ax) / (bx - ax) * (x1 - x0)
            v.co.y = y0 + (v.co.y - ay) / (by - ay) * (y1 - y0)
            v.co.z = z0
        ob = from_bmesh(nm, bm)
        md = ob.modifiers.new('cloth', 'CLOTH')
        st = md.settings
        st.quality = 7
        st.mass = mass
        st.tension_stiffness = 12
        st.compression_stiffness = 12
        st.bending_stiffness = 0.6
        st.air_damping = 2
        md.collision_settings.distance_min = 0.012
        md.collision_settings.use_self_collision = False
        md.point_cache.frame_start, md.point_cache.frame_end = 1, 80
        return ob

    def settle(ob, frames, thickness, collide):
        sc.frame_set(1)
        for f in range(1, frames):
            sc.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        fro = link(bpy.data.objects.new(ob.name + '_shape', me))
        fro.matrix_world = ob.matrix_world.copy()
        bpy.data.objects.remove(ob)
        for p in fro.data.polygons:
            p.use_smooth = True
        so = fro.modifiers.new('thick', 'SOLIDIFY')
        so.thickness = thickness
        so.offset = 1
        if collide:
            fro.modifiers.new('col', 'COLLISION')
            fro.collision.thickness_outer = 0.02
        bpy.context.view_layer.update()
        return fro

    run = L * top_frac
    duvet = cloth('duvet', -(W / 2 + hang), W / 2 + hang, -L - hang, -(L - run), 0.12, 34, 28, 0.3)
    duvet = settle(duvet, 48, 0.07, True)
    runner = cloth('runner', -(W / 2 + hang * 0.9), W / 2 + hang * 0.9, -L + 0.45, -L + 1.9, 0.45, 34, 8, 0.25)
    runner = settle(runner, 42, 0.04, False)
    duvet.modifiers.remove(duvet.modifiers['col'])
    bpy.data.objects.remove(mattress)
    bpy.context.view_layer.update()
    add_model(name, [('duvet', duvet), ('runner', runner)], recentre=False)


def plant_model(name, height, pot_r, n_leaves, kind):
    reset()
    pot_h = pot_r * 1.55
    pot = lathe('pot', [(pot_r * 0.7, 0), (pot_r * 0.74, 0.02), (pot_r * 0.94, pot_h * 0.86), (pot_r, pot_h * 0.9), (pot_r, pot_h),
                        (pot_r * 0.92, pot_h), (pot_r * 0.9, pot_h * 0.92)], seg=32, cap_bottom=True)
    soil = lathe('soil', [(pot_r * 0.9, pot_h * 0.9), (pot_r * 0.6, pot_h * 0.93), (0.0, pot_h * 0.94)], seg=32)
    stems, leaves_a, leaves_b = [], [], []
    top = height
    if kind == 'tall':            # fiddle-leaf fig: a few upright stems, broad leaves up the top two thirds
        trunks = [(0.0, 0.0, 1.0), (0.12, 0.08, 0.86), (-0.1, -0.06, 0.78)]
        for ti, (ox, oy, frac) in enumerate(trunks):
            h = pot_h + (top - pot_h) * frac
            pts = [(ox * pot_r * (k / 8) * 3, oy * pot_r * (k / 8) * 3, pot_h * 0.9 + (h - pot_h * 0.9) * k / 8) for k in range(9)]
            stems.append(tube_along('stem%d' % ti, pts, 0.035 * (1.0 if ti == 0 else 0.8), 6, closed=False))
            nl = int(n_leaves * (0.5 if ti == 0 else 0.25))
            for li in range(nl):
                t = 0.35 + 0.65 * (li + random.random() * 0.5) / nl
                base = Vector(pts[min(8, int(t * 8))])
                L = (0.42 + 0.22 * random.random()) * (1.25 - 0.35 * t) * height / 4.4 * 1.6
                lf = leaf('lf', L, L * 0.62, fold=0.22, droop=0.35 + 0.4 * random.random(), rows=5, cols=3)
                lf.rotation_euler = (random.uniform(-0.2, 0.2), -random.uniform(0.15, 0.7), random.uniform(0, 2 * PI))
                lf.location = base
                (leaves_a if random.random() < 0.55 else leaves_b).append(lf)
    else:                         # a full, rounded bush: leaves arcing out from the soil
        for li in range(n_leaves):
            ang = 2 * PI * li / n_leaves + random.uniform(-0.25, 0.25)
            up = random.uniform(0.35, 1.25)
            L = (top - pot_h) * random.uniform(0.55, 0.95)
            stem_len = L * 0.45
            sx, sy = math.cos(ang), math.sin(ang)
            p0 = Vector((sx * pot_r * 0.15, sy * pot_r * 0.15, pot_h * 0.92))
            p1 = p0 + Vector((sx * stem_len * math.cos(up) * 0.6, sy * stem_len * math.cos(up) * 0.6, stem_len * math.sin(up)))
            stems.append(tube_along('st%d' % li, [tuple(p0), tuple((p0 + p1) / 2 + Vector((0, 0, 0.04))), tuple(p1)], 0.016, 5, closed=False))
            lf = leaf('lf', L * 0.62, L * 0.3, fold=0.3, droop=0.9 + 0.5 * random.random(), rows=5, cols=2)
            lf.rotation_euler = (random.uniform(-0.3, 0.3), -(up * 0.85), ang)
            lf.location = p1
            (leaves_a if li % 2 else leaves_b).append(lf)
    bpy.context.view_layer.update()
    parts = [('pot', pot), ('soil', soil), ('stem', join(stems, 'stems'))]
    if leaves_a:
        parts.append(('leaf', join(leaves_a, 'leaves_a')))
    if leaves_b:
        parts.append(('leaf2', join(leaves_b, 'leaves_b')))
    add_model(name, parts)


def make_lamps():
    def shade(nm, r_bot, r_top, h, z0, t=0.022, seg=40):
        prof = [(r_bot - t, z0 + 0.01), (r_bot, z0), (r_bot + 0.008, z0 + 0.015), (r_top + 0.008, z0 + h - 0.015), (r_top, z0 + h), (r_top - t, z0 + h - 0.01), (r_bot - t, z0 + 0.01)]
        return lathe(nm, prof, seg=seg, sharp_deg=60)

    reset()   # tall cone shade (warm luxury floor lamp)
    add_model('shade_cone', [('shade', shade('s', 0.76, 0.55, 0.95, 0)), ('bulb', lathe('b', [(0.0, 0.3), (0.12, 0.36), (0.13, 0.48), (0.07, 0.6), (0.0, 0.62)], seg=16))])
    reset()   # straight drum shade (Scandinavian floor lamp)
    add_model('shade_drum', [('shade', shade('s', 0.7, 0.7, 1.0, 0)), ('bulb', lathe('b', [(0.0, 0.32), (0.12, 0.38), (0.13, 0.5), (0.07, 0.62), (0.0, 0.64)], seg=16))])
    reset()   # table lamp: a gourd-shaped base and a tapered shade
    base = lathe('base', [(0.0, 0.0), (0.14, 0.0), (0.16, 0.02), (0.22, 0.14), (0.25, 0.3), (0.2, 0.5), (0.1, 0.62), (0.07, 0.66), (0.075, 0.7), (0.0, 0.7)], seg=36, sharp_deg=70)
    add_model('tablelamp', [('base', base), ('shade', shade('s', 0.45, 0.3, 0.55, 0.72)), ('bulb', lathe('b', [(0.0, 0.8), (0.09, 0.86), (0.1, 0.95), (0.0, 1.0)], seg=12))])
    reset()   # pendant dome
    dome = lathe('dome', [(0.0, 0.0), (0.09, 0.0), (0.12, -0.02), (0.16, -0.08), (0.35, -0.28), (0.52, -0.5), (0.6, -0.66), (0.62, -0.7),
                          (0.6, -0.7), (0.58, -0.66), (0.5, -0.52), (0.33, -0.3), (0.14, -0.1), (0.0, -0.08)], seg=40, sharp_deg=70)
    add_model('dome', [('shade', dome), ('bulb', lathe('b', [(0.0, -0.2), (0.12, -0.26), (0.13, -0.38), (0.0, -0.45)], seg=14))])


# --------------------------------------------------------------------------------------------
STEPS = [
    ('seat', make_seat), ('back', make_back), ('pillows', make_pillows),
    ('bed', lambda: make_bedding('bedding', 6.0, 6.75, 0.62, 0.8)),
    ('twin', lambda: make_bedding('bedding_twin', 3.4, 6.5, 0.6, 0.7)),
    ('plant_tall', lambda: plant_model('plant_tall', 4.4, 0.8, 30, 'tall')),
    ('plant_bush', lambda: plant_model('plant_bush', 3.2, 0.55, 22, 'bush')),
    ('lamps', make_lamps),
]
for nm, fn in STEPS:
    try:
        fn()
    except Exception as err:  # one failed model must not stop the others
        import traceback
        traceback.print_exc()
        print('FAILED', nm, err)

js = ('/* Furniture models made in Blender by blender/make_furniture.py. Do not edit by hand:\n'
      '   run that script again instead. Positions are packed per part (16-bit, inside lo..hi),\n'
      '   normals 8-bit, triangles as indices. */\n'
      'window.FURNITURE_MODELS = ' + json.dumps(MODELS, separators=(',', ':')) + ';\n')
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(js)
print('wrote', OUT, len(js) // 1024, 'KB,', len(MODELS), 'models')
