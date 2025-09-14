/**
* 統計情報（試行回数・ベスト・直近10件）
* @typedef {Object} Stats
* @property {number} attempts 総試行回数
* @property {?number} best ベスト反応時間(ms)。未計測は null
* @property {number[]} recent 直近10回の反応時間(ms)。最長でも 10 件
*/

/**
* UI の状態
* @typedef {'idle'|'waiting'|'ready'|'result'} State
*/


// localStorage に保存する際のキー
const STORAGE_KEY = 'reflex_tester_stats';

// document.querySelector の短縮関数
const $ = (sel) => document.querySelector(sel);

// クリック / タップ領域
const pad = $('#pad');
const padLabel = $('#padLabel');

//スタート / リセットボタン
const startBtn = $('#startBtn');
const resetBtn = $('#resetBtn');

// 結果と統計エリア
const lastMsEl = $('#lastMs');
const bestMsEl = $('#bestMs');
const avgMsEl = $('#avgMs');
const attemptsEl = $('#attempts');

// 計測結果（小数のミリ秒）を四捨五入して "123 ms" 形式に整える関数
const formatMs = (n) => `${Math.round(n)} ms`;

/**
* 保存済みの統計を取り出して安全に復元する
*/
const loadStats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, best: null, recent: [] }; //何も保存されていなければ既定値を返す
    const data = JSON.parse(raw); //文字列 → JSON に変換
    return {
      // 型のゆれに備えて数値化と配列チェックを行い、壊れたデータでも落ちないようにする
      attempts: Number(data.attempts) || 0,
      best: (Number(data.best) || data.best === 0) ? Number(data.best) : null, //data.best === 0：0が偽扱いになってしまうのを防ぐ
      // filter(Number.isFinite)：配列内の数値以外を除外するため、slice(-10)：直近10件だけを残す
      recent: Array.isArray(data.recent) ? data.recent.filter(Number.isFinite).slice(-10) : [],
    };
  } catch {
    return { attempts: 0, best: null, recent: [] };
  }
};

// 統計をJSON文字列にして保存する
const saveStats = (stats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

// 現在の統計を取り出して保持する
let stats = loadStats();
// 現在の段階を表す状態
let state = 'idle'; // 'idle' | 'waiting' | 'ready' | 'result'
// setTimeout のID。予約をキャンセルできるように保持。
let waitTimer = null;
// スタートの基準時刻を保持する
let readyAt = 0;

// padの色と表示文言を一括で切り替える関数
const setPadMode = (mode, label) => {
  // 除去してから付与
  pad.classList.remove('pad--idle', 'pad--wait', 'pad--ready');
  pad.classList.add(`pad--${mode}`);
  padLabel.textContent = label;
};

// 統計表示（今回/ベスト/平均/試行回数）を更新する関数
const updateStatsUI = ({ last = null } = {}) => {
  lastMsEl.textContent = Number.isFinite(last) ? formatMs(last) : '—';
  bestMsEl.textContent = Number.isFinite(stats.best) ? formatMs(stats.best) : '—';

  const arr = stats.recent;
  const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  avgMsEl.textContent = Number.isFinite(avg) ? formatMs(avg) : '—';
  attemptsEl.textContent = String(stats.attempts);
};


/**
* 待機スタート
*/
const startWaiting = () => {
  // 以前のタイマーが残っていたらキャンセル（二重予約のバグ防止）
  if (waitTimer) {
    clearTimeout(waitTimer);
    waitTimer = null;
  }

  //状態を waiting にして、赤い画面＆「押すな」表示にする
  state = 'waiting';
  setPadMode('wait', '準備…（赤の間は押さない）');

  // 1.3s〜3.5sでランダム
  const delay = 1300 + Math.random() * 2200;
  // ランダムな待機後に becomeReady を呼ぶ
  waitTimer = setTimeout(() => becomeReady(), delay);
};

/**
* 押下OKスタート
*/
const becomeReady = () => {
  state = 'ready';
  setPadMode('ready', '今だ！ タップ / クリック');
  // スタートの基準時刻を readyAt に記録
  readyAt = performance.now();
};

/**
* フライング処理
*/
const recordFalseStart = () => {
  state = 'idle';
  if (waitTimer) {
    clearTimeout(waitTimer);
    waitTimer = null;
  }
  setPadMode('idle', 'フライング！ もう一度試す');
  updateStatsUI({ last: null });
};

/**
* 押下時処理
*/
const recordReaction = () => {
  // スタート基準時刻と押下時との差分を delta に保持
  const now = performance.now();
  const delta = now - readyAt;

  // 統計の更新
  stats.attempts += 1;
  stats.best = (stats.best == null) ? delta : Math.min(stats.best, delta);
  stats.recent = [...stats.recent, delta].slice(-10);
  saveStats(stats);

  // 画面の更新
  state = 'result';
  setPadMode('idle', `反応速度：${formatMs(delta)}（もう一度クリックで再開）`);
  updateStatsUI({ last: delta });
};


/**
* 入力イベントの統合ハンドラ
*/
const onPress = (evt) => {
  if (evt.pointerType === 'touch') {
    // 今は未使用
  }

  // 現在の状態に応じて適切な処理を呼び出す分岐
  switch (state) {
    case 'idle':
    case 'result':
      startWaiting();
      break;
    case 'waiting':
      recordFalseStart();
      break;
    case 'ready':
      recordReaction();
      break;
  }
};

/**
* キーボード
*/
const onKey = (e) => {
  // 押しっぱなしの自動リピートは無視する
  if (e.repeat) return;
  // Space / Enter を押したらスクロールなどの既定動作を抑止して onPress に委譲
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    onPress(e);
  }
};

// pad のクリック／キーボード操作に同じロジックを使う
pad.addEventListener('click', onPress);
pad.addEventListener('keydown', onKey);


/**
* 「もう一度」ボタン押下
*/
startBtn.addEventListener('click', () => {
  if (state === 'waiting' || state === 'ready') return; // 動作中（waiting/ready）は無視する
  startWaiting();
});

/**
* 「統計リセット」ボタン押下
*/
resetBtn.addEventListener('click', () => {
  // 保存データを初期化
  stats = { attempts: 0, best: null, recent: [] };
  saveStats(stats);
  // 画面表示を初期状態に
  updateStatsUI({ last: null });
  setPadMode('idle', 'クリックまたはタップで開始');
});

// 初期表示
updateStatsUI({ last: null });
setPadMode('idle', 'クリックまたはタップで開始');
