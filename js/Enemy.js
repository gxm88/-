import * as THREE from 'three';

// 怪物配置
export const ENEMY_CONFIGS = {
  smallCube: {
    type: '小方块',
    geometry: 'box',
    color: 0x00ff88,
    size: 0.6,
    hp: 100,
    speed: 2.0,
    reward: 10
  },
  pyramid: {
    type: '棱锥怪',
    geometry: 'tetrahedron',
    color: 0xff6600,
    size: 0.7,
    hp: 200,
    speed: 1.6,
    reward: 20
  },
  cylinder: {
    type: '圆柱兽',
    geometry: 'cylinder',
    color: 0xff2d95,
    size: 0.7,
    hp: 350,
    speed: 1.4,
    reward: 30
  },
  sphere: {
    type: '球体王',
    geometry: 'sphere',
    color: 0xb44dff,
    size: 0.9,
    hp: 600,
    speed: 1.0,
    reward: 50
  },
  boss: {
    type: '星形Boss',
    geometry: 'icosahedron',
    color: 0xffd700,
    size: 1.2,
    hp: 1500,
    speed: 0.8,
    reward: 100
  }
};

export class Enemy {
  constructor(config, path, scene) {
    this.config = config;
    this.path = path;
    this.scene = scene;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.reward = config.reward;
    this.alive = true;
    this.reachedEnd = false;
    this.pathIndex = 0;
    this.progress = 0;

    this.mesh = this.createMesh();
    this.healthBar = this.createHealthBar();
    this.setPosition(path[0]);
    scene.add(this.mesh);
    scene.add(this.healthBar);
  }

  createMesh() {
    const { geometry, color, size } = this.config;
    let geo;
    switch (geometry) {
      case 'box':
        geo = new THREE.BoxGeometry(size, size, size);
        break;
      case 'tetrahedron':
        geo = new THREE.TetrahedronGeometry(size * 0.7);
        break;
      case 'cylinder':
        geo = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size, 8);
        break;
      case 'sphere':
        geo = new THREE.SphereGeometry(size * 0.5, 16, 16);
        break;
      case 'icosahedron':
        geo = new THREE.IcosahedronGeometry(size * 0.5);
        break;
      default:
        geo = new THREE.BoxGeometry(size, size, size);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.y = size * 0.5;
    return mesh;
  }

  createHealthBar() {
    const group = new THREE.Group();
    const bgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    group.add(bg);

    const fgGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    this.healthFill = new THREE.Mesh(fgGeo, fgMat);
    this.healthFill.position.z = 0.01;
    group.add(this.healthFill);

    group.position.y = this.config.size * 0.5 + 0.8;
    return group;
  }

  setPosition(pos) {
    this.mesh.position.x = pos.x;
    this.mesh.position.z = pos.z;
    this.healthBar.position.x = pos.x;
    this.healthBar.position.z = pos.z;
  }

  updateHealthBar() {
    const ratio = this.hp / this.maxHp;
    this.healthFill.scale.x = Math.max(0, ratio);
    this.healthFill.position.x = -(1.2 - 1.2 * ratio) / 2;
    if (ratio > 0.5) {
      this.healthFill.material.color.set(0x00ff88);
    } else if (ratio > 0.25) {
      this.healthFill.material.color.set(0xffaa00);
    } else {
      this.healthFill.material.color.set(0xff3333);
    }
  }

  takeDamage(damage) {
    this.hp -= damage;
    this.updateHealthBar();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(delta) {
    if (!this.alive) return;

    if (this.pathIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      return;
    }

    const current = this.path[this.pathIndex];
    const next = this.path[this.pathIndex + 1];
    const dx = next.x - current.x;
    const dz = next.z - current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    this.progress += (this.speed * delta) / dist;

    if (this.progress >= 1) {
      this.progress = 0;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.reachedEnd = true;
        this.alive = false;
        return;
      }
    }

    // Interpolate position
    const c = this.path[this.pathIndex];
    const n = this.path[this.pathIndex + 1];
    const t = this.progress;
    const x = c.x + (n.x - c.x) * t;
    const z = c.z + (n.z - c.z) * t;

    this.setPosition({ x, z });

    // Rotate the mesh
    this.mesh.rotation.x += delta * 3;
    this.mesh.rotation.y += delta * 2;
  }

  remove() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.healthBar);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.healthBar.children.forEach(c => {
      c.geometry?.dispose();
      c.material?.dispose();
    });
  }
}