window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admAIConfig = async function() {
    const models = [
      { name: "DeepSeek · Music LLM", desc: "用于自然语言 → 歌单匹配", key: "sk-...7a2f", calls: 184, enabled: true },
      { name: "本地 · 小模型 (FastRec)",  desc: "本地私有化推荐引擎，无外部请求", key: "-", calls: 642, enabled: true },
      { name: "Qwen · 情绪识别",            desc: "情绪标签生成，用于情绪匹配", key: "sk-...q2nM", calls: 112, enabled: false },
    ];
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>AI 模型管理</h3>
        <div style="margin-bottom:14px;color:var(--text-3);font-size:12px">多模型接入 · 云端 API 与本地私有化模型兼容 · 可按调用限流</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          ${models.map(m => `
            <div class="admin-stat" style="padding:18px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center">
              <div>
                <div style="font-weight:600">${m.name}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:4px">${m.desc}</div>
                <div style="font-size:11px;color:var(--text-dim);margin-top:10px;font-family:monospace">API Key: ${m.key}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:4px">今日调用 · ${m.calls} 次</div>
              </div>
              <div class="switch ${m.enabled ? "is-on" : ""}" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div>
            </div>`).join("")}
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">＋ 添加模型</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">调用统计</button>
        </div>
      </div>

      <div class="admin-panel" style="margin-bottom:14px">
        <h3>推荐策略</h3>
        <div class="two-col-form">
          <div class="form-field"><label>推荐数量（每日）</label><input type="text" value="10 首" /></div>
          <div class="form-field"><label>冷启动策略</label><select><option>用热门榜单填充</option><option>用 AI 随机探索</option></select></div>
          <div class="form-field"><label>行为权重 · 播放完成</label><input type="text" value="0.55" /></div>
          <div class="form-field"><label>行为权重 · 收藏</label><input type="text" value="0.30" /></div>
          <div class="form-field"><label>行为权重 · 跳过</label><input type="text" value="-0.15" /></div>
          <div class="form-field"><label>推荐刷新时间</label><input type="text" value="每日 03:00" /></div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>全网热榜爬虫</h3>
        <div class="switch-row"><div><div>网易云 · 热歌榜</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:00 同步</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>Spotify · Global Top 50</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每 6 小时同步一次</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>Apple Music · Daily Top 100</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:30 同步</div></div><div class="switch" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
      </div>
    `;
  };
})();