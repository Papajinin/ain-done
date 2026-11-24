// AIN Done 설정 v1: 화면 모드, 테마 색, 한 주의 시작, 분류(추가·고치기·지우기·꾹 눌러 순서 바꾸기), 계정
// 기본 틀과 순서 바꾸기는 AIN Line 설정(내 질문)과 같은 방식

const settingsOverlay = document.getElementById('settingsOverlay');
const sTheme = document.getElementById('sTheme');
const sAccent = document.getElementById('sAccent');
const sWeek = document.getElementById('sWeek');
const sCats = document.getElementById('sCats');

function markSeg(seg, v) {
  seg.querySelectorAll('button').forEach(b => {
    const on = b.dataset.v === String(v);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}

function renderSettings() {
  markSeg(sTheme, state.settings.theme);
  markSeg(sAccent, state.settings.accent);
  markSeg(sWeek, state.settings.weekStart);
  renderCats();
  const signedIn = typeof cloud !== 'undefined' && cloud.user;
  document.getElementById('sAccount').hidden = !signedIn;
  document.getElementById('localNote').hidden = !!signedIn || cloudConfigured();
  if (signedIn) document.getElementById('accountEmail').textContent = cloud.user.email || '';
}

function renderCats() {
  const rows = state.cats.map(c => `
    <div class="c-row" data-cid="${c.id}">
      <button type="button" class="c-open" data-c="${c.id}">${dotHtml(c.id)}<span class="c-text">${escapeHtml(c.name)}</span></button>
      <span class="grip" aria-hidden="true">${ICONS.grip}</span>
    </div>`).join('');
  const add = state.cats.length < MAX_CATS ? `<button type="button" class="row add" data-cadd>${ICONS.plus}분류 추가</button>` : '';
  sCats.innerHTML = rows + add;
}

function openSettings() {
  renderSettings();
  showOverlay(settingsOverlay);
}

function onSeg(seg, key, cast) {
  seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.settings[key] = cast ? cast(b.dataset.v) : b.dataset.v;
    applyTheme();
    saveState();
    renderSettings();
    render();
  });
}
onSeg(sTheme, 'theme');
onSeg(sAccent, 'accent');
onSeg(sWeek, 'weekStart', Number);

document.getElementById('settingsClose').addEventListener('click', () => hideOverlay(settingsOverlay));
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) hideOverlay(settingsOverlay); });
document.getElementById('logoutBtn').addEventListener('click', () => confirmSignOut());

sCats.addEventListener('click', e => {
  if (cSkipClick) { cSkipClick = false; return; }
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.cadd !== undefined) return openCatSheet(null);
  if (b.dataset.c) return openCatSheet(b.dataset.c);
});

// ---------- 분류 추가·고치기 창 ----------
const catOverlay = document.getElementById('catOverlay');
const cName = document.getElementById('cName');
const cColors = document.getElementById('cColors');
const cSave = document.getElementById('cSave');
let cForm = null; // { id(고칠 때), c }

function openCatSheet(id) {
  const c = id ? catOf(id) : null;
  const used = state.cats.filter(x => x.id !== id).map(x => x.c);
  cForm = { id: c ? c.id : null, c: c ? c.c : CAT_COLORS.find(x => !used.includes(x)) };
  cName.value = c ? c.name : '';
  document.getElementById('cTitle').textContent = c ? '분류 고치기' : '분류 추가';
  cSave.textContent = c ? '저장' : '추가';
  document.getElementById('cEditOnly').hidden = !c;
  renderColors();
  checkCat();
  showOverlay(catOverlay);
  // 아이폰은 누르는 순간에 커서를 넣어야 키보드를 열어 줌
  if (!c) cName.focus({ preventScroll: true });
}
// 다른 분류가 쓰는 색은 흐리게, 고를 수 없음
function renderColors() {
  const used = state.cats.filter(x => x.id !== cForm.id).map(x => x.c);
  cColors.innerHTML = CAT_COLORS.map(c => `<button type="button" class="${c === cForm.c ? 'on' : ''}" data-color="${c}" aria-label="${CAT_COLOR_NAMES[c]}" aria-pressed="${c === cForm.c}"${used.includes(c) ? ' disabled' : ''}><span style="background:var(--c-${c})"></span></button>`).join('');
}
function checkCat() {
  cSave.disabled = !cName.value.trim() || !cForm.c;
}
function closeCatSheet() {
  document.activeElement && document.activeElement.blur();
  hideOverlay(catOverlay);
}
function saveCat() {
  checkCat();
  if (cSave.disabled) return;
  const data = { name: cName.value.trim(), c: cForm.c };
  if (cForm.id) Object.assign(catOf(cForm.id), data);
  else state.cats.push({ id: newId(), ...data });
  saveState();
  closeCatSheet();
  renderCats();
  render();
}
// 지우면 그 분류로 적은 기록은 "분류 없음"이 됨
function askDeleteCat() {
  const c = catOf(cForm.id);
  showActions(`'${c.name}' 분류를 지워요. 이 분류로 적은 기록은 "분류 없음"이 돼요.`, [
    { label: '분류 지우기', danger: true, fn: () => {
      state.cats = state.cats.filter(x => x.id !== c.id);
      Object.values(state.entries).forEach(e => (e.done || []).forEach(x => { if (x.cat === c.id) x.cat = null; }));
      saveState();
      closeCatSheet();
      renderCats();
      render();
    } }
  ]);
}
cColors.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  cForm.c = b.dataset.color;
  renderColors();
  checkCat();
});
cName.addEventListener('input', checkCat);
cName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveCat(); } });
cSave.addEventListener('click', saveCat);
document.getElementById('cCancel').addEventListener('click', closeCatSheet);
document.getElementById('cDelete').addEventListener('click', askDeleteCat);
catOverlay.addEventListener('click', e => { if (e.target === catOverlay) closeCatSheet(); });

// ---------- 꾹 눌러(0.45초) 끌어서 순서 바꾸기 (AIN Line·Days와 같은 방식) ----------
// 누르기 전에 손가락이 움직이면 스크롤로 봄
let cDrag = null;
let cSkipClick = false;

sCats.addEventListener('pointerdown', e => {
  const row = e.target.closest('.c-row');
  if (!row) return;
  cDrag = { row, y: e.clientY, on: false };
  cDrag.timer = setTimeout(() => {
    if (!cDrag) return;
    cDrag.on = true;
    cDrag.rows = [...sCats.querySelectorAll('.c-row')];
    cDrag.from = cDrag.to = cDrag.rows.indexOf(row);
    cDrag.tops = cDrag.rows.map(r => r.offsetTop);
    cDrag.hs = cDrag.rows.map(r => r.offsetHeight);
    sCats.classList.add('sorting');
    row.classList.add('dragging');
    if (navigator.vibrate) navigator.vibrate(10);
  }, 450);
});
document.addEventListener('pointermove', e => {
  if (!cDrag) return;
  if (!cDrag.on) {
    if (Math.abs(e.clientY - cDrag.y) > 8) { clearTimeout(cDrag.timer); cDrag = null; }
    return;
  }
  const { rows, from, tops, hs } = cDrag;
  const last = rows.length - 1;
  const dy = Math.max(tops[0] - tops[from] - 4, Math.min(tops[last] + hs[last] - hs[from] - tops[from] + 4, e.clientY - cDrag.y));
  cDrag.row.style.transform = `translateY(${dy}px)`;
  const mid = tops[from] + hs[from] / 2 + dy;
  let to = from;
  rows.forEach((r, k) => {
    if (k === from) return;
    const m = tops[k] + hs[k] / 2;
    let shift = 0;
    if (k < from && mid <= m) { shift = hs[from]; to--; }
    if (k > from && mid >= m) { shift = -hs[from]; to++; }
    r.style.transform = shift ? `translateY(${shift}px)` : '';
  });
  cDrag.to = to;
});
document.addEventListener('touchmove', e => { if (cDrag && cDrag.on) e.preventDefault(); }, { passive: false });

function endCDrag() {
  if (!cDrag) return;
  clearTimeout(cDrag.timer);
  const was = cDrag;
  cDrag = null;
  if (!was.on) return;
  cSkipClick = true;
  setTimeout(() => { cSkipClick = false; }, 400);
  const { rows, from, to, tops, hs, row } = was;
  const y = to > from ? tops[to] + hs[to] - hs[from] - tops[from] : tops[to] - tops[from];
  row.classList.add('settle');
  row.style.transform = `translateY(${y}px)`;
  setTimeout(() => {
    const order = rows.map(r => catOf(r.dataset.cid));
    order.splice(to, 0, order.splice(from, 1)[0]);
    state.cats = order;
    sCats.classList.remove('sorting');
    saveState();
    renderCats();
    render();
  }, 380); // 내려앉는 움직임(--t)이 끝난 뒤
}
document.addEventListener('pointerup', endCDrag);
document.addEventListener('pointercancel', endCDrag);
