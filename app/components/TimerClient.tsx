'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRoutine } from '../lib/storage';
import { playSoundForPhase, playCountdownTick, playComplete } from '../lib/sounds';
import { Phase, PhaseType, Routine } from '../types';
import { useTheme } from '../lib/theme';

// ─── Phase sequence builder ───────────────────────────────────────────────────

function buildSequence(routine: Routine): Phase[] {
  const phases: Phase[] = [];
  const rounds = routine.rounds ?? 1;

  if (routine.warmupDuration > 0) {
    phases.push({ type: 'warmup', duration: routine.warmupDuration, label: 'Warm Up' });
  }

  for (let r = 0; r < rounds; r++) {
    routine.exercises.forEach((ex, i) => {
      phases.push({
        type: 'exercise',
        duration: routine.exerciseDuration,
        label: ex.name || `Exercise ${i + 1}`,
        round: r + 1,
      });
      const isLastExercise = i === routine.exercises.length - 1;
      const isLastRound = r === rounds - 1;
      if (!isLastExercise && routine.restDuration > 0) {
        phases.push({ type: 'rest', duration: routine.restDuration, label: 'Rest', round: r + 1 });
      } else if (isLastExercise && !isLastRound && routine.restDuration > 0) {
        phases.push({ type: 'rest', duration: routine.restDuration, label: `Round ${r + 2}`, round: r + 1 });
      }
    });
  }

  if (routine.cooldownDuration > 0) {
    phases.push({ type: 'cooldown', duration: routine.cooldownDuration, label: 'Cool Down' });
  }

  return phases;
}

// ─── Phase config ─────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<PhaseType, {
  label: string;
  description: (phaseName: string) => string;
}> = {
  warmup:   { label: 'WARM UP',   description: () => 'Warm up in progress.' },
  exercise: { label: 'WORK',      description: (n) => `${n}` },
  rest:     { label: 'REST',      description: () => 'Rest period.' },
  cooldown: { label: 'COOL DOWN', description: () => 'Cool down in progress.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export default function TimerClient({ routineId }: { routineId: string }) {
  const router = useRouter();
  const { accent } = useTheme();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);

  const [state, setState] = useState<TimerState>('idle');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tickAnim, setTickAnim] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(false);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    const r = getRoutine(routineId);
    if (r) {
      setRoutine(r);
      const seq = buildSequence(r);
      setPhases(seq);
      if (seq.length > 0) setTimeLeft(seq[0].duration);
    }
  }, [routineId]);

  const currentPhase = phases[phaseIndex] ?? null;
  const cfg = currentPhase ? PHASE_CONFIG[currentPhase.type] : PHASE_CONFIG.warmup;
  // accent comes from global theme

  const progress = currentPhase
    ? ((currentPhase.duration - timeLeft) / currentPhase.duration) * 100
    : 0;

  const R = 168;
  const circumference = 2 * Math.PI * R;

  const advancePhase = useCallback((nextIndex: number, allPhases: Phase[]) => {
    if (nextIndex >= allPhases.length) {
      setState('done');
      playComplete();
      return;
    }
    const next = allPhases[nextIndex];
    setPhaseIndex(nextIndex);
    setTimeLeft(next.duration);
    playSoundForPhase(next.type);
  }, []);

  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 3 && prev > 1) {
          playCountdownTick();
          setTickAnim(true);
          setTimeout(() => setTickAnim(false), 300);
        }
        if (prev <= 1) {
          tickRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (tickRef.current && timeLeft === 0 && state === 'running') {
      tickRef.current = false;
      advancePhase(phaseIndex + 1, phases);
    }
  }, [timeLeft, state, phaseIndex, phases, advancePhase]);

  function start() {
    if (state === 'idle' && phases.length > 0) {
      startTimeRef.current = new Date();
      playSoundForPhase(phases[0].type);
    }
    setState('running');
  }

  function pause() { setState('paused'); }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('idle');
    setPhaseIndex(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
  }

  function restart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('idle');
    setPhaseIndex(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function getWorkoutMeta() {
    const now = startTimeRef.current ?? new Date();
    const rounds = routine!.rounds ?? 1;
    const totalSecs =
      routine!.warmupDuration +
      rounds * routine!.exercises.length * routine!.exerciseDuration +
      rounds * Math.max(0, routine!.exercises.length - 1) * routine!.restDuration +
      Math.max(0, rounds - 1) * routine!.restDuration +
      routine!.cooldownDuration;
    const totalMin = Math.floor(totalSecs / 60);
    const totalSec = totalSecs % 60;
    return {
      dateStr: now.toISOString().split('T')[0],
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      totalLabel: totalMin > 0 ? `${totalMin}m ${totalSec}s` : `${totalSec}s`,
      rounds,
    };
  }

  function exportMarkdown() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const lines = [
      '---',
      `title: "${routine.name}"`,
      `date: ${dateStr}`,
      `time: ${timeStr}`,
      `tags: [workout, hiit]`,
      `type: HIIT`,
      '---',
      '',
      `# ${routine.name}`,
      '',
      `**Date:** ${dateStr} at ${timeStr}  `,
      `**Total Time:** ${totalLabel}  `,
      `**Exercises:** ${routine.exercises.length}  `,
      `**Rounds:** ${rounds}  `,
      '',
      '## Workout Structure',
      '',
      '| Phase | Duration |',
      '| ----- | -------- |',
      ...(routine.warmupDuration > 0 ? [`| Warm Up | ${routine.warmupDuration}s |`] : []),
      `| Exercise | ${routine.exerciseDuration}s |`,
      `| Rest | ${routine.restDuration}s |`,
      ...(routine.cooldownDuration > 0 ? [`| Cool Down | ${routine.cooldownDuration}s |`] : []),
      '',
      '## Exercises',
      '',
      ...routine.exercises.map(ex => `- [x] ${ex.name}`),
      '',
      '## Notes',
      '',
      '_Add notes here..._',
      '',
    ];
    downloadFile(lines.join('\n'), `${dateStr} ${routine.name}.md`, 'text/markdown');
  }

  function exportCSV() {
    if (!routine) return;
    const { dateStr, rounds } = getWorkoutMeta();
    const rows = [
      ['Date', 'Routine', 'Round', 'Phase', 'Exercise', 'Duration (s)'],
      ...(routine.warmupDuration > 0
        ? [[dateStr, routine.name, '', 'Warm Up', '', String(routine.warmupDuration)]]
        : []),
      ...Array.from({ length: rounds }).flatMap((_, r) =>
        routine.exercises.map(ex => [
          dateStr, routine.name, String(r + 1), 'Exercise', ex.name, String(routine.exerciseDuration),
        ])
      ),
      ...(routine.cooldownDuration > 0
        ? [[dateStr, routine.name, '', 'Cool Down', '', String(routine.cooldownDuration)]]
        : []),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    downloadFile(csv, `${dateStr} ${routine.name}.csv`, 'text/csv');
  }

  function exportJSON() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const data = {
      routine: routine.name,
      date: dateStr,
      time: timeStr,
      totalTime: totalLabel,
      rounds,
      warmupDuration: routine.warmupDuration,
      exerciseDuration: routine.exerciseDuration,
      restDuration: routine.restDuration,
      cooldownDuration: routine.cooldownDuration,
      exercises: routine.exercises.map(ex => ex.name),
    };
    downloadFile(JSON.stringify(data, null, 2), `${dateStr} ${routine.name}.json`, 'application/json');
  }

  function exportText() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const lines = [
      `HIIT WORKOUT — ${routine.name}`,
      `Date: ${dateStr} at ${timeStr}`,
      `Total Time: ${totalLabel}  |  Rounds: ${rounds}`,
      '',
      'STRUCTURE',
      ...(routine.warmupDuration > 0 ? [`  Warm Up:    ${routine.warmupDuration}s`] : []),
      `  Exercise:   ${routine.exerciseDuration}s`,
      `  Rest:       ${routine.restDuration}s`,
      ...(routine.cooldownDuration > 0 ? [`  Cool Down:  ${routine.cooldownDuration}s`] : []),
      '',
      'EXERCISES',
      ...routine.exercises.map((ex, i) => `  ${i + 1}. ${ex.name}`),
    ];
    downloadFile(lines.join('\n'), `${dateStr} ${routine.name}.txt`, 'text/plain');
  }

  if (!routine) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <p className="text-white/30 text-sm">Routine not found.</p>
      </div>
    );
  }

  const phaseLabel = currentPhase ? cfg.label : '';
  const phaseDesc = currentPhase
    ? cfg.description(currentPhase.label)
    : '';

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Back button */}
      <div className="absolute top-5 left-5 z-10">
        <button
          onClick={() => { stop(); router.push('/'); }}
          className="p-2 text-white/25 hover:text-white/60 transition-colors"
          title="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-12">

        {state === 'done' ? (
          /* ── Done state ── */
          <div className="text-center space-y-4">
            <p className="text-xs tracking-[0.25em] uppercase text-white/30">Complete</p>
            <h2 className="text-4xl font-light text-white">{routine.name}</h2>
            <p className="text-white/30 text-sm">Workout finished.</p>

            <div className="flex flex-col items-center gap-3 pt-8 w-full max-w-xs">
              <div className="relative w-full">
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm transition-all"
                >
                  Export
                  <svg className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showExportMenu && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 rounded-xl border border-white/10 bg-[#161616] overflow-hidden shadow-2xl z-10">
                    {[
                      { label: 'Markdown', sub: '.md', fn: exportMarkdown },
                      { label: 'CSV', sub: '.csv', fn: exportCSV },
                      { label: 'JSON', sub: '.json', fn: exportJSON },
                      { label: 'Plain Text', sub: '.txt', fn: exportText },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={opt.fn}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                      >
                        <span className="text-sm text-white/70">{opt.label}</span>
                        <span className="text-xs text-white/25">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={restart}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm transition-all"
                >
                  Restart
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Timer state ── */
          <>
            {/* Ring with content inside */}
            <div className="relative flex items-center justify-center w-full max-w-[380px] aspect-square">
              <svg viewBox="0 0 420 420" className="w-full rotate-[-90deg] absolute inset-0">
                {/* Track */}
                <circle
                  cx="210" cy="210" r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="6"
                />
                {/* Progress */}
                <circle
                  cx="210" cy="210" r={R}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  stroke={currentPhase?.type === 'rest' ? '#6b7280' : accent}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * progress) / 100}
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.7s ease' }}
                />
              </svg>

              {/* Inner text */}
              <div className="relative flex flex-col items-center justify-center gap-2 text-center px-10">
                <span
                  className="text-xs font-semibold tracking-[0.2em] uppercase transition-colors duration-700"
                  style={{ color: currentPhase?.type === 'rest' ? '#6b7280' : accent }}
                >
                  {phaseLabel}
                </span>

                <span
                  className={`font-light text-white transition-opacity ${
                    state === 'paused' ? 'opacity-40' : 'opacity-100'
                  } ${tickAnim ? 'tick-animate' : ''}`}
                  style={{ fontSize: 'clamp(3rem, 14vw, 5rem)', lineHeight: 1, letterSpacing: '-0.02em' }}
                >
                  {formatTime(timeLeft)}
                </span>

                <span className="text-sm text-white/30 mt-1">
                  {state === 'paused' ? 'Paused.' : phaseDesc}
                </span>

                {(routine.rounds ?? 1) > 1 && currentPhase?.round && (
                  <span className="text-xs text-white/20 tracking-wider uppercase">
                    Round {currentPhase.round} / {routine.rounds}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-12">
              {/* Restart */}
              <button
                onClick={restart}
                className="text-white/35 hover:text-white/70 transition-colors"
                title="Restart"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>

              {/* Play / Pause */}
              {state === 'running' ? (
                <button
                  onClick={pause}
                  className="text-white/70 hover:text-white transition-colors"
                  title="Pause"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={start}
                  className="text-white/70 hover:text-white transition-colors"
                  title="Start"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </button>
              )}

              {/* Stop */}
              <button
                onClick={stop}
                disabled={state === 'idle'}
                className="text-white/35 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="Stop"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
