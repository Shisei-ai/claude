// =============================================================
//  main.js — 起動処理とメインループ
// =============================================================

// 画像素材を読み込み終えてからゲームを開始する
Assets.load(function main() {
  // セーブデータを読み込む。無ければ新規作成
  const loaded = loadGame();
  if (!loaded) S = newState();
  document.body.classList.toggle('pixel', Assets.pixelArt());

  UI.init();

  // 画面を閉じていた間の生産をまとめて計算(放置生産)
  function catchUp(sinceMs) {
    const result = simulateOffline((Date.now() - sinceMs) / 1000);
    if (result && result.gained.length) {
      const min = Math.floor(result.sec / 60);
      UI.modal(`<h2>留守の間に</h2>
        <p>${min > 0 ? `${min}分` : `${Math.floor(result.sec)}秒`}の間、工房の設備が働き続けていた。</p>
        <div class="gained">${result.gained.map(([k, n]) => `<span class="req out">${icon(k)}${ITEMS[k].name} +${n}</span>`).join('')}</div>
        ${result.alvUp ? `<p class="good">A.Lv が ${result.alvUp} 上がった！</p>` : ''}
        <div class="mfoot"><span></span><button class="btn glow" onclick="UI.closeModal()">閉じる</button></div>`);
    }
  }

  if (!S.flags.prologue) {
    UI.showStory(STORY.prologue, () => { S.flags.prologue = true; saveGame(); });
  } else {
    catchUp(S.savedAt);
  }

  // ブラウザのタブが隠れている間はループが止まるので、戻った時に追いつく
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); saveGame(); }
    else if (hiddenAt && !Field.active) catchUp(hiddenAt);
    else if (hiddenAt) simulateOffline((Date.now() - hiddenAt) / 1000);
  });
  window.addEventListener('beforeunload', saveGame);

  // ---- 入力 ----
  window.addEventListener('keydown', e => {
    if (!Field.active) return;
    if (['1', '2', '3', '4', '5', '6', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!e.repeat) Field.keyDown(e);
  });
  window.addEventListener('keyup', e => Field.keyUp(e));
  window.addEventListener('blur', () => { Field.keys = {}; Field.mouse.down = false; });
  const cv = document.getElementById('cv');
  cv.addEventListener('mousemove', e => { Field.mouse.x = e.clientX; Field.mouse.y = e.clientY; });
  cv.addEventListener('mousedown', e => { if (e.button === 0) Field.mouse.down = true; });
  window.addEventListener('mouseup', () => { Field.mouse.down = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', () => { if (Field.active) Field.resize(); });

  // ---- メインループ ----
  let last = performance.now(), uiT = 0, saveT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tickProduction(dt * DEBUG.speed);
    S.stats.playSec += dt;
    if (Field.active) { Field.update(dt); Field.draw(); }
    uiT += dt; saveT += dt;
    if (uiT > 0.25) { uiT = 0; UI.tick(); }
    if (saveT > 10) { saveT = 0; saveGame(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
