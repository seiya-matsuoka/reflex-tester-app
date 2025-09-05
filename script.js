const STORAGE_KEY = 'reflex_tester_stats';

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

const formatMs = (n) => `${Math.round(n)} ms`;

const loadStats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, best: null, recent: [] };
    const data = JSON.parse(raw);
    return {
      attempts: Number(data.attempts) || 0,
      best: (Number(data.best) || data.best === 0) ? Number(data.best) : null,
      recent: Array.isArray(data.recent) ? data.recent.filter(Number.isFinite).slice(-10) : [],
    };
  } catch {
    return { attempts: 0, best: null, recent: [] };
  }
};

const saveStats = (stats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

let stats = loadStats();
let state = 'idle'; // 'idle' | 'waiting' | 'ready' | 'result'
let waitTimer = null;
let readyAt = 0;

// 
const setPadMode = (mode, label) => {
  pad.classList.remove('pad--idle', 'pad--wait', 'pad--ready');
  pad.classList.add(`pad--${mode}`);
  padLabel.textContent = label;
};

const updateStatsUI = ({ last = null } = {}) => {
  lastMsEl.textContent = Number.isFinite(last) ? formatMs(last) : '—';
  bestMsEl.textContent = Number.isFinite(stats.best) ? formatMs(stats.best) : '—';

  const arr = stats.recent;
  const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  avgMsEl.textContent = Number.isFinite(avg) ? formatMs(avg) : '—';
  attemptsEl.textContent = String(stats.attempts);
};

// 
const startWaiting = () => {
  // 
  if (waitTimer) {
    clearTimeout(waitTimer);
    waitTimer = null;
  }

  state = 'waiting';
  setPadMode('wait', '準備…（赤の間は押さない）');

  // 1.3s〜3.5s でランダム
  const delay = 1300 + Math.random() * 2200;
  waitTimer = setTimeout(() => becomeReady(), delay);
};

const becomeReady = () => {
  state = 'ready';
  setPadMode('ready', '今だ！ タップ / クリック');
  readyAt = performance.now();
};

const recordFalseStart = () => {
  // フライング
  state = 'idle';
  if (waitTimer) {
    clearTimeout(waitTimer);
    waitTimer = null;
  }
  setPadMode('idle', 'フライング！ もう一度試す');
  updateStatsUI({ last: null });
};

const recordReaction = () => {
  const now = performance.now();
  const delta = now - readyAt;

  // 更新
  stats.attempts += 1;
  stats.best = (stats.best == null) ? delta : Math.min(stats.best, delta);
  stats.recent = [...stats.recent, delta].slice(-10);
  saveStats(stats);

  state = 'result';
  setPadMode('idle', `反応速度：${formatMs(delta)}（もう一度クリックで再開）`);
  updateStatsUI({ last: delta });
};

// 
const onPress = (evt) => {
  // 
  if (evt.pointerType === 'touch') {
    // 
  }

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

const onKey = (e) => {
  if (e.repeat) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    onPress(e);
  }
};

// 
pad.addEventListener('click', onPress);
pad.addEventListener('keydown', onKey);
startBtn.addEventListener('click', () => {
  if (state === 'waiting' || state === 'ready') return; // 動作中は無視
  startWaiting();
});
resetBtn.addEventListener('click', () => {
  stats = { attempts: 0, best: null, recent: [] };
  saveStats(stats);
  updateStatsUI({ last: null });
  setPadMode('idle', 'クリックまたはタップで開始');
});

updateStatsUI({ last: null });
setPadMode('idle', 'クリックまたはタップで開始');
