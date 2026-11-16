import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = (await readdir(path.join(root, '교재'))).filter(name => name.endsWith('.html')).sort();
const resources = [];
for (const file of files) {
  const html = await readFile(path.join(root, '교재', file), 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim();
  if (!title) throw new Error(`제목이 없는 교재: ${file}`);
  const day = Number(file.match(/^(\d+)일차/)?.[1]) || null;
  const type = file.startsWith('SQL_') ? 'sql' : file.includes('_코딩_') ? 'coding' : 'theory';
  const topic = title.replace(/^\d+일차\s*(?:이론\s*모의고사|코딩)\s*[|·]?\s*/, '')
    .replace(/^정보처리기사\s*/, '').replace(/\s*·\s*(?:(?:중복 제거\s*)?(?:실제 기출\s*)?)\d+문항$/, '');
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map(match => match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).join(' ');
  resources.push({ id: file.replace(/\.html$/, ''), file, title, topic, day,
    week: day ? Math.ceil(day / 5) : null, type,
    language: type === 'coding' ? (day <= 7 ? 'C' : day <= 15 ? 'Java' : 'Python') : null,
    questions: Number(title.match(/(\d+)문항/)?.[1]) || null,
    keywords: headings.slice(0, 2500),
    href: `교재/${encodeURIComponent(file)}`,
    source: `https://github.com/najongjine/EngineerInfoClass_public1214/blob/main/${encodeURIComponent('교재')}/${encodeURIComponent(file)}` });
}
if (resources.filter(item => item.day).length !== 40 || resources.filter(item => item.type === 'sql').length !== 3) {
  console.warn('교재 구성이 변경되었습니다. 대시보드에서 목록을 확인하세요.');
}
await writeFile(path.join(root, 'dashboard-data.js'), `// 교재 파일에서 자동 생성. 수정 후 node scripts/build-dashboard.mjs 실행\nwindow.COURSE_RESOURCES = ${JSON.stringify(resources, null, 2)};\n`, 'utf8');
const dist = path.join(root, 'dashboard-site', 'dist');
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'dashboard.css', 'dashboard.js', 'dashboard-data.js']) {
  await cp(path.join(root, file), path.join(dist, file));
}
await cp(path.join(root, '교재'), path.join(dist, '교재'), { recursive: true });
console.log(`${resources.length}개 교재 색인 생성 / dashboard-site/dist 준비 완료`);
