// Achievements: milestones for completing skills. Pure functions, so tests can
// run them in Node. Badges are PixelLab pixel art in assets/badges/.
//
// A completion is recorded the first time a skill reaches 100 points:
//   completions[skillId] = { at: ISO time, wrong: wrong answers at that moment }

const BADGE_ROOT = './assets/badges';

const countRelic = (id, title, target, requirement, flavour) => ({
  id, group: 'relics', title, requirement, flavour,
  measure: (ctx) => ({ value: ctx.completedCount, target: typeof target === 'function' ? target(ctx.totalSkills) : target }),
});

const TOPIC_BEASTS = [
  ['number_place_value', 'Place Value Golem', 'Built from ones, tens and hundreds, and it finally knows which is which. You taught it that.'],
  ['arithmetic', 'Arithmetic Hydra', 'Cut off one head and two more grow back, which is really just addition with extra teeth.'],
  ['factors_multiples_powers', 'Prime Dragon', 'Can only be divided by 1 and itself, and isn’t keen on either.'],
  ['fractions', 'Fraction Slime', 'Cut it in half and you get two slimes. Cut those and you get four. Still the same amount of slime, though: 2/4 = 1/2, remember?'],
  ['decimals', 'Decimal Pixie', 'Tiny, fast and always moving the point. Now she moves it where you tell her.'],
  ['percentages', 'Percent Phoenix', 'Burns at exactly 100%. Anyone who says they’re giving 110% has clearly never met this bird.'],
  ['ratio_proportion_rates', 'Ratio Griffin', 'Strictly 1 part eagle to 1 part lion. A 2:2 griffin simplifies to exactly the same bird-cat.'],
  ['measurement_units', 'Tape Serpent', 'Exactly 3.2 m long. Or 320 cm. Or 3200 mm, when it wants to sound impressive.'],
  ['geometry', 'Polyhedron Mimic', 'Angles, shapes, nets and coordinates. It looked like a treasure chest. It was a cube with teeth.'],
  ['algebra', 'Algebra Sphinx', 'Every riddle ends with “find x”. You found x. It was hiding behind the equals sign all along.'],
  ['sequences_patterns', 'Fibonacci Snail', '1, 1, 2, 3, 5, 8… it’s in no hurry, but you spotted the next term before it moved.'],
  ['data_statistics', 'Data Owl', 'Has read every pie chart in the forest. Still disappointed that none of them were actual pie.'],
  ['probability_sets_logic', 'Dice Imp', 'Bets anyone it can roll a 7 on one dice. The probability of that is 0, and now you know it.'],
  ['mixed_problem_solving', 'Mixed-Problem Chimera', 'Part lion, part goat, part word problem. It needs everything you know at once, which is why it’s the final boss.'],
];

export const ACHIEVEMENTS = [
  ...TOPIC_BEASTS.map(([topicId, title, flavour]) => ({
    id: `topic_${topicId}`, group: 'beasts', title, flavour, topicId,
    requirement: (ctx) => `Complete all ${ctx.topicTotal(topicId)} ${ctx.topicTitle(topicId)} skills.`,
    measure: (ctx) => ({ value: ctx.topicDone(topicId), target: ctx.topicTotal(topicId) }),
  })),
  countRelic('skills_1', 'Fresh Recruit', 1, 'Complete your first skill.',
    (ctx) => `Every legend starts with a wooden sword. Only ${ctx.totalSkills - 1} more skills to go, but who’s counting? (We are. It’s a maths website.)`),
  countRelic('skills_5', 'Apprentice Arithmancer', 5, 'Complete 5 skills.', 'You’ve earned the hat. The long white beard unlocks later.'),
  countRelic('skills_10', 'Double Digits', 10, 'Complete 10 skills.', 'Your skill count now needs two digits, just like your age. Coincidence? Probably.'),
  countRelic('skills_quarter', 'Quarter Master', (total) => Math.ceil(total / 4), (ctx) => `Complete a quarter of all skills (${Math.ceil(ctx.totalSkills / 4)}).`,
    'That’s 25%, 0.25 or 1/4 of everything. All three are correct, so no need to argue about which to write.'),
  countRelic('skills_half', 'Halfway Hero', (total) => Math.ceil(total / 2), (ctx) => `Complete half of all skills (${Math.ceil(ctx.totalSkills / 2)}).`,
    'Optimists say the potion is half full. Pessimists say it’s half empty. Mathematicians say it’s 1/2 and get on with it.'),
  countRelic('skills_three_quarters', 'Three-Quarter Titan', (total) => Math.ceil(total * 3 / 4), (ctx) => `Complete three quarters of all skills (${Math.ceil(ctx.totalSkills * 3 / 4)}).`,
    'The last 25% of the skills have heard about you, and they’re getting nervous.'),
  countRelic('skills_100', 'Centurion', 100, 'Complete 100 skills.', 'The Romans wrote 100 as C. We’d write it as “wow”.'),
  countRelic('skills_all', 'Grand Wizard of Numbers', (total) => total, 'Complete every single skill.',
    'There is nothing left to learn. (There is. Just not on this website.)'),
  {
    id: 'flawless', group: 'relics', title: 'Not a Scratch', requirement: 'Complete a skill without a single wrong answer.',
    flavour: 'Fifteen in a row and not one mistake. Suspiciously perfect. We’re keeping an eye on you.',
    measure: (ctx) => ({ value: ctx.completions.some((item) => item.wrong === 0) ? 1 : 0, target: 1 }),
  },
  {
    id: 'comeback', group: 'relics', title: 'Battle-Scarred', requirement: 'Complete a skill after getting 5 or more of its questions wrong.',
    flavour: 'Dented, cracked, patched with a plank, and still standing. Mistakes are just practice in disguise.',
    measure: (ctx) => ({ value: ctx.completions.some((item) => item.wrong >= 5) ? 1 : 0, target: 1 }),
  },
  {
    id: 'five_topics', group: 'relics', title: 'Wanderer', requirement: 'Complete a skill in 5 different topics.',
    flavour: 'A bit of fractions here, a dash of geometry there. Not lost, just exploring.',
    measure: (ctx) => ({ value: ctx.topicsTouched, target: 5 }),
  },
  {
    id: 'every_topic', group: 'relics', title: 'Jack of All Trades', requirement: (ctx) => `Complete at least one skill in each of the ${ctx.topicCount} topics.`,
    flavour: 'Jack of all trades, and coming for master of all.',
    measure: (ctx) => ({ value: ctx.topicsTouched, target: ctx.topicCount }),
  },
  {
    id: 'hat_trick', group: 'relics', title: 'Hat-Trick', requirement: 'Complete 3 skills in one day.',
    flavour: 'Pulling skills out of a hat now, are we?',
    measure: (ctx) => ({ value: ctx.bestDay, target: 3 }),
  },
  {
    id: 'weekend', group: 'relics', title: 'Weekend Warrior', requirement: 'Complete a skill on a Saturday or a Sunday.',
    flavour: 'Everyone else was watching cartoons. You were doing maths. Respect.',
    measure: (ctx) => ({ value: ctx.completions.some((item) => [0, 6].includes(new Date(item.at).getDay())) ? 1 : 0, target: 1 }),
  },
];

export const badgeUrl = (id) => `${BADGE_ROOT}/${id}.png`;

const localDay = (iso) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// skills: [{id, topic_id}], topics: [{id, title}], completions: {skillId: {at, wrong}}
export function achievementContext({ skills, topics, completions }) {
  const skillIds = new Set(skills.map((skill) => skill.id));
  const done = Object.entries(completions || {}).filter(([id]) => skillIds.has(id));
  const doneIds = new Set(done.map(([id]) => id));
  const topicOf = new Map(skills.map((skill) => [skill.id, skill.topic_id]));
  const liveTopics = topics.filter((topic) => skills.some((skill) => skill.topic_id === topic.id));
  const perDay = {};
  done.forEach(([, item]) => { const day = localDay(item.at); perDay[day] = (perDay[day] || 0) + 1; });
  return {
    totalSkills: skills.length,
    completedCount: doneIds.size,
    completions: done.map(([, item]) => item),
    topicCount: liveTopics.length,
    topicsTouched: new Set([...doneIds].map((id) => topicOf.get(id))).size,
    bestDay: Math.max(0, ...Object.values(perDay)),
    topicTitle: (topicId) => topics.find((topic) => topic.id === topicId)?.title ?? topicId,
    topicTotal: (topicId) => skills.filter((skill) => skill.topic_id === topicId).length,
    topicDone: (topicId) => skills.filter((skill) => skill.topic_id === topicId && doneIds.has(skill.id)).length,
  };
}

// Every achievement with its text resolved and whether its condition holds now.
export function evaluateAchievements(input) {
  const ctx = achievementContext(input);
  const text = (value) => (typeof value === 'function' ? value(ctx) : value);
  return ACHIEVEMENTS.map((achievement) => {
    const { value, target } = achievement.measure(ctx);
    return {
      id: achievement.id, group: achievement.group, title: achievement.title,
      requirement: text(achievement.requirement), flavour: text(achievement.flavour),
      value: Math.min(value, target), target, met: target > 0 && value >= target, badge: badgeUrl(achievement.id),
    };
  });
}
