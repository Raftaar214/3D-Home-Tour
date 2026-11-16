# 3D Home Tour

Turns a 2D floor plan into an editable plan and a 3D walkthrough that runs in the browser.

- **Plan editor** (`walkthrough/editor.html`): click any wall, window, door, pillar, wardrobe, terrace, balcony or double-height opening to move, resize, edit or delete it.
- **3D walkthrough** (`walkthrough/index.html`): guided tour, first-person walking with W A S D and the mouse, dollhouse view with the roof off, and three interior styles (Modern, Scandinavian, Warm luxury) that change the furniture, lights, wall art and fittings.
- **Single file** (`first-floor-walkthrough.html`): the whole walkthrough in one HTML file.
- **Kit** (`_kit/`): the playbook for new clients and a clean copy of the code to start each job from.

## Run it

Needs Python 3 and an internet connection (Three.js loads from a CDN).

```bash
cd walkthrough
python serve.py 8765
```

Then open http://localhost:8765/editor.html to edit the plan, or http://localhost:8765/index.html to walk through it. The server saves every editor change into `walkthrough/js/plan-data.js`. On Windows, double-click `walkthrough/Start plan editor.bat` instead.

To rebuild the single file after a change:

```bash
python walkthrough/build.py
```

## Layout data

All dimensions live in `walkthrough/js/plan-data.js`, in feet. The original drawings are not stored in this repository.

For a new client, follow `_kit/FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md`.
