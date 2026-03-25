'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRoutines, deleteRoutine } from './lib/storage';
import { Routine } from './types';

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

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

export default function HomePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);

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
    <div className="min-h-screen bg-[#010108]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#08080f]">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              HIIT Timer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Interval Training</p>
          </div>
          <Link
            href="/routine/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Routine
          </Link>
        </div>
      </header>

      {/* Routines list */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {routines.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-purple-800/40 flex items-center justify-center">
              <svg className="w-9 h-9 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400 text-lg font-medium">No routines yet</p>
            <p className="text-slate-600 text-sm mt-2">Create your first HIIT routine to get started</p>
            <Link
              href="/routine/new"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-blue-900/30"
            >
              Create Routine
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map(routine => (
              <div key={routine.id} className="group relative">
                <Link
                  href={`/timer/${routine.id}`}
                  className="block rounded-2xl border border-white/8 bg-[#0c0c14] hover:bg-[#14142a] hover:border-purple-800/50 transition-all p-5 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-slate-100 truncate">{routine.name}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
                        {(routine.rounds ?? 1) > 1 && ` · ${routine.rounds} rounds`}
                        {' '}&middot; {totalTime(routine)} total
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {routine.warmupDuration > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#0a0010]/90 text-[#dd00ff] border border-[#dd00ff]/25">
                            Warm {formatDuration(routine.warmupDuration)}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#0f0005]/90 text-[#ff003c] border border-[#ff003c]/25">
                          Work {formatDuration(routine.exerciseDuration)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#04000f]/90 text-[#7700ff] border border-[#7700ff]/25">
                          Rest {formatDuration(routine.restDuration)}
                        </span>
                        {routine.cooldownDuration > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#00071a]/90 text-[#1d5dfc] border border-[#1d5dfc]/25">
                            Cool {formatDuration(routine.cooldownDuration)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:scale-105 group-hover:brightness-110 transition-all">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Edit & Delete actions */}
                <div className="absolute top-4 right-16 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/routine/${routine.id}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button
                    onClick={e => handleDelete(routine.id, e)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
