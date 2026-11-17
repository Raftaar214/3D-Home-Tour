"""Local server for the walkthrough and the plan editor.

Serves this folder on http://localhost:<port> and lets the plan editor write its
changes straight into the plan files (js/plan-data.js for the first floor,
js/plan-data-ground.js for the ground floor), so edits are kept on disk instead
of only inside a browser. Listens on this computer only.

Run:  python serve.py 8765
"""
import http.server
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
# one plan file per floor: (file the editor writes, copy kept from before the first edit, variable name)
FLOORS = {
    'first': (os.path.join(ROOT, 'js', 'plan-data.js'), os.path.join(ROOT, 'js', 'plan-data.original.js'), 'PLAN_DATA'),
    'ground': (os.path.join(ROOT, 'js', 'plan-data-ground.js'), os.path.join(ROOT, 'js', 'plan-data-ground.original.js'), 'PLAN_DATA_GROUND'),
}
PLAN, ORIG = FLOORS['first'][0], FLOORS['first'][1]

HEADER_GROUND = """/* The editable GROUND FLOOR plan: walls, their windows and doors, pillars, the
   outdoor areas (car porch, entry lobby, walkway, open court) and wardrobes.
   Written by the plan editor (Ground floor tab).

   Units are feet, on the same axes as the first floor: X runs to the right of the
   sheet (south), Y runs down the sheet (west, toward the road). X = 0 is the
   front-left corner of the plot, Y = 0 is the outer face of the rear wall.
   r  = [x0, y0, x1, y1] footprint.   ax = direction the wall runs ("x" or "y").
   z  = [bottom, top] measured from the ground floor finish; left out means floor
        to ceiling. "H" = ceiling, "PORCH" = car porch level (1'-6" below the floor),
        "ROOF" = top of the first floor's roof slab.
   ops = openings; a/b are positions along the wall. "leaves": 2 = double door. */
"""

HEADER = """/* The editable floor plan: walls, their windows and doors, pillars, and the open
   areas (terrace, balconies, double-height opening). Written by the plan editor.

   Units are feet. X runs to the right of the sheet (south), Y runs down the sheet
   (west, toward the road). X = 0 is the front-left corner of the plot, Y = 0 is
   the outer face of the rear wall.
   r  = [x0, y0, x1, y1] footprint.   ax = direction the wall runs ("x" or "y").
   z  = [bottom, top]; left out means floor to ceiling. "GF" = ground floor level,
        "H" = ceiling, "TOP" = top of the roof slab, "-SLAB" = underside of the floor slab.
   ops = openings; a/b are positions along the wall. */
"""


def stamp(path):
    """Version mark of a plan file: changes whenever the file is written."""
    try:
        return str(os.stat(path).st_mtime_ns)
    except OSError:
        return ''


def is_rect(r):
    return isinstance(r, list) and len(r) == 4 and all(isinstance(v, (int, float)) for v in r)


def check(d):
    if not isinstance(d, dict) or not isinstance(d.get('version'), int):
        return 'bad plan'
    if not isinstance(d.get('H'), (int, float)) or not 8 <= d['H'] <= 20:
        return 'bad ceiling height'
    for key in ('walls', 'pillars', 'areas'):
        items = d.get(key)
        if not isinstance(items, list) or len(items) > 500:
            return 'bad ' + key
        for it in items:
            if not isinstance(it, dict) or not is_rect(it.get('r')):
                return 'bad item in ' + key
    for w in d['walls']:
        if w.get('ax') not in ('x', 'y'):
            return 'bad wall direction'
    extra = d.get('wardrobes', [])
    if not isinstance(extra, list) or len(extra) > 200 or not all(isinstance(it, dict) and is_rect(it.get('r')) for it in extra):
        return 'bad wardrobes'
    return None


def render(d, floor='first'):
    def block(name, items, last=False):
        body = ',\n'.join('    ' + json.dumps(it, ensure_ascii=False) for it in items)
        return '  %s: [\n%s\n  ]%s\n' % (name, body, '' if last else ',')
    return ((HEADER_GROUND if floor == 'ground' else HEADER) + 'window.%s = {\n' % FLOORS[floor][2]
            + '  version: %d,\n  H: %s,\n  SLAB: 0.4167,\n  DOOR: 7,\n' % (d['version'], json.dumps(d['H']))
            + block('walls', d['walls']) + block('pillars', d['pillars']) + block('areas', d['areas'])
            + block('wardrobes', d.get('wardrobes', []), True)
            + '};\n')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')  # always serve the current files
        super().end_headers()

    def reply(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/ping':
            floor = 'ground' if 'floor=ground' in self.path else 'first'
            return self.reply(200, {'ok': True, 'canSave': True, 'hasOriginal': os.path.exists(FLOORS[floor][1]), 'stamp': stamp(FLOORS[floor][0])})
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        floor = 'ground' if 'floor=ground' in self.path else 'first'
        plan_file, orig_file = FLOORS[floor][0], FLOORS[floor][1]
        origin = self.headers.get('Origin', '')
        local = origin.startswith('http://localhost:') or origin.startswith('http://127.0.0.1:')
        if self.headers.get('X-Plan-Editor') != '1' or (origin and not local):
            return self.reply(403, {'ok': False, 'error': 'not allowed'})
        if path == '/api/reset':
            if os.path.exists(orig_file):
                shutil.copyfile(orig_file, plan_file)
            return self.reply(200, {'ok': True, 'stamp': stamp(plan_file)})
        if path != '/api/plan':
            return self.reply(404, {'ok': False, 'error': 'unknown'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2000000:
                return self.reply(400, {'ok': False, 'error': 'bad size'})
            data = json.loads(self.rfile.read(size).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, {'ok': False, 'error': 'not JSON'})
        problem = check(data)
        if problem:
            return self.reply(400, {'ok': False, 'error': problem})
        # An editor page saves only over the version of the file it loaded. A page left open
        # from before a newer save (another tab, or a change made outside the editor) is
        # refused and asked to reload, instead of quietly putting old walls back.
        if self.headers.get('X-Plan-Stamp', '') != stamp(plan_file):
            return self.reply(409, {'ok': False, 'error': 'stale', 'stamp': stamp(plan_file)})
        if not os.path.exists(orig_file) and os.path.exists(plan_file):
            shutil.copyfile(plan_file, orig_file)  # keep the plan as it was before the first edit
        tmp = plan_file + '.tmp'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(render(data, floor))
        os.replace(tmp, plan_file)
        return self.reply(200, {'ok': True, 'stamp': stamp(plan_file)})

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler) as srv:
        print('Serving %s on http://localhost:%d' % (ROOT, port))
        srv.serve_forever()
