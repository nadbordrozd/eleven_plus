# Local storage schema

The app is client-side in V1. Store state under a single key, e.g. `eleven_plus_maths_state_v1`.

```ts
interface SkillProgress {
  skill_id: string;
  points: number;
  attempts: number;
  correct: number;
  wrong: number;
  status: 'not_attempted' | 'in_progress' | 'done' | 'mastered';
  last_practiced_at?: string;
}

interface AppStateV1 {
  schema_version: 1;
  question_tally: { attempted: number; correct: number; wrong: number };
  skill_progress: Record<string, SkillProgress>;
  completed_tests: Array<{
    id: string;
    blueprint_id: string;
    completed_at: string;
    score: number;
    total: number;
    recommended_skill_ids: string[];
  }>;
}
```

Suggested scoring defaults: +1 point for correct, -2 for wrong, floor at 0, `done` at 20 points, `mastered` at 40 points with at least 90% recent accuracy. Keep thresholds configurable.
