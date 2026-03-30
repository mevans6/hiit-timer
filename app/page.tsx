'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRoutines, deleteRoutine } from './lib/storage';
import { Routine } from './types';
import { useTheme, THEME_COLORS, ThemeColor } from './lib/theme';

function totalTime(routine: Routine): string {
  const n = routine.exercises.length;
  const rounds = routine.rounds ?? 1;
  if (n === 0) return '0s';
  const t =
    routine.warmupDuration +
    rounds * n * routine.exerciseDuration +
    rounds * Math.max(0, n - 1) * routine.restDuration +
    Math.max(0, rounds - 1) * routine.restDuration +
    routine.cooldownDuration;
  const m = Math.floor(t / 60);
  const s = t % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function ThemeModal({ onClose }: { onClose: () => void }) {
  const { accent, setAccent } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-[#1a1a1a] rounded-3xl p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs tracking-[0.2em] uppercase text-white/30 mb-2">Display</p>
        <h2 className="text-3xl font-light text-white mb-1">Theme Color</h2>
        <p className="text-sm text-white/35 mb-7">Pick a vivid accent for the timer ring and controls.</p>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {THEME_COLORS.map(color => {
            const isSelected = accent === color.value;
            return (
              <button
                key={color.value}
                onClick={() => setAccent(color.value as ThemeColor)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left"
                style={{
                  borderColor: isSelected ? color.value : 'rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                <span
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ background: color.value }}
                />
                <span className="text-sm font-medium text-white/70">{color.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showTheme, setShowTheme] = useState(false);
  const { accent } = useTheme();

  useEffect(() => {
    setRoutines(getRoutines());
  }, []);

  function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this routine?')) return;
    deleteRoutine(id);
    setRoutines(getRoutines());
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {/* Gear icon */}
          <button
            onClick={() => setShowTheme(true)}
            className="p-1.5 text-white/25 hover:text-white/60 transition-colors"
            title="Theme"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <h1 className="text-lg font-medium tracking-tight" style={{ color: accent }}>
            HIIT Timer
          </h1>
        </div>
        <Link
          href="/routine/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </Link>
      </header>

      {/* Routines list */}
      <main className="max-w-lg mx-auto px-6 pb-12">
        {routines.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/25 text-sm">No routines yet.</p>
            <Link
              href="/routine/new"
              className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 text-sm transition-all"
            >
              Create your first routine
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {routines.map(routine => (
              <div key={routine.id} className="group relative">
                <Link
                  href={`/timer/${routine.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#161616] hover:bg-[#1c1c1c] hover:border-white/12 transition-all px-5 py-4"
                >
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium text-white/80 truncate">{routine.name}</h2>
                    <p className="text-xs text-white/25 mt-0.5">
                      {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
                      {(routine.rounds ?? 1) > 1 && ` · ${routine.rounds} rounds`}
                      {' · '}{totalTime(routine)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-white/20 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                {/* Edit & Delete */}
                <div className="absolute top-1/2 -translate-y-1/2 right-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/routine/${routine.id}`}
                    onClick={e => e.stopPropagation()}
                    className="p-2 text-white/25 hover:text-white/60 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </Link>
                  <button
                    onClick={e => handleDelete(routine.id, e)}
                    className="p-2 text-white/25 hover:text-red-400/70 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
    </div>
  );
}
