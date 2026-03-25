'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { getRoutine, saveRoutine } from '../lib/storage';
import { Exercise, Routine } from '../types';

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
      <label className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</label>
      <div className="flex items-center bg-[#060609] border border-white/10 rounded-xl overflow-hidden">
        <input
          type="number"
          min={0}
          max={999}
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-16 px-3 py-2.5 bg-transparent text-center text-slate-100 text-sm focus:outline-none focus:bg-white/5"
        />
        <span className="text-slate-600 text-xs pr-3">sec</span>
      </div>
    </div>
  );
}

export default function RoutineEditor({ routineId }: Props) {
  const router = useRouter();
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
    <div className="min-h-screen bg-[#010108]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#08080f] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-slate-100 flex-1">
            {isNew ? 'New Routine' : 'Edit Routine'}
          </h1>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/30"
          >
            Save
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Routine name */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c14] p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Routine Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Cardio Blast"
            className="w-full bg-[#060609] border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-600/60 focus:ring-1 focus:ring-purple-600/40 transition-colors text-base"
          />
        </div>

        {/* Durations */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c14] p-5">
          <h2 className="text-sm font-bold text-slate-300 mb-4">Durations</h2>
          <div className="grid grid-cols-4 gap-3">
            <DurationInput label="Warm Up" value={warmupDuration} onChange={setWarmupDuration} color="text-[#dd00ff]" />
            <DurationInput label="Exercise" value={exerciseDuration} onChange={setExerciseDuration} color="text-[#ff003c]" />
            <DurationInput label="Rest" value={restDuration} onChange={setRestDuration} color="text-[#7700ff]" />
            <DurationInput label="Cool Down" value={cooldownDuration} onChange={setCooldownDuration} color="text-[#1d5dfc]" />
          </div>
        </div>

        {/* Rounds */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c14] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-300">Rounds</h2>
              <p className="text-xs text-slate-600 mt-0.5">Repeat the full exercise sequence</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRounds(r => Math.max(1, r - 1))}
                className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/8 text-slate-300 font-bold text-lg flex items-center justify-center transition-colors"
              >−</button>
              <span className="text-2xl font-black text-slate-100 w-8 text-center">{rounds}</span>
              <button
                onClick={() => setRounds(r => r + 1)}
                className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/8 text-slate-300 font-bold text-lg flex items-center justify-center transition-colors"
              >+</button>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c14] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-300">
              Exercises
              <span className="ml-2 text-xs font-normal text-slate-600">({exercises.length})</span>
            </h2>
            <button
              onClick={addExercise}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-700/50 to-purple-700/50 hover:from-blue-600/60 hover:to-purple-600/60 border border-purple-700/40 text-purple-300 text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Exercise
            </button>
          </div>

          {exercises.length === 0 ? (
            <p className="text-center text-slate-600 py-8 text-sm">
              No exercises yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#060609] border border-white/6 group"
                >
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-800/60 to-purple-800/60 text-xs font-bold text-purple-300 shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={e => updateExerciseName(ex.id, e.target.value)}
                    className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 focus:outline-none min-w-0"
                    placeholder="Exercise name"
                  />
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveExercise(i, 'up')}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveExercise(i, 'down')}
                      disabled={i === exercises.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition-colors"
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
        <div className="rounded-2xl border border-white/8 bg-[#0c0c14] p-5">
          <h2 className="text-sm font-bold text-slate-300 mb-3">Sequence Preview</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {warmupDuration > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#0a0010]/90 text-[#dd00ff] border border-[#dd00ff]/25">Warm Up</span>
            )}
            {Array.from({ length: rounds }).map((_, r) => (
              <>
                {rounds > 1 && (
                  <span key={`round-${r}`} className="px-2.5 py-1 rounded-full bg-white/5 text-slate-500 border border-white/10 text-xs">
                    Round {r + 1}
                  </span>
                )}
                {exercises.map((ex, i) => (
                  <>
                    <span key={`ex-${r}-${ex.id}`} className="px-2.5 py-1 rounded-full bg-[#0f0005]/90 text-[#ff003c] border border-[#ff003c]/25">
                      {ex.name || `Exercise ${i + 1}`}
                    </span>
                    {i < exercises.length - 1 && restDuration > 0 && (
                      <span key={`rest-${r}-${ex.id}`} className="px-2.5 py-1 rounded-full bg-[#04000f]/90 text-[#7700ff] border border-[#7700ff]/25">Rest</span>
                    )}
                  </>
                ))}
                {r < rounds - 1 && restDuration > 0 && (
                  <span key={`between-${r}`} className="px-2.5 py-1 rounded-full bg-[#04000f]/90 text-[#7700ff] border border-[#7700ff]/25">Rest</span>
                )}
              </>
            ))}
            {cooldownDuration > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#00071a]/90 text-[#1d5dfc] border border-[#1d5dfc]/25">Cool Down</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
