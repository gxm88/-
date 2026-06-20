import * as THREE from 'three';

export class Map {
  constructor(scene) {
    this.scene = scene;
    this.cols = 10;
    this.rows = 10;
    this.cellSize = 1;

    // 路径网格坐标 (col, row)
    this.pathCells = [
      [0, 0], [0, 3], [3, 3], [3, 0], [5, 0],
      [5, 3], [8, 3], [8, 0], [9, 0], [9, 5],
      [5, 5], [5, 7], [9, 7], [9, 9]
    ];

    // 计算世界坐标路径
    this.path = this.pathCells.map(([col, row]) => ({
      x: this.colToWorld(col),
      z: this.rowToWorld(row)
    }));

    // 可放置塔的格子 (不在路径上的格子)
    this.placeableCells = this.computePlaceableCells();

    this.createGrid();
    this.createPathVisual();
    this.createPlaceableMarkers();
  }

  colToWorld(col) {
    return col - (this.cols - 1) / 2;
  }

  rowToWorld(row) {
    return row - (this.rows - 1) / 2;
  }

  worldToCol(worldX) {
    return Math.round(worldX + (this.cols - 1) / 2);
  }

  worldToRow(worldZ) {
    return Math.round(worldZ + (this.rows - 1) / 2);
  }

  computePlaceableCells() {
    const pathSet = new Set(this.pathCells.map(([c, r]) => `${c},${r}`));
    const placeable = [];
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (!pathSet.has(`${col},${row}`)) {
          placeable.push({ col, row, x: this.colToWorld(col), z: this.rowToWorld(row) });
        }
      }
    }
    return placeable;
  }

  createGrid() {
    // 地面
    const groundGeo = new THREE.PlaneGeometry(this.cols, this.rows);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 网格线
    const gridHelper = new THREE.PolarGridHelper(
      Math.max(this.cols, this.rows) / 2,
      32,
      this.cols,
      64,
      0x222244,
      0x222244
    );
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  createPathVisual() {
    // 路径发光面
    for (let i = 0; i < this.path.length - 1; i++) {
      const from = this.path[i];
      const to = this.path[i + 1];
      const midX = (from.x + to.x) / 2;
      const midZ = (from.z + to.z) / 2;
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const pathGeo = new THREE.PlaneGeometry(0.6, length);
      const pathMat = new THREE.MeshStandardMaterial({
        color: 0x334466,
        emissive: 0x112233,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.7
      });
      const pathSeg = new THREE.Mesh(pathGeo, pathMat);
      pathSeg.rotation.x = -Math.PI / 2;
      pathSeg.rotation.z = angle;
      pathSeg.position.set(midX, 0.02, midZ);
      pathSeg.receiveShadow = true;
      this.scene.add(pathSeg);
    }

    // 路径起点和终点标记
    this.createMarker(this.path[0], 0x00ff88, '起点');
    this.createMarker(this.path[this.path.length - 1], 0xff3333, '终点');
  }

  createMarker(pos, color, label) {
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.set(pos.x, 0.06, pos.z);
    this.scene.add(marker);
  }

  createPlaceableMarkers() {
    this.markers = [];
    for (const cell of this.placeableCells) {
      const geo = new THREE.PlaneGeometry(0.8, 0.8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x334455,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const marker = new THREE.Mesh(geo, mat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(cell.x, 0.03, cell.z);
      marker.userData = { col: cell.col, row: cell.row };
      this.scene.add(marker);
      this.markers.push(marker);
    }
  }

  isPlaceable(col, row) {
    const pathSet = new Set(this.pathCells.map(([c, r]) => `${c},${r}`));
    return !pathSet.has(`${col},${row}`) &&
           col >= 0 && col < this.cols &&
           row >= 0 && row < this.rows;
  }

  getWorldPos(col, row) {
    return { x: this.colToWorld(col), z: this.rowToWorld(row) };
  }

  getPath() {
    return this.path;
  }

  getStartPos() {
    return this.path[0];
  }
}