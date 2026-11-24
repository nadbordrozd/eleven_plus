import { extraGenerators, extraSkillIds } from './extra-generators.js';
import { choose, formatNumber, generateSafely, seededRng } from './generators/core.js';
import { renderVisual } from './visual-renderers.js';
import { renderSolution } from './visuals/working.js';
import { evaluateAchievements } from './achievements.js';
import { playSound, preloadSounds, setSoundEnabled, soundEnabled } from './sounds.js';

const CONTENT_ROOT = './data';
const STORAGE_KEY = 'eleven_plus_maths_state_v1';
const ACTIVE_SKILLS = new Set(extraSkillIds);
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

function isDeveloperMode() {
  return ['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).has('dev');
}

function difficultyForPoints(points) {
  if (points < 25) return 'easy';
  if (points <= 75) return 'medium';
  return 'hard';
}

export function parseYamlList(text) {
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
    completions: {},
    achievements: {},
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const loaded = saved?.schema_version === 1 ? { ...defaultState(), ...saved } : defaultState();
    if (!loaded.completions || typeof loaded.completions !== 'object') loaded.completions = {};
    if (!loaded.achievements || typeof loaded.achievements !== 'object') loaded.achievements = {};
    return loaded;
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
  delete state.completions[skill.id];
  saveState();
  renderCatalogue();
}

function resetAllProgress() {
  if(state.question_tally.attempted===0&&Object.keys(state.skill_progress).length===0) return;
  if(!window.confirm('Reset progress for every skill? This cannot be undone. Achievements you have already earned are kept.')) return;
  const todos = [...todoSkillIds()];
  const known = [...knownSkillIds()];
  const achievements = state.achievements;
  state=defaultState();
  state.todo_skills = todos;
  state.known_skills = known;
  state.achievements = achievements;
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
    const availableTopicSkills = allTopicSkills.filter((skill) => ACTIVE_SKILLS.has(skill.id)), availableCount = availableTopicSkills.length;

    header.addEventListener('click', () => {
      header.setAttribute('aria-expanded', String(header.getAttribute('aria-expanded') !== 'true'));
    });

    const topicTodoSkills = availableTopicSkills.filter((skill) => skillEvaluation(skill.id) === 'todo'), topicTodo = topicTodoSkills.length;
    const topicKnown = availableTopicSkills.filter((skill) => skillEvaluation(skill.id) === 'known').length, topicUnassessed = availableCount-topicTodo-topicKnown, assessed = topicTodo+topicKnown;
    const topicCount = section.querySelector('.topic-count');
    if (!availableCount) topicCount.textContent = 'Coming soon';
    else if (!assessed) topicCount.textContent = `Not assessed yet · ${availableCount} skills`;
    else if (topicTodo) topicCount.textContent = `${topicTodo} need practice · ${topicKnown} confident`;
    else if (!topicUnassessed) topicCount.textContent = `All ${availableCount} skills confident`;
    else topicCount.textContent = `${topicKnown} confident · ${topicUnassessed} not assessed`;

    const assessmentCopy = section.querySelector('.topic-assessment-copy');
    assessmentCopy.textContent = availableCount ? `Answer one or two questions for each of the ${availableCount} skills. Questions automatically get harder as your skill score grows.` : 'Assessment questions are not available for this topic yet.';
    const topicTestButton = section.querySelector('.topic-test-button');
    topicTestButton.textContent = assessed ? 'Retake assessment →' : 'Start assessment →';
    topicTestButton.disabled = availableCount === 0;
    topicTestButton.addEventListener('click', () => startDiagnostic(topic.id));

    const topicPlanTitle = section.querySelector('.topic-plan-title'), topicPlanCopy = section.querySelector('.topic-plan-copy'), topicPracticeButton = section.querySelector('.topic-practice-button');
    if (topicTodo) {
      topicPlanTitle.textContent = `${topicTodo} skill${topicTodo===1?'':'s'} need practice`;
      topicPlanCopy.textContent = `${topicKnown} confident · ${topicUnassessed} not assessed. Work through the recommended skills at your own pace.`;
      topicPracticeButton.disabled = false;
      topicPracticeButton.addEventListener('click', () => openPractice(topicTodoSkills[0]));
    } else if (!assessed) {
      topicPlanTitle.textContent = 'No practice plan yet';
      topicPlanCopy.textContent = 'Take the assessment first and we will identify the skills that need work.';
      topicPracticeButton.disabled = true;
    } else {
      topicPlanTitle.textContent = topicUnassessed ? 'Nothing currently needs practice' : 'This topic looks confident';
      topicPlanCopy.textContent = topicUnassessed ? `${topicKnown} confident · ${topicUnassessed} still not assessed.` : `All ${topicKnown} assessed skills are marked confident.`;
      topicPracticeButton.disabled = true;
    }

    topicSkills.forEach((skill) => grid.append(createExerciseCard(skill)));
    list.append(section);
  });
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-filter';
    const labels={todo:'need practice',known:'are marked confident',unmarked:'are waiting to be assessed'};
    empty.textContent = `No skills ${labels[catalogueFilter]||'match this filter'}.`;
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
  todo.textContent = evaluation === 'todo' ? '✓ Needs practice' : 'Needs practice';
  known.textContent = evaluation === 'known' ? '✓ Confident' : 'Confident';
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
  document.querySelector('#header-correct').textContent = tally.correct;
  document.querySelector('#question-summary').textContent = tally.attempted
    ? `${tally.correct} of ${tally.attempted} questions correct`
    : 'No questions answered yet';
  document.querySelector('#reset-all-button').disabled=tally.attempted===0&&Object.keys(state.skill_progress).length===0;
  document.querySelector('#todo-count').textContent = todoCount;
  document.querySelector('#known-count').textContent = knownCount;
  document.querySelector('#unmarked-count').textContent = skills.length - todoCount - knownCount;
  updateAchievementCount();
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
  currentQuestion = generateSafely(generators[archetypeId], seed, { difficulty });
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
  document.querySelector('#solution').hidden = true;
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
  const pointsBefore = progress.points;
  progress.attempts += 1;
  progress.correct += correct ? 1 : 0;
  progress.wrong += correct ? 0 : 1;
  progress.points = Math.min(COMPLETION_POINTS, Math.max(0, progress.points + (correct ? CORRECT_POINTS : -WRONG_POINTS)));
  progress.last_practiced_at = new Date().toISOString();
  progress.status = progress.points >= COMPLETION_POINTS ? 'done' : 'in_progress';
  state.skill_progress[currentSkill.id] = progress;
  if (progress.status === 'done') setSkillEvaluation(currentSkill.id, 'known', { persist: false });
  const newlyCompleted = progress.status === 'done' && !state.completions[currentSkill.id];
  if (newlyCompleted) state.completions[currentSkill.id] = { at: progress.last_practiced_at, wrong: progress.wrong };
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
  const correctText = currentQuestion.options.find((option) => option.id === currentQuestion.answer)?.text;
  feedback.textContent = progress.status === 'done'
    ? 'Skill completed!'
    : skipped ? `Question skipped. +${CORRECT_POINTS} points.`
      : correct ? `Correct! +${CORRECT_POINTS} points.`
      : `Not quite. −${WRONG_POINTS} points. The answer is ${currentQuestion.answer}: ${correctText}.`;
  renderSolution(document.querySelector('#solution'), currentQuestion, { open: !correct });
  document.querySelector('#next-button').hidden = false;
  const reachedFull = progress.status === 'done' && pointsBefore < COMPLETION_POINTS;
  playSound(reachedFull ? 'skill_complete' : correct ? 'correct' : 'wrong');
  // Let the skill fanfare finish before an achievement jingle starts.
  if (newlyCompleted) syncAchievements({ announce: true, delay: 1700 });
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

function startDiagnostic(topicId) {
  diagnosticSession = { topicId, items: diagnosticSkills(topicId), index: 0, results: [], answered: false, question: null, confirming: false, needsConfirmation: false, previousArchetypeId: null };
  if (!diagnosticSession.items.length) return;
  document.querySelector('#catalogue-view').hidden = true;
  document.querySelector('#practice-view').hidden = true;
  document.querySelector('#diagnostic-view').hidden = false;
  showDiagnosticQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDiagnosticQuestion() {
  const session = diagnosticSession;
  if (!session || session.index >= session.items.length) { finishDiagnostic(); return; }
  const { skill, topic } = session.items[session.index];
  const ids = archetypes.filter((item) => item.skill_id === skill.id && generators[item.id]).map((item) => item.id);
  const seed = (Date.now() + (session.index * 2 + (session.confirming ? 1 : 0)) * 2654435761) >>> 0;
  const unseenIds = session.confirming ? ids.filter((id) => id !== session.previousArchetypeId) : ids;
  const archetypeId = chooseArchetypeId(seed, unseenIds.length ? unseenIds : ids);
  session.previousArchetypeId = archetypeId;
  const difficulty = difficultyForPoints(progressFor(skill.id).points);
  session.question = generateSafely(generators[archetypeId], seed, { difficulty });
  document.querySelector('.diagnostic-shell').dataset.difficulty = difficulty;
  session.answered = false;
  session.needsConfirmation = false;
  const topicItems = session.items, topicPosition = session.index + 1;
  document.querySelector('#diagnostic-topic-title').textContent = topic.title;
  document.querySelector('#diagnostic-overall-progress').textContent = `${session.index + 1} of ${session.items.length}`;
  document.querySelector('#diagnostic-progress-bar').style.width = `${session.index / session.items.length * 100}%`;
  document.querySelector('#diagnostic-section-progress').textContent = `Question ${topicPosition} of ${topicItems.length} in this topic`;
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
  document.querySelector('#diagnostic-solution').hidden = true;
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
  const completed = progressFor(skill.id).points >= COMPLETION_POINTS;
  session.needsConfirmation = !session.confirming && (completed ? !correct : correct);
  const suggestedEvaluation = correct ? 'known' : 'todo';
  if (!session.needsConfirmation) {
    setSkillEvaluation(skill.id, suggestedEvaluation);
    document.querySelector(`input[name="diagnostic-evaluation"][value="${suggestedEvaluation}"]`).checked = true;
  }
  const feedback = document.querySelector('#diagnostic-feedback');
  feedback.hidden = false; feedback.classList.add(correct ? 'correct' : 'wrong');
  playSound(correct ? 'correct' : 'wrong');
  const outcome = session.needsConfirmation
    ? 'Let’s try one more question on this skill before updating your plan.'
    : `We have marked this skill ${correct ? 'Confident' : 'Needs practice'}; you can change that assessment above.`;
  const correctText = session.question.options.find((option) => option.id === session.question.answer)?.text;
  feedback.textContent = `${correct ? 'Correct.' : `Not quite. The answer is ${session.question.answer}: ${correctText}.`} ${outcome}`;
  renderSolution(document.querySelector('#diagnostic-solution'), session.question, { open: !correct });
  document.querySelector('#diagnostic-skip-question').hidden = true;
  document.querySelector('#diagnostic-next-question').hidden = false;
}

function skipDiagnosticQuestion() {
  const session = diagnosticSession;
  if (!session || session.answered) return;
  const skillId = session.items[session.index].skill.id;
  session.results.push({ skillId, correct: null, skipped: true });
  session.index += 1;
  session.confirming = false;
  showDiagnosticQuestion();
}

function nextDiagnosticQuestion() {
  const session = diagnosticSession;
  if (!session) return;
  if (session.needsConfirmation) session.confirming = true;
  else { session.index += 1; session.confirming = false; }
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
  session.confirming = false;
  session.needsConfirmation = false;
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
  document.querySelector('#diagnostic-result-summary').textContent = `You answered ${correct} of ${answered.length} attempted questions correctly${skipped ? ` and skipped ${skipped}` : ''}. In this topic, ${topicTodos} skill${topicTodos === 1 ? ' needs' : 's need'} practice and ${topicKnown} ${topicKnown === 1 ? 'is' : 'are'} marked confident.`;
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

function achievementList() {
  return evaluateAchievements({ skills: skills.filter((skill) => ACTIVE_SKILLS.has(skill.id)), topics, completions: state.completions });
}

// Skills completed before achievements existed still count.
function backfillCompletions() {
  Object.entries(state.skill_progress).forEach(([skillId, progress]) => {
    if (progress.points >= COMPLETION_POINTS && !state.completions[skillId]) {
      state.completions[skillId] = { at: progress.last_practiced_at || new Date().toISOString(), wrong: progress.wrong || 0 };
    }
  });
}

// Earned achievements are kept for good, even if progress is later reset.
function syncAchievements({ announce = false, delay = 0 } = {}) {
  const fresh = achievementList().filter((item) => item.met && !state.achievements[item.id]);
  if (!fresh.length) return;
  const now = new Date().toISOString();
  fresh.forEach((item) => { state.achievements[item.id] = now; });
  saveState();
  updateAchievementCount();
  if (!announce) return;
  setTimeout(() => playSound('achievement'), delay);
  fresh.forEach((item, index) => setTimeout(() => showAchievementToast(item), delay + index * 900));
}

function updateAchievementCount() {
  const link = document.querySelector('#achievements-count');
  if (!link || !skills.length) return;
  const list = achievementList();
  link.textContent = `${list.filter((item) => state.achievements[item.id]).length}/${list.length}`;
}

function showAchievementToast(item) {
  const toast = document.createElement('button');
  toast.type = 'button';
  toast.className = 'achievement-toast';
  toast.innerHTML = '<img alt="" width="64" height="64"><span><small>Achievement unlocked!</small><strong></strong></span>';
  toast.querySelector('img').src = item.badge;
  toast.querySelector('strong').textContent = item.title;
  toast.addEventListener('click', () => { toast.remove(); location.hash = 'achievements'; });
  document.querySelector('#toast-stack').append(toast);
  setTimeout(() => toast.classList.add('leaving'), 6000);
  setTimeout(() => toast.remove(), 6600);
}

function renderAchievements() {
  const list = achievementList(), earned = list.filter((item) => state.achievements[item.id]).length;
  document.querySelector('#achievements-earned').textContent = earned;
  document.querySelector('#achievements-total').textContent = list.length;
  document.querySelector('#achievements-progress-bar').style.width = `${earned / list.length * 100}%`;
  const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  ['beasts', 'relics'].forEach((group) => {
    const grid = document.querySelector(`#achievements-${group}`);
    grid.replaceChildren(...list.filter((item) => item.group === group).map((item) => {
      const earnedAt = state.achievements[item.id];
      const card = document.createElement('article');
      card.className = `achievement-card ${earnedAt ? 'earned' : 'locked'}`;
      card.innerHTML = `
        <div class="achievement-plinth"><img alt="" width="128" height="128" loading="lazy"></div>
        <div class="achievement-copy">
          <h3></h3>
          <p class="achievement-requirement"></p>
          <p class="achievement-flavour"></p>
          <div class="achievement-status"></div>
        </div>`;
      card.querySelector('img').src = item.badge;
      card.querySelector('img').alt = earnedAt ? `${item.title} badge` : `Locked badge: ${item.title}`;
      card.querySelector('h3').textContent = item.title;
      card.querySelector('.achievement-requirement').textContent = item.requirement;
      card.querySelector('.achievement-flavour').textContent = item.flavour;
      const status = card.querySelector('.achievement-status');
      if (earnedAt) status.textContent = `Unlocked ${dateFormat.format(new Date(earnedAt))}`;
      else if (item.target > 1) {
        status.innerHTML = '<div class="achievement-track"><span></span></div><span class="achievement-count"></span>';
        status.querySelector('.achievement-track span').style.width = `${item.value / item.target * 100}%`;
        status.querySelector('.achievement-count').textContent = `${item.value} / ${item.target}`;
      } else status.textContent = 'Locked';
      return card;
    }));
  });
}

function showRoute() {
  if (!skills.length) return;
  const wantAchievements = location.hash === '#achievements';
  const achievementsView = document.querySelector('#achievements-view');
  if (wantAchievements) {
    if (diagnosticSession) exitDiagnostic();
    document.querySelector('#practice-view').hidden = true;
    currentSkill = null;
    selectedArchetypeId = null;
    document.querySelector('#catalogue-view').hidden = true;
    achievementsView.hidden = false;
    renderAchievements();
    window.scrollTo({ top: 0 });
  } else if (!achievementsView.hidden) {
    achievementsView.hidden = true;
    document.querySelector('#catalogue-view').hidden = false;
    renderCatalogue();
    window.scrollTo({ top: 0 });
  }
}

export function chooseArchetypeId(seed, archetypeIds) {
  if (!archetypeIds.length) throw new Error('No implemented archetypes are available for this skill.');
  return choose(seededRng(seed ^ 0xA53A9E1D), archetypeIds);
}

export const generators = extraGenerators;
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
    backfillCompletions();
    syncAchievements();
    renderCatalogue();
    showRoute();
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
  const soundToggle = document.querySelector('#sound-toggle');
  const showSoundSetting = () => {
    const on = soundEnabled();
    soundToggle.setAttribute('aria-pressed', String(on));
    soundToggle.setAttribute('aria-label', on ? 'Sound effects on. Turn sound off' : 'Sound effects off. Turn sound on');
    soundToggle.title = on ? 'Sound on' : 'Sound off';
  };
  soundToggle.addEventListener('click', () => { setSoundEnabled(!soundEnabled()); showSoundSetting(); });
  showSoundSetting();
  preloadSounds();
  window.addEventListener('hashchange', showRoute);
  document.querySelector('#achievements-back').addEventListener('click', () => { location.hash = ''; });
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
    if (isDeveloperMode() && practiceIsOpen && !questionAnswered && event.key.toLowerCase() === 'x' && !event.repeat) {
      event.preventDefault();
      markAnswer(currentQuestion.answer, { skipped: true });
    }
  });
  initialise();
}
