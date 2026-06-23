window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admLibraryMgmt = async function() {
    const foldersRes = await API.getFolders();
    const folders = foldersRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>目录挂载</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">将宿主机目录映射到容器。修改后需重新扫描。</p>
        <div class="data-table" style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-3)">
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">宿主机路径</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">文件数</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">状态</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-3);font-size:12px">最后扫描</th>
                <th style="padding:10px 14px;text-align:right;color:var(--text-3);font-size:12px">操作</th>
              </tr>
            </thead>
            <tbody>
              ${folders.map(f => `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 14px;font-size:13px"><code>${f.path}</code></td>
                  <td style="padding:10px 14px;font-size:13px;color:var(--text-2)">${f.count}</td>
                  <td style="padding:10px 14px;font-size:13px"><span class="status-dot">已挂载</span></td>
                  <td style="padding:10px 14px;font-size:12px;color:var(--text-3)">2 小时前</td>
                  <td style="padding:10px 14px;text-align:right"><button class="icon-btn" onclick="App.showToast('扫描已触发', 'success')">⟳</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0">＋ 添加目录</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">立即全量扫描</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">增量扫描</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">后台定时任务</button>
        </div>
      </div>

      <div class="admin-panel">
        <h3>扫描日志</h3>
        <div class="scan-log">
<span class="ok">[09:12:04] ▸ 扫描 /music/Synthwave · 88 个新文件</span>
<span class="ok">[09:12:11] ▸ 元数据补全 · 成功 86 / 88</span>
<span class="warn">[09:12:13] ▸ 2 个文件缺少封面，拉取中...</span>
<span class="ok">[09:12:20] ▸ 封面拉取完成 · 2 / 2</span>
<span class="dim">[09:12:22] ▸ 重复检测：1 组潜在重复</span>
        </div>
      </div>
    `;
  };
})();