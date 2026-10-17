"use client";
import { useEffect, useRef, type ReactNode } from 'react';
import styles from '@/app/business-pulse/manual-pulse.module.css';

export function PulseDialog({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    ref.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.nativeDialog} aria-labelledby={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>{children}</dialog>;
}
