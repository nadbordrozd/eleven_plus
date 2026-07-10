// Generated content-model types for the 11+ maths practice app.

export type TopicId = string;
export type SkillId = string;
export type ArchetypeId = string;

export interface Topic {
  id: TopicId;
  title: string;
  description: string;
}

export interface Skill {
  id: SkillId;
  title: string;
  topic_id: TopicId;
  description: string;
  prerequisites: SkillId[];
  exam_facing: boolean;
  source_problem_count?: number;
}

export interface VisualSpec {
  type: string;
  description: string;
  renderer_data: string;
  placeholder_ok_in_v1: boolean;
}

export interface ArchetypeSpec {
  synthetic_example: string;
  parameterisation: string;
  constraints: string[];
  solution_strategy: string;
  distractor_patterns: string[];
  visual_spec: VisualSpec | null;
  difficulty_notes: string;
  implementation_priority: 'v1_text' | 'v1_visual_simple' | 'v2_visual_or_placeholder';
}

export interface Archetype {
  id: ArchetypeId;
  skill_id: SkillId;
  topic_id: TopicId;
  title: string;
  archetype_summary: string;
  generator_notes: string;
  requires_visual_component: boolean;
  visual_component_type: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  exam_facing: boolean;
  source_problem_count: number;
  source_use: string;
  spec: ArchetypeSpec;
}

export type AnswerFormat = 'multiple_choice' | 'free_response';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | string;
  text: string;
}

export interface QuestionInstance {
  id: string;
  skill_id: SkillId;
  archetype_id: ArchetypeId;
  prompt: string;
  visual?: Record<string, unknown> | null;
  answer_format: AnswerFormat;
  options?: QuestionOption[];
  answer: string | number | Record<string, unknown>;
  explanation?: string | null; // v2; can be null in V1
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
}

export interface SkillProgress {
  skill_id: SkillId;
  points: number;
  attempts: number;
  correct: number;
  wrong: number;
  status: 'not_attempted' | 'in_progress' | 'done' | 'mastered';
  last_practiced_at?: string;
}

export interface AppStateV1 {
  schema_version: 1;
  question_tally: { attempted: number; correct: number; wrong: number };
  skill_progress: Record<SkillId, SkillProgress>;
  completed_tests: Array<{
    id: string;
    blueprint_id: string;
    completed_at: string;
    score: number;
    total: number;
    recommended_skill_ids: SkillId[];
  }>;
}
