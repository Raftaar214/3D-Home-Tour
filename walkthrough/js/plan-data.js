/* The editable floor plan: walls, their windows and doors, pillars, and the open
   areas (terrace, balconies, double-height opening). Written by the plan editor.

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
    {"id": "rear-thin", "ax": "x", "r": [-1, 0, 12.9, 0.375], "ops": [{"type": "win", "a": 2.556, "b": 5.556, "sill": 3, "head": 7}, {"type": "gdoor", "a": 9.39, "b": 12.89, "sill": 0, "head": 7, "hinge": "b", "swing": 1, "isOpen": false}]},
    {"id": "rear-thick", "ax": "x", "r": [12.9, 0, 29.625, 0.75], "ops": [{"type": "win", "a": 22.37, "b": 26.87, "sill": 3.5, "head": 7}]},
    {"id": "hall-north", "ax": "y", "r": [-1, 0.375, -0.25, 14.5833], "ops": [{"type": "win", "a": 3.64, "b": 7.14, "sill": 3, "head": 7}, {"type": "gdoor", "a": 7.14, "b": 10.64, "sill": 0, "head": 7, "hinge": "b", "swing": 1, "isOpen": false}]},
    {"id": "hall-west", "ax": "x", "r": [13.7133, 14.25, 29.625, 14.625]},
    {"id": "kitchen-hall", "ax": "y", "r": [18.875, 0.75, 19.25, 8.0417], "ops": [{"type": "door", "a": 4.375, "b": 7.375, "sill": 0, "head": 7, "hinge": "b", "swing": 1, "isOpen": true}]},
    {"id": "kitchen-washroom-b", "ax": "y", "r": [26.75, 7.7915, 27.125, 14.5415]},
    {"id": "kitchen-washroom-c", "ax": "x", "r": [19.1666, 7.75, 27.0833, 8.125]},
    {"id": "washroom-door", "ax": "y", "r": [18.8335, 8.0421, 19.2085, 14.5004], "ops": [{"type": "door", "a": 8.1505, "b": 10.4005, "sill": 0, "head": 7, "hinge": "a", "swing": 1, "isOpen": true}]},
    {"id": "south", "ax": "y", "r": [29.625, 0, 30.375, 47], "z": ["GF", "H"]},
    {"id": "lounge-north", "ax": "y", "r": [-0.375, 14.625, 0.375, 28.625], "ops": [{"type": "win", "a": 18.13, "b": 24.4, "sill": 2.5, "head": 7}]},
    {"id": "lounge-terrace", "ax": "x", "r": [0.375, 27.875, 9.25, 28.625], "ops": [{"type": "win", "a": 0.75, "b": 2, "sill": 0.4166666666666667, "head": 8}, {"type": "door", "a": 2, "b": 6.5, "sill": 0, "head": 8, "hinge": "a", "swing": -1, "isOpen": true}, {"type": "win", "a": 6.5, "b": 7.75, "sill": 0.4166666666666667, "head": 8}]},
    {"id": "bedroom-east", "ax": "x", "r": [9.25, 27.875, 29.625, 28.25], "ops": [{"type": "door", "a": 9.3, "b": 12.75, "sill": 0, "head": 7, "hinge": "a", "swing": 1, "isOpen": true}, {"type": "win", "a": 15.4173, "b": 19.4173, "sill": 3, "head": 7}]},
    {"id": "bedroom-north", "ax": "y", "r": [8.875, 28.625, 9.25, 47]},
    {"id": "bedroom-south", "ax": "y", "r": [22.25, 28.25, 22.625, 46.25], "ops": [{"type": "open", "a": 41.5, "b": 44.25, "sill": 0, "head": 7, "hinge": "a", "swing": 1, "isOpen": true}]},
    {"id": "front", "ax": "x", "r": [9.25, 46.25, 29.625, 47], "ops": [{"type": "win", "a": 9.7, "b": 14.25, "sill": 2.5, "head": 7}, {"type": "gdoor", "a": 17.03, "b": 19.76, "sill": 0, "head": 7, "hinge": "a", "swing": -1, "isOpen": true}]},
    {"id": "toilet-dress", "ax": "x", "r": [22.625, 37.875, 30, 38.25], "ops": [{"type": "door", "a": 24, "b": 26.75, "sill": 0, "head": 7, "hinge": "a", "swing": -1, "isOpen": true}]},
    {"id": "suite-south-liner", "ax": "y", "r": [29.25, 28.25, 29.625, 31.25]},
    {"id": "terrace-parapet", "ax": "y", "r": [0, 28.625, 0.375, 45.7667], "z": [0, 3.5], "mat": "stone"},
    {"id": "void-east-low", "ax": "x", "r": [9, 14.25, 29.625, 14.625], "z": ["GF", 0], "hidden": true},
    {"id": "void-west-low", "ax": "x", "r": [9, 27.875, 29.625, 28.25], "z": ["GF", 0], "hidden": true},
    {"id": "void-north-low", "ax": "y", "r": [9, 14.625, 9.375, 27.875], "z": ["GF", "-SLAB"], "hidden": true},
    {"id": "wall-23", "ax": "x", "r": [0.3335, 46.5836, 5.5834, 46.9586], "z": [0, 3.5]}
  ],
  pillars: [
    {"id": "p-rear-north", "r": [-1, 0, -0.25, 1.5]},
    {"id": "p-rear-south", "r": [28.5, 0, 30, 0.75]},
    {"id": "p-mid-1", "r": [12.9, 13.875, 14.4, 14.625]},
    {"id": "p-mid-south", "r": [28.5, 13.875, 30, 14.625]},
    {"id": "p-lounge", "r": [7.75, 27.875, 9.25, 28.625]},
    {"id": "p-bedroom", "r": [22.25, 27.875, 23.75, 28.625]},
    {"id": "p-front-1", "r": [15.5, 46.25, 17, 47]},
    {"id": "p-front-south", "r": [29.25, 45.5, 30, 47]},
    {"id": "p-terrace-1", "r": [0, 38.75, 0.75, 40.25], "z": ["GF", "TOP"], "mat": "stone"},
    {"id": "p-terrace-2", "r": [0, 45.5, 0.75, 47], "z": ["GF", "TOP"], "mat": "stone"}
  ],
  areas: [
    {"id": "void", "name": "Double Height", "kind": "void", "r": [13.2083, 14.625, 26.125, 24.375]},
    {"id": "terrace", "name": "Terrace", "kind": "terrace", "r": [0, 28.625, 8.875, 47]},
    {"id": "front-balcony", "name": "Front Balcony", "kind": "balcony", "r": [5.39, 47, 19.875, 50.54]},
    {"id": "rear-balcony", "name": "Rear Balcony", "kind": "balcony", "r": [-3.5, -2, 30.375, 0]},
    {"id": "north-balcony", "name": "Rear Balcony", "kind": "balcony", "r": [-3.5, 0, -1, 14.625]}
  ],
  wardrobes: [
    {"id": "dress-wardrobe-1", "r": [22.625, 45.5833, 24.8333, 46.25], "face": "rear", "h": 7},
    {"id": "dress-wardrobe-2", "r": [27.25, 38.25, 29.6667, 46.25], "face": "north"},
    {"id": "wardrobe-3", "r": [12.9999, 11.8334, 18.8332, 14.25], "face": "rear"},
    {"id": "wardrobe-4", "r": [22.5834, 38.2501, 23.8334, 40.2501], "face": "front", "h": 7},
    {"id": "wardrobe-5", "r": [25.1668, 45.9167, 26.9168, 46.25], "face": "rear", "mirror": true, "h": 7},
    {"id": "wardrobe-6", "r": [27.0834, 12.25, 29.6667, 14.25], "face": "rear"},
    {"id": "wardrobe-7", "r": [22.5834, 44.4166, 23.4167, 46.2499], "face": "south", "h": 7}
  ]
};
