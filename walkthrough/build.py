"""Bundle the walkthrough into ONE HTML file.

Reads index.html and every script it uses and puts the scripts inside the page.

  python build.py
      -> ../first-floor-walkthrough.html
      The layout is read from the plan editor's file (js/plan-data.js) every time
      the page opens, as long as the page stays where this script puts it. A copy
      of the plan is built in too, used when that file cannot be found.

  python build.py --share <output.html>
      A fully self-contained copy for publishing as a shareable link: the plan is
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
OUT = os.path.abspath(args[0]) if args else os.path.join(os.path.dirname(ROOT), 'first-floor-walkthrough.html')


def read(rel):
    return io.open(os.path.join(ROOT, rel), encoding='utf-8').read()


def check(rel, code):
    if '</script' in code.lower():
        raise SystemExit(rel + ' contains a closing script tag and cannot be inlined')
    return code


def inline(rel):
    return '<script>\n/* ---- ' + rel + ' ---- */\n' + check(rel, read(rel)) + '\n</script>'


html = read('index.html')
plan_line = re.search(r"<script>document\.write\('<script src=\"js/plan-data\.js.*?</script>", html)
if not plan_line:
    raise SystemExit('plan-data script line not found in index.html')
live = '' if SHARE else os.path.relpath(os.path.join(ROOT, 'js', 'plan-data.js'), os.path.dirname(OUT)).replace('\\', '/')
if SHARE:
    plan_block = '<script>window.PLAN_STANDALONE = true;</script>\n' + inline('js/plan-data.js')
else:
    plan_block = '\n'.join([
        '<script>window.PLAN_STANDALONE = true;</script>',
        '<script>\n/* ---- built-in copy of the plan ---- */\n' + check('js/plan-data.js', read('js/plan-data.js'))
        + '\nwindow.PLAN_BAKED = window.PLAN_DATA; window.PLAN_DATA = null;\n</script>',
        # the editor's plan file, read fresh each time the page opens
        "<script>document.write('<script src=\"" + live + "?t=' + Date.now() + '\"><\\/script>');</script>",
        "<script>window.PLAN_SOURCE = window.PLAN_DATA ? 'editor' : 'built-in'; if (!window.PLAN_DATA) window.PLAN_DATA = window.PLAN_BAKED;</script>",
    ])
html = html.replace(plan_line.group(0), plan_block)
html, count = re.subn(r'<script src="(js/[a-z-]+\.js)\?v=\d+"></script>', lambda m: inline(m.group(1)), html)
html = re.sub(r'\s*<a id="editlink"[^>]*>.*?</a>', '', html)  # the editor is a separate page
if re.search(r'<script src="js/(?!plan-data)', html):
    raise SystemExit('a local script was left un-inlined')
if SHARE:
    for tag in (r'<!doctype html>\s*', r'<html[^>]*>\s*', r'</html>\s*', r'<head>\s*', r'</head>\s*', r'<body>\s*', r'</body>\s*',
                r'<meta charset[^>]*>\s*', r'<meta name="viewport"[^>]*>\s*', r'<link rel="icon"[^>]*>\s*'):
        html = re.sub(tag, '', html, count=1, flags=re.I)
    html = html.replace(':root {', ':root { color-scheme: dark;', 1)  # the page is dark by design
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
print('wrote %s (%d scripts inlined, %d KB%s)' % (OUT, count + 1, len(html.encode('utf-8')) // 1024, ', share copy' if SHARE else ', live plan from ' + live))
