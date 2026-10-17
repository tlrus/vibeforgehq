import type { PulseAgentId } from '@/lib/pulse-agent-activity';
import styles from './pulse-agent-dashboard.module.css';

/** Distinct illustrated assistants, not portraits of real people. */
export function PulseAgentAvatar({ agent, small = false }: { agent: PulseAgentId; small?: boolean }) {
  return <span className={`${styles.avatar} ${small ? styles.avatarSmall : ''}`} data-agent={agent} aria-hidden="true">
    <svg viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" className={styles.avatarBackdrop} />
      <path d="M15 77c1-15 11-22 25-22s24 7 25 22" className={styles.avatarBody} />
      <rect x="20" y="19" width="40" height="39" rx={agent === 'linza' ? 18 : 13} className={styles.avatarFace} />
      {agent === 'atlas' ? <>
        <path d="M19 32h42M37 36h6" className={styles.avatarLine} />
        <circle cx="30" cy="36" r="8" className={styles.avatarGlasses} /><circle cx="50" cy="36" r="8" className={styles.avatarGlasses} />
        <circle cx="30" cy="36" r="2" className={styles.avatarEye} /><circle cx="50" cy="36" r="2" className={styles.avatarEye} />
        <path d="M35 48h10M27 22l5-8h16l5 8" className={styles.avatarLine} />
      </> : agent === 'mayak' ? <>
        <path d="M40 18V9" className={styles.avatarLine} /><circle cx="40" cy="8" r="4" className={styles.avatarEye} />
        <path d="M27 36q4-5 8 0m10 0q4-5 8 0m-19 10q6 6 12 0" className={styles.avatarLine} />
        <path d="M28 64h24M40 59v15" className={styles.avatarLine} />
      </> : agent === 'linza' ? <>
        <rect x="24" y="29" width="32" height="15" rx="7.5" className={styles.avatarGlasses} />
        <circle cx="33" cy="36" r="3" className={styles.avatarEye} /><circle cx="47" cy="36" r="3" className={styles.avatarEye} />
        <path d="M35 50h10M56 22l7-5m-6 10 8-1" className={styles.avatarLine} />
        <circle cx="40" cy="68" r="6" className={styles.avatarGlasses} />
      </> : <>
        <path d="M21 28c2-11 12-15 20-15 12 0 19 7 19 17l-11-9-13 8-15-1Z" className={styles.avatarBody} />
        <circle cx="31" cy="37" r="2.5" className={styles.avatarEye} /><circle cx="49" cy="37" r="2.5" className={styles.avatarEye} />
        <path d="M33 48q7 3 14 0" className={styles.avatarLine} />
        <path d="m40 66-10-6v13l10-7 10 7V60l-10 6Z" className={styles.avatarFace} />
      </>}
    </svg>
  </span>;
}
