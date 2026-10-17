"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  Square,
  Target,
  Zap,
} from "lucide-react";
import styles from "./pulse-agent-panel.module.css";
import type { BusinessPulseClient } from "@/lib/business-pulse-data";
import type {
  PulseAgentBrief,
  PulseAgentNextAction,
  PulseAgentFacts,
} from "@/lib/pulse-agent";
import { runPulseAgent } from '@/lib/pulse-agent-activity';
import { usePulseAgentJournal } from '@/lib/use-pulse-agent-journal';

type AgentTab = "brief" | "next" | "facts";

type PulseAgentPanelProps = {
  client: BusinessPulseClient;
  onApplyNextAction?: (action: string, dueAtIso: string) => void;
  onInsertComment?: (text: string) => void;
  demo?: boolean;
  onAgentCommentChange?: (comment: string) => void;
};

export function PulseAgentPanel({
  client,
  onApplyNextAction,
  onInsertComment,
  demo = false,
  onAgentCommentChange,
}: PulseAgentPanelProps) {
  const controller = useRef<AbortController | null>(null);
  const { error: journalError } = usePulseAgentJournal(demo);
  useEffect(() => () => controller.current?.abort(), []);
  const [activeTab, setActiveTab] = useState<AgentTab | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'rules' | 'configured'>('rules');

  const [brief, setBrief] = useState<PulseAgentBrief | null>(null);
  const [nextAction, setNextAction] = useState<PulseAgentNextAction | null>(null);
  const [facts, setFacts] = useState<PulseAgentFacts | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard fail
    }
  };

  const runAgent = async (action: AgentTab) => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setActiveTab(action);
    setError(null);
    setLoading(true);

    try {
      const data = await runPulseAgent(action === 'next' ? 'suggest_next' : action === 'facts' ? 'extract_facts' : 'brief', client, { demo, mode, signal: request.signal });

      if (action === "brief") {
        setBrief(data as PulseAgentBrief);
      } else if (action === "next") {
        setNextAction(data as PulseAgentNextAction);
      } else if (action === "facts") {
        setFacts(data as PulseAgentFacts);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      controller.current = null;
      setLoading(false);
    }
  };

  return (
    <section className={styles.agentBox} aria-label="Comp AI CRM Agent">
      <header className={styles.agentHeader}>
        <div className={styles.agentTitle}>
          <BrainCircuit />
          <span>AI-Агент (Comp AI Pulse)</span>
          <span className={styles.agentBadge}>Встроен</span>
        </div>
        <div className={styles.agentActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${activeTab === "brief" ? styles.actionBtnActive : ""}`}
            onClick={() => runAgent("brief")}
            disabled={loading}
          >
            <Zap /> Бриф перед звонком
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${activeTab === "next" ? styles.actionBtnActive : ""}`}
            onClick={() => runAgent("next")}
            disabled={loading}
          >
            <Target /> Следующий шаг
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${activeTab === "facts" ? styles.actionBtnActive : ""}`}
            onClick={() => runAgent("facts")}
            disabled={loading}
          >
            <FileText /> Факты
          </button>
        </div>
      </header>

      <div className={styles.agentCorrection}>
        {onAgentCommentChange ? <label><strong>Уточнение для агента</strong><textarea value={client.agentComment || ''} disabled={loading} maxLength={2000} rows={3} placeholder="Например: презентацию ещё не отправил. Нужно напомнить отправить, а не звонить после отправки." onChange={event => { onAgentCommentChange(event.target.value); setBrief(null); setNextAction(null); setFacts(null); }} /><small>Уточнение действует для этой карточки и сохраняется кнопкой «Сохранить». После правки запустите анализ снова.</small></label> : null}
        <label className={styles.analysisMode}><span>Способ анализа</span><select value={mode} disabled={loading} onChange={event => setMode(event.target.value as 'rules' | 'configured')}><option value="rules">Встроенные правила · без AI-расходов</option><option value="configured">AI-модель · возможен расход API</option></select></label>
        {activeTab && !loading && !brief && !nextAction && !facts ? <button type="button" className={styles.applyBtn} onClick={() => runAgent(activeTab)}>Пересмотреть с уточнением</button> : null}
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <RefreshCw className={styles.spin} />
          <span>AI-агент анализирует карточку и историю взаимодействий...</span>
          <button type="button" className={styles.miniBtn} onClick={() => controller.current?.abort()}><Square /> Остановить ожидание</button>
        </div>
      )}

      {journalError ? <p className={styles.errorNotice} role="alert">{journalError}</p> : null}
      {!loading && !error && activeTab && (activeTab === 'brief' ? brief : activeTab === 'next' ? nextAction : facts) ? <p className={styles.sourceNotice}>
        {activeTab === 'brief' ? 'Атлас' : activeTab === 'next' ? 'Маяк' : 'Линза'} · {(activeTab === 'brief' ? brief : activeTab === 'next' ? nextAction : facts)?.source === 'heuristic' ? 'Встроенные правила — проверьте шаблонные рекомендации' : 'AI-модель — проверьте рекомендации'}. Результат добавлен в журнал агентов на дашборде.
      </p> : null}

      {error && (
        <div className={styles.errorNotice} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && activeTab === "brief" && brief && (
        <div className={styles.resultBox}>
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Досье клиента</span>
            <p className={styles.summaryText}>{brief.summary}</p>
          </div>

          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Главная цель звонка</span>
            <div className={styles.goalHighlight}>🎯 {brief.callGoal}</div>
          </div>

          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Рекомендуемый скрипт для разговора</span>
            <div className={styles.scriptBox}>{brief.script}</div>
            <div className={styles.scriptToolbar}>
              {onInsertComment && (
                <button
                  type="button"
                  className={styles.applyBtn}
                  onClick={() => onInsertComment(brief.script)}
                  title="Вставить этот скрипт в поле комментария к клиенту"
                >
                  <Plus /> Вставить в комментарий
                </button>
              )}
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => copyToClipboard(brief.script)}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>

          {brief.keyPains.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Ключевые боли и контекст</span>
              <ul className={styles.listItems}>
                {brief.keyPains.map((pain, i) => (
                  <li key={i}>{pain}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.suggestedQuestions.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Вопросы для выявления потребности</span>
              <ul className={styles.listItems}>
                {brief.suggestedQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.objectionTips.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Отработка вероятных возражений</span>
              <ul className={styles.listItems}>
                {brief.objectionTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !error && activeTab === "next" && nextAction && (
        <div className={styles.resultBox}>
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Рекомендуемый шаг</span>
            <div className={styles.goalHighlight}>
              <strong>{nextAction.action}</strong>
              <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "#a2eed3" }}>
                Срок: {nextAction.dueLabel} · Канал: {nextAction.channel === "whatsapp" ? "WhatsApp" : nextAction.channel === "email" ? "Email" : "Звонок"}
              </div>
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Почему это важно</span>
            <p className={styles.summaryText}>{nextAction.reason}</p>
          </div>

          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Черновик сообщения</span>
            <div className={styles.scriptBox}>{nextAction.messageDraft}</div>
            <div className={styles.scriptToolbar}>
              {onApplyNextAction && (
                <button
                  type="button"
                  className={styles.applyBtn}
                  onClick={() => onApplyNextAction(nextAction.action, nextAction.dueAtIso)}
                >
                  <Target /> Применить как следующий шаг в карточку
                </button>
              )}
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => copyToClipboard(nextAction.messageDraft)}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "facts" && facts && (
        <div className={styles.resultBox}>
          <div className={styles.factsGrid}>
            <div className={styles.factCard}>
              <small>Бюджет</small>
              <strong>{facts.budget || "Не зафиксирован"}</strong>
            </div>
            <div className={styles.factCard}>
              <small>ЛПР</small>
              <strong>{facts.decisionMaker || "Не определен"}</strong>
            </div>
            <div className={styles.factCard}>
              <small>Сроки / Дедлайн</small>
              <strong>{facts.timeline || "Не определены"}</strong>
            </div>
          </div>

          {facts.objections.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Зафиксированные возражения</span>
              <ul className={styles.listItems}>
                {facts.objections.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {facts.competitors.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Конкуренты / Тендер</span>
              <ul className={styles.listItems}>
                {facts.competitors.map((comp, i) => (
                  <li key={i}>{comp}</li>
                ))}
              </ul>
            </div>
          )}

          {facts.keyFacts.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Установленные факты</span>
              <ul className={styles.listItems}>
                {facts.keyFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
