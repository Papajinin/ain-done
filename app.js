// AIN Done 공통 v1: 날짜 도우미(공휴일 포함), 저장소, 상태, 한 일·분류·추천, 화면 모드·테마 색, 아래에서 올라오는 창
// 기본 틀은 AIN Line과 같음

const STORE_KEY = 'ainDone';
const appEl = document.getElementById('app');
const WEEK_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const CAT_COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'pink', 'teal', 'brown']; // 공통 카테고리 색 8가지
const CAT_COLOR_NAMES = { blue: '블루', green: '그린', orange: '오렌지', red: '레드', purple: '퍼플', pink: '핑크', teal: '청록', brown: '노랑' };
const MAX_CATS = 8;    // 색이 겹치지 않게 8개까지
const SUGGEST_MAX = 8; // 추천은 한 줄에 최대 8개 (AIN Cost와 같음)
const RECENT_DAYS = 30; // 빈칸일 때 추천: 최근 30일 동안 많이 한 순

// ---------- 날짜 ('YYYY-MM-DD' 문자열) ----------
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// 빨간 날: 일요일 또는 공휴일 (공휴일 목록은 AIN Todo의 holidays.js를 같이 씀)
function holidayName(s) {
  return (typeof HOLIDAYS !== 'undefined' && HOLIDAYS[s]) || '';
}
function isRedDay(s) {
  return parseYmd(s).getDay() === 0 || !!holidayName(s);
}
function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayStr() {
  return ymd(new Date());
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
// n달 전 같은 날. 그런 날이 없으면(3월 31일의 한 달 전 등) 그달의 마지막 날
function monthsAgo(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() - n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}
function dateLabel(k) {
  const d = parseYmd(k);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK_NAMES[d.getDay()]}요일`;
}
function weekLead(d) {
  return (d.getDay() - state.settings.weekStart + 7) % 7;
}
function weekLabelsHtml() {
  return [...Array(7)].map((_, i) => (i + state.settings.weekStart) % 7)
    .map(n => `<span${n === 0 ? ' class="sun"' : ''}>${WEEK_NAMES[n]}</span>`).join('');
}

// ---------- 상태 ----------
// 하루 기록: entries['YYYY-MM-DD'] = { done: [{ t: 이름, cat: 분류 id 또는 null, at: 적은 시각(ms) }], line: 하루 한 줄 }
//  - at은 화면에 보이지 않고, 적은 순서를 지키는 데만 씀
//  - 한 일도 하루 한 줄도 없으면 그날 기록을 지움
// 분류: cats = [{ id, name, c }] (순서 = 돌아보기에 보이는 순서)
let state = {
  entries: {},
  cats: [],
  // theme: light | dark | auto (기기마다), accent: blue | green | red | yellow, weekStart: 0 | 1 (계정마다)
  settings: { theme: 'auto', accent: 'blue', weekStart: 0 }
};

// 저장하지 않는 화면 상태
const ui = {
  today: todayStr(),
  sel: todayStr(),     // 오늘 화면의 날짜
  view: 'today',       // today | recall | search
  period: 'week',      // 돌아보기: week | month | year
  back: 0,             // 돌아보기: 몇 기간 전
  open: new Set(),     // 돌아보기: 펼친 분류
  q: '',               // 찾는 글자
  typed: '',           // 오늘 한 일 적기 칸의 글자
  sugOpen: false,      // 추천 줄이 보이는지
  flash: null,         // 다음 그리기에서 반짝일 줄 { i, kind: 'new' | 'again' }
  anim: ''             // 다음 그리기 한 번만 쓰는 움직임 (enter)
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    state = {
      entries: saved.entries || {},
      cats: saved.cats || [],
      settings: { ...state.settings, ...(saved.settings || {}) }
    };
    return true;
  } catch (e) {
    return false;
  }
}

// 이 기기에만 저장 (클라우드에서 받은 내용을 저장할 때)
function saveLocal() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// 내가 바꾼 내용 저장: 기기 + 클라우드 (sync.js)
function saveState() {
  saveLocal();
  if (typeof cloudSave === 'function') cloudSave();
}

// 화면 모드('자동'이면 아이폰 설정을 따름)와 테마 색
function applyTheme() {
  const { theme: mode, accent } = state.settings;
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');
  if (accent === 'green' || accent === 'red' || accent === 'yellow') root.setAttribute('data-accent', accent);
  else root.removeAttribute('data-accent');
}

// 아래에서 올라오는 창 열기·닫기
function showOverlay(el) {
  el.hidden = false;
  document.body.classList.add('locked');
  el.showFrame = requestAnimationFrame(() => el.classList.add('show'));
}
function hideOverlay(el) {
  cancelAnimationFrame(el.showFrame); // 열리기 직전에 닫으면 다시 열리지 않게
  el.classList.remove('show');
  if (!document.querySelector('.overlay.show')) document.body.classList.remove('locked');
  setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 380); // 닫히는 움직임(0.35초)이 끝난 뒤
}

function newId() {
  return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// ---------- 한 일 ----------
function dayDone(k) {
  const e = state.entries[k];
  return (e && e.done) || [];
}
function dayLine(k) {
  const e = state.entries[k];
  return (e && e.line) || '';
}
function hasEntry(k) {
  return dayDone(k).length > 0 || !!dayLine(k).trim();
}
function entryOf(k) {
  return state.entries[k] || (state.entries[k] = { done: [], line: '' });
}
function cleanDay(k) {
  if (!hasEntry(k)) delete state.entries[k];
}
// 같은 날 같은 일은 한 번만. 돌려주는 값: { i: 줄 번호, kind: 'new'(새로 적음) | 'again'(이미 있음) }
// 지난 기록에 같은 이름이 있으면 마지막에 적었을 때의 분류를 따라감
function addDone(k, name) {
  const t = name.trim();
  if (!t) return null;
  const list = entryOf(k).done || (state.entries[k].done = []);
  const was = list.findIndex(x => x.t === t);
  if (was >= 0) return { i: was, kind: 'again' };
  const info = itemIndex().get(t);
  list.push({ t, cat: info && catOf(info.cat) ? info.cat : null, at: Date.now() });
  return { i: list.length - 1, kind: 'new' };
}

// ---------- 분류 ----------
function catOf(id) {
  return id ? state.cats.find(c => c.id === id) || null : null;
}
function catColor(id) {
  const c = catOf(id);
  return c ? `var(--c-${c.c})` : 'var(--line)';
}
function dotHtml(id) {
  return `<span class="dot" style="background:${catColor(id)}"></span>`;
}

// ---------- 추천 (AIN Cost 내역 자동완성과 같은 방식) ----------
// 지난 기록 전체에서 이름마다: 지금까지 적은 횟수, 최근 30일 횟수, 마지막으로 적은 날과 그때의 분류
function itemIndex() {
  const map = new Map();
  const from = ymd(addDays(parseYmd(ui.today), -(RECENT_DAYS - 1)));
  Object.keys(state.entries).sort().forEach(k => {
    dayDone(k).forEach(x => {
      const e = map.get(x.t) || { t: x.t, n: 0, n30: 0, last: '', cat: null };
      e.n++;
      if (k >= from && k <= ui.today) e.n30++;
      if (k >= e.last) { e.last = k; e.cat = x.cat; }
      map.set(x.t, e);
    });
  });
  return map;
}
// 빈칸이면 최근 30일 동안 많이 한 순, 글자가 있으면 그 글자가 들어간 이름을 많이 쓴 순.
// 그날 이미 적은 일과 똑같이 친 이름은 빼고 최대 8개
function suggestions(k, typed) {
  const q = typed.trim();
  const done = new Set(dayDone(k).map(x => x.t));
  const all = [...itemIndex().values()].filter(e => !done.has(e.t));
  const byLast = (a, b) => (b.last > a.last) - (b.last < a.last);
  const hits = q
    ? all.filter(e => e.t !== q && e.t.includes(q)).sort((a, b) => b.n - a.n || byLast(a, b))
    : all.filter(e => e.n30 > 0).sort((a, b) => b.n30 - a.n30 || byLast(a, b));
  return hits.slice(0, SUGGEST_MAX);
}

// ---------- 아이콘 ----------
const ICONS = {
  recall: '<svg viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8"/><path d="M12 7.5V12l3 2"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h16"/></svg>'
};

// 선택 버튼 묶음(.seg): 고른 칸 표시가 옆으로 미끄러짐 (네 앱 공통 방식)
// 어느 칸을 골랐는지는 화면마다 .on으로 정하고, 여기서는 그 칸을 따라가기만 함
const segPos = new Map(); // 묶음을 다시 그려도 지난 자리에서 미끄러지게
function segKey(seg) { return seg.id || seg.dataset.seg || seg.getAttribute('aria-label') || ''; }
function moveSegThumb(thumb, pos, animate) {
  if (!animate) thumb.style.transition = 'none';
  thumb.style.width = pos.w + 'px';
  thumb.style.transform = `translateX(${pos.x}px)`;
  if (!animate) { void thumb.offsetWidth; thumb.style.transition = ''; }
}
function placeSegThumb(seg, animate) {
  let thumb = seg.querySelector(':scope > .seg-thumb');
  if (!thumb) {
    thumb = document.createElement('span');
    thumb.className = 'seg-thumb';
    seg.prepend(thumb);
    seg.classList.add('has-thumb');
    segResize.observe(seg);
    const last = segPos.get(segKey(seg));
    if (last) { moveSegThumb(thumb, last, false); thumb.dataset.ready = '1'; } else animate = false;
  }
  const on = seg.querySelector(':scope > button.on');
  thumb.hidden = !on;
  if (!on || !on.offsetWidth) return; // 닫힌 창 안: 보일 때 segResize가 다시 부름
  const pos = { x: on.offsetLeft, w: on.offsetWidth };
  moveSegThumb(thumb, pos, animate && thumb.dataset.ready === '1');
  thumb.dataset.ready = '1';
  if (segKey(seg)) segPos.set(segKey(seg), pos);
}
const segResize = new ResizeObserver(list => list.forEach(e => placeSegThumb(e.target, true)));
new MutationObserver(list => {
  const segs = new Set();
  for (const m of list) {
    if (m.type === 'attributes') {
      const p = m.target.parentElement;
      if (p && p.classList.contains('seg')) segs.add(p);
      continue;
    }
    if (m.target.classList && m.target.classList.contains('seg')) segs.add(m.target);
    m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.classList.contains('seg')) segs.add(n);
      n.querySelectorAll('.seg').forEach(s => segs.add(s));
    });
  }
  segs.forEach(s => placeSegThumb(s, true));
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
document.querySelectorAll('.seg').forEach(s => placeSegThumb(s, false));
// 아이폰 사파리는 이게 있어야 누르는 동안(:active) 모양이 바뀜
document.addEventListener('touchstart', () => {}, { passive: true });

// 창 바깥(어두운 판)을 눌렀다 뗐을 때만 창을 닫음.
// 입력칸 안에서 드래그를 시작해 바깥에서 손을 떼면, 브라우저가 이를 '바깥 클릭'으로 알아 창이 닫히던 문제를 막음
let pressStartTarget = null;
document.addEventListener('pointerdown', e => { pressStartTarget = e.target; }, true);
document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('overlay') && pressStartTarget !== e.target) {
    e.stopPropagation();
  }
}, true);
