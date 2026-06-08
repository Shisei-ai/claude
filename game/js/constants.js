const C = {
  CELL: 32,
  COLS: 100,
  ROWS: 100,
  CORE_X: 48,   // top-left of 3×3 core block
  CORE_Y: 48,

  // Terrain types
  EMPTY:      0,
  IRON_ORE:   1,
  COPPER_ORE: 2,
  COAL:       3,
  CORE:       4,
  OIL_WELL:   5,
  SULFUR_DEP: 6,

  // Equipment IDs
  EQ: {
    MINER:        'miner',
    CONVEYOR:     'conveyor',
    FURNACE:      'furnace',
    ASSEMBLER:    'assembler',
    TURRET:       'turret',
    WALL:         'wall',
    GENERATOR:    'generator',
    LASER:        'laser',
    OIL_PUMP:     'oil_pump',
    WATER_PUMP:   'water_pump',
    COKE_OVEN:    'coke_oven',
    DISTILLATION: 'distillation',
    CHEM_PLANT:   'chem_plant',
    ELECTROLYZER: 'electrolyzer',
    ADV_ASSEMBLER:'adv_assembler',
  },

  // Resource IDs
  RES: {
    IRON_ORE:      'iron_ore',
    COPPER_ORE:    'copper_ore',
    COAL:          'coal',
    SULFUR:        'sulfur',
    IRON_PLATE:    'iron_plate',
    COPPER_PLATE:  'copper_plate',
    CIRCUIT:       'circuit',
    COKE:          'coke',
    PLASTIC:       'plastic',
    REFINED_COPPER:'refined_copper',
    EXPLOSIVES:    'explosives',
    ADV_CIRCUIT:   'adv_circuit',
    CRUDE_OIL:     'crude_oil',
    PETRO_GAS:     'petro_gas',
    LIGHT_OIL:     'light_oil',
    HEAVY_OIL:     'heavy_oil',
    SULFURIC_ACID: 'sulfuric_acid',
    LUBRICANT:     'lubricant',
    WATER:         'water',
    HYDROGEN:      'hydrogen',
    OXYGEN:        'oxygen',
  },

  // Directions: 0=right,1=down,2=left,3=up
  DIR: { RIGHT:0, DOWN:1, LEFT:2, UP:3 },
  DIR_VEC: [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}],
};
