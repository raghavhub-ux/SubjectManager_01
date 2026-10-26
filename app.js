const STORAGE_KEY = 'semester-study-manager-v1';
const palettes = ['violet', 'mint', 'peach', 'blue', 'rose', 'gold'];
const icons = ['◈', '⌘', '✳', '◉', '◇', '⌬'];
const seed = {
  subjects: [
    { id: 'sub-1', name: 'Data Structures', code: 'CS 204', color: 'violet', topics: [{ id: 't1', name: 'Arrays & linked lists', done: true }, { id: 't2', name: 'Stacks and queues', done: true }, { id: 't3', name: 'Trees & traversals', done: false }, { id: 't4', name: 'Graphs & shortest paths', done: false }] },
    { id: 'sub-2', name: 'Database Systems', code: 'CS 218', color: 'mint', topics: [{ id: 't5', name: 'Relational model', done: true }, { id: 't6', name: 'SQL & normalization', done: false }, { id: 't7', name: 'Transactions', done: false }] },
    { id: 'sub-3', name: 'Discrete Mathematics', code: 'MA 201', color: 'peach', topics: [{ id: 't8', name: 'Logic & proofs', done: true }, { id: 't9', name: 'Combinatorics', done: false }, { id: 't10', name: 'Graph theory', done: false }] },
    { id: 'sub-4', name: 'Computer Networks', code: 'CS 230', color: 'blue', topics: [{ id: 't11', name: 'Network models', done: false }, { id: 't12', name: 'Transport layer', done: false }, { id: 't13', name: 'Routing & switching', done: false }] },
    { id: 'sub-5', name: 'Operating Systems', code: 'CS 222', color: 'rose', topics: [{ id: 't14', name: 'Processes & threads', done: true }, { id: 't15', name: 'Memory management', done: false }, { id: 't16', name: 'File systems', done: false }] }
  ],
  evaluations: [
    { id: 'eval-1', name: 'Trees & Graphs Quiz', subjectId: 'sub-1', type: 'Quiz', date: addDays(3) },
    { id: 'eval-2', name: 'SQL Lab Assessment', subjectId: 'sub-2', type: 'Assignment', date: addDays(7) },
    { id: 'eval-3', name: 'Mid-semester Exam', subjectId: 'sub-3', type: 'Exam', date: addDays(13) },
    { id: 'eval-4', name: 'Network Protocols Test', subjectId: 'sub-4', type: 'Quiz', date: addDays(19) }
  ]
};
function addDays(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved && Array.isArray(saved.subjects) && Array.isArray(saved.evaluations)) return saved; } catch {} return structuredClone(seed); }
let state = loadState();
let currentView = 'overview';
let subjectFilter = 'all';
let toastTimer;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function progress(subject) { return subject.topics.length ? Math.round(subject.topics.filter(topic => topic.done).length / subject.topics.length * 100) : 0; }
function allProgress() { const topics = state.subjects.flatMap(subject => subject.topics); return topics.length ? Math.round(topics.filter(topic => topic.done).length / topics.length * 100) : 0; }
function subjectFor(id) { return state.subjects.find(subject => subject.id === id); }
function formatDate(dateString, options = { month: 'short', day: 'numeric' }) { const date = new Date(`${dateString}T12:00:00`); return Number.isNaN(+date) ? 'Date TBD' : new Intl.DateTimeFormat(undefined, options).format(date); }
function daysUntil(dateString) { const today = new Date(); today.setHours(0, 0, 0, 0); const date = new Date(`${dateString}T00:00:00`); return Math.ceil((date - today) / 86400000); }
function countdown(dateString) { const days = daysUntil(dateString); if (days < 0) return 'Passed'; if (days === 0) return 'Today'; if (days === 1) return 'Tomorrow'; return `In ${days} days`; }
function sortEvaluations(evaluations) { return [...evaluations].sort((a, b) => a.date.localeCompare(b.date)); }
function renderSubjectNav() {
  $('#subjectNav').innerHTML = state.subjects.slice(0, 7).map(subject => `<button class="subject-nav-item" data-subject="${subject.id}"><span class="subject-dot ${subject.color}"></span><span>${escapeHTML(subject.name)}</span></button>`).join('');
  $('#subjectNavCount').textContent = state.subjects.length;
}
function renderStats() {
  $('#subjectStat').textContent = state.subjects.length;
  $('#progressStat').textContent = allProgress();
  $('#overallProgressBar').style.width = `${allProgress()}%`;
  $('#upcomingStat').textContent = state.evaluations.filter(item => daysUntil(item.date) >= 0).length;
}
function topicPreview(subject) {
  const open = subject.topics.find(topic => !topic.done);
  return open ? `Next up: ${open.name}` : subject.topics.length ? 'Syllabus complete!' : 'Add your syllabus topics';
}
function subjectCard(subject, detailed = false) {
  const complete = subject.topics.filter(topic => topic.done).length;
  const topicRows = detailed ? `<div class="topic-area"><div class="topic-area-head"><span>SYLLABUS CHECKLIST</span><span>${complete}/${subject.topics.length} done</span></div><div class="topic-list">${subject.topics.map(topic => `<div class="topic-row ${topic.done ? 'done' : ''}" role="checkbox" aria-checked="${topic.done}" tabindex="0" data-topic="${topic.id}" data-subject-id="${subject.id}"><span class="topic-check">${topic.done ? '✓' : ''}</span><span>${escapeHTML(topic.name)}</span></div>`).join('')}</div><form class="topic-add" data-topic-form="${subject.id}"><input maxlength="90" aria-label="Add a topic to ${escapeHTML(subject.name)}" placeholder="Add a syllabus topic…" /><button aria-label="Add topic">＋</button></form></div>` : `<div class="topic-summary"><span>${subject.topics.length} syllabus ${subject.topics.length === 1 ? 'topic' : 'topics'}</span><span>${escapeHTML(topicPreview(subject))}</span></div>`;
  return `<article class="subject-card" data-card-subject="${subject.id}"><div class="card-top"><span class="subject-icon ${subject.color}">${icons[palettes.indexOf(subject.color)] || '◈'}</span><button class="card-menu" data-delete-subject="${subject.id}" aria-label="Remove ${escapeHTML(subject.name)}" title="Remove subject">···</button></div><h3>${escapeHTML(subject.name)}</h3><div class="course-code">${escapeHTML(subject.code || 'SEMESTER SUBJECT')}</div><div class="card-progress-row"><span>Syllabus progress</span><strong>${progress(subject)}%</strong></div><div class="progress-track"><span style="width:${progress(subject)}%"></span></div>${topicRows}</article>`;
}
function renderCards() {
  const overview = state.subjects.slice(0, 3);
  $('#subjectCards').innerHTML = overview.length ? overview.map(subject => subjectCard(subject)).join('') : emptyState('Your semester starts here', 'Add a subject to build your study space.', 'Add a subject', 'add-subject');
  const filtered = state.subjects.filter(subject => subjectFilter === 'all' || (subjectFilter === 'completed' ? progress(subject) === 100 : progress(subject) < 100));
  $('#allSubjectCards').innerHTML = filtered.length ? filtered.map(subject => subjectCard(subject, true)).join('') : emptyState(state.subjects.length ? 'Nothing in this view yet' : 'Your semester starts here', state.subjects.length ? 'Subjects will show up here when they match this filter.' : 'Add a subject to build your study space.', state.subjects.length ? '' : 'Add a subject', state.subjects.length ? '' : 'add-subject');
  $('#subjectsSummary').textContent = `${state.subjects.length} ${state.subjects.length === 1 ? 'subject' : 'subjects'}`;
}
function emptyState(title, message, button, action = '') { return `<div class="empty-state" style="grid-column:1/-1"><strong>${title}</strong>${message}${button ? `<button data-action="${action}">${button}</button>` : ''}</div>`; }
function evalMarkup(item, removable = false) {
  const subject = subjectFor(item.subjectId);
  const [month, day] = formatDate(item.date, { month: 'short', day: '2-digit' }).split(' ');
  return `<div class="${removable ? 'evaluation-row' : 'upcoming-item'}"><div class="date-block"><span>${escapeHTML((month || '').toUpperCase())}</span><strong>${escapeHTML(day || '')}</strong></div><div class="event-info"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(subject?.name || 'Subject removed')} · ${escapeHTML(countdown(item.date))}</small>${removable ? `<span class="eval-type">${escapeHTML(item.type || 'Evaluation')}</span>` : ''}</div>${removable ? `<button class="delete-eval" data-delete-eval="${item.id}" aria-label="Delete evaluation" title="Delete evaluation">×</button>` : `<span class="event-countdown">${escapeHTML(countdown(item.date))}</span>`}</div>`;
}
function renderUpcoming() {
  const next = sortEvaluations(state.evaluations.filter(item => daysUntil(item.date) >= 0)).slice(0, 3);
  $('#upcomingList').innerHTML = next.length ? next.map(item => evalMarkup(item)).join('') : emptyState('A little breathing room', 'No upcoming evaluations. Add one when you have a date.');
  const focus = [...state.subjects].sort((a, b) => progress(a) - progress(b)).slice(0, 4);
  $('#focusList').innerHTML = focus.length ? focus.map(subject => `<div class="focus-row"><span class="subject-dot ${subject.color}"></span><span class="focus-row-name">${escapeHTML(subject.name)}</span><div class="mini-track"><span style="width:${progress(subject)}%"></span></div><span class="focus-row-value">${progress(subject)}%</span></div>`).join('') : emptyState('Add your first subject', 'Your syllabus progress will appear here.');
}
function renderEvaluations() {
  const upcoming = sortEvaluations(state.evaluations.filter(item => daysUntil(item.date) >= 0));
  const past = sortEvaluations(state.evaluations.filter(item => daysUntil(item.date) < 0)).reverse();
  $('#evalSummary').innerHTML = `<div class="eval-summary-card"><span>Upcoming</span><strong>${upcoming.length}</strong></div><div class="eval-summary-card"><span>Next deadline</span><strong>${upcoming.length ? escapeHTML(countdown(upcoming[0].date)) : '—'}</strong></div><div class="eval-summary-card"><span>Past evaluations</span><strong>${past.length}</strong></div>`;
  const group = (title, items) => `<section class="evaluation-group"><h2>${title} <span class="group-count">${items.length}</span></h2>${items.length ? items.map(item => evalMarkup(item, true)).join('') : emptyState(title === 'Coming up' ? 'No upcoming evaluations' : 'No past evaluations', title === 'Coming up' ? 'Add a date to make a study plan.' : 'Completed dates will collect here.')}</section>`;
  $('#allEvaluations').innerHTML = group('Coming up', upcoming) + group('Past', past);
  const select = $('#evaluationSubject');
  select.innerHTML = state.subjects.length ? state.subjects.map(subject => `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`).join('') : '<option value="" disabled selected>Add a subject first</option>';
}
function render() { renderSubjectNav(); renderStats(); renderCards(); renderUpcoming(); renderEvaluations(); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400); }
function navigate(view) {
  currentView = view;
  $$('.view').forEach(section => section.classList.toggle('active', section.id === `${view}View`));
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const labels = { overview: 'Overview', subjects: 'My subjects', evaluations: 'Evaluations' };
  $('#breadcrumbCurrent').textContent = labels[view] || 'Overview';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openSubjectDialog() { $('#subjectForm').reset(); $('#subjectDialog').showModal(); setTimeout(() => $('#subjectName').focus(), 50); }
function openEvaluationDialog() {
  if (!state.subjects.length) { showToast('Add a subject before scheduling an evaluation.'); openSubjectDialog(); return; }
  $('#evaluationForm').reset(); $('#evaluationDate').value = addDays(7); $('#evaluationDialog').showModal(); setTimeout(() => $('#evaluationName').focus(), 50);
}
function toggleTopic(subjectId, topicId) {
  const subject = subjectFor(subjectId); const topic = subject?.topics.find(item => item.id === topicId); if (!topic) return;
  topic.done = !topic.done; persist(); render();
  if (progress(subject) === 100) showToast(`${subject.name} syllabus complete — lovely work!`);
}
document.addEventListener('click', event => {
  const nav = event.target.closest('[data-view]'); if (nav) { navigate(nav.dataset.view); return; }
  const go = event.target.closest('[data-go]'); if (go) { navigate(go.dataset.go); return; }
  if (event.target.closest('#quickAdd,#addSubjectTop,#addSubjectHero,#addSubjectPage')) { openSubjectDialog(); return; }
  if (event.target.closest('#addEvaluation')) { openEvaluationDialog(); return; }
  const close = event.target.closest('[data-close]'); if (close) { $(`#${close.dataset.close}`).close(); return; }
  const action = event.target.closest('[data-action]'); if (action?.dataset.action === 'add-subject') { openSubjectDialog(); return; }
  const topic = event.target.closest('[data-topic]'); if (topic) { toggleTopic(topic.dataset.subjectId, topic.dataset.topic); return; }
  const removeSubject = event.target.closest('[data-delete-subject]'); if (removeSubject) {
    const subject = subjectFor(removeSubject.dataset.deleteSubject); if (!subject) return;
    if (!confirm(`Remove ${subject.name} and its syllabus topics?`)) return;
    state.subjects = state.subjects.filter(item => item.id !== subject.id); state.evaluations = state.evaluations.filter(item => item.subjectId !== subject.id); persist(); render(); showToast(`${subject.name} removed.`); return;
  }
  const removeEval = event.target.closest('[data-delete-eval]'); if (removeEval) { state.evaluations = state.evaluations.filter(item => item.id !== removeEval.dataset.deleteEval); persist(); render(); showToast('Evaluation removed.'); }
});
document.addEventListener('keydown', event => { const topic = event.target.closest('[data-topic]'); if (topic && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleTopic(topic.dataset.subjectId, topic.dataset.topic); } });
document.addEventListener('submit', event => {
  const form = event.target.closest('[data-topic-form]'); if (!form) return;
  event.preventDefault(); const input = $('input', form); const name = input.value.trim(); if (!name) return;
  const subject = subjectFor(form.dataset.topicForm); if (!subject) return;
  subject.topics.push({ id: `topic-${Date.now()}`, name, done: false }); persist(); render(); showToast('Syllabus topic added.');
});
$('#subjectForm').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#subjectName').value.trim(); if (!name) return;
  const subject = { id: `subject-${Date.now()}`, name, code: $('#subjectCode').value.trim(), color: $('#subjectColor').value, topics: $('#subjectTopics').value.split('\n').map(line => line.trim()).filter(Boolean).map((topic, index) => ({ id: `topic-${Date.now()}-${index}`, name: topic, done: false })) };
  state.subjects.push(subject); persist(); render(); $('#subjectDialog').close(); navigate(currentView); showToast(`${name} added to your semester.`);
});
$('#evaluationForm').addEventListener('submit', event => {
  event.preventDefault(); const item = { id: `evaluation-${Date.now()}`, name: $('#evaluationName').value.trim(), subjectId: $('#evaluationSubject').value, type: $('#evaluationType').value, date: $('#evaluationDate').value };
  if (!item.name || !item.subjectId || !item.date) return;
  state.evaluations.push(item); persist(); render(); $('#evaluationDialog').close(); navigate('evaluations'); showToast('Evaluation added to your calendar.');
});
$$('[data-filter]').forEach(button => button.addEventListener('click', () => { subjectFilter = button.dataset.filter; $$('[data-filter]').forEach(tab => tab.classList.toggle('active', tab === button)); renderCards(); }));
$('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('semester-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });
function init() {
  if (localStorage.getItem('semester-theme') === 'dark') document.body.classList.add('dark');
  $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  render();
}
init();
