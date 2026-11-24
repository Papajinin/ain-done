// AIN Done 오늘 화면 v1: 날짜 줄, 오늘 한 일 적기(추천), 한 일 목록, 하루 한 줄(자동 저장), 한 일 창, 날짜 고르기, 날짜 넘기기
// 날짜 넘기기(버튼·옆으로 쓸기)와 자동 저장은 AIN Line 쓰기 화면과 같은 방식

function todayHtml() {
  const k = ui.sel;
  const isToday = k === ui.today;
  return `
    <header class="top">
      <h1 class="wordmark"><b>AIN</b> Done</h1>
      <div class="top-right">
        <button class="icon-btn" type="button" data-go="recall" aria-label="돌아보기"><span class="icon-circle">${ICONS.recall}</span></button>
        <button class="icon-btn" type="button" data-go="settings" aria-label="설정"><span class="icon-circle">${ICONS.settings}</span></button>
      </div>
    </header>
    <div class="date-bar">
      <button type="button" class="date-title" data-pick aria-label="날짜 고르기">${dateLabel(k)}${holidayName(k) ? ` <em class="holiday">${holidayName(k)}</em>` : ''}</button>
      ${isToday ? '' : '<button type="button" class="today-btn" data-today>오늘</button>'}
      <div class="arrows">
        <button class="nav-btn" type="button" data-step="-1" aria-label="전날">${ICONS.back}</button>
        <button class="nav-btn" type="button" data-step="1" aria-label="다음날"${isToday ? ' disabled' : ''}>${ICONS.next}</button>
      </div>
    </div>
    <div class="day-pane">
      <div class="quick">
        <form class="direct" id="doneForm" autocomplete="off">
          <input id="doneInput" type="text" maxlength="40" value="${escapeHtml(ui.typed)}" placeholder="${isToday ? '오늘' : '이날'} 한 일 적기" aria-label="한 일 적기" enterkeyhint="done" autocomplete="off">
          <button class="add-round" type="submit" aria-label="적기"><span>${ICONS.plus}</span></button>
        </form>
        <div id="sugSlot">${sugHtml()}</div>
      </div>
      <h2 class="done-head" id="doneHead">${doneHeadHtml(k)}</h2>
      <div class="done-list" id="doneList">${doneListHtml(k)}</div>
      <div class="oneline">
        <label class="ol-label" for="lineInput">하루 한 줄</label>
        <textarea id="lineInput" class="ol-input" rows="1" placeholder="안 써도 괜찮아요">${escapeHtml(dayLine(k))}</textarea>
      </div>
    </div>`;
}

function doneHeadHtml(k) {
  const n = dayDone(k).length;
  return `${k === ui.today ? '오늘' : '이날'} 한 일${n ? ` <em class="num">${n}개</em>` : ''}`;
}
function doneListHtml(k) {
  const list = dayDone(k);
  if (!list.length) return `<p class="none">${k === ui.today ? '위에 적으면 여기에 쌓여요.' : '이날은 적은 게 없어요.'}</p>`;
  const f = ui.flash;
  ui.flash = null;
  return list.map((x, i) => `<button type="button" class="di${f && f.i === i ? ' ' + f.kind : ''}" data-item="${i}">${dotHtml(x.cat)}<span class="t">${escapeHtml(x.t)}</span></button>`).join('');
}

// ---------- 추천 줄 ----------
let sugHits = []; // 지금 보이는 추천 (버튼 번호 = 배열 순서)
function sugHtml() {
  sugHits = ui.sugOpen ? suggestions(ui.sel, ui.typed) : [];
  if (!sugHits.length) return '';
  const q = ui.typed.trim();
  const hits = sugHits;
  const name = t => {
    if (!q) return escapeHtml(t);
    const at = t.indexOf(q);
    return escapeHtml(t.slice(0, at)) + '<mark>' + escapeHtml(q) + '</mark>' + escapeHtml(t.slice(at + q.length));
  };
  return `<div class="suggest">${hits.map((e, i) => `<button class="sg" type="button" data-sg="${i}">${dotHtml(e.cat)}<span>${name(e.t)}</span><small class="num">${e.n}</small></button>`).join('')}</div>`;
}
// 글자를 칠 때는 화면 전체를 다시 그리지 않고 추천 줄만 바꿈 (키보드가 내려가지 않게)
function updateSug() {
  const slot = document.getElementById('sugSlot');
  if (slot) slot.innerHTML = sugHtml();
}
// 한 일을 적은 뒤: 목록·개수·추천만 다시 그림 (입력칸은 그대로 두어 이어서 적을 수 있게)
function updateDayParts() {
  const k = ui.sel;
  const head = document.getElementById('doneHead');
  if (!head) return render();
  head.innerHTML = doneHeadHtml(k);
  document.getElementById('doneList').innerHTML = doneListHtml(k);
  updateSug();
  const row = appEl.querySelector('.di.new, .di.again');
  if (row) row.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function writeDone(name) {
  const r = addDone(ui.sel, name);
  if (!r) return;
  ui.flash = r;
  ui.typed = '';
  const input = document.getElementById('doneInput');
  if (input) input.value = '';
  if (r.kind === 'new') saveState();
  updateDayParts();
}

appEl.addEventListener('submit', e => {
  if (e.target.id !== 'doneForm') return;
  e.preventDefault();
  const input = document.getElementById('doneInput');
  if (!input.value.trim()) return input.focus();
  writeDone(input.value);
});
appEl.addEventListener('input', e => {
  if (e.target.id !== 'doneInput') return;
  ui.typed = e.target.value;
  ui.sugOpen = true;
  updateSug();
});
// 입력칸을 누르면 추천이 나오고, 다른 곳을 누르면 사라짐
appEl.addEventListener('focusin', e => {
  if (e.target.id !== 'doneInput' || ui.sugOpen) return;
  ui.sugOpen = true;
  updateSug();
});
appEl.addEventListener('focusout', e => {
  if (e.target.id !== 'doneInput') return;
  setTimeout(() => {
    if (document.activeElement && document.activeElement.id === 'doneInput') return;
    ui.sugOpen = false;
    updateSug();
  }, 150);
});
// 추천을 누를 때 입력칸의 키보드가 내려가지 않게
appEl.addEventListener('pointerdown', e => { if (e.target.closest('.sg')) e.preventDefault(); });
appEl.addEventListener('click', e => {
  const b = e.target.closest('.sg');
  if (!b) return;
  const hit = sugHits[Number(b.dataset.sg)];
  if (hit) writeDone(hit.t);
});

// ---------- 날짜 옮기기 (미래로는 못 감) ----------
// AIN Todo 캘린더처럼: 지금 날이 옆으로 밀려나고, 새 날이 반대쪽에서 들어온다 (버튼·쓸기·날짜 고르기 모두)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sliding = false;
let paneX = 0; // 손가락을 따라 옮긴 거리

function moveDay(k) {
  if (k > ui.today) k = ui.today;
  if (sliding || (k === ui.sel && ui.view === 'today')) return;
  flushSave();
  ui.typed = '';
  ui.sugOpen = false;
  const pane = appEl.querySelector('.day-pane');
  if (ui.view !== 'today' || !pane || reduceMotion) return showDay(k);
  slideDay(k < ui.sel ? -1 : 1, k);
}
function showDay(k) {
  ui.sel = k;
  ui.view = 'today';
  render();
  window.scrollTo(0, 0);
}
function setPane(pane, x, ms, ease) {
  pane.style.transition = ms ? `transform ${ms}ms ${ease}` : 'none';
  pane.style.transform = x ? `translateX(${x}px)` : '';
  paneX = x;
}
function slideDay(dir, k) {
  sliding = true;
  appEl.classList.remove('enter');
  let pane = appEl.querySelector('.day-pane');
  const w = pane.clientWidth;
  const outMs = Math.round(80 + 140 * (1 - Math.min(Math.abs(paneX) / w, 1)));
  setPane(pane, -dir * w, outMs, 'ease-in');
  setTimeout(() => {
    showDay(k);
    pane = appEl.querySelector('.day-pane');
    setPane(pane, dir * w, 0);
    pane.offsetHeight; // 새 날을 반대쪽에 먼저 놓기
    setPane(pane, 0, 240, 'ease-out');
    setTimeout(() => {
      pane.style.transition = '';
      sliding = false;
    }, 250);
  }, outMs);
}
// 덜 밀었으면 제자리로
function snapBack() {
  const pane = appEl.querySelector('.day-pane');
  if (!pane) return;
  setPane(pane, 0, 200, 'ease-out');
  setTimeout(() => { pane.style.transition = ''; }, 210);
}

// 하루 한 줄 칸 높이: 글이 늘면 부드럽게 늘어남 (처음 그릴 때는 바로)
function growField(t, smooth) {
  const from = t.offsetHeight;
  t.style.height = 'auto';
  const to = t.scrollHeight;
  if (smooth && from && from !== to) { t.style.height = from + 'px'; void t.offsetHeight; }
  t.style.height = to + 'px';
}

// ---------- 하루 한 줄 자동 저장 ----------
// 글자를 칠 때마다 기기에 바로 저장하고, 클라우드는 잠깐 멈췄을 때 한 번에 올림 (AIN Line과 같음)
let saveTimer = null;
function scheduleSave() {
  saveLocal();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 800);
}
function flushSave() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveState();
}

appEl.addEventListener('input', e => {
  const t = e.target;
  if (t.id !== 'lineInput') return;
  const k = ui.sel;
  entryOf(k).line = t.value;
  cleanDay(k);
  growField(t, true);
  scheduleSave();
});
appEl.addEventListener('focusout', e => { if (e.target.id === 'lineInput') flushSave(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
window.addEventListener('pagehide', flushSave);

// ---------- 한 일 창 (줄을 누르면): 분류 고르기, 지우기 ----------
const itemOverlay = document.getElementById('itemOverlay');
const itemName = document.getElementById('itemName');
const itemCats = document.getElementById('itemCats');
let itemForm = null; // { k, i, cat }

function openItem(i) {
  const x = dayDone(ui.sel)[i];
  if (!x) return;
  document.activeElement && document.activeElement.blur();
  itemForm = { k: ui.sel, i, cat: catOf(x.cat) ? x.cat : null };
  itemName.textContent = x.t;
  renderItemCats();
  showOverlay(itemOverlay);
}
function renderItemCats() {
  itemCats.innerHTML = [...state.cats, null].map(c => {
    const id = c ? c.id : '';
    const on = (c ? c.id : null) === itemForm.cat;
    return `<button type="button" class="pick${on ? ' on' : ''}" data-cat="${id}" aria-pressed="${on}">${dotHtml(c ? c.id : null)}${c ? escapeHtml(c.name) : '분류 없음'}</button>`;
  }).join('');
}
itemCats.addEventListener('click', e => {
  const b = e.target.closest('.pick');
  if (!b) return;
  itemForm.cat = b.dataset.cat || null;
  renderItemCats();
});
document.getElementById('itemSave').addEventListener('click', () => {
  const x = dayDone(itemForm.k)[itemForm.i];
  if (x && x.cat !== itemForm.cat) {
    x.cat = itemForm.cat;
    saveState();
  }
  hideOverlay(itemOverlay);
  render();
});
document.getElementById('itemCancel').addEventListener('click', () => hideOverlay(itemOverlay));
itemOverlay.addEventListener('click', e => { if (e.target === itemOverlay) hideOverlay(itemOverlay); });
document.getElementById('itemDelete').addEventListener('click', () => {
  const x = dayDone(itemForm.k)[itemForm.i];
  if (!x) return;
  showActions(`'${x.t}'을(를) 지워요.`, [
    { label: '지우기', danger: true, fn: () => {
      state.entries[itemForm.k].done.splice(itemForm.i, 1);
      cleanDay(itemForm.k);
      saveState();
      hideOverlay(itemOverlay);
      render();
    } }
  ]);
});

// ---------- 날짜 고르기 창 ----------
const dateOverlay = document.getElementById('dateOverlay');
const dateCal = document.getElementById('dateCal');
let pickMonth = null;

function openDatePicker() {
  const d = parseYmd(ui.sel);
  pickMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderDatePicker();
  showOverlay(dateOverlay);
}
function renderDatePicker() {
  dateCal.innerHTML = calHtml(pickMonth, { pick: true });
}
dateCal.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.cal) {
    pickMonth = new Date(pickMonth.getFullYear(), pickMonth.getMonth() + Number(b.dataset.cal), 1);
    return renderDatePicker();
  }
  if (b.dataset.date) {
    hideOverlay(dateOverlay);
    moveDay(b.dataset.date);
  }
});
document.getElementById('dateClose').addEventListener('click', () => hideOverlay(dateOverlay));
dateOverlay.addEventListener('click', e => { if (e.target === dateOverlay) hideOverlay(dateOverlay); });

// ---------- 옆으로 쓸어 날짜 옮기기 ----------
// 오른쪽으로 쓸면 전날, 왼쪽으로 쓸면 다음날. 쓰는 동안 손가락을 따라 움직임 (AIN Line과 같은 기준)
// 입력칸·추천 줄(옆으로 밀어 보는 곳) 안에서 시작한 쓸기는 무시
let swipe = null;
let swipedAt = 0;

appEl.addEventListener('touchstart', e => {
  swipe = null;
  if (sliding || ui.view !== 'today' || e.touches.length !== 1) return;
  if (e.target.closest('input, textarea, .suggest') || document.body.classList.contains('locked')) return;
  const p = e.touches[0];
  swipe = { x: p.clientX, y: p.clientY, time: Date.now(), axis: null };
}, { passive: true });

appEl.addEventListener('touchmove', e => {
  if (!swipe) return;
  const p = e.touches[0];
  const dx = p.clientX - swipe.x, dy = p.clientY - swipe.y;
  if (!swipe.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
    swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    swipedAt = Date.now();
    if (swipe.axis === 'x') appEl.classList.remove('enter');
  }
  if (swipe.axis === 'x' && !reduceMotion) {
    const pane = appEl.querySelector('.day-pane');
    // 오늘에서 다음날 쪽으로는 조금만 끌려옴 (못 간다는 느낌)
    if (pane) setPane(pane, dx < 0 && ui.sel === ui.today ? dx / 4 : dx, 0);
  }
}, { passive: true });

appEl.addEventListener('touchend', e => {
  if (!swipe) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - swipe.x;
  const fast = Math.abs(dx) / Math.max(Date.now() - swipe.time, 1) > 0.4; // 휙 넘긴 경우
  const axis = swipe.axis;
  swipe = null;
  if (axis) swipedAt = Date.now();
  if (axis !== 'x') return;
  const pane = appEl.querySelector('.day-pane');
  const far = pane && Math.abs(dx) > pane.clientWidth * 0.25;
  const step = dx < 0 ? 1 : -1;
  if ((far || (fast && Math.abs(dx) > 30)) && !(step > 0 && ui.sel === ui.today)) {
    moveDay(ymd(addDays(parseYmd(ui.sel), step)));
  } else if (!reduceMotion) snapBack();
}, { passive: true });

appEl.addEventListener('touchcancel', () => {
  if (swipe && swipe.axis === 'x') snapBack();
  swipe = null;
}, { passive: true });

// 쓸고 난 손가락이 버튼 위에서 떨어져도 눌린 것으로 치지 않음
appEl.addEventListener('click', e => {
  if (Date.now() - swipedAt < 400) { e.stopPropagation(); e.preventDefault(); }
}, true);
