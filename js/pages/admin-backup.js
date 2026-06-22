window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admBackup = async function() {
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>系统日志</h3>
        <div class="filter-bar" style="margin-bottom:14px">
          <span class="filter-pill is-active" onclick="this.parentElement.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('is-active'));this.classList.add('is-active');App.showToast('日志已筛选', 'info')">全部</span>
          <span class="filter-pill" onclick="this.parentElement.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('is-active'));this.classList.add('is-active');App.showToast('日志已筛选', 'info')">系统</span>
          <span class="filter-pill" onclick="this.parentElement.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('is-active'));this.classList.add('is-active');App.showToast('日志已筛选', 'info')">播放</span>
          <span class="filter-pill" onclick="this.parentElement.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('is-active'));this.classList.add('is-active');App.showToast('日志已筛选', 'info')">错误</span>
          <span class="filter-pill" onclick="this.parentElement.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('is-active'));this.classList.add('is-active');App.showToast('日志已筛选', 'info')">操作</span>
          <span class="filter-spacer"></span>
          <span class="filter-pill">导出</span>
        </div>
        <div class="scan-log">
<span class="ok">[09:12:04] INFO · 扫描 /music/Synthwave 完成 · 88 个文件</span>
<span class="ok">[09:12:20] INFO · AI 推荐缓存生成 · 8 位用户</span>
<span class="warn">[09:12:25] WARN · listener_18 连续 API 请求 120 次/min · 触发限流</span>
<span class="ok">[09:13:02] INFO · user nightrain 从 iPhone 登录 (TCP)</span>
<span class="ok">[09:13:04] INFO · user nightrain 开始播放 "Starlit Drive" · 进度同步</span>
<span class="dim">[09:13:10] DEBUG · 双端同步队列 · 3 条命令 · 0 冲突</span>
<span class="ok">[09:14:00] INFO · 每日备份完成 · /backup/musebox-20260621.gz · 184 MB</span>
        </div>
      </div>

      <div class="admin-panel">
        <h3>备份与恢复</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div class="admin-stat" style="padding:16px"><div class="as-num" style="font-size:18px">每日自动备份</div><div class="as-label" style="margin-top:4px">03:30 · 保留最近 14 份</div></div>
          <div class="admin-stat" style="padding:16px"><div class="as-num" style="font-size:18px">最近备份</div><div class="as-label" style="margin-top:4px">2026-06-21 03:30 · 184 MB</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0" onclick="App.showToast('备份已开始', 'success')">立即备份</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">导入配置</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">导出配置</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">从备份恢复</button>
        </div>
      </div>
    `;
  };
})();