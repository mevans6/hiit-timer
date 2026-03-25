export interface Exercise {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  name: string;
  warmupDuration: number;
  exerciseDuration: number;
  restDuration: number;
  cooldownDuration: number;
  rounds: number;
  exercises: Exercise[];
}

export interface Phase {
  type: PhaseType;
  duration: number;
  label: string;
  round?: number;
}

export type PhaseType = 'warmup' | 'exercise' | 'rest' | 'cooldown';
