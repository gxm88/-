// 关卡定义：不同地图路径、难度、波次
export const LEVELS = [
  {
    id: 1,
    name: '新手村',
    subtitle: 'VILLAGE',
    description: '简单的 L 形路径，适合熟悉基本操作',
    difficulty: '简单',
    cols: 8,
    rows: 8,
    pathCells: [
      [0, 0], [4, 0], [4, 4], [7, 4], [7, 7]
    ],
    waves: 8,
    startGold: 250,
    startLives: 25,
    theme: { bg: 0x0a0a1a, path: 0x334466, grid: 0x222244 },
    // 每波敌人配置: { type, count, interval }
    waveDefs: [
      [{ type: 'smallCube', count: 4, interval: 0.9 }],
      [{ type: 'smallCube', count: 6, interval: 0.8 }],
      [{ type: 'smallCube', count: 4, interval: 0.7 }, { type: 'pyramid', count: 2, interval: 1.0 }],
      [{ type: 'pyramid', count: 5, interval: 0.8 }],
      [{ type: 'pyramid', count: 4, interval: 0.7 }, { type: 'cylinder', count: 2, interval: 1.0 }],
      [{ type: 'cylinder', count: 5, interval: 0.8 }],
      [{ type: 'cylinder', count: 4, interval: 0.7 }, { type: 'sphere', count: 2, interval: 1.2 }],
      [{ type: 'sphere', count: 3, interval: 1.0 }, { type: 'boss', count: 1, interval: 0 }]
    ]
  },
  {
    id: 2,
    name: '蜿蜒小径',
    subtitle: 'WINDING',
    description: 'S 形蛇形路径，需要更多策略布局',
    difficulty: '普通',
    cols: 10,
    rows: 8,
    pathCells: [
      [0, 0], [0, 3], [3, 3], [3, 0], [5, 0],
      [5, 3], [8, 3], [8, 0], [9, 0], [9, 7]
    ],
    waves: 10,
    startGold: 200,
    startLives: 20,
    theme: { bg: 0x0a0a1a, path: 0x334466, grid: 0x222244 },
    waveDefs: [
      [{ type: 'smallCube', count: 5, interval: 0.8 }],
      [{ type: 'smallCube', count: 8, interval: 0.7 }],
      [{ type: 'smallCube', count: 5, interval: 0.6 }, { type: 'pyramid', count: 3, interval: 1.0 }],
      [{ type: 'pyramid', count: 8, interval: 0.7 }],
      [{ type: 'pyramid', count: 5, interval: 0.6 }, { type: 'cylinder', count: 3, interval: 1.0 }],
      [{ type: 'cylinder', count: 8, interval: 0.7 }, { type: 'sphere', count: 2, interval: 1.2 }],
      [{ type: 'sphere', count: 5, interval: 0.8 }, { type: 'boss', count: 1, interval: 0 }],
      [{ type: 'sphere', count: 8, interval: 0.7 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'pyramid', count: 5, interval: 0.5 }, { type: 'cylinder', count: 5, interval: 0.5 }, { type: 'sphere', count: 3, interval: 0.5 }],
      [{ type: 'boss', count: 3, interval: 2.0 }, { type: 'sphere', count: 5, interval: 0.5 }]
    ]
  },
  {
    id: 3,
    name: '十字迷踪',
    subtitle: 'CROSSROAD',
    description: '十字交叉路径，考验多线防守能力',
    difficulty: '困难',
    cols: 10,
    rows: 10,
    pathCells: [
      [0, 0], [0, 4], [4, 4], [4, 0], [4, 9], [9, 9]
    ],
    waves: 10,
    startGold: 180,
    startLives: 18,
    theme: { bg: 0x0c0c1e, path: 0x3a3355, grid: 0x252244 },
    waveDefs: [
      [{ type: 'smallCube', count: 6, interval: 0.7 }],
      [{ type: 'pyramid', count: 5, interval: 0.8 }],
      [{ type: 'smallCube', count: 5, interval: 0.6 }, { type: 'pyramid', count: 3, interval: 0.8 }, { type: 'cylinder', count: 2, interval: 1.0 }],
      [{ type: 'cylinder', count: 6, interval: 0.7 }],
      [{ type: 'pyramid', count: 5, interval: 0.6 }, { type: 'cylinder', count: 4, interval: 0.8 }],
      [{ type: 'cylinder', count: 6, interval: 0.7 }, { type: 'sphere', count: 3, interval: 1.0 }],
      [{ type: 'sphere', count: 6, interval: 0.8 }, { type: 'boss', count: 1, interval: 0 }],
      [{ type: 'sphere', count: 8, interval: 0.7 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'cylinder', count: 6, interval: 0.5 }, { type: 'sphere', count: 5, interval: 0.7 }, { type: 'boss', count: 1, interval: 0 }],
      [{ type: 'boss', count: 3, interval: 1.5 }, { type: 'sphere', count: 6, interval: 0.5 }]
    ]
  },
  {
    id: 4,
    name: '螺旋迷宫',
    subtitle: 'SPIRAL',
    description: '螺旋形路径，怪物绕圈推进，需要精心布局',
    difficulty: '噩梦',
    cols: 12,
    rows: 10,
    pathCells: [
      [0, 0], [0, 7], [8, 7], [8, 1], [2, 1],
      [2, 5], [5, 5], [5, 3], [11, 3], [11, 9]
    ],
    waves: 12,
    startGold: 180,
    startLives: 15,
    theme: { bg: 0x0e0e1a, path: 0x3d2d55, grid: 0x282244 },
    waveDefs: [
      [{ type: 'pyramid', count: 6, interval: 0.7 }],
      [{ type: 'pyramid', count: 8, interval: 0.6 }],
      [{ type: 'cylinder', count: 5, interval: 0.7 }, { type: 'pyramid', count: 3, interval: 0.8 }],
      [{ type: 'cylinder', count: 8, interval: 0.6 }],
      [{ type: 'cylinder', count: 6, interval: 0.6 }, { type: 'sphere', count: 3, interval: 1.0 }],
      [{ type: 'sphere', count: 6, interval: 0.8 }],
      [{ type: 'sphere', count: 5, interval: 0.7 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'cylinder', count: 6, interval: 0.5 }, { type: 'sphere', count: 4, interval: 0.7 }],
      [{ type: 'sphere', count: 8, interval: 0.6 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'boss', count: 3, interval: 1.5 }, { type: 'sphere', count: 5, interval: 0.5 }],
      [{ type: 'pyramid', count: 6, interval: 0.4 }, { type: 'cylinder', count: 6, interval: 0.4 }, { type: 'sphere', count: 4, interval: 0.6 }],
      [{ type: 'boss', count: 4, interval: 1.5 }, { type: 'sphere', count: 6, interval: 0.5 }]
    ]
  },
  {
    id: 5,
    name: '终极试炼',
    subtitle: 'GAUNTLET',
    description: '最复杂的路径，最强怪物潮，真正的塔防大师挑战',
    difficulty: '地狱',
    cols: 12,
    rows: 12,
    pathCells: [
      [0, 0], [2, 0], [2, 2], [0, 2], [0, 5],
      [3, 5], [3, 3], [5, 3], [5, 5], [7, 5],
      [7, 2], [11, 2], [11, 7], [5, 7], [5, 9], [11, 11]
    ],
    waves: 15,
    startGold: 200,
    startLives: 15,
    theme: { bg: 0x0f0f1a, path: 0x4d2055, grid: 0x2a2244 },
    waveDefs: [
      [{ type: 'pyramid', count: 6, interval: 0.6 }],
      [{ type: 'cylinder', count: 5, interval: 0.7 }],
      [{ type: 'pyramid', count: 5, interval: 0.5 }, { type: 'cylinder', count: 4, interval: 0.6 }],
      [{ type: 'cylinder', count: 8, interval: 0.6 }],
      [{ type: 'cylinder', count: 5, interval: 0.5 }, { type: 'sphere', count: 4, interval: 0.8 }],
      [{ type: 'sphere', count: 6, interval: 0.7 }],
      [{ type: 'sphere', count: 5, interval: 0.6 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'cylinder', count: 6, interval: 0.5 }, { type: 'sphere', count: 5, interval: 0.6 }],
      [{ type: 'sphere', count: 8, interval: 0.6 }, { type: 'boss', count: 2, interval: 1.5 }],
      [{ type: 'boss', count: 3, interval: 1.5 }, { type: 'sphere', count: 4, interval: 0.5 }],
      [{ type: 'pyramid', count: 8, interval: 0.4 }, { type: 'cylinder', count: 6, interval: 0.4 }],
      [{ type: 'sphere', count: 8, interval: 0.5 }, { type: 'boss', count: 3, interval: 1.2 }],
      [{ type: 'boss', count: 4, interval: 1.2 }, { type: 'sphere', count: 6, interval: 0.4 }],
      [{ type: 'pyramid', count: 8, interval: 0.3 }, { type: 'cylinder', count: 8, interval: 0.3 }, { type: 'sphere', count: 6, interval: 0.4 }],
      [{ type: 'boss', count: 5, interval: 1.0 }, { type: 'sphere', count: 8, interval: 0.3 }]
    ]
  }
];

// 获取关卡配置
export function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

// 计算星级
export function getStars(lives, startLives) {
  const ratio = lives / startLives;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.35) return 2;
  return 1;
}