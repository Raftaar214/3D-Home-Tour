# 3D Home Tour

Turns 2D floor plans into an editable plan and a 3D walkthrough of the whole home that runs in the browser.

- **Plan editor** (`walkthrough/editor.html`): one tab per floor (ground and first). Click any wall, window, door, pillar, wardrobe, terrace, balcony, porch or double-height opening to move, resize, edit or delete it.
- **3D walkthrough** (`walkthrough/index.html`):
  - both floors, joined by the main stair and by a front stair that runs on to the roof
  - a Start Tour from the road into every room, with a label at each stop (name, area, one selling point), soft background music made in code and a mute button
  - first-person walking with W A S D and the mouse
  - a dollhouse view of either floor
  - a time-of-day slider from morning to night
  - three interior styles (Modern, Scandinavian, Warm luxury) that change the furniture, lights, wall art and fittings
- **Furniture models** (`walkthrough/blender/make_furniture.py`): cushions, pillows, cloth-draped bedding, plants and lamp shades, modelled in Blender and saved to `walkthrough/js/models-data.js`.
- **Single file** (`home-walkthrough.html`): the whole walkthrough in one HTML file.
- **Kit** (`_kit/`): the playbook for new clients and a clean copy of the code to start each job from.

## Run it

Needs Python 3 and an internet connection (Three.js loads from a CDN).

```bash
cd walkthrough
python serve.py 8765
```

Then open http://localhost:8765/editor.html to edit the plan (add `?floor=ground` for the ground floor), or http://localhost:8765/index.html to walk through it. The server saves every editor change into the floor's plan file. On Windows, double-click `walkthrough/Start plan editor.bat` instead.

To rebuild the single file after a change:

```bash
python walkthrough/build.py
```

To remake the furniture models (Blender 5.x, no window needed):

```bash
blender --background --factory-startup --python walkthrough/blender/make_furniture.py -- walkthrough/js/models-data.js
```

## Layout data

All dimensions live in `walkthrough/js/plan-data.js` (first floor) and `walkthrough/js/plan-data-ground.js` (ground floor), in feet. The original drawings are not stored in this repository.

For a new client, follow `_kit/FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md`.
