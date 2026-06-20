// 无尽生存模式 - 2D 塔防
// 程序生成无限地图 | 昼夜循环 | 基地扩张 | 资源采集 | 怪物袭击

const TILE = 40;            // 每格像素
const WORLD_W = 256;        // 世界宽(格)
const WORLD_H = 256;        // 世界高(格)
const BASE_X = 128;         // 初始基地X
const BASE_Y = 128;         // 初始基地Y
const BASE_RADIUS = 4;      // 基地初始半径(格)

// 地形
const GRASS = 0;
const TREE = 1;
const ROCK = 2;
const WATER = 3;
const GOLD = 4;

// 昼夜(秒)
const DAY_LEN = 75;
const NIGHT_LEN = 35;

// 噪音函数
function noise2D(x, y) {
  let n = Math.sin(x * 14.319 + y * 52.117) * 49321.723;
  n += Math.sin(x * 37.291 + y * 19.487) * 28741.551;
  n += Math.sin(x * 67.883 + y * 43.911) * 19531.229;
  return (n - Math.floor(n) + 1) % 1;
}

function getTerrain(x, y) {
  // 基地附近清理
  const dx = x - BASE_X, dy = y - BASE_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < BASE_RADIUS + 1) return GRASS;

  const n = noise2D(x * 0.7, y * 0.7);
  const n2 = noise2D(x * 1.3 + 5, y * 1.3 + 5);

  if (dist < BASE_RADIUS + 3) {
    // 基地附近：少量资源
    if (n < 0.12) return TREE;
    if (n < 0.18) return ROCK;
    return GRASS;
  }

  if (n2 < 0.04) return WATER;
  if (n < 0.08) return GOLD;
  if (n < 0.22) return ROCK;
  if (n < 0.42) return TREE;
  return GRASS;
}

export class EndlessGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 单位
    this.towers = [];       // 防御塔(固定)
    this.walls = [];        // 围墙(固定)
    this.workers = [];      // 工人(移动)
    this.enemies = [];      // 怪物
    this.projectiles = [];  // 弹丸

    // 基地
    this.baseHP = 100;
    this.baseMaxHP = 100;
    this.baseRadius = BASE_RADIUS; // 当前扩张半径

    // 资源
    this.wood = 50;
    this.stone = 30;
    this.coins = 100;

    // 昼夜
    this.dayTime = 0;
    this.dayNum = 1;
    this.isNight = false;
    this.nightSpawnTimer = 0;
    this.nightSpawnInterval = 1.5;
    this.enemiesThisNight = 0;
    this.maxEnemiesPerNight = 4;
    this.kills = 0;

    // 相机
    this.camX = BASE_X * TILE - 400;
    this.camY = BASE_Y * TILE - 240;
    this.zoom = 1;
    this.targetZoom = 1;

    // 拖拽
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCamX = 0;
    this.dragCamY = 0;
    this.dragUnit = null;      // 正在拖拽的单位
    this.dragUnitLine = null;  // 拖拽线终点(世界坐标)

    // 建造模式
    this.buildMode = null;  // 'tower' | 'wall' | 'worker' | null
    this.hoverCell = null;
    this.selectedUnit = null;

    // 资源节点(程序生成缓存)
    this.resourceCache = new Map();

    this.running = false;
    this.paused = false;

    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.lastTime = 0;
    this.animId = null;
  }

  // ===== 初始化 =====
  start() {
    this.towers = [];
    this.walls = [];
    this.workers = [];
    this.enemies = [];
    this.projectiles = [];
    this.baseHP = this.baseMaxHP;
    this.baseRadius = BASE_RADIUS;
    this.wood = 50;
    this.stone = 30;
    this.coins = 100;
    this.dayTime = 0;
    this.dayNum = 1;
    this.isNight = false;
    this.nightSpawnTimer = 0;
    this.enemiesThisNight = 0;
    this.maxEnemiesPerNight = 4;
    this.kills = 0;
    this.camX = BASE_X * TILE - this.canvas.width / 2;
    this.camY = BASE_Y * TILE - this.canvas.height / 2;
    this.zoom = 1;
    this.targetZoom = 1;
    this.buildMode = null;
    this.selectedUnit = null;
    this.dragUnit = null;
    this.dragUnitLine = null;
    this.resourceCache.clear();
    this.running = true;
    this.lastTime = performance.now();
    this.updateHUD();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  cleanup() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ===== 游戏循环 =====
  loop() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.2) dt = 0.2;
    if (this.paused) dt = 0;

    this.update(dt);
    this.render();
  }

  // ===== 更新 =====
  update(dt) {
    // 昼夜
    this.dayTime += dt;
    const cycleLen = this.isNight ? NIGHT_LEN : DAY_LEN;
    if (this.dayTime >= cycleLen) {
      this.dayTime -= cycleLen;
      this.isNight = !this.isNight;
      if (this.isNight) {
        this.enemiesThisNight = 0;
        this.nightSpawnTimer = 0;
        this.maxEnemiesPerNight = 4 + this.dayNum * 2;
      } else {
        this.dayNum++;
        this.coins += 20 + this.dayNum * 5; // 存活奖励
      }
      this.updateHUD();
    }

    // 夜晚刷怪
    if (this.isNight && this.running) {
      this.nightSpawnTimer += dt;
      const interval = Math.max(0.4, 1.5 - this.dayNum * 0.05);
      if (this.nightSpawnTimer >= interval && this.enemiesThisNight < this.maxEnemiesPerNight) {
        this.nightSpawnTimer = 0;
        this.spawnEnemy();
        this.enemiesThisNight++;
      }
    }

    // 更新单位
    for (const w of this.workers) this.updateWorker(w, dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    for (const t of this.towers) this.updateTower(t, dt);
    for (const p of this.projectiles) this.updateProjectile(p, dt);

    // 清理
    this.workers = this.workers.filter(w => w.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);

    // 检测基地被攻击
    for (const e of this.enemies) {
      const dx = e.x - BASE_X * TILE;
      const dy = e.y - BASE_Y * TILE;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE * 1.5) {
        this.baseHP -= e.damage * dt;
        e.alive = false;
        if (this.baseHP <= 0) {
          this.baseHP = 0;
          this.gameOver();
          return;
        }
      }
    }

    // 缩放平滑
    this.zoom += (this.targetZoom - this.zoom) * 5 * dt;

    this.updateHUD();
  }

  updateWorker(w, dt) {
    if (w.gathering) {
      // 正在采集
      w.gatherTimer -= dt;
      if (w.gatherTimer <= 0) {
        w.gathering = false;
        // 采集完成，返回基地
        if (w.targetResource) {
          const res = w.targetResource;
          if (res.type === TREE) this.wood += 5;
          else if (res.type === ROCK) this.stone += 4;
          else if (res.type === GOLD) this.coins += 8;
          this.resourceCache.delete(res.key);
          w.targetResource = null;
        }
        w.targetX = BASE_X * TILE + (Math.random() - 0.5) * TILE * 2;
        w.targetY = BASE_Y * TILE + (Math.random() - 0.5) * TILE * 2;
      }
      return;
    }

    // 移动到目标
    const dx = w.targetX - w.x;
    const dy = w.targetY - w.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      // 到达目标
      if (w.targetResource && !w.gathering) {
        w.gathering = true;
        w.gatherTimer = 2.0;
      } else {
        // 到了基地，待命
        w.targetX = w.x;
        w.targetY = w.y;
      }
      return;
    }
    const speed = 80;
    w.x += (dx / dist) * speed * dt;
    w.y += (dy / dist) * speed * dt;
  }

  updateEnemy(e, dt) {
    // 走向基地
    const dx = BASE_X * TILE - e.x;
    const dy = BASE_Y * TILE - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    // 检查前方是否有围墙
    let blocked = false;
    for (const wall of this.walls) {
      const wdx = e.x - wall.x;
      const wdy = e.y - wall.y;
      const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
      if (wdist < TILE * 0.8) {
        // 攻击围墙
        wall.hp -= e.damage * dt * 2;
        blocked = true;
        if (wall.hp <= 0) wall.alive = false;
      }
    }
    if (blocked) return;

    const speed = 40 + this.dayNum * 3;
    e.x += (dx / dist) * speed * dt;
    e.y += (dy / dist) * speed * dt;
  }

  updateTower(t, dt) {
    t.fireTimer -= dt;
    if (t.fireTimer > 0) return;

    // 找最近敌人
    let closest = null;
    let closestDist = t.range * TILE;
    for (const e of this.enemies) {
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }
    if (!closest) return;

    t.fireTimer = t.fireRate;
    this.projectiles.push({
      x: t.x, y: t.y,
      target: closest,
      speed: 350,
      damage: t.damage,
      alive: true
    });
  }

  updateProjectile(p, dt) {
    if (!p.target || !p.target.alive) {
      p.alive = false;
      return;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      p.target.hp -= p.damage;
      p.alive = false;
      if (p.target.hp <= 0) {
        p.target.alive = false;
        this.kills++;
        this.coins += p.target.reward;
      }
      return;
    }
    p.x += (dx / dist) * p.speed * (1 / 60);
    p.y += (dy / dist) * p.speed * (1 / 60);
  }

  spawnEnemy() {
    // 从屏幕边缘外生成
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 400 + Math.random() * 200;
    const x = BASE_X * TILE + Math.cos(angle) * spawnDist;
    const y = BASE_Y * TILE + Math.sin(angle) * spawnDist;
    const tier = Math.floor(this.dayNum / 3) + 1;
    this.enemies.push({
      x, y,
      hp: 15 + tier * 10 + this.dayNum * 3,
      maxHp: 15 + tier * 10 + this.dayNum * 3,
      damage: 3 + tier * 2,
      reward: 5 + tier * 3 + this.dayNum,
      alive: true,
      tier
    });
  }

  gameOver() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.onGameOver) this.onGameOver(this.dayNum, this.kills);
  }

  // ===== 渲染 =====
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 背景
    const bgColor = this.isNight ? '#0a0a18' : '#1a2a10';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 可见范围
    const halfW = w / this.zoom / 2;
    const halfH = h / this.zoom / 2;
    const minX = Math.floor((this.camX - halfW) / TILE) - 1;
    const maxX = Math.ceil((this.camX + halfW) / TILE) + 1;
    const minY = Math.floor((this.camY - halfH) / TILE) - 1;
    const maxY = Math.ceil((this.camY + halfH) / TILE) + 1;

    // 绘制地形
    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) continue;
        const terrain = getTerrain(tx, ty);
        const px = tx * TILE;
        const py = ty * TILE;

        switch (terrain) {
          case GRASS:
            ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
            break;
          case TREE: {
            ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
            ctx.fillRect(px, py, TILE, TILE);
            // 检查缓存
            const key = `${tx},${ty}`;
            if (!this.resourceCache.has(key)) {
              ctx.fillStyle = this.isNight ? '#1a3a0a' : '#2a5a18';
              ctx.beginPath();
              ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.35, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = this.isNight ? '#3a2a14' : '#6a4a24';
              ctx.fillRect(px + TILE / 2 - 2, py + TILE / 2, 4, TILE / 3);
            }
            continue;
          }
          case ROCK: {
            ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
            ctx.fillRect(px, py, TILE, TILE);
            const key = `${tx},${ty}`;
            if (!this.resourceCache.has(key)) {
              ctx.fillStyle = this.isNight ? '#3a3a3a' : '#6a6a6a';
              ctx.beginPath();
              ctx.moveTo(px + TILE / 2, py + TILE * 0.15);
              ctx.lineTo(px + TILE * 0.85, py + TILE * 0.6);
              ctx.lineTo(px + TILE * 0.6, py + TILE * 0.9);
              ctx.lineTo(px + TILE * 0.15, py + TILE * 0.7);
              ctx.lineTo(px + TILE * 0.2, py + TILE * 0.3);
              ctx.fill();
              ctx.fillStyle = this.isNight ? '#2a2a2a' : '#5a5a5a';
              ctx.beginPath();
              ctx.arc(px + TILE * 0.45, py + TILE * 0.5, TILE * 0.2, 0, Math.PI * 2);
              ctx.fill();
            }
            continue;
          }
          case WATER:
            ctx.fillStyle = this.isNight ? '#0a1a3a' : '#1a4a8a';
            break;
          case GOLD: {
            ctx.fillStyle = this.isNight ? '#1a2a14' : '#3a5a24';
            ctx.fillRect(px, py, TILE, TILE);
            const key = `${tx},${ty}`;
            if (!this.resourceCache.has(key)) {
              ctx.fillStyle = this.isNight ? '#4a3a00' : '#ffd700';
              ctx.beginPath();
              ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = this.isNight ? '#3a2a00' : '#ffaa00';
              ctx.beginPath();
              ctx.arc(px + TILE * 0.35, py + TILE * 0.35, TILE * 0.12, 0, Math.PI * 2);
              ctx.fill();
            }
            continue;
          }
        }
        ctx.fillRect(px, py, TILE, TILE);
      }
    }

    // 网格线
    ctx.strokeStyle = this.isNight ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let tx = minX; tx <= maxX; tx++) {
      ctx.beginPath();
      ctx.moveTo(tx * TILE, minY * TILE);
      ctx.lineTo(tx * TILE, (maxY + 1) * TILE);
      ctx.stroke();
    }
    for (let ty = minY; ty <= maxY; ty++) {
      ctx.beginPath();
      ctx.moveTo(minX * TILE, ty * TILE);
      ctx.lineTo((maxX + 1) * TILE, ty * TILE);
      ctx.stroke();
    }

    // 基地
    this.drawBase(ctx);

    // 围墙
    for (const wall of this.walls) {
      this.drawWall(ctx, wall);
    }

    // 塔
    for (const t of this.towers) {
      this.drawTower(ctx, t);
    }

    // 工人
    for (const w of this.workers) {
      this.drawWorker(ctx, w);
    }

    // 敌人
    for (const e of this.enemies) {
      this.drawEnemy(ctx, e);
    }

    // 弹丸
    for (const p of this.projectiles) {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 拖拽线
    if (this.dragUnit && this.dragUnitLine) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(this.dragUnit.x, this.dragUnit.y);
      ctx.lineTo(this.dragUnitLine.x, this.dragUnitLine.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 选中单位高亮
    if (this.selectedUnit) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.selectedUnit.x, this.selectedUnit.y, TILE * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 建造预览
    if (this.buildMode && this.hoverCell) {
      const hx = this.hoverCell.x * TILE + TILE / 2;
      const hy = this.hoverCell.y * TILE + TILE / 2;
      const terrain = getTerrain(this.hoverCell.x, this.hoverCell.y);
      const canPlace = terrain === GRASS;

      ctx.strokeStyle = canPlace ? 'rgba(0,255,136,0.6)' : 'rgba(255,51,51,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.rect(this.hoverCell.x * TILE + 2, this.hoverCell.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      if (canPlace && this.buildMode === 'tower') {
        ctx.fillStyle = 'rgba(0,240,255,0.2)';
        ctx.beginPath();
        ctx.arc(hx, hy, TILE * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // 夜间叠加暗色
    if (this.isNight) {
      ctx.fillStyle = 'rgba(5, 5, 20, 0.35)';
      ctx.fillRect(0, 0, w, h);
    }

    // 小地图
    this.drawMinimap(ctx, w, h);
  }

  drawBase(ctx) {
    const bx = BASE_X * TILE;
    const by = BASE_Y * TILE;
    const r = this.baseRadius * TILE;

    // 基地地面
    ctx.fillStyle = this.isNight ? '#1a2a0a' : '#2a4a18';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();

    // 基地建筑
    ctx.fillStyle = this.isNight ? '#3a3a4a' : '#5a5a7a';
    ctx.fillRect(bx - TILE * 0.6, by - TILE * 0.6, TILE * 1.2, TILE * 1.2);
    ctx.fillStyle = this.isNight ? '#4a4a5a' : '#7a7a9a';
    ctx.fillRect(bx - TILE * 0.3, by - TILE * 0.3, TILE * 0.6, TILE * 0.6);

    // 血条
    const hpRatio = this.baseHP / this.baseMaxHP;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - TILE * 0.5, by - TILE * 0.8, TILE, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#00ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(bx - TILE * 0.5, by - TILE * 0.8, TILE * hpRatio, 4);
  }

  drawWall(ctx, wall) {
    ctx.fillStyle = this.isNight ? '#4a4a3a' : '#8a8a6a';
    ctx.fillRect(wall.x - TILE * 0.4, wall.y - TILE * 0.4, TILE * 0.8, TILE * 0.8);
    ctx.strokeStyle = this.isNight ? '#3a3a2a' : '#6a6a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x - TILE * 0.4, wall.y - TILE * 0.4, TILE * 0.8, TILE * 0.8);
    // 血条
    const hpR = wall.hp / wall.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6, 3);
    ctx.fillStyle = hpR > 0.5 ? '#0f0' : '#f80';
    ctx.fillRect(wall.x - TILE * 0.3, wall.y - TILE * 0.5, TILE * 0.6 * hpR, 3);
  }

  drawTower(ctx, t) {
    // 射程圈
    if (t === this.selectedUnit) {
      ctx.strokeStyle = 'rgba(0,240,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range * TILE, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 塔身
    ctx.fillStyle = '#00aadd';
    ctx.beginPath();
    ctx.arc(t.x, t.y, TILE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ddff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, TILE * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // 炮管
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + TILE * 0.35, t.y - TILE * 0.15);
    ctx.stroke();
  }

  drawWorker(ctx, w) {
    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.arc(w.x, w.y, TILE * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.arc(w.x, w.y, TILE * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // 状态指示
    if (w.gathering) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(w.x, w.y - TILE * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemy(ctx, e) {
    const colors = ['#ff4444', '#ff8800', '#ff00aa', '#aa00ff'];
    const color = colors[Math.min(e.tier - 1, colors.length - 1)];

    ctx.fillStyle = color;
    ctx.beginPath();
    const size = TILE * 0.3 + e.tier * 2;
    // 快速绘制三角形怪物
    ctx.moveTo(e.x, e.y - size);
    ctx.lineTo(e.x + size, e.y + size * 0.7);
    ctx.lineTo(e.x - size, e.y + size * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(e.x, e.y + size * 0.2, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 血条
    const hpR = e.hp / e.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - TILE * 0.25, e.y - size - 5, TILE * 0.5, 3);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(e.x - TILE * 0.25, e.y - size - 5, TILE * 0.5 * hpR, 3);
  }

  drawMinimap(ctx, w, h) {
    const mmSize = 100;
    const mmX = w - mmSize - 8;
    const mmY = h - mmSize - 55;
    const scale = mmSize / (WORLD_W * TILE);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);
    ctx.fillStyle = '#1a2a14';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);

    // 基地
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(mmX + BASE_X * TILE * scale - 2, mmY + BASE_Y * TILE * scale - 2, 4, 4);

    // 单位
    ctx.fillStyle = '#00aadd';
    for (const t of this.towers) {
      ctx.fillRect(mmX + t.x * scale - 1, mmY + t.y * scale - 1, 2, 2);
    }
    ctx.fillStyle = '#ff4444';
    for (const e of this.enemies) {
      ctx.fillRect(mmX + e.x * scale - 1, mmY + e.y * scale - 1, 2, 2);
    }

    // 视口
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mmX + (this.camX - w / 2 / this.zoom) * scale,
      mmY + (this.camY - h / 2 / this.zoom) * scale,
      w / this.zoom * scale,
      h / this.zoom * scale
    );
  }

  // ===== 输入处理 =====
  screenToWorld(sx, sy) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      x: (sx - w / 2) / this.zoom + this.camX,
      y: (sy - h / 2) / this.zoom + this.camY
    };
  }

  worldToCell(wx, wy) {
    return {
      x: Math.floor(wx / TILE),
      y: Math.floor(wy / TILE)
    };
  }

  findUnitAt(wx, wy) {
    const all = [...this.towers, ...this.workers, ...this.walls];
    for (const u of all) {
      const dx = u.x - wx;
      const dy = u.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.5) return u;
    }
    return null;
  }

  findResourceAt(wx, wy) {
    const cell = this.worldToCell(wx, wy);
    const key = `${cell.x},${cell.y}`;
    if (this.resourceCache.has(key)) return null;
    const terrain = getTerrain(cell.x, cell.y);
    if (terrain === TREE || terrain === ROCK || terrain === GOLD) {
      return { key, x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2, type: terrain };
    }
    return null;
  }

  handleMouseDown(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    const unit = this.findUnitAt(world.x, world.y);

    if (unit && (this.towers.includes(unit) || this.workers.includes(unit))) {
      // 开始拖拽单位
      this.dragUnit = unit;
      this.dragUnitLine = null;
      this.selectedUnit = unit;
      this.buildMode = null;
      return;
    }

    if (this.buildMode) {
      const cell = this.worldToCell(world.x, world.y);
      this.doBuild(cell.x, cell.y);
      return;
    }

    // 无单位，开始拖拽地图
    this.dragging = true;
    this.dragStartX = sx;
    this.dragStartY = sy;
    this.dragCamX = this.camX;
    this.dragCamY = this.camY;
    this.dragUnit = null;
    this.dragUnitLine = null;
    this.selectedUnit = null;
  }

  handleMouseMove(sx, sy) {
    const world = this.screenToWorld(sx, sy);

    if (this.dragUnit) {
      // 拖拽单位到资源
      const resource = this.findResourceAt(world.x, world.y);
      if (resource) {
        this.dragUnitLine = { x: resource.x, y: resource.y };
      } else {
        this.dragUnitLine = { x: world.x, y: world.y };
      }
      return;
    }

    if (this.dragging) {
      this.camX = this.dragCamX - (sx - this.dragStartX) / this.zoom;
      this.camY = this.dragCamY - (sy - this.dragStartY) / this.zoom;
      return;
    }

    // 建造模式悬停
    if (this.buildMode) {
      this.hoverCell = this.worldToCell(world.x, world.y);
    }
  }

  handleMouseUp(sx, sy) {
    if (this.dragUnit) {
      const world = this.screenToWorld(sx, sy);
      const resource = this.findResourceAt(world.x, world.y);
      if (resource) {
        // 指定单位去采集
        const unit = this.dragUnit;
        if (this.workers.includes(unit)) {
          unit.targetX = resource.x;
          unit.targetY = resource.y;
          unit.targetResource = resource;
          unit.gathering = false;
          this.resourceCache.set(resource.key, true);
        }
      }
      this.dragUnit = null;
      this.dragUnitLine = null;
      return;
    }

    this.dragging = false;
  }

  handleWheel(delta) {
    this.targetZoom = Math.max(0.4, Math.min(2.5, this.targetZoom - delta * 0.001));
  }

  doBuild(cx, cy) {
    const terrain = getTerrain(cx, cy);
    if (terrain !== GRASS) return;

    const wx = cx * TILE + TILE / 2;
    const wy = cy * TILE + TILE / 2;

    if (this.buildMode === 'tower') {
      if (this.wood < 30 || this.stone < 10) return;
      this.wood -= 30;
      this.stone -= 10;
      this.towers.push({
        x: wx, y: wy,
        range: 3.5,
        damage: 10,
        fireRate: 0.8,
        fireTimer: 0,
        alive: true
      });
    } else if (this.buildMode === 'wall') {
      if (this.wood < 10) return;
      this.wood -= 10;
      this.walls.push({
        x: wx, y: wy,
        hp: 50,
        maxHp: 50,
        alive: true
      });
    } else if (this.buildMode === 'worker') {
      if (this.wood < 20) return;
      this.wood -= 20;
      this.workers.push({
        x: wx, y: wy,
        targetX: wx, targetY: wy,
        targetResource: null,
        gathering: false,
        gatherTimer: 0,
        alive: true
      });
    }
    this.updateHUD();
  }

  setBuildMode(mode) {
    this.buildMode = this.buildMode === mode ? null : mode;
    this.selectedUnit = null;
    this.dragUnit = null;
    this.dragUnitLine = null;
  }

  // ===== HUD =====
  updateHUD() {
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        wood: this.wood,
        stone: this.stone,
        coins: this.coins,
        isNight: this.isNight,
        dayNum: this.dayNum,
        hp: this.baseHP,
        maxHp: this.baseMaxHP
      });
    }
  }
}