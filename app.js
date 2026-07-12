import { extraGenerators, extraSkillIds } from './extra-generators.js';
import { renderVisual } from './visual-renderers.js';

const CONTENT_ROOT = './data';
const STORAGE_KEY = 'eleven_plus_maths_state_v1';
const ACTIVE_SKILLS = new Set([
  'ar_divide_equal_groups',
  'pct_percent_of_amount',
  'ar_multi_step_numeric',
  'stat_mean',
  'alg_substitution',
  'seq_arithmetic_geometric',
  'dec_add_subtract',
  ...extraSkillIds,
]);
const CORRECT_POINTS = 7;
const WRONG_POINTS = 10;
const COMPLETION_POINTS = 100;
const STATUS_LABELS = {
  not_attempted: 'Not started',
  in_progress: 'In progress',
  done: 'Completed',
  mastered: 'Mastered',
};
const TOPIC_STYLES = [
  ['#3457d5', '#eef2ff'], ['#8b4abb', '#f7effc'], ['#c06a18', '#fff5e9'],
  ['#168461', '#e9f8f2'], ['#147f96', '#e9f8fb'], ['#bd3b67', '#fceef4'],
];

let topics = [];
let skills = [];
let archetypes = [];
let state = loadState();
let currentSkill = null;
let currentQuestion = null;
let selectedArchetypeId = null;
let questionCounter = 0;
let questionAnswered = false;
let catalogueFilter = 'all';
let diagnosticSession = null;

function difficultyForPoints(points) {
  if (points < 25) return 'easy';
  if (points <= 75) return 'medium';
  return 'hard';
}

function parseYamlList(text) {
  const records = [];
  let current = null;
  let activeArray = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (/^- id:/.test(rawLine)) {
      if (current) records.push(current);
      current = { id: scalar(rawLine.slice(rawLine.indexOf(':') + 1)) };
      activeArray = null;
      continue;
    }
    if (!current) continue;
    const field = rawLine.match(/^  ([a-z_]+):(?:\s*(.*))?$/);
    if (field) {
      const [, key, value = ''] = field;
      if (value === '') {
        current[key] = [];
        activeArray = key;
      } else {
        current[key] = scalar(value);
        activeArray = null;
      }
      continue;
    }
    const arrayItem = rawLine.match(/^  - (.+)$/);
    if (arrayItem && activeArray) current[activeArray].push(scalar(arrayItem[1]));
  }
  if (current) records.push(current);
  return records;
}

function scalar(value) {
  const clean = value.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (clean === 'true') return true;
  if (clean === 'false') return false;
  if (clean === 'null') return null;
  if (/^-?\d+$/.test(clean)) return Number(clean);
  return clean;
}

function defaultState() {
  return {
    schema_version: 1,
    question_tally: { attempted: 0, correct: 0, wrong: 0 },
    skill_progress: {},
    todo_skills: [],
    known_skills: [],
    completed_tests: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.schema_version === 1 ? { ...defaultState(), ...saved } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todoSkillIds() {
  if (!Array.isArray(state.todo_skills)) state.todo_skills = [];
  return state.todo_skills;
}

function knownSkillIds() {
  if (!Array.isArray(state.known_skills)) state.known_skills = [];
  return state.known_skills;
}

function skillEvaluation(skillId) {
  if (todoSkillIds().includes(skillId)) return 'todo';
  if (knownSkillIds().includes(skillId)) return 'known';
  return 'unmarked';
}

function setSkillEvaluation(skillId, evaluation, { rerender = false, persist = true } = {}) {
  const todos = new Set(todoSkillIds()), known = new Set(knownSkillIds());
  todos.delete(skillId); known.delete(skillId);
  if (evaluation === 'todo') todos.add(skillId);
  if (evaluation === 'known') known.add(skillId);
  state.todo_skills = [...todos]; state.known_skills = [...known];
  if (persist) saveState();
  if (rerender) renderCatalogue();
}

function resetSkillProgress(skill) {
  const progress=state.skill_progress[skill.id];
  if(!progress||progress.attempts===0) return;
  if(!window.confirm(`Reset all progress for “${skill.title}”?`)) return;
  state.question_tally.attempted=Math.max(0,state.question_tally.attempted-progress.attempts);
  state.question_tally.correct=Math.max(0,state.question_tally.correct-progress.correct);
  state.question_tally.wrong=Math.max(0,state.question_tally.wrong-progress.wrong);
  delete state.skill_progress[skill.id];
  saveState();
  renderCatalogue();
}

function resetAllProgress() {
  if(state.question_tally.attempted===0&&Object.keys(state.skill_progress).length===0) return;
  if(!window.confirm('Reset progress for every skill? This cannot be undone.')) return;
  const todos = [...todoSkillIds()];
  const known = [...knownSkillIds()];
  state=defaultState();
  state.todo_skills = todos;
  state.known_skills = known;
  saveState();
  renderCatalogue();
}

function progressFor(skillId) {
  const progress = state.skill_progress[skillId];
  if (progress) {
    progress.points = Math.min(COMPLETION_POINTS, Math.max(0, progress.points));
    if (progress.points >= COMPLETION_POINTS) progress.status = 'done';
    else if (progress.status === 'done' || progress.status === 'mastered') progress.status = progress.attempts ? 'in_progress' : 'not_attempted';
    return progress;
  }
  return {
    skill_id: skillId, points: 0, attempts: 0, correct: 0, wrong: 0, status: 'not_attempted',
  };
}

function renderCatalogue() {
  const list = document.querySelector('#topic-list');
  const expandedTopics = new Set([...list.querySelectorAll('.topic-section')]
    .filter((section) => section.querySelector('.topic-header')?.getAttribute('aria-expanded') === 'true')
    .map((section) => section.dataset.topicId));
  list.replaceChildren();
  topics.forEach((topic, index) => {
    const allTopicSkills = skills.filter((skill) => skill.topic_id === topic.id);
    const topicSkills = allTopicSkills.filter((skill) => catalogueFilter === 'all' || skillEvaluation(skill.id) === catalogueFilter);
    if (!topicSkills.length) return;
    const section = document.querySelector('#topic-template').content.cloneNode(true);
    const root = section.querySelector('.topic-section');
    root.dataset.topicId = topic.id;
    const header = section.querySelector('.topic-header');
    if (expandedTopics.has(topic.id)) header.setAttribute('aria-expanded', 'true');
    const grid = section.querySelector('.exercise-grid');
    const [color, pale] = TOPIC_STYLES[index % TOPIC_STYLES.length];
    root.style.setProperty('--topic-color', color);
    root.style.setProperty('--topic-pale', pale);
    section.querySelector('.topic-icon').textContent = String(index + 1).padStart(2, '0');
    section.querySelector('.topic-heading strong').textContent = topic.title;
    section.querySelector('.topic-heading small').textContent = topic.description;
    const availableCount = topicSkills.filter((skill) => ACTIVE_SKILLS.has(skill.id)).length;
    section.querySelector('.topic-count').textContent = availableCount ? `${availableCount} available · ${topicSkills.length} skills` : `${topicSkills.length} skills`;

    header.addEventListener('click', () => {
      header.setAttribute('aria-expanded', String(header.getAttribute('aria-expanded') !== 'true'));
    });

    const topicProgress = allTopicSkills.map((skill) => progressFor(skill.id));
    const topicStarted = topicProgress.filter((item) => item.attempts > 0).length;
    const topicInProgress = topicProgress.filter((item) => item.attempts > 0 && item.points < COMPLETION_POINTS).length;
    const topicCompleted = topicProgress.filter((item) => item.points >= COMPLETION_POINTS).length;
    const topicTodo = allTopicSkills.filter((skill) => skillEvaluation(skill.id) === 'todo').length;
    const topicKnown = allTopicSkills.filter((skill) => skillEvaluation(skill.id) === 'known').length;
    const topicSummary = section.querySelector('.topic-summary');
    topicSummary.innerHTML = `
      <span><strong>${topicStarted}</strong><small>Started</small></span>
      <span><strong>${topicInProgress}</strong><small>In progress</small></span>
      <span><strong>${topicCompleted}</strong><small>Completed</small></span>
      <span><strong>${allTopicSkills.length-topicTodo-topicKnown}</strong><small>Not evaluated</small></span>
      <span><strong>${topicTodo}</strong><small>TODO</small></span>
      <span><strong>${topicKnown}</strong><small>I know this</small></span>
    `;
    const topicTestButton = section.querySelector('.topic-test-button'), topicDifficulty = section.querySelector('.topic-test-difficulty');
    topicTestButton.disabled = availableCount === 0;
    topicTestButton.addEventListener('click', () => startDiagnostic(topic.id, topicDifficulty.value));

    topicSkills.forEach((skill) => grid.append(createExerciseCard(skill)));
    list.append(section);
  });
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-filter';
    empty.textContent = 'No skills are on your TODO list yet. Add them from any skill card or during the skills check.';
    list.append(empty);
  }
  renderSummary();
}

function createExerciseCard(skill) {
  const available = ACTIVE_SKILLS.has(skill.id);
  const progress = progressFor(skill.id);
  const card = document.createElement('article');
  card.className = `exercise-card ${available ? 'available' : 'inactive'}`;
  const evaluation = skillEvaluation(skill.id);
  if (evaluation !== 'unmarked') card.classList.add(evaluation);

  const status = document.createElement('span');
  status.className = `status ${available ? progress.status : 'inactive'}`;
  status.textContent = available ? STATUS_LABELS[progress.status] : 'Coming soon';
  const title = document.createElement('h3');
  title.textContent = skill.title;
  const description = document.createElement('p');
  description.textContent = skill.description;
  const icon = document.createElement('span');
  icon.className = available ? 'card-arrow' : 'lock';
  icon.textContent = available ? '●' : '○';
  icon.setAttribute('aria-hidden', 'true');
  card.append(status, title, description, icon);
  if (available) {
    const progressElement = document.createElement('div');
    progressElement.className = 'card-progress';
    progressElement.innerHTML = `
      <div class="card-progress-label"><span>Progress</span><span>${progress.points} / ${COMPLETION_POINTS}</span></div>
      <div class="card-progress-track"><span style="width: ${progress.points}%"></span></div>
    `;
    card.append(progressElement);
    if (progress.status === 'done') card.classList.add('completed');
  }
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const todo = document.createElement('button'), known = document.createElement('button');
  todo.type = known.type = 'button';
  todo.className = `card-action todo-action${evaluation === 'todo' ? ' selected' : ''}`;
  known.className = `card-action known-action${evaluation === 'known' ? ' selected' : ''}`;
  todo.textContent = evaluation === 'todo' ? '✓ TODO' : 'TODO';
  known.textContent = evaluation === 'known' ? '✓ I know this' : 'I know this';
  todo.setAttribute('aria-pressed', String(evaluation === 'todo'));
  known.setAttribute('aria-pressed', String(evaluation === 'known'));
  todo.addEventListener('click', () => setSkillEvaluation(skill.id, evaluation === 'todo' ? 'unmarked' : 'todo', { rerender: true }));
  known.addEventListener('click', () => setSkillEvaluation(skill.id, evaluation === 'known' ? 'unmarked' : 'known', { rerender: true }));
  actions.append(todo, known);
  if (available) {
    const practice = document.createElement('button');
    practice.type = 'button';
    practice.className = 'card-action practice';
    practice.textContent = 'Practise skill';
    practice.addEventListener('click', () => openPractice(skill));
    actions.append(practice);
  }
  const inspect = document.createElement('button');
  inspect.type = 'button';
  inspect.className = 'card-action';
  inspect.textContent = 'Question types';
  inspect.addEventListener('click', () => openArchetypeDialog(skill));
  actions.append(inspect);
  if(available){
    const reset=document.createElement('button');
    reset.type='button'; reset.className='card-action reset'; reset.textContent='Reset';
    reset.disabled=progress.attempts===0;
    reset.setAttribute('aria-label',`Reset progress for ${skill.title}`);
    reset.addEventListener('click',()=>resetSkillProgress(skill));
    actions.append(reset);
  }
  card.append(actions);
  return card;
}

function renderSummary() {
  const allProgress = skills.map((skill) => progressFor(skill.id));
  const started = allProgress.filter((item) => item.attempts > 0).length;
  const inProgress = allProgress.filter((item) => item.attempts > 0 && item.points < COMPLETION_POINTS).length;
  const completed = allProgress.filter((item) => item.points >= COMPLETION_POINTS).length;
  const allIds = skills.map((skill) => skill.id), todoCount = allIds.filter((id) => skillEvaluation(id) === 'todo').length, knownCount = allIds.filter((id) => skillEvaluation(id) === 'known').length;
  const tally = state.question_tally;
  document.querySelector('#skills-started').textContent = started;
  document.querySelector('#skills-in-progress').textContent = inProgress;
  document.querySelector('#skills-completed').textContent = completed;
  document.querySelector('#skills-not-evaluated').textContent = skills.length - todoCount - knownCount;
  document.querySelector('#skills-todo').textContent = todoCount;
  document.querySelector('#skills-known').textContent = knownCount;
  document.querySelector('#overall-progress').style.width = `${started / skills.length * 100}%`;
  document.querySelector('#header-correct').textContent = tally.correct;
  document.querySelector('#question-summary').textContent = tally.attempted
    ? `${tally.correct} of ${tally.attempted} questions correct`
    : 'No questions answered yet';
  document.querySelector('#reset-all-button').disabled=tally.attempted===0&&Object.keys(state.skill_progress).length===0;
  document.querySelector('#todo-count').textContent = todoCount;
  document.querySelector('#known-count').textContent = knownCount;
  document.querySelector('#unmarked-count').textContent = skills.length - todoCount - knownCount;
}

function setCatalogueFilter(filter) {
  catalogueFilter = filter;
  document.querySelectorAll('.skill-filter button').forEach((button) => button.classList.toggle('active', button.dataset.filter === filter));
  renderCatalogue();
}

function openArchetypeDialog(skill) {
  const dialog = document.querySelector('#archetype-dialog');
  const skillArchetypes = archetypes.filter((archetype) => archetype.skill_id === skill.id);
  document.querySelector('#archetype-dialog-title').textContent = skill.title;
  document.querySelector('#archetype-dialog-description').textContent = `${skillArchetypes.length} question type${skillArchetypes.length === 1 ? '' : 's'} defined for this skill.`;
  const list = document.querySelector('#archetype-list');
  list.replaceChildren();

  skillArchetypes.forEach((archetype) => {
    const ready = Boolean(generators[archetype.id]);
    const item = document.createElement('article');
    item.className = 'archetype-item';
    const header = document.createElement('div');
    header.className = 'archetype-item-header';
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = archetype.title;
    const summary = document.createElement('p');
    summary.textContent = archetype.archetype_summary;
    copy.append(title, summary);
    header.append(copy);
    if (ready) {
      const tryButton = document.createElement('button');
      tryButton.type = 'button';
      tryButton.className = 'try-type';
      tryButton.textContent = 'Try this type';
      tryButton.addEventListener('click', () => {
        dialog.close();
        openPractice(skill, archetype.id);
      });
      header.append(tryButton);
    }
    const meta = document.createElement('div');
    meta.className = 'archetype-meta';
    meta.innerHTML = `
      <span class="meta-badge">Difficulty ${archetype.difficulty}/5</span>
      <span class="meta-badge">${archetype.requires_visual_component ? `Visual: ${archetype.visual_component_type}` : 'Text only'}</span>
      <span class="meta-badge ${ready ? 'ready' : ''}">${ready ? 'Implemented' : 'Not implemented'}</span>
      <span class="meta-badge">ID: ${archetype.id}</span>
    `;
    item.append(header, meta);
    list.append(item);
  });
  dialog.showModal();
}

function openPractice(skill, archetypeId = null) {
  currentSkill = skill;
  selectedArchetypeId = archetypeId;
  document.querySelector('#catalogue-view').hidden = true;
  document.querySelector('#practice-view').hidden = false;
  document.querySelector('#practice-title').textContent = skill.title;
  const topicTitle = topics.find((topic) => topic.id === skill.topic_id)?.title || '';
  const archetypeTitle = archetypes.find((item) => item.id === archetypeId)?.title;
  document.querySelector('#practice-topic').textContent = archetypeTitle ? `${topicTitle} · ${archetypeTitle}` : topicTitle;
  updatePracticePoints();
  showNextQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closePractice() {
  document.querySelector('#practice-view').hidden = true;
  document.querySelector('#catalogue-view').hidden = false;
  currentSkill = null;
  selectedArchetypeId = null;
  renderCatalogue();
}

function showNextQuestion() {
  const seed = (Date.now() + questionCounter++ * 2654435761) >>> 0;
  const difficulty = difficultyForPoints(progressFor(currentSkill.id).points);
  const availableGenerators = archetypes
    .filter((item) => item.skill_id === currentSkill.id && generators[item.id])
    .map((item) => item.id);
  const archetypeId = selectedArchetypeId || chooseArchetypeId(seed, availableGenerators);
  currentQuestion = generators[archetypeId](seed, { difficulty });
  questionAnswered = false;
  updateDifficultyIndicator(difficulty);
  document.querySelector('#question-prompt').textContent = currentQuestion.prompt;
  renderQuestionVisual(currentQuestion.visual);
  const options = document.querySelector('#answer-options');
  options.replaceChildren();
  currentQuestion.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.innerHTML = `<span class="answer-letter">${option.id}</span><span></span>`;
    button.lastElementChild.textContent = option.text;
    button.addEventListener('click', () => markAnswer(option.id));
    options.append(button);
  });
  const feedback = document.querySelector('#feedback');
  feedback.hidden = true;
  feedback.className = 'feedback';
  document.querySelector('#next-button').hidden = true;
}

function renderQuestionVisual(visual) {
  renderVisual(document.querySelector('#question-visual'),visual,formatNumber);
}

function markAnswer(optionId, { skipped = false } = {}) {
  if (questionAnswered) return;
  questionAnswered = true;
  const correct = optionId === currentQuestion.answer;
  const progress = progressFor(currentSkill.id);
  progress.attempts += 1;
  progress.correct += correct ? 1 : 0;
  progress.wrong += correct ? 0 : 1;
  progress.points = Math.min(COMPLETION_POINTS, Math.max(0, progress.points + (correct ? CORRECT_POINTS : -WRONG_POINTS)));
  progress.last_practiced_at = new Date().toISOString();
  progress.status = progress.points >= COMPLETION_POINTS ? 'done' : 'in_progress';
  state.skill_progress[currentSkill.id] = progress;
  if (progress.status === 'done') setSkillEvaluation(currentSkill.id, 'known', { persist: false });
  state.question_tally.attempted += 1;
  state.question_tally.correct += correct ? 1 : 0;
  state.question_tally.wrong += correct ? 0 : 1;
  saveState();

  document.querySelectorAll('.answer-button').forEach((button) => {
    button.disabled = true;
    const id = button.querySelector('.answer-letter').textContent;
    if (id === currentQuestion.answer) button.classList.add('correct');
    else if (id === optionId) button.classList.add('wrong');
  });
  if (currentQuestion.visual?.answerSymmetryAxes) {
    renderQuestionVisual({
      ...currentQuestion.visual,
      symmetryAxes: currentQuestion.visual.answerSymmetryAxes,
    });
  }
  const feedback = document.querySelector('#feedback');
  feedback.hidden = false;
  feedback.classList.add(correct ? 'correct' : 'wrong');
  feedback.textContent = progress.status === 'done'
    ? `Skill completed! ${currentQuestion.explanation}`
    : skipped ? `Question skipped. +${CORRECT_POINTS} points. ${currentQuestion.explanation}`
      : correct ? `Correct! +${CORRECT_POINTS} points. ${currentQuestion.explanation}`
      : `Not quite. −${WRONG_POINTS} points. ${currentQuestion.explanation}`;
  document.querySelector('#next-button').hidden = false;
  updatePracticePoints();
  renderSummary();
}

function updatePracticePoints() {
  const progress = progressFor(currentSkill.id);
  document.querySelector('#practice-points').textContent = `${progress.points} / ${COMPLETION_POINTS} points`;
  document.querySelector('#practice-progress-bar').style.width = `${progress.points}%`;
  document.querySelector('#practice-score').textContent = `${progress.correct}/${progress.attempts} correct`;
}

function updateDifficultyIndicator(difficulty) {
  const shell = document.querySelector('.practice-shell');
  const indicator = document.querySelector('#difficulty-indicator');
  shell.dataset.difficulty = difficulty;
  indicator.dataset.level = difficulty;
  indicator.setAttribute('aria-label', `Current difficulty: ${difficulty}`);
}

function diagnosticSkills(topicId) {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return [];
  return skills
    .filter((skill) => skill.topic_id === topicId)
    .filter((skill) => archetypes.some((archetype) => archetype.skill_id === skill.id && generators[archetype.id]))
    .map((skill) => ({ skill, topic }));
}

function startDiagnostic(topicId, difficulty = 'hard') {
  diagnosticSession = { difficulty, topicId, items: diagnosticSkills(topicId), index: 0, results: [], answered: false, question: null };
  if (!diagnosticSession.items.length) return;
  document.querySelector('#catalogue-view').hidden = true;
  document.querySelector('#practice-view').hidden = true;
  document.querySelector('#diagnostic-view').hidden = false;
  document.querySelector('.diagnostic-shell').dataset.difficulty = difficulty;
  showDiagnosticQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDiagnosticQuestion() {
  const session = diagnosticSession;
  if (!session || session.index >= session.items.length) { finishDiagnostic(); return; }
  const { skill, topic } = session.items[session.index];
  const ids = archetypes.filter((item) => item.skill_id === skill.id && generators[item.id]).map((item) => item.id);
  const seed = (Date.now() + session.index * 2654435761) >>> 0;
  const archetypeId = chooseArchetypeId(seed, ids);
  session.question = generators[archetypeId](seed, { difficulty: session.difficulty });
  session.answered = false;
  const topicItems = session.items, topicPosition = session.index + 1;
  document.querySelector('#diagnostic-topic-title').textContent = topic.title;
  document.querySelector('#diagnostic-overall-progress').textContent = `${session.index + 1} of ${session.items.length}`;
  document.querySelector('#diagnostic-progress-bar').style.width = `${session.index / session.items.length * 100}%`;
  document.querySelector('#diagnostic-section-progress').textContent = `Question ${topicPosition} of ${topicItems.length} in this section`;
  document.querySelector('#diagnostic-skill-name').textContent = skill.title;
  document.querySelector('#diagnostic-question-prompt').textContent = session.question.prompt;
  renderVisual(document.querySelector('#diagnostic-question-visual'), session.question.visual, formatNumber);
  const options = document.querySelector('#diagnostic-answer-options');
  options.replaceChildren();
  session.question.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'answer-button';
    button.innerHTML = `<span class="answer-letter">${option.id}</span><span></span>`;
    button.lastElementChild.textContent = option.text;
    button.addEventListener('click', () => answerDiagnosticQuestion(option.id));
    options.append(button);
  });
  document.querySelectorAll('input[name="diagnostic-evaluation"]').forEach((input) => { input.checked = input.value === skillEvaluation(skill.id); });
  const feedback = document.querySelector('#diagnostic-feedback');
  feedback.hidden = true; feedback.className = 'feedback';
  document.querySelector('#diagnostic-skip-question').hidden = false;
  document.querySelector('#diagnostic-next-question').hidden = true;
}

function answerDiagnosticQuestion(optionId) {
  const session = diagnosticSession;
  if (!session || session.answered) return;
  session.answered = true;
  const correct = optionId === session.question.answer;
  const { skill } = session.items[session.index];
  session.results.push({ skillId: skill.id, correct, skipped: false });
  document.querySelectorAll('#diagnostic-answer-options .answer-button').forEach((button) => {
    button.disabled = true;
    const id = button.querySelector('.answer-letter').textContent;
    if (id === session.question.answer) button.classList.add('correct');
    else if (id === optionId) button.classList.add('wrong');
  });
  if (session.question.visual?.answerSymmetryAxes) renderVisual(document.querySelector('#diagnostic-question-visual'), { ...session.question.visual, symmetryAxes: session.question.visual.answerSymmetryAxes }, formatNumber);
  if (!correct) {
    setSkillEvaluation(skill.id, 'todo');
    document.querySelector('input[name="diagnostic-evaluation"][value="todo"]').checked = true;
  }
  const feedback = document.querySelector('#diagnostic-feedback');
  feedback.hidden = false; feedback.classList.add(correct ? 'correct' : 'wrong');
  feedback.textContent = correct ? `Correct. ${session.question.explanation}` : `Not quite. ${session.question.explanation} We have suggested adding this skill to TODO.`;
  document.querySelector('#diagnostic-skip-question').hidden = true;
  document.querySelector('#diagnostic-next-question').hidden = false;
}

function skipDiagnosticQuestion() {
  const session = diagnosticSession;
  if (!session || session.answered) return;
  session.results.push({ skillId: session.items[session.index].skill.id, correct: null, skipped: true });
  session.index += 1;
  showDiagnosticQuestion();
}

function nextDiagnosticQuestion() {
  if (!diagnosticSession) return;
  diagnosticSession.index += 1;
  showDiagnosticQuestion();
}

function skipDiagnosticSection() {
  const session = diagnosticSession;
  if (!session) return;
  const firstSkipped = session.answered ? session.index + 1 : session.index;
  for (let index = firstSkipped; index < session.items.length; index += 1) {
    session.results.push({ skillId: session.items[index].skill.id, correct: null, skipped: true });
  }
  session.index = session.items.length;
  showDiagnosticQuestion();
}

function finishDiagnostic() {
  const session = diagnosticSession;
  if (!session) return;
  document.querySelector('#diagnostic-question-card').hidden = true;
  document.querySelector('.diagnostic-section-meta').hidden = true;
  document.querySelector('#diagnostic-complete').hidden = false;
  document.querySelector('#diagnostic-topic-title').textContent = 'Complete';
  document.querySelector('#diagnostic-overall-progress').textContent = `${session.items.length} skills`;
  document.querySelector('#diagnostic-progress-bar').style.width = '100%';
  const answered = session.results.filter((result) => !result.skipped), correct = answered.filter((result) => result.correct).length, skipped = session.results.filter((result) => result.skipped).length;
  const topicIds = new Set(session.items.map((item) => item.skill.id)), topicTodos = [...topicIds].filter((id) => skillEvaluation(id) === 'todo').length, topicKnown = [...topicIds].filter((id) => skillEvaluation(id) === 'known').length;
  document.querySelector('#diagnostic-result-summary').textContent = `You answered ${correct} of ${answered.length} attempted questions correctly${skipped ? ` and skipped ${skipped}` : ''}. In this topic, ${topicTodos} skill${topicTodos === 1 ? ' is' : 's are'} TODO and ${topicKnown} ${topicKnown === 1 ? 'is' : 'are'} marked “I know this”.`;
}

function exitDiagnostic({ showTopic = false } = {}) {
  const topicId = diagnosticSession?.topicId;
  diagnosticSession = null;
  document.querySelector('#diagnostic-view').hidden = true;
  document.querySelector('#diagnostic-question-card').hidden = false;
  document.querySelector('.diagnostic-section-meta').hidden = false;
  document.querySelector('#diagnostic-complete').hidden = true;
  document.querySelector('#catalogue-view').hidden = false;
  setCatalogueFilter('all');
  if (showTopic && topicId) document.querySelector(`.topic-section[data-topic-id="${topicId}"] .topic-header`)?.setAttribute('aria-expanded', 'true');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function seededRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

function choose(rng, items) { return items[Math.floor(rng() * items.length)]; }

export function chooseArchetypeId(seed, archetypeIds) {
  if (!archetypeIds.length) throw new Error('No implemented archetypes are available for this skill.');
  return choose(seededRng(seed ^ 0xA53A9E1D), archetypeIds);
}

function shuffle(rng, items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cleanNumber(value) {
  if (!Number.isFinite(value)) throw new Error('A generator produced a non-finite number.');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNumber(value) {
  return cleanNumber(value).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

function numericOptions(rng, answer, candidates, format = formatNumber) {
  answer = cleanNumber(answer);
  const choices = [];
  const displayedValues = new Set();
  const addChoice = (rawValue) => {
    const value = cleanNumber(rawValue);
    const text = format(value);
    if (value < 0 || displayedValues.has(text)) return;
    choices.push({ value, text });
    displayedValues.add(text);
  };

  [answer, ...candidates].forEach(addChoice);
  for (let offset = 1; choices.length < 5; offset += 1) {
    for (const candidate of [answer + offset, answer - offset]) {
      addChoice(candidate);
      if (choices.length === 5) break;
    }
  }
  const shuffled = shuffle(rng, choices.slice(0, 5));
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return {
    options: shuffled.map((choice, index) => ({ id: letters[index], text: choice.text })),
    answer: letters[shuffled.findIndex((choice) => choice.value === answer)],
  };
}

const EQUAL_GROUP_SCENARIOS = [
  { items: 'counters', groups: 'tables', setting: 'a maths lesson' },
  { items: 'seedlings', groups: 'garden rows', setting: 'a community garden' },
  { items: 'badges', groups: 'display boxes', setting: 'a school fair' },
  { items: 'books', groups: 'classroom shelves', setting: 'a new library corner' },
  { items: 'tennis balls', groups: 'training bags', setting: 'a sports club' },
];
const EQUAL_GROUP_FORMS = [
  (s,t,g) => `During ${s.setting}, ${t} ${s.items} are shared equally among ${g} ${s.groups}. How many go in each?`,
  (s,t,g) => `${s.setting[0].toUpperCase()+s.setting.slice(1)} has ${t} ${s.items} to place in ${g} equal ${s.groups}. Find the number in each ${s.groups.replace(/s$/, '')}.`,
  (s,t,g) => `The organiser at ${s.setting} divides ${t} ${s.items} evenly between ${g} ${s.groups}. What is each group's share?`,
  (s,t,g) => `${g} ${s.groups} at ${s.setting} must each receive the same number from a collection of ${t} ${s.items}. How many does each receive?`,
];
const EQUAL_GROUP_TEMPLATES = EQUAL_GROUP_SCENARIOS.flatMap((scenario) => EQUAL_GROUP_FORMS.map((form) => (total, groups) => form(scenario, total, groups)));

const MEAN_SCENARIOS = [
  { values: 'quiz scores', one: 'score' },
  { values: 'daily reading totals', one: 'reading total' },
  { values: 'scores in a darts practice', one: 'score' },
  { values: 'numbers of laps completed', one: 'lap total' },
  { values: 'plant heights in centimetres', one: 'plant height' },
];
const MEAN_FORMS = [
  (s,n,m,k) => `${n} ${s.values} have a mean of ${m}. ${n-1} of them are ${k}. What is the missing ${s.one}?`,
  (s,n,m,k) => `The mean of ${n} ${s.values} is ${m}. The recorded values are ${k} and one unknown value. Find the unknown value.`,
  (s,n,m,k) => `After one ${s.one} was smudged, the remaining ${s.values} read ${k}. There were ${n} values with mean ${m}. What was smudged?`,
  (s,n,m,k) => `A set of ${n} ${s.values} averages ${m}. If the known values are ${k}, calculate the final ${s.one}.`,
];
const MEAN_TEMPLATES = MEAN_SCENARIOS.flatMap((scenario) => MEAN_FORMS.map((form) => (count, mean, known) => form(scenario, count, mean, known.join(', '))));

const DECIMAL_ADD_TEMPLATES = [
  (a,b) => ({ prompt:`Two parcels weigh ${a} kg and ${b} kg. What is their combined mass?`, unit:'kg' }),
  (a,b) => ({ prompt:`A ribbon is made by joining lengths of ${a} m and ${b} m. How long is it altogether?`, unit:'m' }),
  (a,b) => ({ prompt:`Leila walks ${a} km before lunch and ${b} km afterwards. Find her total distance.`, unit:'km' }),
  (a,b) => ({ prompt:`A jug contains ${a} litres of apple juice and ${b} litres of orange juice. How much drink is there?`, unit:'litres' }),
  (a,b) => ({ prompt:`Two bags of rice have masses of ${a} kg and ${b} kg. What is their total mass?`, unit:'kg' }),
  (a,b) => ({ prompt:`A carpenter joins boards measuring ${a} m and ${b} m. Find the combined length.`, unit:'m' }),
  (a,b) => ({ prompt:`On Saturday, Arun cycles ${a} km in the morning and ${b} km in the evening. How far does he cycle?`, unit:'km' }),
  (a,b) => ({ prompt:`A tank receives ${a} litres from one pipe and ${b} litres from another. How much enters altogether?`, unit:'litres' }),
  (a,b) => ({ prompt:`A recipe uses ${a} kg of vegetables and ${b} kg of beans. What mass of ingredients is that?`, unit:'kg' }),
  (a,b) => ({ prompt:`Two sections of a hiking route are ${a} km and ${b} km long. What is their total length?`, unit:'km' }),
  (a,b) => ({ prompt:`A wire is extended by attaching a ${b} m piece to a ${a} m piece. Find its new length.`, unit:'m' }),
  (a,b) => ({ prompt:`Maya pours ${a} litres and then another ${b} litres into a container. How much has she poured?`, unit:'litres' }),
  (a,b) => ({ prompt:`The first stage of a race is ${a} km and the second is ${b} km. How long are both stages together?`, unit:'km' }),
  (a,b) => ({ prompt:`A delivery includes packages weighing ${a} kg and ${b} kg. Calculate their combined mass.`, unit:'kg' }),
  (a,b) => ({ prompt:`A model railway uses tracks of ${a} m and ${b} m. What length of track is used?`, unit:'m' }),
  (a,b) => ({ prompt:`A café mixes ${a} litres of one drink with ${b} litres of another. Find the total volume.`, unit:'litres' }),
  (a,b) => ({ prompt:`Nia swims ${a} km on Monday and ${b} km on Wednesday. What distance does she swim in total?`, unit:'km' }),
  (a,b) => ({ prompt:`A sack contains ${a} kg of flour and receives another ${b} kg. How much flour is now in it?`, unit:'kg' }),
  (a,b) => ({ prompt:`Two pieces of fabric, ${a} m and ${b} m long, are used for a costume. How much fabric is used?`, unit:'m' }),
  (a,b) => ({ prompt:`A reservoir gains ${a} litres in one hour and ${b} litres in the next. What is the total gain?`, unit:'litres' }),
];
const DECIMAL_SUBTRACT_TEMPLATES = [
  (a,b) => ({ prompt:`A container held ${a} litres. After ${b} litres were used, how much remained?`, unit:'litres' }),
  (a,b) => ({ prompt:`A ${a} m plank has a ${b} m piece cut off. Find the remaining length.`, unit:'m' }),
  (a,b) => ({ prompt:`A bag can hold ${a} kg and already contains ${b} kg. How much more can be added?`, unit:'kg' }),
  (a,b) => ({ prompt:`Of a ${a} km route, Priya has completed ${b} km. How far remains?`, unit:'km' }),
  (a,b) => ({ prompt:`A tank contained ${a} litres before ${b} litres leaked out. What volume is left?`, unit:'litres' }),
  (a,b) => ({ prompt:`A roll held ${a} m of paper. A designer used ${b} m. How much paper remains?`, unit:'m' }),
  (a,b) => ({ prompt:`A crate and its limit differ: it may hold ${a} kg and currently holds ${b} kg. Find the unused capacity.`, unit:'kg' }),
  (a,b) => ({ prompt:`A cyclist planned to travel ${a} km and has ridden ${b} km. What distance is still to go?`, unit:'km' }),
  (a,b) => ({ prompt:`From ${a} litres of paint, ${b} litres are poured into tins. How much is left?`, unit:'litres' }),
  (a,b) => ({ prompt:`A rope was ${a} m long before ${b} m was removed. Calculate its new length.`, unit:'m' }),
  (a,b) => ({ prompt:`A parcel allowance is ${a} kg. The parcel weighs ${b} kg. How much allowance remains?`, unit:'kg' }),
  (a,b) => ({ prompt:`A walker has a ${a} km target and has covered ${b} km. Find the outstanding distance.`, unit:'km' }),
  (a,b) => ({ prompt:`A barrel starts with ${a} litres and supplies ${b} litres to a kitchen. What remains?`, unit:'litres' }),
  (a,b) => ({ prompt:`A metal strip measures ${a} m. After trimming ${b} m, how long is it?`, unit:'m' }),
  (a,b) => ({ prompt:`A lift can carry ${a} kg. Passengers currently weigh ${b} kg. How much capacity remains?`, unit:'kg' }),
  (a,b) => ({ prompt:`A boat journey is ${a} km long. After travelling ${b} km, how far is left?`, unit:'km' }),
  (a,b) => ({ prompt:`A measuring vessel held ${a} litres, then released ${b} litres. Find the remaining volume.`, unit:'litres' }),
  (a,b) => ({ prompt:`A garden border needs ${a} m of edging. ${b} m has been installed. How much more is needed?`, unit:'m' }),
  (a,b) => ({ prompt:`A store had ${a} kg of grain and sold ${b} kg. What mass remains?`, unit:'kg' }),
  (a,b) => ({ prompt:`A runner's course is ${a} km. With ${b} km completed, calculate the distance remaining.`, unit:'km' }),
];

function divisionQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const groupCounts = difficulty === 'easy' ? [2, 3, 4, 5, 10]
    : difficulty === 'medium' ? [3, 4, 5, 6, 8, 9, 10, 12]
      : [6, 7, 8, 9, 12, 15, 16, 20];
  const groupCount = choose(rng, groupCounts);
  const groupSize = difficulty === 'easy' ? 3 + Math.floor(rng() * 18)
    : difficulty === 'medium' ? 8 + Math.floor(rng() * 43)
      : 24 + Math.floor(rng() * 77);
  const total = groupCount * groupSize;
  const templateIndex = Math.floor(rng() * EQUAL_GROUP_TEMPLATES.length);
  const prompt = EQUAL_GROUP_TEMPLATES[templateIndex](total, groupCount);
  const unit = EQUAL_GROUP_SCENARIOS[Math.floor(templateIndex / EQUAL_GROUP_FORMS.length)].items;
  const result = numericOptions(rng, groupSize, [groupCount, total, groupSize * groupCount / 2, groupSize + groupCount]);
  return {
    id: `division_equal_groups-${seed}`,
    skill_id: 'ar_divide_equal_groups', archetype_id: 'division_equal_groups',
    prompt, answer_format: 'multiple_choice', ...result,
    explanation: `${total} ÷ ${groupCount} = ${groupSize}, so each group has ${groupSize} ${unit}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['division', 'equal groups', difficulty],
  };
}

const PERCENTAGE_PAIRS = {
  easy: [
    [10, 40], [10, 90], [20, 60], [20, 150], [30, 80], [40, 70], [50, 90], [60, 120], [70, 50], [90, 80],
  ],
  standard: [
    [5, 140], [15, 60], [15, 120], [25, 48], [25, 140], [35, 80], [45, 60], [65, 80], [75, 52], [85, 40],
  ],
  hard: [
    [12, 75], [18, 50], [22, 150], [28, 50], [32, 75], [37, 200], [42, 150], [58, 50], [62, 150], [78, 50],
  ],
};

function percentageValues(rng, requestedDifficulty) {
  const requested = requestedDifficulty === 'medium' ? 'standard' : requestedDifficulty;
  const difficulty = requested || choose(rng, ['easy', 'easy', 'standard', 'standard', 'standard', 'hard', 'hard']);
  const [percent, base] = choose(rng, PERCENTAGE_PAIRS[difficulty]);
  return { percent, base, answer: cleanNumber(percent * base / 100), difficulty };
}

function percentageDistractors(percent, base, answer) {
  return [percent, base - answer, answer + percent, base, Math.abs(base / 10 - answer)];
}

function percentageQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const { percent, base, answer, difficulty } = percentageValues(rng, config.difficulty);
  const result = numericOptions(rng, answer, percentageDistractors(percent, base, answer));
  return {
    id: `percent_of_amount-${seed}`,
    skill_id: 'pct_percent_of_amount', archetype_id: 'percent_of_amount',
    prompt: `Find ${percent}% of ${base}.`, answer_format: 'multiple_choice', ...result,
    explanation: `${percent}% of ${base} is ${percent}/100 × ${base} = ${formatNumber(answer)}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'standard' ? 2 : 3,
    tags: ['percentages', 'amounts', difficulty],
  };
}

const WORD_PROBLEM_TEMPLATES = [
  (p, b) => ({ prompt: `A school library received ${b} new books. ${p}% are non-fiction. How many of the new books are non-fiction?`, unit: 'books' }),
  (p, b) => ({ prompt: `${b} pupils entered a school activity week. ${p}% chose a sports activity. How many pupils chose a sports activity?`, unit: 'pupils' }),
  (p, b) => ({ prompt: `A theatre has ${b} seats. For the afternoon performance, ${p}% of the seats were occupied. How many seats were occupied?`, unit: 'seats' }),
  (p, b) => ({ prompt: `A wildlife group planted ${b} trees. ${p}% were oak trees. How many oak trees did the group plant?`, unit: 'trees' }),
  (p, b) => ({ prompt: `Mina is reading a ${b}-page novel and has completed ${p}% of it. How many pages has she read?`, unit: 'pages' }),
  (p, b) => ({ prompt: `A baker made ${b} rolls before lunchtime. By noon, ${p}% had been sold. How many rolls had been sold?`, unit: 'rolls' }),
  (p, b) => ({ prompt: `A box contains ${b} craft beads. ${p}% of the beads are blue. How many blue beads are in the box?`, unit: 'beads' }),
  (p, b) => ({ prompt: `${b} people responded to a travel survey. ${p}% said they usually cycle to work. How many respondents usually cycle?`, unit: 'people' }),
  (p, b) => ({ prompt: `A concert released ${b} tickets. During the first day, ${p}% were sold online. How many tickets were sold online?`, unit: 'tickets' }),
  (p, b) => ({ prompt: `A farmer harvested ${b} apples. ${p}% were packed for the farm shop. How many apples were packed for the shop?`, unit: 'apples' }),
  (p, b) => ({ prompt: `A charity hopes to raise £${b}. It has already collected ${p}% of its target. How much has it collected?`, unit: 'pounds', money: true }),
  (p, b) => ({ prompt: `Noah has saved £${b} for a trip. He plans to spend ${p}% of it on travel. How much has he set aside for travel?`, unit: 'pounds', money: true }),
  (p, b) => ({ prompt: `A water tank holds ${b} litres when full. It is currently ${p}% full. How many litres of water are in the tank?`, unit: 'litres' }),
  (p, b) => ({ prompt: `A runner planned a ${b}-minute training session. The warm-up takes ${p}% of the session. How many minutes does the warm-up take?`, unit: 'minutes' }),
  (p, b) => ({ prompt: `There are ${b} questions in an online quiz. Priya answered ${p}% correctly. How many questions did she answer correctly?`, unit: 'questions' }),
  (p, b) => ({ prompt: `A museum welcomed ${b} visitors on Saturday. ${p}% of them joined a guided tour. How many visitors joined a tour?`, unit: 'visitors' }),
  (p, b) => ({ prompt: `A warehouse checked ${b} parcels. ${p}% were ready to be dispatched that afternoon. How many parcels were ready?`, unit: 'parcels' }),
  (p, b) => ({ prompt: `A community garden has ${b} plants. ${p}% are herbs. How many herb plants are in the garden?`, unit: 'plants' }),
  (p, b) => ({ prompt: `A class collected ${b} recyclable items. ${p}% were aluminium cans. How many cans did the class collect?`, unit: 'cans' }),
  (p, b) => ({ prompt: `An animal shelter received ${b} bags of food. ${p}% were donated by local schools. How many bags came from schools?`, unit: 'bags' }),
  (p, b) => ({ prompt: `A science club tested ${b} seeds. ${p}% germinated during the first week. How many seeds germinated?`, unit: 'seeds' }),
  (p, b) => ({ prompt: `A stadium car park has ${b} spaces. Before the match, ${p}% were occupied. How many spaces were occupied?`, unit: 'spaces' }),
];

function percentageWordProblem(seed, config = {}) {
  const rng = seededRng(seed);
  const { percent, base, answer, difficulty } = percentageValues(rng, config.difficulty);
  const context = choose(rng, WORD_PROBLEM_TEMPLATES)(percent, base);
  const format = context.money ? (value) => `£${formatNumber(value)}` : (value) => `${formatNumber(value)} ${context.unit}`;
  const result = numericOptions(rng, answer, percentageDistractors(percent, base, answer), format);
  return {
    id: `percent_of_amount_word_problem-${seed}`,
    skill_id: 'pct_percent_of_amount', archetype_id: 'percent_of_amount_word_problem',
    prompt: context.prompt, answer_format: 'multiple_choice', ...result,
    explanation: `${percent}% of ${base} is ${percent}/100 × ${base} = ${formatNumber(answer)} ${context.unit}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'standard' ? 2 : 3,
    tags: ['percentages', 'word problem', difficulty],
  };
}

function multiStepArithmeticQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const scale = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const a = 3 + Math.floor(rng() * (6 + scale * 6));
  const b = 2 + Math.floor(rng() * (4 + scale * 4));
  const c = 2 + Math.floor(rng() * (3 + scale * 3));
  const d = 1 + Math.floor(rng() * (2 + scale * 2));
  const allPatterns = [
    { expression: `${a} + ${b} × ${c}`, answer: a + b * c, wrong: (a + b) * c, working: `${b} × ${c} = ${b * c}, then add ${a}` },
    { expression: `(${a} + ${b}) × ${c} − ${d}`, answer: (a + b) * c - d, wrong: a + b * c - d, working: `${a} + ${b} = ${a + b}, multiply by ${c}, then subtract ${d}` },
    { expression: `${a} × ${c} − ${b} × ${d}`, answer: a * c - b * d, wrong: (a * c - b) * d, working: `work out both multiplications before subtracting` },
    { expression: `${a} + ${b} × (${c} − ${d})`, answer: a + b * (c - d), wrong: (a + b) * (c - d), working: `calculate the brackets first, then multiply, then add` },
  ].filter((pattern) => pattern.answer >= 0);
  const patternLimit = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 4;
  const pattern = choose(rng, allPatterns.slice(0, patternLimit));
  const result = numericOptions(rng, pattern.answer, [pattern.wrong, pattern.answer + b, pattern.answer - c, pattern.answer + d]);
  return {
    id: `multi_step_arithmetic_expression-${seed}`,
    skill_id: 'ar_multi_step_numeric', archetype_id: 'multi_step_arithmetic_expression',
    prompt: `Calculate ${pattern.expression}.`, answer_format: 'multiple_choice', ...result,
    explanation: `Use the order of operations: ${pattern.working}. The answer is ${formatNumber(pattern.answer)}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['arithmetic', 'order of operations', difficulty],
  };
}

function meanMissingQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const count = difficulty === 'easy' ? 4 : choose(rng, [4, 5]);
  const mean = difficulty === 'easy' ? 10 + Math.floor(rng() * 11)
    : difficulty === 'medium' ? 15 + Math.floor(rng() * 21)
      : 25 + Math.floor(rng() * 31);
  const deviationSets = count === 4
    ? [[-5, -2, 3, 4], [-6, 1, 2, 3], [-4, -3, 2, 5]]
    : [[-6, -3, 1, 3, 5], [-5, -2, 0, 2, 5], [-7, -1, 1, 3, 4]];
  const values = shuffle(rng, choose(rng, deviationSets).map((offset) => mean + offset));
  const missingIndex = Math.floor(rng() * count);
  const missing = values[missingIndex];
  const known = values.filter((_, index) => index !== missingIndex);
  const total = mean * count;
  const knownTotal = known.reduce((sum, value) => sum + value, 0);
  const result = numericOptions(rng, missing, [mean, total - knownTotal + 1, mean + count, missing + count]);
  return {
    id: `mean_find_missing-${seed}`,
    skill_id: 'stat_mean', archetype_id: 'mean_find_missing',
    prompt: choose(rng, MEAN_TEMPLATES)(count, mean, known),
    answer_format: 'multiple_choice', ...result,
    explanation: `The total must be ${mean} × ${count} = ${total}. The known scores total ${knownTotal}, so the missing score is ${total} − ${knownTotal} = ${missing}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['mean', 'missing value', difficulty],
  };
}

function substitutionQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const size = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
  const x = 2 + Math.floor(rng() * size);
  const y = 1 + Math.floor(rng() * size);
  const a = 2 + Math.floor(rng() * (difficulty === 'hard' ? 9 : 6));
  const b = 1 + Math.floor(rng() * (difficulty === 'hard' ? 12 : 8));
  const allPatterns = [
    { expression: `${a}x + ${b}`, answer: a * x + b, wrong: a + x + b, working: `${a} × ${x} + ${b}` },
    { expression: `${a}x − ${b}y`, answer: a * x - b * y, wrong: (a * x - b) * y, working: `${a} × ${x} − ${b} × ${y}` },
    { expression: `${a}(x + y)`, answer: a * (x + y), wrong: a * x + y, working: `${a} × (${x} + ${y})` },
    { expression: `x² + ${b}y`, answer: x * x + b * y, wrong: x * 2 + b * y, working: `${x}² + ${b} × ${y}` },
  ].filter((pattern) => pattern.answer >= 0);
  const patternLimit = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 4;
  const pattern = choose(rng, allPatterns.slice(0, patternLimit));
  const result = numericOptions(rng, pattern.answer, [pattern.wrong, pattern.answer + x, pattern.answer - y, pattern.answer + a]);
  return {
    id: `substitute_expression_values-${seed}`,
    skill_id: 'alg_substitution', archetype_id: 'substitute_expression_values',
    prompt: `When x = ${x} and y = ${y}, what is the value of ${pattern.expression}?`,
    answer_format: 'multiple_choice', ...result,
    explanation: `Substitute the given values: ${pattern.working} = ${pattern.answer}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['algebra', 'substitution', difficulty],
  };
}

function additiveSequenceQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const start = 3 + Math.floor(rng() * (difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 55));
  const kinds = difficulty === 'easy' ? ['constant']
    : difficulty === 'medium' ? ['constant', 'increasing']
      : ['increasing', 'alternating'];
  const kind = choose(rng, kinds);
  let values;
  let next;
  let explanation;
  if (kind === 'constant') {
    const difference = 3 + Math.floor(rng() * 10);
    values = Array.from({ length: 5 }, (_, index) => start + index * difference);
    next = start + 5 * difference;
    explanation = `The sequence increases by ${difference} each time.`;
  } else if (kind === 'increasing') {
    const firstDifference = 2 + Math.floor(rng() * 5);
    values = [start];
    for (let index = 0; index < 4; index += 1) values.push(values.at(-1) + firstDifference + index);
    next = values.at(-1) + firstDifference + 4;
    explanation = `The differences are ${firstDifference}, ${firstDifference + 1}, ${firstDifference + 2}, ${firstDifference + 3}, so the next difference is ${firstDifference + 4}.`;
  } else {
    const first = 2 + Math.floor(rng() * 6);
    const second = first + 3 + Math.floor(rng() * 5);
    values = [start];
    for (let index = 0; index < 4; index += 1) values.push(values.at(-1) + (index % 2 === 0 ? first : second));
    next = values.at(-1) + first;
    explanation = `The sequence alternates between adding ${first} and adding ${second}.`;
  }
  const lastDifference = next - values.at(-1);
  const result = numericOptions(rng, next, [values.at(-1) + lastDifference + 1, values.at(-1) + lastDifference - 1, values.at(-1) + 2 * lastDifference, values.at(-1)]);
  return {
    id: `sequence_next_additive-${seed}`,
    skill_id: 'seq_arithmetic_geometric', archetype_id: 'sequence_next_additive',
    prompt: `What is the next number? ${values.join(', ')}, …`, answer_format: 'multiple_choice', ...result,
    explanation: `${explanation} The next number is ${next}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['sequences', kind, difficulty],
  };
}

function decimalContextQuestion(seed, config = {}) {
  const rng = seededRng(seed);
  const difficulty = config.difficulty || 'medium';
  const firstHundredths = difficulty === 'easy'
    ? (8 + Math.floor(rng() * 43)) * 10
    : difficulty === 'medium' ? 75 + Math.floor(rng() * 550)
      : 175 + Math.floor(rng() * 1325);
  const secondHundredths = difficulty === 'easy'
    ? (2 + Math.floor(rng() * 25)) * 10
    : difficulty === 'medium' ? 25 + Math.floor(rng() * 300)
      : 35 + Math.floor(rng() * 765);
  const operation = rng() < 0.55 ? 'add' : 'subtract';
  const larger = Math.max(firstHundredths, secondHundredths);
  const smaller = Math.min(firstHundredths, secondHundredths);
  const answerHundredths = operation === 'add' ? larger + smaller : larger - smaller;
  const first = formatNumber(larger / 100);
  const second = formatNumber(smaller / 100);
  const answer = cleanNumber(answerHundredths / 100);
  const context = choose(rng, operation === 'add' ? DECIMAL_ADD_TEMPLATES : DECIMAL_SUBTRACT_TEMPLATES)(first, second);
  const chosenUnit = context.unit;
  const format = (value) => `${formatNumber(value)} ${chosenUnit}`;
  const result = numericOptions(rng, answer, [cleanNumber((larger + smaller) / 100), cleanNumber(Math.abs(larger - smaller + 10) / 100), cleanNumber(answer + 1), cleanNumber(answer / 10)], format);
  return {
    id: `decimal_add_subtract_context-${seed}`,
    skill_id: 'dec_add_subtract', archetype_id: 'decimal_add_subtract_context',
    prompt: context.prompt, answer_format: 'multiple_choice', ...result,
    explanation: `${first} ${operation === 'add' ? '+' : '−'} ${second} = ${formatNumber(answer)} ${chosenUnit}.`,
    difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    tags: ['decimals', operation, difficulty],
  };
}

export const generators = {
  division_equal_groups: divisionQuestion,
  percent_of_amount: percentageQuestion,
  percent_of_amount_word_problem: percentageWordProblem,
  multi_step_arithmetic_expression: multiStepArithmeticQuestion,
  mean_find_missing: meanMissingQuestion,
  substitute_expression_values: substitutionQuestion,
  sequence_next_additive: additiveSequenceQuestion,
  decimal_add_subtract_context: decimalContextQuestion,
  ...extraGenerators,
};
export const coreWordProblemGeneratorIds = [
  'division_equal_groups',
  'percent_of_amount_word_problem',
  'mean_find_missing',
  'decimal_add_subtract_context',
];

async function initialise() {
  try {
    const [topicResponse, skillResponse, archetypeResponse] = await Promise.all([
      fetch(`${CONTENT_ROOT}/topics.yaml`),
      fetch(`${CONTENT_ROOT}/skills.yaml`),
      fetch(`${CONTENT_ROOT}/archetypes.yaml`),
    ]);
    if (!topicResponse.ok || !skillResponse.ok || !archetypeResponse.ok) throw new Error('Content files could not be loaded.');
    [topics, skills, archetypes] = await Promise.all([
      topicResponse.text(), skillResponse.text(), archetypeResponse.text(),
    ]).then((files) => files.map(parseYamlList));
    if (!topics.length || !skills.length || !archetypes.length) throw new Error('No exercise content was found.');
    renderCatalogue();
  } catch (error) {
    const servingHint = /content files|content was found/i.test(error.message)
      ? ' Serve this folder through a local web server rather than opening index.html directly.'
      : '';
    document.querySelector('#topic-list').innerHTML = `<p class="error">${error.message}${servingHint}</p>`;
    console.error(error);
  }
}

if (typeof document !== 'undefined' && document.querySelector('#topic-list')) {
  document.querySelector('#back-button').addEventListener('click', closePractice);
  document.querySelector('#reset-all-button').addEventListener('click', resetAllProgress);
  document.querySelector('#next-button').addEventListener('click', showNextQuestion);
  document.querySelector('#diagnostic-exit-button').addEventListener('click', () => exitDiagnostic());
  document.querySelector('#diagnostic-skip-question').addEventListener('click', skipDiagnosticQuestion);
  document.querySelector('#diagnostic-next-question').addEventListener('click', nextDiagnosticQuestion);
  document.querySelector('#diagnostic-skip-section').addEventListener('click', skipDiagnosticSection);
  document.querySelector('#diagnostic-finish-button').addEventListener('click', () => exitDiagnostic({ showTopic: true }));
  document.querySelectorAll('input[name="diagnostic-evaluation"]').forEach((input) => input.addEventListener('change', (event) => {
    const skill = diagnosticSession?.items[diagnosticSession.index]?.skill;
    if (!skill) return;
    setSkillEvaluation(skill.id, event.target.value);
  }));
  document.querySelectorAll('.skill-filter button').forEach((button) => button.addEventListener('click', () => setCatalogueFilter(button.dataset.filter)));
  document.querySelector('#close-dialog').addEventListener('click', () => document.querySelector('#archetype-dialog').close());
  document.querySelector('#archetype-dialog').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.addEventListener('keydown', (event) => {
    const practiceIsOpen = !document.querySelector('#practice-view').hidden;
    if (practiceIsOpen && !questionAnswered && event.key.toLowerCase() === 'x' && !event.repeat) {
      event.preventDefault();
      markAnswer(currentQuestion.answer, { skipped: true });
    }
  });
  initialise();
}
