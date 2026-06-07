const C = {
  CELL: 32,
  COLS: 28,
  ROWS: 20,

  // Terrain types
  EMPTY: 0,
  IRON_ORE: 1,
  COPPER_ORE: 2,
  COAL: 3,
  CORE: 4,

  // Equipment IDs
  EQ: {
    MINER:    'miner',
    CONVEYOR: 'conveyor',
    FURNACE:  'furnace',
    ASSEMBLER:'assembler',
    TURRET:   'turret',
    WALL:     'wall',
    GENERATOR:'generator',
    LASER:    'laser',
  },

  // Resource IDs
  RES: {
    IRON_ORE:     'iron_ore',
    COPPER_ORE:   'copper_ore',
    COAL:         'coal',
    IRON_PLATE:   'iron_plate',
    COPPER_PLATE: 'copper_plate',
    CIRCUIT:      'circuit',
    GEAR:         'gear',
  },

  // Directions: 0=right,1=down,2=left,3=up
  DIR: { RIGHT:0, DOWN:1, LEFT:2, UP:3 },
  DIR_VEC: [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}],
};
