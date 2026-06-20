import * as THREE from 'three';

// 防御塔配置
export const TOWER_CONFIGS = {
  arrow: {
    type: '箭塔',
    name: '箭塔',
    geometry: 'cone',
    color: 0x00f0ff,
    range: 2.5,
    damage: 25,
    fireRate: 1.0,
    cost: 50,
    description: '基础塔，攻速快'
  },
  cannon: {
    type: 'cannon',
    name: '炮塔',
    geometry: 'box',
    color: 0xff3333,
    range: 2.0,
    damage: 60,
    fireRate: 0.5,
    cost: 100,
    description: '高伤害，射速慢'
  },
  ice: {
    type: 'ice',
    name: '冰塔',
    geometry: 'octahedron',
    color: 0x66ccff,
    range: 2.2,
    damage: 15,
    fireRate: 1.2,
    cost: 75,
    description: '减速敌人，攻速快'
  },
  lightning: {
    type: 'lightning',
    name: '雷塔',
    geometry: 'dodecahedron',
    color: 0xffff00,
    range: 3.0,
    damage: 40,
    fireRate: 0.8,
    cost: 150,
    description: '大范围，中等伤害'
  }
};

export const TOWER_LIST = ['arrow', 'cannon', 'ice', 'lightning'];

export class Tower {
  constructor(config, gridPos, worldPos, scene) {
    this.config = config;
    this.gridPos = gridPos; // {col, row}
    this.worldPos = worldPos; // {x, z}
    this.scene = scene;
    this.fireTimer = 0;
    this.target = null;

    this.mesh = this.createMesh();
    this.rangeRing = this.createRangeRing();
    this.mesh.position.set(worldPos.x, 0, worldPos.z);
    this.rangeRing.position.set(worldPos.x, 0.01, worldPos.z);
    scene.add(this.mesh);
    scene.add(this.rangeRing);
    this.rangeRing.visible = false;
  }

  createMesh() {
    const { geometry, color } = this.config;
    let geo;
    switch (geometry) {
      case 'cone':
        geo = new THREE.ConeGeometry(0.45, 0.9, 8);
        break;
      case 'box':
        geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        break;
      case 'octahedron':
        geo = new THREE.OctahedronGeometry(0.45);
        break;
      case 'dodecahedron':
        geo = new THREE.DodecahedronGeometry(0.45);
        break;
      default:
        geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5;
    mesh.castShadow = true;
    return mesh;
  }

  createRangeRing() {
    const geo = new THREE.RingGeometry(this.config.range - 0.05, this.config.range, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  showRange(visible) {
    this.rangeRing.visible = visible;
  }

  findTarget(enemies) {
    let closest = null;
    let closestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.mesh.position.x - this.worldPos.x;
      const dz = enemy.mesh.position.z - this.worldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= this.config.range && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  update(delta, enemies, projectiles) {
    this.fireTimer += delta;

    // Find target
    this.target = this.findTarget(enemies);

    if (this.target && this.fireTimer >= 1 / this.config.fireRate) {
      this.fireTimer = 0;
      this.fire(this.target, projectiles);
      // Attack animation
      this.mesh.scale.set(1.2, 0.8, 1.2);
      setTimeout(() => {
        if (this.mesh) this.mesh.scale.set(1, 1, 1);
      }, 100);
    }
  }

  fire(target, projectiles) {
    const startPos = {
      x: this.worldPos.x,
      y: 0.8,
      z: this.worldPos.z
    };
    projectiles.push(new Projectile(startPos, target, this.config.damage, this.config.color, this.config.type));
  }

  remove() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.rangeRing);
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.rangeRing.geometry?.dispose();
    this.rangeRing.material?.dispose();
  }
}

export class Projectile {
  constructor(startPos, target, damage, color, towerType) {
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.towerType = towerType;
    this.speed = 8;
    this.alive = true;

    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);
  }

  update(delta) {
    if (!this.alive || !this.target || !this.target.alive) {
      this.alive = false;
      return;
    }

    const targetPos = this.target.mesh.position;
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dz = targetPos.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.3) {
      this.target.takeDamage(this.damage);
      // Slow effect for ice tower
      if (this.towerType === 'ice') {
        this.target.speed = this.target.config.speed * 0.5;
        setTimeout(() => {
          if (this.target && this.target.alive) {
            this.target.speed = this.target.config.speed;
          }
        }, 1000);
      }
      this.alive = false;
      return;
    }

    const moveAmount = this.speed * delta;
    const ratio = Math.min(moveAmount / dist, 1);
    this.mesh.position.x += dx * ratio;
    this.mesh.position.y += dy * ratio;
    this.mesh.position.z += dz * ratio;
  }

  remove() {
    if (this.mesh) {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
    }
  }
}