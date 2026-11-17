(() => {
  'use strict';
  const resources = window.COURSE_RESOURCES || [];
  const list = document.querySelector('#materials');
  const search = document.querySelector('#search');
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s_·|/.,–—-]+/g, '');
  const link = item => `<a href="${escape(item.href)}" target="_blank" rel="noopener noreferrer">${escape(item.topic)}</a>`;
  function cell(item, label) {
    return `<td class="lesson" data-label="${label}">${item ? link(item) : '<span aria-label="해당 검색 결과 없음">—</span>'}</td>`;
  }
  function render() {
    const words = search.value.trim().split(/\s+/).filter(Boolean).map(normalize);
    const matches = resources.filter(item => {
      const text = normalize(`${item.title} ${item.topic} ${item.language || ''} ${item.number ? `${item.number} ${item.number}번` : 'SQL'}`);
      return words.every(word => /^\d+(?:번)?$/.test(word) ? item.number === parseInt(word, 10) : text.includes(word));
    });
    const sections = [];
    for (let group = 1; group <= 4; group++) {
      const items = matches.filter(item => item.group === group);
      if (!items.length) continue;
      const numbers = [...new Set(items.map(item => item.number))].sort((a, b) => a - b);
      const rows = numbers.map(number => {
        const theory = items.find(item => item.number === number && item.type === 'theory');
        const coding = items.find(item => item.number === number && item.type === 'coding');
        return `<tr><td class="day">${number}</td>${cell(theory, '이론 모의고사')}${cell(coding, '코딩')}</tr>`;
      }).join('');
      const range = `${(group - 1) * 5 + 1}–${group * 5}`;
      sections.push(`<section id="week-${group}" aria-labelledby="heading-${group}"><h2 id="heading-${group}">${range}</h2><table aria-label="${range} 교재"><thead><tr><th scope="col">번호</th><th scope="col">이론 모의고사</th><th scope="col">코딩</th></tr></thead><tbody>${rows}</tbody></table></section>`);
    }
    const sql = matches.filter(item => item.type === 'sql');
    if (sql.length) sections.push(`<section id="sql" aria-labelledby="sql-heading"><h2 id="sql-heading">SQL 보충 교재</h2><ul class="sql-list">${sql.map(item => `<li>${link(item)}</li>`).join('')}</ul></section>`);
    list.innerHTML = sections.join('');
    document.querySelector('#result-count').textContent = `${matches.length}개 교재`;
    document.querySelector('#empty-state').hidden = matches.length > 0;
    document.querySelector('nav').hidden = words.length > 0;
  }
  search.addEventListener('input', render);
  render();
})();
