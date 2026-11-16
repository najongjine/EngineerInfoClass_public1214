(() => {
  'use strict';
  const resources = window.COURSE_RESOURCES || [];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const storageKey = 'engineer-learning-dashboard-v1';
  let storageOK = true;
  let saved = {};
  try { const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed; }
  catch { storageOK = false; }
  const state = { week: 'all', type: 'all', view: 'all', query: '', unfinished: false };
  const weekInfo = [null,
    { title: '개발 기초와 C 프로그래밍', range: 'DAY 01 — 05' },
    { title: '자료구조·테스트와 C / Java', range: 'DAY 06 — 10' },
    { title: '객체지향·운영체제와 Java', range: 'DAY 11 — 15' },
    { title: '데이터베이스와 Python', range: 'DAY 16 — 20' }];
  const viewNames = { all: '전체 커리큘럼', theory: '이론 모의고사', coding: '코딩 실습', sql: 'SQL 보충 교재', saved: '즐겨찾기' };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s_·|/.,–—-]+/g, '');
  const record = item => saved[item.id] && typeof saved[item.id] === 'object' ? saved[item.id] : {};
  let toastTimer;
  function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2200); }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { storageOK = false; toast('저장 공간을 사용할 수 없어 현재 화면에만 반영됩니다.'); }
  }
  function resourceActions(item) {
    const itemState = record(item);
    const label = `${item.day ? `${item.day}일차 ` : ''}${item.type === 'theory' ? '이론' : item.type === 'coding' ? '코딩' : 'SQL'} ${item.topic}`;
    return `<div class="resource-actions"><button class="star-button" data-action="star" data-id="${escape(item.id)}" aria-pressed="${!!itemState.star}" aria-label="${escape(label)} 즐겨찾기" title="즐겨찾기">${itemState.star ? '★' : '☆'}</button><button class="done-button" data-action="done" data-id="${escape(item.id)}" aria-pressed="${!!itemState.done}" aria-label="${escape(label)} 학습 완료" title="학습 완료"><span>✓</span></button></div>`;
  }
  function lessonLink(item, text, className = 'resource-title') {
    return `<a class="${className}" href="${escape(item.href)}" target="_blank" rel="noopener noreferrer" data-open="${escape(item.id)}">${escape(text)} <span aria-hidden="true">↗</span></a>`;
  }
  function resourceCell(item) {
    if (!item) return '<div class="blank-cell">—</div>';
    const meta = item.type === 'theory' ? (item.questions ? `기출 ${item.questions}문항` : '이론 모의고사') : '코딩 실습';
    return `<div class="resource-cell ${record(item).done ? 'is-complete' : ''}"><div class="resource-details">${lessonLink(item, item.topic)}<div class="resource-meta">${item.language ? `<span class="language">${item.language}</span>` : ''}<span>${meta}</span></div></div>${resourceActions(item)}</div>`;
  }
  function matches(item) {
    const itemState = record(item);
    if (state.view === 'saved' && !itemState.star) return false;
    if (state.type !== 'all' && item.type !== state.type) return false;
    if (state.week !== 'all' && item.week !== Number(state.week)) return false;
    if (state.unfinished && itemState.done) return false;
    const searchable = normalize([item.title, item.file, item.topic, item.language || '', item.keywords,
      item.day ? `${item.day}일차 ${String(item.day).padStart(2, '0')}일차 ${item.week}주차 day${item.day}` : 'SQL 데이터베이스 보충 실습',
      item.type === 'theory' ? '이론 기출 모의고사' : item.type === 'coding' ? '코딩 프로그래밍' : 'SQL'].join(' '));
    return state.query.trim().split(/\s+/).filter(Boolean).every(word => searchable.includes(normalize(word)));
  }
  function updateStats() {
    const completed = resources.filter(item => record(item).done).length;
    const total = resources.length;
    const percent = total ? Math.round(completed / total * 100) : 0;
    $('#completed-total').textContent = completed;
    $('#resource-total').textContent = total;
    $('#nav-total').textContent = total;
    $('#day-total').textContent = new Set(resources.filter(item => item.day).map(item => item.day)).size;
    $('#sql-total').textContent = resources.filter(item => item.type === 'sql').length;
    $('#progress-percent').textContent = `${percent}%`;
    $('#progress-fill').style.width = `${percent}%`;
    $('.progress-track').setAttribute('aria-valuenow', percent);
    $('#saved-count').textContent = resources.filter(item => record(item).star).length;
    $('#storage-note').textContent = storageOK ? '완료 체크와 즐겨찾기는 이 브라우저에 저장됩니다.' : '브라우저 저장 불가 · 학습 기록은 현재 화면에만 유지됩니다.';
    const lastOpened = resources.filter(item => record(item).opened).sort((a, b) => record(b).opened - record(a).opened)[0];
    const next = lastOpened || resources.find(item => !record(item).done) || resources[0];
    if (next) {
      const link = $('#continue-link');
      link.href = next.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.dataset.open = next.id;
      link.innerHTML = `${lastOpened ? '최근 교재 이어보기' : completed === total ? '교재 다시 보기' : '첫 교재 시작하기'} <span aria-hidden="true">↗</span>`;
      link.title = next.title;
    }
  }
  function render() {
    const filtered = resources.filter(matches);
    const sections = [];
    for (let week = 1; week <= 4; week++) {
      const items = filtered.filter(item => item.week === week);
      if (!items.length) continue;
      const single = state.type === 'theory' || state.type === 'coding';
      const days = [...new Set(items.map(item => item.day))].sort((a, b) => a - b);
      const rows = days.map(day => {
        const theory = items.find(item => item.day === day && item.type === 'theory');
        const coding = items.find(item => item.day === day && item.type === 'coding');
        return `<div class="day-row"><div class="day-number ${day % 5 === 0 ? 'exam' : ''}"><strong>${String(day).padStart(2, '0')}</strong><span>${day % 5 === 0 ? '주차 종합' : 'DAY'}</span></div>${single ? resourceCell(theory || coding) : resourceCell(theory) + resourceCell(coding)}</div>`;
      }).join('');
      sections.push(`<section class="week-section ${single ? 'type-only' : ''}" aria-label="${week}주차"><div class="week-heading"><span class="week-number">WEEK ${String(week).padStart(2, '0')}</span><h3>${weekInfo[week].title}</h3><span class="week-range">${weekInfo[week].range}</span></div><div class="course-table"><div class="table-header" aria-hidden="true"><span>학습 일차</span><span>${single ? (state.type === 'theory' ? '이론 모의고사' : '코딩 실습') : '이론 모의고사'}</span>${single ? '' : '<span>코딩 실습</span>'}</div>${rows}</div></section>`);
    }
    const sqlItems = filtered.filter(item => item.type === 'sql');
    if (sqlItems.length) {
      const sqlDescriptions = { DCL: '사용자·DB 생성 · 권한 관리 · 빈칸 49제', DDL: '공통 문법 실습 · 테이블 정의 · 빈칸 90제', DML: '빈칸 40제 · SELECT 결과 82제' };
      const cards = sqlItems.map(item => {
        const kind = item.file.match(/SQL_([A-Z]+)/)?.[1] || 'SQL';
        const title = { DCL: '사용자와 권한 관리', DDL: '데이터베이스 구조 설계', DML: '데이터 조작과 조회' }[kind] || item.topic;
        return `<article class="sql-card ${record(item).done ? 'is-complete' : ''}"><div class="sql-top"><span class="sql-icon">SQL / ${kind}</span>${resourceActions(item)}</div>${lessonLink(item, title)}<div class="resource-meta">${sqlDescriptions[kind] || escape(item.topic)}</div>${lessonLink(item, '실습 교재 열기', 'sql-open')}</article>`;
      }).join('');
      sections.push(`<section class="sql-section" aria-label="SQL 보충 교재"><div class="week-heading"><span class="week-number">SQL LAB</span><h3>SQL 보충 교재</h3><span class="week-range">공통 문법 · 실습 · 빈칸 문제</span></div><div class="sql-grid">${cards}</div></section>`);
    }
    const focused = document.activeElement;
    const focusAction = focused?.dataset.action;
    const focusId = focused?.dataset.id;
    $('#resource-list').innerHTML = sections.join('');
    if (focusAction && focusId) {
      const replacement = $$('#resource-list button').find(button => button.dataset.action === focusAction && button.dataset.id === focusId);
      if (replacement) replacement.focus({ preventScroll: true });
      else $('#unfinished').focus({ preventScroll: true });
    }
    $('#empty-state').hidden = filtered.length > 0;
    $('#result-count').textContent = `${filtered.length}개 교재`;
    $('#heading-count').textContent = filtered.length;
    $('#curriculum-heading').firstChild.textContent = `${viewNames[state.view]} `;
    $('#breadcrumb-current').textContent = viewNames[state.view];
    $('#section-description').textContent = state.view === 'saved' ? '별표를 눌러 모아둔 교재를 빠르게 다시 열어보세요.' : state.type === 'sql' ? 'DCL · DDL · DML, 필요한 SQL 교재를 바로 열어보세요.' : '일차별 이론과 코딩을 함께 확인하고, 원하는 교재를 바로 열어보세요.';
    $$('.nav-item').forEach(button => { button.classList.toggle('active', button.dataset.view === state.view); button.setAttribute('aria-current', button.dataset.view === state.view ? 'page' : 'false'); });
    $$('.week-tab').forEach(button => { const selected = button.dataset.week === state.week; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
    $$('.type-filter').forEach(button => { const selected = button.dataset.type === state.type; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
    updateStats();
  }
  $$('.nav-item').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view; state.type = ['theory', 'coding', 'sql'].includes(state.view) ? state.view : 'all'; state.week = 'all'; state.query = ''; state.unfinished = false; $('#search').value = ''; $('#unfinished').checked = false; render();
    $('#curriculum').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  $$('.week-tab').forEach(button => button.addEventListener('click', () => { state.week = button.dataset.week; if (state.type === 'sql' && state.week !== 'all') { state.type = 'all'; if (state.view !== 'saved') state.view = 'all'; } render(); }));
  $$('.type-filter').forEach(button => button.addEventListener('click', () => { state.type = button.dataset.type; if (state.type === 'sql') state.week = 'all'; if (state.view !== 'saved') state.view = state.type; render(); }));
  $('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
  $('#unfinished').addEventListener('change', event => { state.unfinished = event.target.checked; render(); });
  $('#reset-filters').addEventListener('click', () => { Object.assign(state, { week: 'all', type: 'all', view: 'all', query: '', unfinished: false }); $('#search').value = ''; $('#unfinished').checked = false; render(); });
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if (action) {
      const id = action.dataset.id;
      const item = resources.find(item => item.id === id);
      if (!item) return;
      const field = action.dataset.action === 'star' ? 'star' : 'done';
      saved[id] = { ...record(item), [field]: !record(item)[field] };
      persist(); render();
      if (storageOK) toast(field === 'star' ? (saved[id].star ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 해제했어요.') : (saved[id].done ? '학습 완료! 한 걸음 더 나아갔어요.' : '학습 완료 표시를 해제했어요.'));
    }
    const opened = event.target.closest('[data-open]');
    if (opened) {
      const item = resources.find(item => item.id === opened.dataset.open);
      if (item) { saved[item.id] = { ...record(item), opened: Date.now() }; persist(); updateStats(); }
    }
  });
  document.addEventListener('keydown', event => { if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); $('#search').focus(); } });
  window.addEventListener('storage', event => { if (event.key === storageKey) { try { const next = JSON.parse(event.newValue || '{}'); if (next && typeof next === 'object' && !Array.isArray(next)) saved = next; } catch { /* Keep the current valid state. */ } render(); } });
  render();
})();
