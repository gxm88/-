import { SceneManager } from './Scene.js';
import { Game } from './Game.js';
import { UIManager } from './UI.js';
import { getLevel, getStars } from './LevelData.js';

class App {
  constructor() {
    this.sceneManager = new SceneManager(document.getElementById('game-container'));
    this.ui = new UIManager();
    this.game = new Game(this.sceneManager, this.ui);
    this.currentLevelId = 1;

    this.setupCallbacks();
    this.ui.showHomePage();
  }

  setupCallbacks() {
    // 主页回调
    this.ui.onSelectLevel = (levelId) => this.startLevel(levelId);
    this.ui.onBackToHome = () => this.goHome();

    // 游戏回调
    this.ui.onSelectTowerType = (type) => { this.game.selectedTowerType = type; };
    this.ui.onStartWave = () => this.game.startNextWave();
    this.ui.onRestart = () => this.startLevel(this.currentLevelId);
    this.ui.onNextLevel = () => this.nextLevel();
    this.ui.onUpgrade = () => this.game.upgradeTower();
    this.ui.onSell = () => this.game.sellTower();
    this.ui.onDeselectTower = () => this.game.clearAllSelections();
  }

  startLevel(levelId) {
    this.currentLevelId = levelId;
    const level = getLevel(levelId);
    this.ui.showGamePage();
    this.ui.setLevelName(`${level.name} - ${level.subtitle}`);
    this.game.loadLevel(levelId);
  }

  goHome() {
    this.game.cleanup();
    // 重建场景
    const scene = this.sceneManager.getScene();
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    this.sceneManager.setupLighting();
    this.ui.showHomePage();
    this.ui.renderHomePage();
  }

  nextLevel() {
    const level = getLevel(this.currentLevelId);
    const stars = getStars(this.game.lives, level.startLives);
    this.ui.unlockLevel(this.currentLevelId, stars);

    const nextId = this.currentLevelId + 1;
    if (nextId <= 5) {
      this.startLevel(nextId);
    } else {
      this.goHome();
    }
  }
}

// 启动
const app = new App();