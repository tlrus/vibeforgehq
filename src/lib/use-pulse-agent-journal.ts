"use client";
import { useEffect, useState } from 'react';
import { AGENT_ACTIVITY_EVENT, agentJournalKey, readAgentJournal, type PulseAgentRun } from './pulse-agent-activity';

export function usePulseAgentJournal(demo = false) {
  const [snapshot, setSnapshot] = useState<{ runs: PulseAgentRun[]; error: string }>({ runs: [], error: '' });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setSnapshot(readAgentJournal(demo)); setReady(true); };
    const frame = requestAnimationFrame(sync);
    const onStorage = (event: StorageEvent) => { if (event.key === agentJournalKey(demo) || event.key === null) sync(); };
    window.addEventListener(AGENT_ACTIVITY_EVENT, sync);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    const timer = setInterval(sync, 15_000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); window.removeEventListener(AGENT_ACTIVITY_EVENT, sync); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', sync); };
  }, [demo]);
  return { ...snapshot, ready };
}
