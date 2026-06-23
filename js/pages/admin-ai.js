window.Pages = window.Pages || {};
(function() {
  "use strict";

  // HTML escape helper
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.Pages.admAIConfig = async function() {
    let models = [];
    try {
      const res = await API.getAIModels();
      models = res.data || [];
    } catch (e) {
      console.error('Failed to load AI models:', e);
    }

    return `
      <div class="admin-panel" style="margin-bottom:14px">
        <h3>AI 模型管理</h3>
        <div style="margin-bottom:14px;color:var(--text-3);font-size:12px">多模型接入 · 云端 API 与本地私有化模型兼容 · 可按调用限流</div>
        
        ${models.length === 0 ? `
          <div style="text-align:center;padding:40px 20px;color:var(--text-3)">
            <div style="font-size:40px;margin-bottom:12px;opacity:0.4">⟐</div>
            <div style="font-size:15px;font-weight:600;color:var(--text-2);margin-bottom:4px">暂无模型</div>
            <div style="font-size:13px">点击「添加模型」开始配置 AI 服务</div>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
            ${models.map(m => `
              <div class="admin-stat" style="padding:18px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start">
                <div>
                  <div style="font-weight:600">${esc(m.provider)} · ${esc(m.name)}</div>
                  <div style="font-size:12px;color:var(--text-3);margin-top:4px">${esc(m.description || '暂无描述')}</div>
                  <div style="font-size:11px;color:var(--text-dim);margin-top:10px;font-family:monospace">API Key: ${esc(m.api_key || '-')}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:4px">今日调用 · ${m.calls} 次</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
                  <div class="switch ${m.enabled ? 'is-on' : ''}" data-model-id="${m.id}" data-enabled="${m.enabled ? '1' : '0'}" onclick="window.Pages._toggleAIModel(event, this)"></div>
                  <button style="background:none;border:none;color:var(--text-3);font-size:11px;cursor:pointer;padding:2px 6px" data-model-id="${m.id}" data-model-name="${esc(m.provider + ' · ' + m.name)}" onclick="window.Pages._deleteAIModel(event, this)">删除</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="ai-card-cta" style="margin-top:0" onclick="window.Pages._showAddModelModal()">＋ 添加模型</button>
          <button class="ph-ghost" style="padding:10px 18px;border-radius:999px;border:1px solid var(--border-strong);color:var(--text-1);font-size:var(--fs-13);background:transparent">调用统计</button>
        </div>
      </div>

      <!-- Add Model Modal -->
      <div id="add-model-modal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center" onclick="if(event.target===this) this.style.display='none'">
        <div class="modal-content" style="background:var(--bg-1);border-radius:var(--r-16);padding:28px;width:90%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">
          <h3 style="margin:0 0 20px;font-size:18px">添加 AI 模型</h3>
          <div class="form-field" style="margin-bottom:14px">
            <label style="display:block;font-size:12px;color:var(--text-2);margin-bottom:6px">Provider <span style="color:var(--bad)">*</span></label>
            <input type="text" id="add-model-provider" placeholder="例如：DeepSeek、OpenAI、Qwen" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:10px;color:var(--text-1);font-size:14px;outline:none;box-sizing:border-box">
          </div>
          <div class="form-field" style="margin-bottom:14px">
            <label style="display:block;font-size:12px;color:var(--text-2);margin-bottom:6px">Model Name <span style="color:var(--bad)">*</span></label>
            <input type="text" id="add-model-name" placeholder="例如：deepseek-chat、gpt-4" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:10px;color:var(--text-1);font-size:14px;outline:none;box-sizing:border-box">
          </div>
          <div class="form-field" style="margin-bottom:14px">
            <label style="display:block;font-size:12px;color:var(--text-2);margin-bottom:6px">API Key</label>
            <input type="password" id="add-model-key" placeholder="sk-..." style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:10px;color:var(--text-1);font-size:14px;outline:none;box-sizing:border-box">
          </div>
          <div class="form-field" style="margin-bottom:20px">
            <label style="display:block;font-size:12px;color:var(--text-2);margin-bottom:6px">Description</label>
            <input type="text" id="add-model-desc" placeholder="模型用途说明" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:10px;color:var(--text-1);font-size:14px;outline:none;box-sizing:border-box">
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button onclick="document.getElementById('add-model-modal').style.display='none'" style="padding:10px 20px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-2);font-size:14px;cursor:pointer">取消</button>
            <button id="add-model-save" style="padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;font-size:14px;font-weight:600;cursor:pointer">保存</button>
          </div>
        </div>
      </div>

      <!-- Recommendation Strategy (unchanged) -->
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

      <!-- Crawler (unchanged) -->
      <div class="admin-panel">
        <h3>全网热榜爬虫</h3>
        <div class="switch-row"><div><div>网易云 · 热歌榜</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:00 同步</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>Spotify · Global Top 50</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每 6 小时同步一次</div></div><div class="switch is-on" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
        <div class="switch-row"><div><div>Apple Music · Daily Top 100</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">每日 02:30 同步</div></div><div class="switch" onclick="this.classList.toggle('is-on'); App.showToast('设置已更新', 'success')"></div></div>
      </div>
    `;
  };

  // Toggle model enabled/disabled
  window.Pages._toggleAIModel = async function(e, el) {
    e.stopPropagation();
    const id = el.dataset.modelId;
    const currentEnabled = el.dataset.enabled === '1';
    const newEnabled = !currentEnabled;
    
    // Optimistic UI update
    el.classList.toggle('is-on', newEnabled);
    el.dataset.enabled = newEnabled ? '1' : '0';
    
    try {
      await API.updateAIModel(id, { enabled: newEnabled });
      App.showToast(newEnabled ? '模型已启用' : '模型已禁用', 'success');
    } catch (err) {
      // Rollback
      el.classList.toggle('is-on', currentEnabled);
      el.dataset.enabled = currentEnabled ? '1' : '0';
      App.showToast('更新失败: ' + err.message, 'error');
    }
  };

  // Delete model
  window.Pages._deleteAIModel = async function(e, el) {
    e.stopPropagation();
    const id = el.dataset.modelId;
    const name = el.dataset.modelName;
    
    if (!confirm(`确定要删除模型「${name}」吗？此操作不可撤销。`)) return;
    
    try {
      await API.deleteAIModel(id);
      App.showToast('模型已删除', 'success');
      // Refresh the admin body
      const adminBody = document.getElementById('admin-body');
      if (adminBody) {
        adminBody.innerHTML = await window.Pages.admAIConfig();
      }
    } catch (err) {
      App.showToast('删除失败: ' + err.message, 'error');
    }
  };

  // Show add model modal
  window.Pages._showAddModelModal = function() {
    const modal = document.getElementById('add-model-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Clear form
      document.getElementById('add-model-provider').value = '';
      document.getElementById('add-model-name').value = '';
      document.getElementById('add-model-key').value = '';
      document.getElementById('add-model-desc').value = '';
    }
  };

  // Save new model (bound after render)
  window.Pages._bindAddModelSave = function() {
    const saveBtn = document.getElementById('add-model-save');
    if (!saveBtn || saveBtn.dataset.bound) return;
    saveBtn.dataset.bound = '1';
    
    saveBtn.addEventListener('click', async () => {
      const provider = document.getElementById('add-model-provider').value.trim();
      const modelName = document.getElementById('add-model-name').value.trim();
      const apiKey = document.getElementById('add-model-key').value.trim();
      const description = document.getElementById('add-model-desc').value.trim();
      
      if (!provider || !modelName) {
        App.showToast('请填写 Provider 和 Model Name', 'error');
        return;
      }
      
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中...';
      
      try {
        await API.createAIModel({
          provider,
          model_name: modelName,
          api_key: apiKey || null,
          description: description || null,
        });
        document.getElementById('add-model-modal').style.display = 'none';
        App.showToast('模型添加成功', 'success');
        // Refresh the admin body
        const adminBody = document.getElementById('admin-body');
        if (adminBody) {
          adminBody.innerHTML = await window.Pages.admAIConfig();
          // Re-bind save button after re-render
          setTimeout(() => window.Pages._bindAddModelSave(), 50);
        }
      } catch (err) {
        App.showToast('添加失败: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存';
      }
    });
  };
})();