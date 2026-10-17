"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildBusinessPulseSeedClients, businessPulseStorageKey, parseStoredBusinessPulseClients, type BusinessPulseClient } from './business-pulse-data';
import { demoPulseClients } from './business-pulse-workspace';

export function usePulseWorkspace() {
  const [clients, setState] = useState<BusinessPulseClient[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const key = useRef(businessPulseStorageKey);
  const read = useCallback(() => {
    const raw = localStorage.getItem(key.current);
    if (raw === null) return key.current.endsWith('-demo') ? demoPulseClients() : buildBusinessPulseSeedClients();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('invalid');
    const result = parseStoredBusinessPulseClients(raw);
    if (result.length !== parsed.length) throw new Error('invalid');
    return result;
  }, []);
  useEffect(() => {
    const isDemo = new URLSearchParams(location.search).get('demo') === '1';
    key.current = businessPulseStorageKey + (isDemo ? '-demo' : '');
    const sync = () => {
      setDemo(isDemo);
      try { setState(read()); setError(''); }
      catch { setError('Не удалось прочитать сохранённую базу. Экспортируйте резервную копию перед восстановлением.'); }
      setHydrated(true);
    };
    const frame = requestAnimationFrame(sync);
    const onStorage = (e: StorageEvent) => { if (e.key === key.current) sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', sync); };
  }, [read]);
  const setClients = useCallback((update: (current: BusinessPulseClient[]) => BusinessPulseClient[]) => {
    try {
      const next = update(read());
      localStorage.setItem(key.current, JSON.stringify(next));
      setState(next); setError(''); return true;
    } catch { setError('Изменения не сохранены. Проверьте доступ к хранилищу браузера и свободное место, затем повторите.'); return false; }
  }, [read]);
  const exportBackup = () => {
    const raw = localStorage.getItem(key.current) ?? JSON.stringify(clients);
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `business-pulse-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { clients, setClients, hydrated, error, demo, exportBackup };
}
