// AIN Done 시작 v1: 화면 고르기·그리기, 누르기 처리, 날짜 바뀜, 시작 화면, 클라우드 시작 (AIN Line과 같은 틀)

function render() {
  if (ui.view === 'recall') appEl.innerHTML = recallHtml();
  else if (ui.view === 'search') appEl.innerHTML = searchHtml();
  else appEl.innerHTML = todayHtml();
  // 움직임은 화면을 바꾼 그 한 번만 (같은 화면을 다시 그릴 때는 가만히)
  appEl.className = 'app' + (ui.anim ? ' ' + ui.anim : '');
  ui.anim = '';
  const line = document.getElementById('lineInput');
  if (line) growField(line, false);
}

function go(view) {
  flushSave();
  ui.anim = 'enter';
  ui.view = view;
  ui.sugOpen = false;
  render();
  window.scrollTo(0, 0);
}

function goBack() {
  if (ui.view === 'search') return go('recall');
  go('today');
}

// 돌아보기의 기간 줄 아래만 옆으로 살짝 밀려 들어옴 (주간·월간·연간 바꾸기, ‹ ›)
function renderPeriod(dir) {
  render();
  const pane = appEl.querySelector('.period-pane');
  if (pane && dir) pane.classList.add(dir < 0 ? 'from-left' : 'from-right');
}

appEl.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.go === 'settings') return openSettings();
  if (d.go === 'recall') { ui.back = 0; return go('recall'); }
  if (d.go) return go(d.go);
  if (d.back !== undefined) return goBack();
  if (d.step) return moveDay(ymd(addDays(parseYmd(ui.sel), Number(d.step))));
  if (d.today !== undefined) return moveDay(ui.today);
  if (d.pick !== undefined) return openDatePicker();
  if (d.item) return openItem(Number(d.item));
  if (d.date) { ui.sel = d.date; ui.typed = ''; return go('today'); }
  if (d.period) {
    if (d.period === ui.period) return;
    ui.period = d.period;
    ui.back = 0;
    // 고른 표시가 먼저 미끄러지고 나서 아래 내용을 바꿈
    appEl.querySelectorAll('#periodSeg button').forEach(b => b.classList.toggle('on', b === t));
    return setTimeout(() => renderPeriod(1), 180);
  }
  if (d.shift) {
    ui.back = Math.max(0, ui.back + Number(d.shift));
    return renderPeriod(Number(d.shift) > 0 ? -1 : 1);
  }
  if (d.openCat) {
    if (ui.open.has(d.openCat)) ui.open.delete(d.openCat);
    else { ui.open.add(d.openCat); ui.justOpened = d.openCat; }
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }
});

// 앱을 켜 둔 채 날짜가 바뀌면 '오늘'을 새로 계산
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = todayStr();
  if (now === ui.today) return;
  if (ui.sel === ui.today) ui.sel = now;
  ui.today = now;
  render();
});

// 시작 화면: 첫 화면을 다 그린 뒤에 움직이기 시작 → 약 1.5초 움직이고 잠깐 두었다가 사라짐
// 클라우드 연결은 움직임이 거의 끝난 뒤에 시작해서 끊기지 않게 (AIN Line과 같은 방법)
let splashStarted = false;
function startSplash() {
  if (splashStarted) return;
  splashStarted = true;
  const splash = document.getElementById('splash');
  splash.classList.add('go');
  setTimeout(initCloud, 1700);
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 400);
    lockStart(); // 잠금이 켜져 있으면 Face ID·지문 확인 창을 저절로 띄움
  }, 1600);
}

loadState(); // 기기에 저장된 내용으로 먼저 보여 주고, 클라우드에서 최신 내용을 받으면 다시 그림
applyTheme();
render();
requestAnimationFrame(() => requestAnimationFrame(startSplash)); // 첫 화면이 그려진 다음 장면부터
setTimeout(startSplash, 1000); // 화면 그리기 신호가 오지 않는 경우(백그라운드에서 열림 등) 대비
