// AIN Done 돌아보기 v1: 주간·월간·연간 합계, 분류별 개수(누르면 펼침), 월간 달력(색칠 없음), 그날의 기록 카드, 찾기

// 달력 (월간 돌아보기, 날짜 고르기 창이 같이 씀)
//  - 기록이 있는 날도 색칠하지 않음 (빈 날은 "안 한 날"이 아니라 "안 적은 날"이라, 칠하면 빈칸을 세게 됨)
//  - 일요일·공휴일은 빨간 숫자. 지난날은 모두 누르면 그날로
//  - head: 위에 달 이름과 ‹ › 를 그릴지 (월간 돌아보기는 기간 줄이 대신함)
function calHtml(month, opts) {
  const y = month.getFullYear(), m = month.getMonth();
  const now = parseYmd(ui.today);
  const atNow = y === now.getFullYear() && m === now.getMonth();
  const lead = weekLead(month);
  const last = new Date(y, m + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= last; d++) {
    const k = ymd(new Date(y, m, d));
    const cls = ['cd', isRedDay(k) ? 'red' : '', k === ui.today ? 'today' : ''].join(' ');
    if (k > ui.today) cells += `<button type="button" class="${cls}" disabled><span class="n">${d}</span></button>`;
    else cells += `<button type="button" class="${cls}" data-date="${k}" aria-label="${dateLabel(k)}"><span class="n">${d}</span></button>`;
  }
  const head = opts.pick ? `
    <div class="cal-head">
      <h3 class="month num">${y}년 ${m + 1}월</h3>
      <div class="arrows">
        <button class="nav-btn" type="button" data-cal="-1" aria-label="지난달">${ICONS.back}</button>
        <button class="nav-btn" type="button" data-cal="1" aria-label="다음 달"${atNow ? ' disabled' : ''}>${ICONS.next}</button>
      </div>
    </div>` : '';
  return `${head}<div class="cal-labels">${weekLabelsHtml()}</div><div class="cal-grid">${cells}</div>`;
}

// 처음 적은 날 (아직 없으면 오늘): 더 지난 기간으로 못 가게
function earliestKey() {
  const keys = Object.keys(state.entries).filter(hasEntry).sort();
  return keys.length && keys[0] < ui.today ? keys[0] : ui.today;
}

// 보고 있는 기간: 주간(한 주의 시작 설정), 월간, 연간
function periodRange() {
  const t = parseYmd(ui.today);
  if (ui.period === 'week') {
    const start = addDays(t, -weekLead(t) - 7 * ui.back), end = addDays(start, 6);
    const endMonth = end.getMonth() === start.getMonth() ? '' : `${end.getMonth() + 1}월 `;
    return { start, end, title: `${start.getMonth() + 1}월 ${start.getDate()}일 – ${endMonth}${end.getDate()}일`, word: ui.back ? '이 주에' : '이번 주에' };
  }
  if (ui.period === 'year') {
    const y = t.getFullYear() - ui.back;
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31), title: `${y}년`, word: ui.back ? '이 해에' : '올해' };
  }
  const start = new Date(t.getFullYear(), t.getMonth() - ui.back, 1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0), title: `${start.getFullYear()}년 ${start.getMonth() + 1}월`, word: ui.back ? '이 달에' : '이번 달에' };
}

// 그날의 기록: 일주일·한 달·100일·6개월·1년 전 중 기록이 있는 날만, 가까운 것부터
function recallCards() {
  const t = parseYmd(ui.today);
  return [
    ['일주일 전', addDays(t, -7)],
    ['한 달 전', monthsAgo(t, 1)],
    ['100일 전', addDays(t, -100)],
    ['6개월 전', monthsAgo(t, 6)],
    ['1년 전', monthsAgo(t, 12)]
  ].map(([ago, d]) => ({ ago, k: ymd(d), d })).filter(c => dayDone(c.k).length > 0);
}
function shortDate(d) {
  const sameYear = d.getFullYear() === parseYmd(ui.today).getFullYear();
  return `${sameYear ? '' : d.getFullYear() + '년 '}${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function subTop(title, right) {
  return `
    <header class="top sub">
      <button class="icon-btn" type="button" data-back aria-label="뒤로"><span class="icon-circle">${ICONS.back}</span></button>
      <h1><span>${title}</span></h1>
      ${right || '<span></span>'}
    </header>`;
}

function recallHtml() {
  const r = periodRange();
  const from = ymd(r.start), to = ymd(r.end) < ui.today ? ymd(r.end) : ui.today;
  // 분류별로 모으기 (지운 분류의 기록은 "분류 없음")
  const groups = new Map();
  let total = 0;
  Object.keys(state.entries).forEach(k => {
    if (k < from || k > to) return;
    dayDone(k).forEach(x => {
      total++;
      const id = catOf(x.cat) ? x.cat : 'none';
      const g = groups.get(id) || { id, n: 0, items: new Map() };
      g.n++;
      g.items.set(x.t, (g.items.get(x.t) || 0) + 1);
      groups.set(id, g);
    });
  });
  // 분류 순서는 설정에서 정한 순서, "분류 없음"은 맨 아래
  const rows = [...state.cats.map(c => c.id), 'none'].map(id => groups.get(id)).filter(Boolean);
  const max = Math.max(1, ...rows.map(g => g.n));
  const catRows = rows.map(g => {
    const c = catOf(g.id === 'none' ? null : g.id);
    const open = ui.open.has(g.id);
    const items = [...g.items.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
    return `
      <div class="cat-block">
        <button type="button" class="cat" data-open-cat="${g.id}" aria-expanded="${open}">
          ${dotHtml(c ? c.id : null)}<span class="n">${c ? escapeHtml(c.name) : '분류 없음'}</span>
          <span class="bar"><i style="width:${(g.n / max) * 100}%;background:${c ? `var(--c-${c.c})` : 'var(--sub)'}"></i></span>
          <span class="c num">${g.n}번</span><span class="chev">${ICONS.next}</span>
        </button>
        ${open ? `<div class="subs${ui.justOpened === g.id ? ' opening' : ''}">${items.map(([t, n]) => `<div class="sr"><span class="n">${escapeHtml(t)}</span><span class="c num">${n}번</span></div>`).join('')}</div>` : ''}
      </div>`;
  }).join('');
  ui.justOpened = null;

  const oldest = ymd(r.start) <= earliestKey();
  const cal = ui.period === 'month' ? `<div class="cal">${calHtml(r.start, {})}</div>` : '';
  const cards = recallCards().map(c => {
    const done = dayDone(c.k), line = dayLine(c.k).trim();
    return `
      <button type="button" class="mcard" data-date="${c.k}">
        <span class="ago">${c.ago}</span><span class="md">${shortDate(c.d)}</span>
        <span class="k">${escapeHtml(line || done.slice(0, 2).map(x => x.t).join(', '))}</span>
        <span class="cnt">한 일 ${done.length}개</span>
      </button>`;
  }).join('');

  return `
    ${subTop('돌아보기', `<button class="icon-btn end" type="button" data-go="search" aria-label="찾기"><span class="icon-circle">${ICONS.search}</span></button>`)}
    <div class="seg-wrap"><div class="seg wide grow" id="periodSeg">
      <button type="button" data-period="week" class="${ui.period === 'week' ? 'on' : ''}">주간</button>
      <button type="button" data-period="month" class="${ui.period === 'month' ? 'on' : ''}">월간</button>
      <button type="button" data-period="year" class="${ui.period === 'year' ? 'on' : ''}">연간</button>
    </div></div>
    <div class="period-pane">
      <div class="period">
        <h2 class="num">${r.title}</h2>
        <div class="arrows">
          <button class="nav-btn" type="button" data-shift="1" aria-label="이전"${oldest ? ' disabled' : ''}>${ICONS.back}</button>
          <button class="nav-btn" type="button" data-shift="-1" aria-label="다음"${ui.back === 0 ? ' disabled' : ''}>${ICONS.next}</button>
        </div>
      </div>
      <div class="total"><span>${r.word} 한 일</span><b class="num">${total}</b><span>개</span></div>
      ${rows.length ? `<div class="cats">${catRows}</div>` : ''}
      ${cal}
    </div>
    ${cards ? `<h2 class="sec-title">그날의 기록</h2><div class="cards">${cards}</div>` : ''}`;
}

// ---------- 찾기 ----------
function searchHtml() {
  return `
    ${subTop('찾기')}
    <label class="search">${ICONS.search}<input id="searchInput" type="search" value="${escapeHtml(ui.q)}" placeholder="한 일, 하루 한 줄에서 찾기" aria-label="찾을 글자" autocomplete="off" enterkeyhint="search"></label>
    <div id="searchRes">${searchResHtml()}</div>`;
}

function searchHits(q) {
  const needle = q.toLowerCase(), hits = [];
  Object.keys(state.entries).sort().reverse().forEach(k => {
    dayDone(k).forEach(x => { if (x.t.toLowerCase().includes(needle)) hits.push({ k, t: x.t, cat: x.cat, line: false }); });
    const line = dayLine(k);
    if (line && line.toLowerCase().includes(needle)) hits.push({ k, t: line, line: true });
  });
  return hits;
}
// 찾은 글자를 테마 색 굵은 글씨로 (대문자·소문자 구분 없이)
function markHtml(text, q) {
  const low = text.toLowerCase(), needle = q.toLowerCase();
  let out = '', i = 0, j;
  while ((j = low.indexOf(needle, i)) !== -1) {
    out += escapeHtml(text.slice(i, j)) + '<mark>' + escapeHtml(text.slice(j, j + q.length)) + '</mark>';
    i = j + q.length;
  }
  return out + escapeHtml(text.slice(i));
}
function searchResHtml() {
  const q = ui.q.trim();
  if (!q) return '';
  const hits = searchHits(q);
  const rows = hits.map(h => {
    const d = parseYmd(h.k);
    return `<button type="button" class="res" data-date="${h.k}">
      <span class="d num${isRedDay(h.k) ? ' red' : ''}">${d.getMonth() + 1}/${d.getDate()} ${WEEK_NAMES[d.getDay()]}</span>
      ${h.line ? '' : dotHtml(h.cat)}
      <span class="t">${h.line ? '<small>하루 한 줄</small>' : ''}${markHtml(h.t, q)}</span>
    </button>`;
  }).join('');
  return `<div class="res-count fade-in">${hits.length ? hits.length + '개 찾음' : '찾은 기록이 없어요'}</div>${rows ? `<div class="list fade-in">${rows}</div>` : ''}`;
}

appEl.addEventListener('input', e => {
  if (e.target.id !== 'searchInput') return;
  ui.q = e.target.value;
  document.getElementById('searchRes').innerHTML = searchResHtml();
});
appEl.addEventListener('keydown', e => {
  if (e.target.id === 'searchInput' && e.key === 'Enter') e.target.blur(); // 키보드 내리기
});
