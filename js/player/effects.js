window.Player = window.Player || {};
(function() {
  "use strict";

  // ---- 均衡器 (预设) ----
  function applyEQPreset(key) {
    const state = window.Player.state;
    const EQ_PRESETS = window.Player.EQ_PRESETS;
    const preset = EQ_PRESETS[key];
    if (!preset) return;
    state.eq.preset = key;
    state.eq.enabled = key !== "flat";
    state.eq.bands.forEach((b, i) => { b.gain = preset.gains[i]; });
    renderEQPanel();
    renderEQButton();
  }

  function renderEQPanel() {
    const state = window.Player.state;
    const EQ_PRESETS = window.Player.EQ_PRESETS;
    const panel = document.getElementById("eq-panel");
    if (!panel) return;

    const p = EQ_PRESETS[state.eq.preset] || EQ_PRESETS.flat;
    panel.innerHTML = `
      <div class="eq-head">
        <span class="eq-title">均衡器</span>
        <div class="eq-head-right">
          <span class="eq-preset-name">${p.name}</span>
          <button class="eq-toggle-btn ${state.eq.enabled ? "is-on" : ""}" id="eq-toggle">${state.eq.enabled ? "ON" : "OFF"}</button>
          <button class="eq-close-btn" id="eq-close">×</button>
        </div>
      </div>
      <p class="eq-desc">${p.desc}</p>

      <div class="eq-presets">
        ${Object.entries(EQ_PRESETS).map(([k, v]) =>
          `<button class="eq-preset-btn ${state.eq.preset === k ? "is-active" : ""}" data-preset="${k}">${v.name}</button>`
        ).join("")}
      </div>

      <div class="eq-bands">
        ${state.eq.bands.map((b, i) => {
          const pct = ((b.gain + 12) / 24 * 100).toFixed(0);
          return `
          <div class="eq-band-col">
            <div class="eq-band-slider" data-idx="${i}">
              <div class="eq-band-track">
                <div class="eq-band-fill" style="height:${pct}%"></div>
              </div>
              <div class="eq-band-thumb" style="bottom:${pct}%"></div>
            </div>
            <span class="eq-band-gain">${b.gain > 0 ? "+" : ""}${b.gain} dB</span>
            <span class="eq-band-label">${b.label}</span>
          </div>`;
        }).join("")}
      </div>

      <div class="eq-viz-section">
        <div class="eq-viz-label">频谱</div>
        <div class="eq-viz" id="eq-viz">
          ${Array.from({ length: 32 }, (_, i) =>
            `<div class="eq-viz-bar" style="--i:${i}"></div>`
          ).join("")}
        </div>
      </div>
    `;

    panel.querySelectorAll(".eq-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => applyEQPreset(btn.dataset.preset));
    });

    const toggle = panel.querySelector("#eq-toggle");
    if (toggle) toggle.addEventListener("click", () => {
      state.eq.enabled = !state.eq.enabled;
      renderEQPanel();
      renderEQButton();
    });

    const close = panel.querySelector("#eq-close");
    if (close) close.addEventListener("click", () => {
      panel.classList.remove("is-open");
      renderEQButton();
    });

    panel.querySelectorAll(".eq-band-slider").forEach(slider => {
      let dragging = false;
      const idx = parseInt(slider.dataset.idx);
      let rafId = null;

      const updateGain = (clientY) => {
        const track = slider.querySelector(".eq-band-track");
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        state.eq.bands[idx].gain = Math.round((pct * 24 - 12) * 10) / 10;
        const wasCustom = state.eq.preset === "custom";
        state.eq.preset = "custom";

        if (rafId) return; // throttle with rAF
        rafId = requestAnimationFrame(() => {
          rafId = null;
          // Update slider fill height
          const fill = slider.querySelector(".eq-band-fill");
          if (fill) fill.style.height = `${(pct * 100).toFixed(0)}%`;
          // Update slider thumb position
          const thumb = slider.querySelector(".eq-band-thumb");
          if (thumb) thumb.style.bottom = `${(pct * 100).toFixed(0)}%`;
          // Update dB label
          const gainLabel = slider.parentElement.querySelector(".eq-band-gain");
          if (gainLabel) {
            const g = state.eq.bands[idx].gain;
            gainLabel.textContent = `${g > 0 ? "+" : ""}${g} dB`;
          }
          // 只在首次变为自定义时更新预设按钮状态，避免每次 rAF 都触发 DOM 重排
          if (!wasCustom) {
            const presetBtns = panel.querySelectorAll(".eq-preset-btn");
            presetBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.preset === "custom"));
            const presetName = panel.querySelector(".eq-preset-name");
            if (presetName) presetName.textContent = "自定义";
          }
        });
      };

      slider.addEventListener("mousedown", (e) => { dragging = true; slider.classList.add("is-dragging"); updateGain(e.clientY); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateGain(e.clientY); });
      document.addEventListener("mouseup", () => { dragging = false; slider.classList.remove("is-dragging"); });
      slider.addEventListener("touchstart", (e) => { e.preventDefault(); dragging = true; slider.classList.add("is-dragging"); updateGain(e.touches[0].clientY); }, { passive: false });
      document.addEventListener("touchmove", (e) => { if (dragging) { e.preventDefault(); updateGain(e.touches[0].clientY); } }, { passive: false });
      document.addEventListener("touchend", () => { dragging = false; slider.classList.remove("is-dragging"); });
    });
  }

  function renderEQButton() {
    const state = window.Player.state;
    const EQ_PRESETS = window.Player.EQ_PRESETS;
    const btn = document.getElementById("btn-eq");
    if (!btn) return;
    if (state.eq.enabled) {
      btn.classList.add("is-active");
      btn.title = `均衡器: ${EQ_PRESETS[state.eq.preset]?.name || "自定义"}`;
    } else {
      btn.classList.remove("is-active");
      btn.title = "均衡器";
    }
  }

  function toggleEQPanel() {
    const panel = document.getElementById("eq-panel");
    if (!panel) { console.warn("[Player] eq-panel 未找到"); return; }
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) {
      renderEQPanel();
      startVisualizer();
    } else {
      stopVisualizer();
    }
    renderEQButton();
  }

  // ---- 频谱可视化 ----
  function startVisualizer() {
    const state = window.Player.state;
    if (state.vizTimer) return;
    const viz = document.getElementById("eq-viz");
    if (!viz) return;
    state.vizTimer = setInterval(() => {
      const bars = viz.querySelectorAll(".eq-viz-bar");
      if (!bars.length) return;
      bars.forEach((bar, i) => {
        const base = 0.08 + 0.15 * Math.sin(i / 5 + state.progress * 10);
        const wave = 0.06 * Math.sin(i / 3 + Date.now() / 500);
        const noise = 0.02 * Math.random();
        let h = base + wave + noise;
        if (state.playing) h *= 2.5;
        const bandIdx = Math.floor(i / 32 * state.eq.bands.length);
        const eqGain = state.eq.bands[bandIdx]?.gain || 0;
        h *= (1 + eqGain / 12);
        bar.style.height = `${Math.min(100, Math.max(2, h * 100))}%`;
      });
    }, 80);
  }

  function stopVisualizer() {
    const state = window.Player.state;
    if (state.vizTimer) { clearInterval(state.vizTimer); state.vizTimer = null; }
  }

  // Export
  window.Player.applyEQPreset = applyEQPreset;
  window.Player.renderEQPanel = renderEQPanel;
  window.Player.renderEQButton = renderEQButton;
  window.Player.toggleEQPanel = toggleEQPanel;
  window.Player.startVisualizer = startVisualizer;
  window.Player.stopVisualizer = stopVisualizer;
})();