import { TOWER_CONFIGS, TOWER_LIST } from './Tower.js';

export class UIManager {
  constructor() {
    this.selectedTower = null;
    this.setupElements();
    this.setupTowerPanel();
    this.setupButtons();
  }

  setupElements() {
    this.hudLives = document.getElementById('hud-lives');
    this.hudGold = document.getElementById('hud-gold');
    this.hudScore = document.getElementById('hud-score');
    this.hudWave = document.getElementById('hud-wave');
    this.hudStatus = document.getElementById('hud-status');
    this.towerPanel = document.getElementById('tower-panel');
    this.startWaveBtn = document.getElementById('btn-start-wave');
    this.menuOverlay = document.getElementById('menu-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.gameoverScore = document.getElementById('gameover-score');
    this.gameoverWave = document.getElementById('gameover-wave');
    this.victoryScore = document.getElementById('victory-score');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnRestart2 = document.getElementById('btn-restart2');
    this.btnStart = document.getElementById('btn-start');
  }

  setupTowerPanel() {
    this.towerPanel.innerHTML = '';
    TOWER_LIST.forEach(type => {
      const config = TOWER_CONFIGS[type];
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.innerHTML = `
        <div class="tower-icon" style="background:${'#' + config.color.toString(16).padStart(6, '0')}"></div>
        <div class="tower-info">
          <span class="tower-name">${config.name}</span>
          <span class="tower-cost">💰${config.cost}</span>
        </div>
        <div class="tower-stats">
          <span>⚔${config.damage}</span>
          <span>🎯${config.range}</span>
          <span>⏱${config.fireRate}/s</span>
        </div>
      `;
      btn.addEventListener('click', () => this.selectTower(type));
      this.towerPanel.appendChild(btn);
    });
  }

  setupButtons() {
    this.startWaveBtn.addEventListener('click', () => {
      if (this.onStartWave) this.onStartWave();
    });

    this.btnRestart.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    this.btnRestart2.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    this.btnStart.addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
  }

  selectTower(type) {
    if (this.selectedTower === type) {
      this.selectedTower = null;
      this.towerPanel.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    } else {
      this.selectedTower = type;
      this.towerPanel.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
      const btns = this.towerPanel.querySelectorAll('.tower-btn');
      const idx = TOWER_LIST.indexOf(type);
      if (idx >= 0 && btns[idx]) btns[idx].classList.add('selected');
    }
  }

  clearSelection() {
    this.selectedTower = null;
    this.towerPanel.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  }

  updateHUD(lives, gold, score, wave, maxWave, status) {
    this.hudLives.textContent = lives;
    this.hudGold.textContent = gold;
    this.hudScore.textContent = score;
    this.hudWave.textContent = `${wave}/${maxWave}`;
    this.hudStatus.textContent = status;
  }

  showGameUI() {
    document.getElementById('hud').classList.remove('hidden');
    this.towerPanel.classList.remove('hidden');
  }

  hideGameUI() {
    document.getElementById('hud').classList.add('hidden');
    this.towerPanel.classList.add('hidden');
    this.startWaveBtn.classList.add('hidden');
  }

  showMenu() {
    this.menuOverlay.classList.remove('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.victoryOverlay.classList.add('hidden');
    this.hideGameUI();
  }

  hideMenu() {
    this.menuOverlay.classList.add('hidden');
    this.showGameUI();
  }

  showGameOver(score, wave) {
    this.gameoverScore.textContent = score;
    this.gameoverWave.textContent = wave;
    this.gameoverOverlay.classList.remove('hidden');
    this.victoryOverlay.classList.add('hidden');
    this.menuOverlay.classList.add('hidden');
    this.hideGameUI();
  }

  showVictory(score) {
    this.victoryScore.textContent = score;
    this.victoryOverlay.classList.remove('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.menuOverlay.classList.add('hidden');
    this.hideGameUI();
  }

  showWaveButton(show) {
    this.startWaveBtn.classList.toggle('hidden', !show);
  }
}