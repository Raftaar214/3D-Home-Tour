"""Bundle the walkthrough into ONE HTML file.

Reads index.html and every script it uses and puts the scripts inside the page.

  python build.py
      -> ../home-walkthrough.html
      The layout is read from the plan editor's files (js/plan-data.js and
      js/plan-data-ground.js) every time the page opens, as long as the page stays
      where this script puts it. A copy of each plan is built in too, used when
      those files cannot be found.

  python build.py --share <output.html>
      A fully self-contained copy for publishing as a shareable link: the plans are
      built in, nothing is read from this folder, and the outer html/head/body
      tags are left out because the publishing service adds its own.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if a != '--share']
SHARE = '--share' in sys.argv
OUT = os.path.abspath(args[0]) if args else os.path.join(os.path.dirname(ROOT), 'home-walkthrough.html')

# one plan file per floor: (file, the variable it sets); a floor without a file is skipped
PLANS = [('js/plan-data.js', 'PLAN_DATA'), ('js/plan-data-ground.js', 'PLAN_DATA_GROUND')]


def read(rel):
    return io.open(os.path.join(ROOT, rel), encoding='utf-8').read()


def check(rel, code):
    if '</script' in code.lower():
        raise SystemExit(rel + ' contains a closing script tag and cannot be inlined')
    return code


def inline(rel):
    return '<script>\n/* ---- ' + rel + ' ---- */\n' + check(rel, read(rel)) + '\n</script>'


html = read('index.html')
first = True
for rel, var in PLANS:
    name = os.path.basename(rel)
    line = re.search(r"<script>document\.write\('<script src=\"js/" + re.escape(name) + r".*?</script>\n?", html)
    if not line:
        if var == 'PLAN_DATA':
            raise SystemExit('plan-data script line not found in index.html')
        continue
    if not os.path.exists(os.path.join(ROOT, rel)):
        html = html.replace(line.group(0), '')
        continue
    head = '<script>window.PLAN_STANDALONE = true;</script>\n' if first else ''
    if SHARE:
        block = head + inline(rel) + '\n'
    else:
        live = os.path.relpath(os.path.join(ROOT, rel), os.path.dirname(OUT)).replace('\\', '/')
        baked = var.replace('DATA', 'BAKED')
        block = head + '\n'.join([
            '<script>\n/* ---- built-in copy of ' + name + ' ---- */\n' + check(rel, read(rel))
            + '\nwindow.' + baked + ' = window.' + var + '; window.' + var + ' = null;\n</script>',
            # the editor's plan file, read fresh each time the page opens
            "<script>document.write('<script src=\"" + live + "?t=' + Date.now() + '\"><\\/script>');</script>",
            "<script>" + ("window.PLAN_SOURCE = window." + var + " ? 'editor' : 'built-in'; " if var == 'PLAN_DATA' else '')
            + "if (!window." + var + ") window." + var + " = window." + baked + ";</script>",
        ]) + '\n'
    html = html.replace(line.group(0), block)
    first = False
html, count = re.subn(r'<script src="(js/[a-z-]+\.js)\?v=\d+"></script>', lambda m: inline(m.group(1)), html)
html = re.sub(r'\s*<a id="editlink"[^>]*>.*?</a>', '', html)  # the editor is a separate page
if re.search(r'<script src="js/', html):
    raise SystemExit('a local script was left un-inlined')
if SHARE:
    for tag in (r'<!doctype html>\s*', r'<html[^>]*>\s*', r'</html>\s*', r'<head>\s*', r'</head>\s*', r'<body>\s*', r'</body>\s*',
                r'<meta charset[^>]*>\s*', r'<meta name="viewport"[^>]*>\s*', r'<link rel="icon"[^>]*>\s*'):
        html = re.sub(tag, '', html, count=1, flags=re.I)
    html = html.replace(':root {', ':root { color-scheme: dark;', 1)  # the page is dark by design
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
print('wrote %s (%d scripts inlined, %d KB%s)' % (OUT, count, len(html.encode('utf-8')) // 1024, ', share copy' if SHARE else ', live plans from js/'))
