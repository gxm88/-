window.Pages = window.Pages || {};
(function() {
  "use strict";
  const { pageHero, viewToggleBtn, rowFor } = window.Pages;

  window.Pages.folders = async function() {
    const [foldersRes, tracksRes] = await Promise.all([
      API.getFolders(),
      API.getTracks(),
    ]);
    const folders = foldersRes.data;
    const tracks = tracksRes.data;

    return `
      ${pageHero("文件夹视图", "完全映射宿主机 /music 目录结构 · 直接以目录方式浏览与播放", { brand: folders.length + " 个目录" })}

      <div class="folder-breadcrumb anim-fade-up">
        <span>music</span><span class="sep">/</span>
      </div>
      <div class="section-head anim-fade-up stagger-1">
        <h3 class="section-title">目录列表 · ${folders.length} 个</h3>
        ${viewToggleBtn("#folders-grid")}
      </div>
      <div class="folder-grid anim-fade-up stagger-1" id="folders-grid">
        ${folders.map((f, i) => {
          const [c1, c2] = colorOf(i);
          return `
            <div class="folder-item" data-folder="${f.path}">
              <div class="folder-ic" style="background:${c1}22;color:${c1}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              </div>
              <div>
                <div class="folder-name">${f.name}</div>
                <div class="playlist-sub" style="margin-top:2px">${f.count} 首 · ${f.path}</div>
              </div>
            </div>`;
        }).join("")}
      </div>

      <div class="section-head anim-fade-up stagger-2" style="margin-top:28px">
        <h3 class="section-title">当前目录下的歌曲</h3>
        ${viewToggleBtn("#folder-tracks")}
      </div>
      <div class="track-list anim-fade-up stagger-2" id="folder-tracks">
        ${tracks.slice(0, 10).map((t, i) => rowFor(t, i)).join("")}
      </div>
    `;
  };
})();