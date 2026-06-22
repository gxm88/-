window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero } = window.Pages;

  window.Pages.admin = async function() {
    return `
      <section class="page-section anim-fade-up">
        ${pageHero("管理后台", "所有前台展示、AI 模型、曲库、用户权限均在这里配置。", { brand: "Administrator" })}

        <div class="admin-layout">
          <div>
            <div class="admin-side-menu">
              <div class="side-group-title" style="padding:4px 12px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">数据总览</div>
              <button class="admin-side-item is-active" data-adm="dashboard">📊 仪表盘</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">曲库管理</div>
              <button class="admin-side-item" data-adm="library-mgmt">📁 目录挂载 / 扫描</button>
              <button class="admin-side-item" data-adm="metadata">✨ 元数据修复</button>
              <button class="admin-side-item" data-adm="ops">🧹 重复 / 冗余清理</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">用户与内容</div>
              <button class="admin-side-item" data-adm="users">👥 用户管理</button>
              <button class="admin-side-item" data-adm="pl-edit">📝 歌单编辑</button>

              <div class="side-group-title" style="padding:14px 12px 4px;font-size:11px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase">AI 与服务</div>
              <button class="admin-side-item" data-adm="ai-config">⟐ AI 模型配置</button>
              <button class="admin-side-item" data-adm="network">🌐 网络 / TCP 服务</button>
              <button class="admin-side-item" data-adm="backup">🗄 日志 / 备份</button>
            </div>
          </div>

          <div id="admin-body"></div>
        </div>
      </section>
    `;
  };
})();