window.Pages = window.Pages || {};
(function() {
  "use strict";

  window.Pages.admLibraryMgmt = async function() {
    const foldersRes = await API.getFolders();
    const folders = foldersRes.data;
    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>手动上传音乐</h3>
        <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">支持 MP3 / WAV / FLAC / OGG / AAC / M4A 格式，单文件最大 200MB</p>
        <div class="upload-zone" id="upload-zone" style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all var(--t-fast);background:var(--bg-3)">
          <div style="font-size:32px;margin-bottom:8px;color:var(--text-dim)">📁</div>
          <div style="font-size:14px;color:var(--text-2);margin-bottom:4px">拖拽音频文件到此处</div>
          <div style="font-size:12px;color:var(--text-3)">或点击选择文件</div>
          <input type="file" id="upload-input" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.opus" multiple style="display:none" />
        </div>
        <div id="upload-list" style="margin-top:12px;display:none">
          <div style="font-size:13px;color:var(--text-2);margin-bottom:8px">上传队列</div>
          <div id="upload-items"></div>
        </div>
        <div id="upload-result" style="margin-top:12px;display:none"></div>
      </div>
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

    setTimeout(() => {
      const zone = document.getElementById('upload-zone');
      const input = document.getElementById('upload-input');
      const list = document.getElementById('upload-list');
      const items = document.getElementById('upload-items');
      const result = document.getElementById('upload-result');
      let selectedFiles = [];

      if (!zone || !input) return;

      zone.addEventListener('click', () => input.click());

      zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        zone.style.borderColor = 'var(--accent)';
        zone.style.background = 'var(--accent-soft)';
      });

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        zone.style.borderColor = 'var(--accent)';
        zone.style.background = 'var(--accent-soft)';
      });

      zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.style.borderColor = 'var(--border)';
        zone.style.background = 'var(--bg-3)';
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.style.borderColor = 'var(--border)';
        zone.style.background = 'var(--bg-3)';
        handleFiles(e.dataTransfer.files);
      });

      input.addEventListener('change', () => handleFiles(input.files));

      function handleFiles(files) {
        selectedFiles = Array.from(files);
        if (selectedFiles.length === 0) return;
        list.style.display = 'block';
        result.style.display = 'none';
        items.innerHTML = selectedFiles.map((f, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-2);border-radius:8px;margin-bottom:6px;font-size:13px">
            <span>${f.name} <span style="color:var(--text-3);font-size:11px">(${(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
            <span id="upload-status-${i}" style="color:var(--text-3);font-size:11px">就绪</span>
          </div>
        `).join('') + `
          <button id="upload-btn" style="margin-top:8px;padding:8px 18px;border-radius:999px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;border:none;font-size:13px;cursor:pointer;font-weight:600">上传 ${selectedFiles.length} 个文件</button>
        `;

        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
          uploadBtn.addEventListener('click', async () => {
            uploadBtn.disabled = true;
            uploadBtn.textContent = '上传中...';
            try {
              const res = await API.uploadTracks(selectedFiles);
              result.style.display = 'block';
              result.innerHTML = `<div style="padding:12px;background:rgba(74,222,128,0.1);border:1px solid var(--good);border-radius:8px;color:var(--good);font-size:13px">✓ ${res.message}</div>`;
              list.style.display = 'none';
            } catch (err) {
              result.style.display = 'block';
              result.innerHTML = `<div style="padding:12px;background:rgba(248,113,113,0.1);border:1px solid var(--bad);border-radius:8px;color:var(--bad);font-size:13px">✗ 上传失败: ${err.message}</div>`;
            } finally {
              uploadBtn.disabled = false;
              uploadBtn.textContent = `上传 ${selectedFiles.length} 个文件`;
            }
          });
        }
      }
    }, 100);
  };
})();