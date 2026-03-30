'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { getRoutine, saveRoutine } from '../lib/storage';
import { Exercise, Routine } from '../types';
import { useTheme } from '../lib/theme';

interface Props {
  routineId: string; // 'new' or existing id
}

function DurationInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs uppercase tracking-wider ${color}`}>{label}</label>
      <div className="flex items-center bg-[#0d0d0d] border border-white/8 rounded-xl overflow-hidden">
        <input
          type="number"
          min={0}
          max={999}
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-16 px-3 py-2.5 bg-transparent text-center text-white/70 text-sm focus:outline-none"
        />
        <span className="text-white/20 text-xs pr-3">s</span>
      </div>
    </div>
  );
}

export default function RoutineEditor({ routineId }: Props) {
  const router = useRouter();
  const { accent } = useTheme();
  const isNew = routineId === 'new';

  const [name, setName] = useState('');
  const [warmupDuration, setWarmupDuration] = useState(60);
  const [exerciseDuration, setExerciseDuration] = useState(40);
  const [restDuration, setRestDuration] = useState(20);
  const [cooldownDuration, setCooldownDuration] = useState(60);
  const [rounds, setRounds] = useState(1);
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: uuidv4(), name: 'Exercise 1' },
  ]);

  useEffect(() => {
    if (!isNew) {
      const r = getRoutine(routineId);
      if (r) {
        setName(r.name);
        setWarmupDuration(r.warmupDuration);
        setExerciseDuration(r.exerciseDuration);
        setRestDuration(r.restDuration);
        setCooldownDuration(r.cooldownDuration);
        setRounds(r.rounds ?? 1);
        setExercises(r.exercises);
      }
    }
  }, [routineId, isNew]);

  function addExercise() {
    setExercises(prev => [...prev, { id: uuidv4(), name: `Exercise ${prev.length + 1}` }]);
  }

  function removeExercise(id: string) {
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function updateExerciseName(id: string, newName: string) {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, name: newName } : e));
  }

  function moveExercise(index: number, dir: 'up' | 'down') {
    const next = [...exercises];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setExercises(next);
  }

  function handleSave() {
    if (!name.trim()) {
      alert('Please enter a routine name.');
      return;
    }
    if (exercises.length === 0) {
      alert('Add at least one exercise.');
      return;
    }

    const routine: Routine = {
      id: isNew ? uuidv4() : routineId,
      name: name.trim(),
      warmupDuration,
      exerciseDuration,
      restDuration,
      cooldownDuration,
      rounds: Math.max(1, rounds),
      exercises,
    };

    saveRoutine(routine);
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0d0d0d] border-b border-white/6">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 text-white/25 hover:text-white/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-white/60 flex-1">
            {isNew ? 'New Routine' : 'Edit Routine'}
          </h1>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm transition-all"
          >
            Save
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6 space-y-4">
        {/* Routine name */}
        <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: accent }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Cardio Blast"
            className="w-full bg-transparent text-white/80 placeholder-white/20 focus:outline-none text-base"
          />
        </div>

        {/* Durations */}
        <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
          <h2 className="text-xs uppercase tracking-wider mb-4" style={{ color: accent }}>Durations</h2>
          <div className="grid grid-cols-4 gap-3">
            <DurationInput label="Warm Up" value={warmupDuration} onChange={setWarmupDuration} color="text-white/50" />
            <DurationInput label="Exercise" value={exerciseDuration} onChange={setExerciseDuration} color="text-white/50" />
            <DurationInput label="Rest" value={restDuration} onChange={setRestDuration} color="text-white/50" />
            <DurationInput label="Cool Down" value={cooldownDuration} onChange={setCooldownDuration} color="text-white/50" />
          </div>
        </div>

        {/* Rounds */}
        <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: accent }}>Rounds</h2>
              <p className="text-xs text-white/25 mt-0.5">Repeat the full exercise sequence</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setRounds(r => Math.max(1, r - 1))}
                className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white/70 flex items-center justify-center text-lg transition-colors"
              >−</button>
              <span className="text-xl font-light text-white/70 w-6 text-center">{rounds}</span>
              <button
                onClick={() => setRounds(r => r + 1)}
                className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white/70 flex items-center justify-center text-lg transition-colors"
              >+</button>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wider" style={{ color: accent }}>
              Exercises <span className="opacity-50">({exercises.length})</span>
            </h2>
            <button
              onClick={addExercise}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-xs transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          {exercises.length === 0 ? (
            <p className="text-center text-white/20 py-8 text-sm">
              No exercises yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[#0d0d0d] border border-white/5 group"
                >
                  <span className="text-xs text-white/20 w-4 text-right shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={e => updateExerciseName(ex.id, e.target.value)}
                    className="flex-1 bg-transparent text-white/70 text-sm placeholder-white/20 focus:outline-none min-w-0"
                    placeholder="Exercise name"
                  />
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveExercise(i, 'up')}
                      disabled={i === 0}
                      className="p-1.5 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveExercise(i, 'down')}
                      disabled={i === exercises.length - 1}
                      className="p-1.5 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="p-1.5 text-white/20 hover:text-red-400/60 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sequence preview */}
        <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
          <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: accent }}>Sequence</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {warmupDuration > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/8">Warm Up</span>
            )}
            {Array.from({ length: rounds }).map((_, r) => (
              <>
                {rounds > 1 && (
                  <span key={`round-${r}`} className="px-2.5 py-1 rounded-full bg-white/3 text-white/20 border border-white/6">
                    R{r + 1}
                  </span>
                )}
                {exercises.map((ex, i) => (
                  <>
                    <span key={`ex-${r}-${ex.id}`} className="px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/8">
                      {ex.name || `Exercise ${i + 1}`}
                    </span>
                    {i < exercises.length - 1 && restDuration > 0 && (
                      <span key={`rest-${r}-${ex.id}`} className="px-2.5 py-1 rounded-full bg-white/3 text-white/25 border border-white/6">Rest</span>
                    )}
                  </>
                ))}
                {r < rounds - 1 && restDuration > 0 && (
                  <span key={`between-${r}`} className="px-2.5 py-1 rounded-full bg-white/3 text-white/25 border border-white/6">Rest</span>
                )}
              </>
            ))}
            {cooldownDuration > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/8">Cool Down</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
