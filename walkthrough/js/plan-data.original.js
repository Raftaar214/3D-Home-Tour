/* The editable floor plan: walls, their windows and doors, pillars, and the open
   areas (terrace, balconies, double-height opening).
   The plan editor (editor.html) reads and writes exactly this structure, and
   "Download plan file" in the editor produces a replacement for this file.

   Units are feet. X runs to the right of the sheet (south), Y runs down the sheet
   (west, toward the road). X = 0 is the front-left corner of the plot, Y = 0 is
   the outer face of the rear wall.
   r  = [x0, y0, x1, y1] footprint.   ax = direction the wall runs ("x" or "y").
   z  = [bottom, top]; left out means floor to ceiling. "GF" = ground floor level,
        "H" = ceiling, "TOP" = top of the roof slab, "-SLAB" = underside of the floor slab.
   ops = openings; a/b are positions along the wall. */
window.PLAN_DATA = {
  version: 2,
  H: 11,
  SLAB: 0.4167,
  DOOR: 7,
  walls: [
    { id: "rear-thin", ax: "x", r: [-1, 0, 12.9, 0.375], ops: [{ type: "win", a: 0.89, b: 3.89, sill: 3, head: 7 }, { type: "gdoor", a: 9.39, b: 12.89, sill: 0, head: 7, hinge: "b", swing: 1, isOpen: false }] },
    { id: "rear-thick", ax: "x", r: [12.9, 0, 29.625, 0.75], ops: [{ type: "win", a: 22.37, b: 26.87, sill: 3.5, head: 7 }] },
    { id: "hall-north", ax: "y", r: [-1, 0.375, -0.25, 14.25], ops: [{ type: "win", a: 3.64, b: 7.14, sill: 3, head: 7 }, { type: "gdoor", a: 7.14, b: 10.64, sill: 0, head: 7, hinge: "b", swing: 1, isOpen: false }] },
    { id: "hall-west", ax: "x", r: [-1, 14.25, 29.625, 14.625], ops: [{ type: "open", a: 5.13, b: 8.63, sill: 0, head: 7 }] },
    { id: "kitchen-hall", ax: "y", r: [18.875, 0.75, 19.25, 10.625], ops: [{ type: "open", a: 4.375, b: 7.375, sill: 0, head: 7 }] },
    { id: "kitchen-washroom-a", ax: "x", r: [27.125, 7.375, 29.625, 7.75] },
    { id: "kitchen-washroom-b", ax: "y", r: [26.75, 7.375, 27.125, 10.625] },
    { id: "kitchen-washroom-c", ax: "x", r: [19.25, 10.25, 26.75, 10.625] },
    { id: "washroom-door", ax: "y", r: [19.25, 10.625, 19.625, 14.25], ops: [{ type: "door", a: 11.4, b: 13.65, sill: 0, head: 7, hinge: "b", swing: 1, isOpen: true }] },
    { id: "south", ax: "y", r: [29.625, 0, 30.375, 47], z: ["GF", "H"] },
    { id: "south-balcony", ax: "y", r: [29.625, 47, 30.375, 50.54], z: ["GF", 3.5] },
    { id: "lounge-north", ax: "y", r: [-0.375, 14.625, 0.375, 28.625], ops: [{ type: "win", a: 18.13, b: 24.4, sill: 2.5, head: 7 }] },
    { id: "lounge-terrace", ax: "x", r: [0.375, 27.875, 9.25, 28.625], ops: [{ type: "win", a: 0.82, b: 4.3, sill: 3, head: 7 }, { type: "gdoor", a: 4.3, b: 7.8, sill: 0, head: 7, hinge: "b", swing: 1, isOpen: true }] },
    { id: "bedroom-east", ax: "x", r: [9.25, 27.875, 29.625, 28.25], ops: [{ type: "door", a: 9.3, b: 12.75, sill: 0, head: 7, hinge: "a", swing: 1, isOpen: true }] },
    { id: "bedroom-north", ax: "y", r: [8.875, 28.625, 9.25, 47] },
    { id: "bedroom-south", ax: "y", r: [22.25, 28.25, 22.625, 46.25], ops: [{ type: "open", a: 41.5, b: 44.25, sill: 0, head: 7 }] },
    { id: "front", ax: "x", r: [9.25, 46.25, 29.625, 47], ops: [{ type: "win", a: 9.7, b: 14.25, sill: 2.5, head: 7 }, { type: "gdoor", a: 17.03, b: 19.76, sill: 0, head: 7, hinge: "a", swing: -1, isOpen: true }, { type: "win", a: 19.76, b: 22.25, sill: 3, head: 7 }] },
    { id: "toilet-dress", ax: "x", r: [22.625, 37.875, 29.25, 38.25], ops: [{ type: "door", a: 24, b: 26.75, sill: 0, head: 7, hinge: "a", swing: -1, isOpen: true }] },
    { id: "suite-south-liner", ax: "y", r: [29.25, 28.25, 29.625, 46.25] },
    { id: "duct-north", ax: "y", r: [26.875, 28.25, 27.25, 31.125], ops: [{ type: "vent", a: 29.1, b: 30.6, sill: 6, head: 7.5 }] },
    { id: "duct-west", ax: "x", r: [27.25, 30.75, 29.25, 31.125] },
    { id: "terrace-parapet", ax: "y", r: [0, 28.625, 0.375, 38.1], z: [0, 3.5], mat: "stone" },
    { id: "void-east-low", ax: "x", r: [9, 14.25, 29.625, 14.625], z: ["GF", 0], hidden: true },
    { id: "void-west-low", ax: "x", r: [9, 27.875, 29.625, 28.25], z: ["GF", 0], hidden: true },
    { id: "void-north-low", ax: "y", r: [9, 14.625, 9.375, 27.875], z: ["GF", "-SLAB"], hidden: true }
  ],
  pillars: [
    { id: "p-rear-north", r: [-1, 0, -0.25, 1.5] },
    { id: "p-rear-south", r: [28.5, 0, 30, 0.75] },
    { id: "p-mid-1", r: [12.9, 13.875, 14.4, 14.625] },
    { id: "p-mid-south", r: [28.5, 13.875, 30, 14.625] },
    { id: "p-lounge", r: [7.75, 27.875, 9.25, 28.625] },
    { id: "p-bedroom", r: [22.25, 27.875, 23.75, 28.625] },
    { id: "p-front-1", r: [15.5, 46.25, 17, 47] },
    { id: "p-front-south", r: [29.25, 45.5, 30, 47] },
    { id: "p-terrace-1", r: [0, 38.1, 0.45, 39], z: ["GF", "TOP"], mat: "stone" },
    { id: "p-terrace-2", r: [0, 45.5, 0.75, 47], z: ["GF", "TOP"], mat: "stone" }
  ],
  /* Open areas: terraces and balconies (floor with a railing on the open sides)
     and the double-height opening in the floor ("void"). */
  areas: [
    { id: "void", name: "Double Height", kind: "void", r: [9.375, 14.625, 26.125, 24.375] },
    { id: "terrace", name: "Terrace", kind: "terrace", r: [0, 28.625, 8.875, 39] },
    { id: "terrace-strip", name: "Terrace", kind: "terrace", r: [5.39, 39, 8.875, 47] },
    { id: "front-balcony", name: "Front Balcony", kind: "balcony", r: [5.39, 47, 30.375, 50.54] },
    { id: "rear-balcony", name: "Rear Balcony", kind: "balcony", r: [-3.5, -2, 30.375, 0] },
    { id: "north-balcony", name: "Rear Balcony", kind: "balcony", r: [-3.5, 0, -1, 14.625] }
  ]
};
