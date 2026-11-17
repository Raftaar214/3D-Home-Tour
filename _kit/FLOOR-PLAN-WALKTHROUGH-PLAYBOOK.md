# Floor Plan to 3D Walkthrough: Playbook

For an architect's practice with many clients. This file tells Claude Code how to turn any client's floor plans into an editable plan, a 3D walkthrough, a single HTML file, a shareable link and, optionally, video clips. It holds the folder layout, the prompt to give, the standing preferences, the build specification, the checks, the mistakes to avoid, and every instruction from the first project, word for word.

First written 13 November 2026 from the project in `D:\Arch` (one client, first floor only). Revised the same day for many clients, any number of floors, and a tour path planned afresh for each plan. Revised 17 November 2026 after the same client's ground floor was added: the kit now handles two floors, a time-of-day slider, a Start Tour with room labels and code-made music, and a stair that runs past the first floor to the roof.

---

## 1. Folder layout

One practice folder, one kit that is reused, one folder per client.

```
Raj Architect\
  _kit\                                   reused for every client; never holds client work
    FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md    this file
    walkthrough-template\                 the editor, 3D code, save server and build script
  <Client name>\
    plans\                                the floor plans as received: one file per floor,
                                          or one file with several floors
    walkthrough\                          a copy of the template, filled in for this client
    <client>-walkthrough.html             the single file to send or publish
  <Next client>\
    ...
```

Rules for Claude:
- **Never edit `_kit` while working on a client.** Copy `walkthrough-template` into the client's folder and work there.
- **Improvements that would help every client go back into `_kit`** at the end of the job (a better editor, multi-floor support, a new furniture piece), with the client's own plan data taken out. Say what was added.
- **Nothing of one client's goes into another client's folder.** The template carries the first project's layout only as a worked example; replace it, never ship it.
- If `_kit` is missing, rebuild from section 7 and create it.

How to start a job: put the plans in `<Client name>\plans\`, give Claude Code access to `Raj Architect`, and say: **"Read `_kit\FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md` and follow it for the client `<Client name>`."**

---

## 2. What you get for each client

1. **A reading of every floor**: each room with its size, every door, window, stair and pillar, the wall height used, and a list of anything unclear.
2. **A plan editor**: click any wall, window, door, pillar, wardrobe, terrace, balcony or double-height opening to move, resize, edit or delete it. Changes are saved into the client's plan file.
3. **A 3D walkthrough**: a guided tour planned for this home, first-person walking with W A S D and the mouse, room captions, a small map, a dollhouse view with the roof off, and a one-click switch between three interior styles.
4. **One HTML file** that contains all of it.
5. **A shareable link**.
6. **Optional video clips** made with Higgsfield from stills of the walkthrough.

---

## 3. Floors: basement, ground, first, or several

The first project had one floor. Others will not.

- **Read every floor supplied** and name each by its level: basement, ground, first, second, terrace. Record floor-to-floor heights; ask if the drawings don't give them.
- **Line the floors up.** Use stairs, lift shafts, columns and outer walls to place each floor exactly above the one below. Report any that don't line up.
- **One home, not separate models.** All floors sit in one 3D model at their real levels, joined by the stairs as drawn, so a viewer can walk up and down.
- **Double-height spaces** are a hole in the upper floor over a real room below. With both floors supplied, the room below is the real one, never a placeholder.
- **Editor**: one tab per floor, with the floor below shown faintly underneath for alignment.
- **Dollhouse view**: a button per floor that lifts off everything above it.
- **Captions and map** show the floor name along with the room.
- **If only some floors are supplied**, say which are missing, build what is there, and mark anything invented (for example a plain room under a void) as a placeholder.

State of the kit (17 Nov 2026): `walkthrough-template` handles **a ground floor and a first floor**.

- Each floor has its own plan file: `js/plan-data.js` (first floor, `window.PLAN_DATA`) and `js/plan-data-ground.js` (ground floor, `window.PLAN_DATA_GROUND`). Same format; ground-floor heights are measured from the ground-floor finish, and `"PORCH"` means the car-porch level 1'-6" below it. A home without a ground-floor drawing simply has no `plan-data-ground.js`, and a plain placeholder room is shown under the void.
- The editor has a tab per floor (`editor.html` and `editor.html?floor=ground`), each saving to its own file through `serve.py`, with the other floor's walls shown in pale blue on request and the client's drawing for that floor (`debug/plan.png`, `debug/plan-ground.png`) as an underlay.
- Ground-floor rooms are furnished in `js/furniture-ground.js` with the same kit as the first floor, so all three styles carry through.
- The dollhouse has Ground floor / First floor buttons; the ground-floor view lifts the whole first floor away.
- Pillars that run through both floors (porch columns, for example) must sit at the same X/Y in both plan files; if one is moved in the editor, move the other to match.
- A basement or a second floor is still to be added the same way: one more plan file, one more editor tab, one more dollhouse button.

---

## 4. The tour path is planned for each home

Never reuse a path from another project. The route in the template belongs to the first project only and must be replaced.

- **Start at the main door** whenever the plans show one. If no entrance is on the supplied floors, start where a visitor would arrive (top or foot of the main stair) and say so.
- **Order the rooms the way a buyer would be shown the home**: entrance and living spaces first, then dining and kitchen, then outdoor spaces off them, then private rooms (bedrooms, dressing, bathrooms), finishing on the best view. For several floors, finish one floor before taking the stair to the next.
- **Work the route out from the plan**: which rooms connect through which doors. Every room is visited or at least looked into; no room is skipped silently.
- **Choose each stop for the view**: stand where the room reads best, face its main feature (window, bed wall, counter), and avoid standing behind an open door, a railing or tall furniture.
- **Show the route for approval** as a numbered list of stops before building it, then confirm it with the collision check in section 8.
- **Replan after layout changes.** When walls or doors move in the editor, the route is rechecked and redrawn where needed.

---

## 5. The prompt to give

Paste this as the first message for a new client.

> You're an architectural visualizer who makes 3D home tours for my architecture practice. Read `_kit\FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md`, then the floor plans in `<Client name>\plans\`.
>
> First read every floor carefully: list every room with its size, every door, window, stair and pillar, and the wall heights you'll use. Point out anything unclear, then ask me only what the playbook has not already settled.
>
> Then build it in `<Client name>\walkthrough\` from the kit:
> - A floor plan editor where every wall, window, door, pillar, wardrobe, terrace, balcony and double-height area is clickable to edit, delete and resize, on every floor, and whose saved plan is what the 3D view uses.
> - One HTML file with Three.js that matches the plans exactly: walls, doors, windows and room sizes to scale, all floors joined by their stairs. Real-looking floors, walls and ceilings, furniture that fits each room, and soft daylight through the windows.
> - First-person walking with W A S D and the mouse, a guided tour planned for this home starting at the main door, and a dollhouse view with the roof off on one button.
> - Furnish every room the way a high-end interior designer would for a listing: rugs, art, plants, lamps, a set dining table, made beds, kitchen details. Wood grain, stone counters, soft fabric.
> - A style switch for Modern, Scandinavian and Warm luxury, one click each.
> - It must run smoothly on a laptop with Intel integrated graphics.
>
> When I change the plan in the editor, refit the furniture, wall paintings, wardrobes and tour to the new walls. Finish with a shareable link.

---

## 6. Which model and tools

### Track A: Claude Fable 5.2 with the Higgsfield connector
Claude Code does all of the work itself.
1. Give the prompt in section 5.
2. Claude builds the editor, walkthrough, single file and link, following sections 3, 4, 7 and 8.
3. **Video with Higgsfield**, after the walkthrough is approved:
   - Claude captures a still at each tour stop and uploads the stills to Higgsfield.
   - Claude generates a short clip per room from each still, showing the cost first and waiting for a yes, because clips use Higgsfield credits.
   - Check each clip against the plan. Higgsfield generates the footage, so it can change furniture, proportions or openings. The walkthrough stays the accurate record.
4. If the Higgsfield tools are missing at the start, say "check the Higgsfield connector"; it can take one turn to finish connecting.

Not yet done on any project: the first session connected Higgsfield but never generated a clip.

### Track B: Claude Opus in Claude Code, without Higgsfield
"Opus ultracode" in the original request is read as Claude Opus running in Claude Code. Give these one at a time and check each result before the next.
1. `Read _kit\FLOOR-PLAN-WALKTHROUGH-PLAYBOOK.md and the plans in <Client name>\plans\. List every room on every floor with its size, every door, window, stair and pillar, and the wall heights. Point out anything unclear. Don't write code yet.`
2. `Copy _kit\walkthrough-template to <Client name>\walkthrough. Put the plans into its plan data, one entry per floor. Show me a top view of each floor laid over its drawing so I can check it.`
3. `Start the plan editor and save server. Confirm that a change in the editor is written to the plan file.`
4. `Build the 3D shell from the plan: walls with openings, floors, ceilings, stairs between floors, railings. Check it against the drawings again.`
5. `Add materials, daylight, the three styles and the style switch.`
6. `Furnish every room for a listing, sized to the rooms. Add wardrobes from the plan.`
7. `Propose the tour route for this home as a numbered list, starting at the main door. After I approve it, build the tour, W A S D and mouse walking, captions, the map and the dollhouse buttons. Run the tour check until it reports no collisions.`
8. `Make it smooth on Intel integrated graphics using the three measures in the playbook.`
9. `Run build.py to make the single HTML file, then publish a shareable link.`
10. Optional: `/code-review ultra` for a deep review of the code. You start this yourself; it is billed.

No video step on this track. Record the guided tour with a screen recorder if a video is needed.

---

### Blender, for better furniture models (set up 17 Nov 2026)

There is no Blender connector in the Claude connector directory, so Claude Code drives Blender directly from the command line. Blender 5.3.0 (the official portable ZIP from download.blender.org, checksum verified) is unpacked at `D:\Apps\blender-5.3.0-windows-x64`. On another PC, download the same ZIP from blender.org (ask the architect first) and unpack it outside the client folders.

- `walkthrough/blender/make_furniture.py` builds the soft furnishings and fittings and writes `js/models-data.js`:

  ```
  "D:\Apps\blender-5.3.0-windows-x64\blender.exe" --background --factory-startup --python walkthrough\blender\make_furniture.py -- walkthrough\js\models-data.js
  ```

  It takes about 15 seconds.
- **What Blender makes:**
  - seat and back cushions with piping
  - throw pillows and bed pillows with pinched corners
  - a duvet and a runner, draped over the mattress by cloth simulation (one set for a double bed, one for a single)
  - two potted plants with real leaves
  - turned lamp shades, a table-lamp base and a pendant dome
- **Styles:** each model is split by role (fabric, piping, pot, leaf, shade...), and the walkthrough paints each role with the current style's material, so the same models serve all three styles.
- **Loading:** `js/models.js` loads the models. `furniture.js` uses them through `soft()`, `bedding()`, `plant()` and the lamp functions, and falls back to plain shapes if `models-data.js` is missing.
- **Fabric:** every fabric material also gets a fine woven texture.
- **Keep it light:** about 1,000 triangles per cushion and about 5,000 per bedding set. After any change to the models, measure a frame in the busiest views (street, hall, bedroom). On the practice PC the target is under about 10 ms at 1.25× resolution.

## 7. Preferences and decisions

**Apply to every client without asking:**

| Matter | Preference |
|---|---|
| Output | Browser walkthrough, not a rendered video |
| Process | Build straight after the reading is approved; no written spec first |
| Styles | All three: Modern, Scandinavian, Warm luxury. Each style changes the furniture shapes, light fittings, wall hangings, accessories and hardware, not only colours |
| Layout source | Always the plan editor's saved file |
| After the plan is edited | Refit furniture, wall paintings, wardrobes and tour |
| Sharing | Publish a shareable link; republish to the same link after changes |
| Extras | Don't add tall units, fridges or similar in front of counters without asking |

**Ask for every client; these were answers for the first client only:**

| Matter | First client's answer |
|---|---|
| Ceiling height | 11 feet |
| Where the tour starts when no main door is drawn | At the stairs |
| A stair that was removed and its space reassigned | That plan only |
| Fridge in the kitchen | None |

**Assumed when a drawing is silent**, stated in the reading for correction: 7' door and window heads, 3' window sills (2'-6" in living rooms and bedrooms), 3'-6" railings, 5" slabs, 9" outer and 4½" inner walls.

---

## 8. Build specification and checks

**Coordinates.** Feet. X to the right of the sheet, Y down the sheet, the same origin on every floor. Note the compass direction of each axis; the north arrow decides the sun direction.

**Plan data** (`walkthrough/js/plan-data.js`), the only place dimensions live:
- `walls`: footprint, direction, optional height range, and openings (window, door, glazed door, cased opening, ventilator) with position, width, sill, head, hinge side, swing, open or closed.
- `pillars`, `areas` (terrace, balcony, double-height void) and `wardrobes` (footprint, door side, height, mirror).
- Read positions from the PDF's vector lines where possible, not by eye.

**Worked out automatically from the plan**: railings on floor edges beside voids and stairwells, railings on open edges of terraces and balconies, and what a person cannot walk through.

**Not automatic, so refit by hand after a layout change**: room floor finishes, room captions, furniture, wall art, lights and the tour path.

**Editor** (`editor.html`, `js/editor.js`, `serve.py`): click to select; drag to move; round handles to resize; exact sizes typed as 12'-6", 12.5 or 150"; add wall, pillar, wardrobe, window, door, opening; delete; undo; snap; ceiling height; original drawing as underlay. `serve.py` writes every change to disk and keeps the first version for Reset. A pill at the top shows "Saved to plan file" or a red warning.

**Walkthrough** (`index.html` and `js/`): `shell.js` builds the building; `materials.js` makes textures in code; `styles.js` holds the three styles; `furniture.js` furnishes rooms; `lighting.js` sets sky, sun and lamps; `tour.js` holds the tour, walking, mouse look, dollhouse view, captions and map.

**Doors shown open** must rest against a wall, never stand across a room or in front of a counter. Pick the hinge side accordingly and tell the architect if it differs from the plan.

**Single file** (`build.py`): one HTML file that reads the editor's plan on opening and keeps a built-in copy as fallback. `python build.py --share <file>` makes the self-contained copy that is published as the link.

**Smoothness on integrated graphics**: draw the sun's shadows once, not every frame; light only the four lamps nearest the viewer; lower the drawing resolution automatically when frames are slow.

**Checks before saying it is done:**
- Top view of each floor over its drawing (`index.html?debug=plan`): walls, openings and stairs line up.
- `APP.checkTour()` in the page console returns an empty list.
- The tour plays to the end and every room on every floor appears in the captions.
- Every tour stop looked at once; no view blocked by a door, railing or furniture.
- A change in the editor reaches the plan file and shows in 3D after reload.
- All three styles apply; dollhouse goes up and comes back; W A S D moves and walls stop you.
- The single file runs next to its `walkthrough` folder and on its own; the link shows the same version.
- Say plainly what was not checked.

---

## 9. Mistakes made the first time

- **Edits lost.** The editor first saved only inside the browser, and the app's built-in browser did not keep them. The save server now writes to disk. Always open the editor from `http://localhost:8765/editor.html`, or start it with `Start plan editor.bat`.
- **Looked for edits in the wrong place.** Ask what the save pill says before searching.
- **Slideshow-like motion.** Redrawing shadows every frame halved the frame rate on Intel graphics.
- **Stale pages.** The browser kept old scripts; the server now sends no-cache headers.
- **Cleaning up after tests.** Never reset the plan file to remove a test item; delete only the test item.
- **Opening the single file inside the Claude app.** It shows a frozen snapshot that cannot read the editor's file. Open it in a normal browser.
- **Mirrors** reflected the sky until each was given a capture of its own room.
- **Misread dimension.** A line read as the balcony edge was the plot boundary; check that room sizes add up to the overall dimensions.
- **A fixed tour.** The route was written for one layout and had to be redrawn when walls moved. Plan it from the plan each time (section 4).
- **Unrequested furniture.** A fridge and pantry placed opposite the counter, and an open door standing in the kitchen, both read as clutter and were removed.
- **Link not refreshed.** After every change, republish the share copy to the same link without being asked.
- **A second link by accident.** Publishing the share copy without the existing link's URL makes a new, separate link. Always publish to the same URL.
- **Editor edits arriving mid-job.** The client's plans were edited again while the ground floor was being built. Before every rebuild, compare the plan files with the last version you fitted (a plan diff), and refit furniture, labels and the tour to what changed.
- **Stairs that go further than one floor.** The front stair runs ground floor → first-floor landing beside the balcony → roof. Read the stair lines on every floor's drawing, not only the lowest.
- **Open doors meeting furniture.** A newly opened or widened door leaf ended up through a sofa or armchair. After every door edit, check the swing area of each open leaf.

---

## 10. Every instruction from the first project, in order

Copied as typed.

1. `You're an architectural visualizer who makes 3D home tours for builders. there is a 2D floor plan in folder . Read it carefully: list every room with its size, every door, window and stair, and the wall height you'll use. Point out anything unclear. Then plan a 3D walkthrough of this home: the style and materials for each room, the lighting, the furniture, and the path a buyer would walk from the front door. Don't write code yet.`
2. `Start at the stairs`
3. `Browser walkthrough`
4. `Yes, build it`
5. Reply to "10' ceiling": `11' ceiling`
6. Reply to the description of the service stair: `remove this stair and add the space that is towards south to the washroom and the west side space to kitchen to make it l shape`
7. `also create something for the floor plan in which all the walls and window door , pillar is clickable to edit, delete resize and we 'll use that for final html if there is any change`
8. `i have made changes in editor file make changes accordingly to the final view`
9. `also make terrace, balcony , dual height area resizable`
10. `walkthrough is not smooth, it looks like running through a series of pictures`
11. `use higgsfield connector for video editing`
12. `I edited in this app`
13. `i re did the changes in editor update the walkthrough add to add wardrobe in editor`
14. `Saved to plan file`
15. `Now build it as one HTML file with Three.js. Match the plan exactly: walls, doors, windows and room sizes to scale. Add real-looking floors, walls and ceilings, furniture that fits each room, and soft daylight coming through the windows. Let me walk through it in first person with WASD and the mouse. Add a top-down dollhouse view with the roof off that I can switch to with one button.`
16. `Furnish every room the way a high-end interior designer would for a listing, in [modern / Scandinavian / warm luxury] style. Add rugs, art, plants, lamps, a set dining table, made beds and kitchen details. Make the materials feel real: wood grain, stone counters, soft fabric. Then add a style switch so I can show the same home in 3 different styles with one click.`
17. `also read the layout walls and all from the editor`
18. `i have edited in the editor, make changes in the index html according to it walls and windows are added make changes in furniture or wall painting or wardrobe`
19. `create a shareable link also create a file in which everything is written suppose whenever i have a new floor plan and i need this type of video till this every prompt and instruction that i gave you to make changes, write everything in the file also mention that, if i'm using fable 5.2 and higssfield then claude code has to do this and if not then commands for opus ultracode next time i give access to a folder in which i save floor plan and the file that you will generate now`
20. `there is 1 almirah or i guess fridge is there in front of kitchen slab, remove that`
21. `No fridge`
22. `update in the artifact too`
23. `in the playbook file, make changes 1. i'm an architect, i'll have many clients, so i'll name the folder raj architect and then many customers/clients in it , so the files that you are asking which would be needing every time, keep it somewhere in the folder for reuse and every clients names' folder would be there with their floor plans 2. this time it is only first floor, next time there can be basement, ground or first or multi floors 3. walkthrough from main door to everywhere in house is not fixed, it will change according to plan... do not fix it`
24. `there are changes in site plan, added some and removed something 1. in kitchen, a wardrobe is added, and remove the cabinet which is already there in front of that wardrobe 2. this looks like 3d cartooned video 3. use higgsfield to make this kind of realistic video 3. also the three styles only changes the colour only, instead of this make it change the furniture style, wall hanging designs, accessories, lightings, hardware fittings 4. update and then also update the artifact`

25. `Add a time-of-day slider from morning to sunset to night. Move the sunlight through the windows as I drag, make it warm and golden at sunset, and at night turn on the lamps and ceiling lights with a soft glow. Add soft shadows and a light reflection on the floors and glass. Keep every change smooth and keep it running well on a normal laptop.`
26. `Add a Start Tour button. The camera walks slowly from the front door through every room in order, pausing in each one with a small label: the room name, its size in square feet and one selling point. Add soft background music made with code, no sound files, and a mute button. At the end, rise up to the dollhouse view of the whole home.`
27. `Im adding ground floor plan also check this also and make same as u do for first floor`
28. `the front stair goes from ground to balcony and then roof`
29. `also the site plan is updated with somewalls and wardrobe shifts`
30. `use blender connector to enhance the furniture design and clarity` (no connector exists; Blender was installed and driven from Claude Code, see section 6)
31. Reply to "Install Blender so I can model better furniture with it?": `Yes, install Blender`
32. `g-stair-front, g-stair-north,g-stair-south these walls' height is till roof`
33. `make it to walk on front road too, walkthrough on road`

Notes on 32–33: plan walls can now run through both floors (`"z": [0, "ROOF"]` in the ground floor file), and a wall can have openings one above the other (a door on each floor). The stair's north wall got an opening onto the front balcony at first-floor level, and its front wall a second window there. The road in front is walkable, the gate stands open, and the tour now starts on the road looking at the house.

How these were built, for reuse:

- **Time of day** (`js/lighting.js`): one value from 0 (7 am) to 1 (9:30 pm) sets the sun's direction and colour, the sky, the light from above, lamp brightness, glowing fittings and ceiling-light halos, stars, and lit windows across the road. The slider eases toward the chosen time; the reflected sky and the mirrors are redrawn only a few times while it moves and once when it settles, so dragging stays smooth. Morning, Sunset and Night buttons jump straight there. `?tod=0.72` in the address opens at sunset.
- **Start Tour** (`js/tour.js`): a large Start Tour button and the Start tour control on the bar. Each pause shows a label with the floor, room name, area in sq ft and one selling point. These are written per home in the tour's key points (`label: [name, size, selling point]`); take sizes from the drawing, and keep each selling point to one short factual line. At the end the camera rises through the roof to the dollhouse view and turns slowly.
- **Music** (`js/music.js`): a slow four-chord pad with soft bell notes, made in the browser with Web Audio. It starts with the tour (browsers only allow sound after a click) and has a Music on/off button.

---

## 11. What is in `_kit\walkthrough-template`

| File | Purpose |
|---|---|
| `index.html` | The walkthrough page |
| `editor.html`, `js/editor.js` | The plan editor |
| `serve.py`, `Start plan editor.bat` | Local server that saves editor changes to disk |
| `js/plan-data.js`, `js/plan-data-ground.js` | Plan data per floor; hold the first project's layout as an example of the format |
| `js/plan.js` | Turns the plan into floors, railings and walkable areas |
| `js/shell.js`, `js/materials.js`, `js/styles.js` | Building, textures and the three styles |
| `js/furniture.js`, `js/furniture-ground.js` | Furniture for the first and ground floors |
| `js/lighting.js` | Sky, sun and time of day, lamps, ceiling lights |
| `js/music.js` | Background music made in code, with mute |
| `js/models.js`, `js/models-data.js`, `blender/make_furniture.py` | Furniture models made in Blender, and their loader |
| `js/tour.js`, `js/main.js` | Tour, labels, walking, dollhouse and controls; start-up |
| `build.py` | Makes the single HTML file, or a share copy with `--share` |
| `debug/` | Put the client's drawings here as `plan.png` (first floor) and `plan-ground.png` (ground floor) for the editor underlay |

Replace for each client: the plan files, the fixed lists in `plan.js` (slabs, room floors, captions, stair positions, the ground floor's room list and steps), the furniture placements in both furniture files, the lamp and ceiling-light positions in `lighting.js`, and the tour route with its labels. The editor, save server, materials, styles, controls and build script carry over unchanged.
