'use client';
import type { BusinessPulseClient } from '@/lib/business-pulse-data';
import { clientConversation, entryConversation, temperatureMeta, type ConversationInput, type ConversationAnalysis, type Temperature } from '@/lib/pulse-conversation';
import styles from './pulse-conversation.module.css';

export function PulseConversationFields({ input, onChange, analysis, overrides, onOverrides, existing = false }: {
  input: ConversationInput; onChange: (value: ConversationInput) => void; analysis: ConversationAnalysis;
  overrides: Partial<ConversationAnalysis>; onOverrides: (value: Partial<ConversationAnalysis>) => void;
  existing?: boolean;
}) {
  return <section className={styles.conversation} aria-label="Новый разговор">
    <header><span>Новое касание</span><h3>Запишите разговор своими словами</h3><p>Слова клиента и ваши действия сохраняются отдельно. Разбор — локальные правила, без платного AI.</p></header>
    <label>Как общались<select name="interactionKind" value={input.kind} onChange={e => onChange({ ...input, kind: e.target.value as ConversationInput['kind'] })}><option value="call">Звонок</option><option value="message">Сообщение</option><option value="meeting">Встреча</option><option value="unknown">Другое / не указано</option></select></label>
    <label>Что ответил клиент<textarea name="customerResponse" rows={3} value={input.response} onChange={e => onChange({ ...input, response: e.target.value })} placeholder="Не хочет, дорого, теряются заявки, хочет больше продаж…" /></label>
    <label>Что я сказал / сделал и как изменился разговор<textarea name="managerWords" rows={3} value={input.managerWords} onChange={e => onChange({ ...input, managerWords: e.target.value })} placeholder="Объяснил, как перестать терять заявки. Клиент потеплел…" /></label>
    <label>Что обещали / о чём договорились<textarea name="promise" rows={2} value={input.promise} onChange={e => onChange({ ...input, promise: e.target.value })} placeholder="Отправить презу, подготовить КП, встретиться…" /></label>
    <div className={styles.analysis} aria-label="Разбор нового касания"><header><strong>{existing ? 'Текущий разбор карточки' : 'Как запись будет сохранена'}</strong><span style={{ color: temperatureMeta[analysis.temperature].color }}>{temperatureMeta[analysis.temperature].label}</span></header>
      {existing ? <p>Пока новый разговор не записан, здесь предыдущий разбор. Исправление без нового текста обновит только трактовку, не добавит касание.</p> : null}
      <dl>{(['objection', 'pain', 'desire'] as const).map((key,i) => <div key={key}><dt>{['Возражение','Боль','Желание'][i]}</dt><dd>{analysis[key] || 'Не определено'}</dd></div>)}</dl>
      <p>{analysis.stopContact ? 'Просьба не связываться: клиент исключается из очереди звонков.' : analysis.needsClarification ? 'Нужно уточнение: правила не могут уверенно понять эту запись.' : 'Разбор по правилам. Проверьте смысл до сохранения.'}</p>
      {analysis.usefulPhrase ? <p>Комментарий сохранится в скрипте клиента как приём, после которого вы отметили потепление. Это наблюдение, не доказанная закономерность.</p> : null}
      <details><summary>Исправить трактовку</summary><label>Интерес клиента<select name="temperature" value={analysis.temperature} onChange={e => onOverrides({ ...overrides, temperature: e.target.value as Temperature, needsClarification: false })}>{Object.entries(temperatureMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>
        {(['objection', 'pain', 'desire'] as const).map((key, i) => <label key={key}>{['Возражение — стандарт', 'Боль — стандарт', 'Желание — стандарт'][i]}<input name={key} value={analysis[key]} onChange={e => onOverrides({ ...overrides, [key]: e.target.value, needsClarification: false })} /></label>)}
        <button type="button" onClick={() => onOverrides({})}>Вернуть разбор по правилам</button>
      </details>
    </div>
  </section>;
}

export function PulseBehaviorArc({ client }: { client: BusinessPulseClient }) {
  const history = [...client.history].sort((a,b) => a.date.localeCompare(b.date) || a.order - b.order);
  const current = clientConversation(client).analysis;
  const phrases = history.map(entry => ({ entry, snapshot: entryConversation(entry) })).filter(item => item.snapshot.analysis.usefulPhrase);
  return <section className={styles.arc} aria-label="Линия поведения клиента"><header><span>Линия поведения</span><h3>Как развивался разговор</h3><p>{history.length} касаний · сейчас: {temperatureMeta[current.temperature].label}</p></header>
    {history.length ? <ol className={styles.arcTrack} tabIndex={0} aria-label="Последовательность касаний — прокручивайте по горизонтали">{history.map((entry, index) => {
      const snapshot = entryConversation(entry), a = snapshot.analysis;
      const before = index ? entryConversation(history[index - 1]).analysis.temperature : 'unknown';
      return <li key={`${entry.date}-${entry.order}-${index}`}><header><b>{index + 1}-е касание</b><time>{entry.date}</time></header><strong style={{ color: temperatureMeta[a.temperature].color }}>{temperatureMeta[before].label} → {temperatureMeta[a.temperature].label}</strong><p><b>{entry.conversation ? 'Клиент' : 'Контекст журнала'}:</b> {entry.conversation ? snapshot.input.response || 'Ответ не записан' : entry.result || entry.pain || 'Не записан'}</p>
        {entry.conversation && snapshot.input.managerWords ? <p><b>Мои действия:</b> {snapshot.input.managerWords}</p> : null}
        {a.objection ? <p><b>Возражение:</b> {a.objection}</p> : null}{a.pain ? <p><b>Боль:</b> {a.pain}</p> : null}{a.desire ? <p><b>Желание:</b> {a.desire}</p> : null}
        {snapshot.input.promise ? <p><b>Договорённость:</b> {snapshot.input.promise}</p> : null}<small>{snapshot.reviewed ? 'Исправлено менеджером' : entry.conversation ? 'Разбор по правилам' : 'Историческая запись · предварительный вывод'}</small></li>;
    })}</ol> : <p>Первый сохранённый разговор начнёт линию поведения.</p>}
    <details><summary>Скрипт и стратегия клиента · {phrases.length} наблюдений</summary><p>Приёмы, после которых менеджер отметил потепление. Подсказки для следующего разговора, не обучение глобальной модели.</p>{phrases.length ? phrases.map(({ entry, snapshot }, index) => <blockquote key={index}><p>{snapshot.analysis.usefulPhrase}</p><footer>{entry.date} · {snapshot.input.response || 'Прямая реплика не записана'}</footer></blockquote>) : <p>Пока нет отмеченных удачных приёмов.</p>}</details>
  </section>;
}
