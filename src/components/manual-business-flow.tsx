"use client";

import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers3,
  Maximize2,
  Minimize2,
  Minus,
  PhoneCall,
  Plus,
  RotateCcw,
  TrendingUp,
  Waypoints,
} from "lucide-react";
import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { clientConversation, temperatureMeta } from '@/lib/pulse-conversation';
import styles from "@/app/business-pulse/manual-pulse.module.css";
import {
  businessPulseStages,
  type BusinessPulseClient,
} from "@/lib/business-pulse-data";
import {
  formatDayLabel,
  getDailyCallsAnalysis,
  getUniqueInteractionDays,
  localDay,
  localYesterday,
  pulseRisk,
  reachedPulseStage,
} from "@/lib/business-pulse-workspace";

type ManualBusinessFlowProps = {
  clients: BusinessPulseClient[];
  selectedStage: number | null;
  onSelectStage: (stage: number) => void;
  onOpenClient: (client: BusinessPulseClient) => void;
  variant?: "pulse" | "crm";
};

const worldWidth = 1820;
const baseX = 70;
const stageX = businessPulseStages.map((_, index) => 260 + index * 235);

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function inactiveFor(client: BusinessPulseClient) {
  return Math.max(0, Date.now() - new Date(client.updatedAt).getTime());
}

function inactivityLabel(milliseconds: number) {
  const hours = Math.max(1, Math.floor(milliseconds / (60 * 60 * 1000)));
  if (hours < 48) return `${hours} ч`;
  return `${Math.floor(hours / 24)} д`;
}

export function ManualBusinessFlow({
  clients,
  selectedStage,
  onSelectStage,
  onOpenClient,
  variant = "pulse",
}: ManualBusinessFlowProps) {
  const [zoom, setZoom] = useState(0.72);
  const [expanded, setExpanded] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  const today = useMemo(() => localDay(), []);
  const yesterday = useMemo(() => localYesterday(), []);
  const availableDays = useMemo(() => getUniqueInteractionDays(clients), [clients]);

  const defaultDay = useMemo(() => {
    const todayAnalysis = getDailyCallsAnalysis(clients, today);
    if (todayAnalysis.totalCalls > 0) return today;
    for (const d of availableDays) {
      if (getDailyCallsAnalysis(clients, d).totalCalls > 0) return d;
    }
    return today;
  }, [clients, availableDays, today]);

  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [onlyDayActions, setOnlyDayActions] = useState(false);
  const [feedFilter, setFeedFilter] = useState<"all" | "advanced" | "same" | "new" | "repeat">("all");

  const dailyAnalysis = useMemo(
    () => getDailyCallsAnalysis(clients, selectedDay),
    [clients, selectedDay]
  );

  const topActiveDays = useMemo(() => {
    return availableDays
      .filter((d) => d !== today && d !== yesterday && getDailyCallsAnalysis(clients, d).totalCalls > 0)
      .slice(0, 3);
  }, [availableDays, clients, today, yesterday]);

  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        if (onlyDayActions && !dailyAnalysis.clientIds.includes(client.id)) return false;
        if (selectedStage !== null && client.stage !== selectedStage) return false;
        return true;
      })
      .sort((a, b) => {
        return b.stage - a.stage;
      });
  }, [clients, onlyDayActions, dailyAnalysis.clientIds, selectedStage]);

  const worldHeight = Math.max(860, filteredClients.length * 4.6 + 320);
  const overdueCount = filteredClients.filter((client) => pulseRisk(client)).length;
  const advancedCount = filteredClients.filter((client) => client.stage >= 2 && client.stage < 6).length;
  const meetingCount = filteredClients.filter((client) => client.stage >= 4 && client.stage < 6).length;

  const resetFilters = () => {
    setOnlyDayActions(false);
    if (selectedStage !== null) onSelectStage(-1);
  };

  const filteredActions = useMemo(() => {
    if (feedFilter === 'new') return dailyAnalysis.actions.filter(a => a.touchNumber === 1);
    if (feedFilter === 'repeat') return dailyAnalysis.actions.filter(a => a.touchNumber > 1);
    if (feedFilter === "advanced") return dailyAnalysis.actions.filter((a) => a.advanced);
    if (feedFilter === "same") return dailyAnalysis.actions.filter((a) => !a.advanced && a.toStage < 6);
    return dailyAnalysis.actions;
  }, [dailyAnalysis.actions, feedFilter]);

  return (
    <section
      className={`${styles.flowPanel} ${variant === "crm" ? styles.flowPanelCrm : ""} ${
        expanded ? styles.flowPanelExpanded : ""
      }`}
      aria-label="Клиентские нити из журнала активности"
    >
      <header className={styles.flowHeader}>
        <div>
          <span>
            <Waypoints /> Клиентский процесс
          </span>
          <h2>Поток клиентских нитей</h2>
          <p>
            Нити показывают текущий этап и историю взаимодействий. Нажмите на этап или отдельную нить для инспекции.
          </p>
        </div>
        <div className={styles.flowHeadlineMetric}>
          <small>На карте</small>
          <strong>{filteredClients.length}</strong>
          <span>{overdueCount} требуют внимания</span>
        </div>
      </header>

      {/* Daily Calls & Actions Section */}
      <div className={styles.flowDailySection}>
        <div className={styles.flowDailyHeader}>
          <div className={styles.flowDailyHeaderTitle}>
            <Calendar />
            <strong>Действия и звонки за день</strong>
            <span>· {dailyAnalysis.dayLabel} ({dailyAnalysis.day})</span>
          </div>

          <div className={styles.flowDailyControls}>
            <button
              type="button"
              className={`${styles.flowDayChip} ${selectedDay === today ? styles.flowDayChipActive : ""}`}
              onClick={() => setSelectedDay(today)}
            >
              Сегодня <b>{getDailyCallsAnalysis(clients, today).totalCalls}</b>
            </button>
            <button
              type="button"
              className={`${styles.flowDayChip} ${selectedDay === yesterday ? styles.flowDayChipActive : ""}`}
              onClick={() => setSelectedDay(yesterday)}
            >
              Вчера <b>{getDailyCallsAnalysis(clients, yesterday).totalCalls}</b>
            </button>
            {topActiveDays.map((d) => {
              const count = getDailyCallsAnalysis(clients, d).totalCalls;
              return (
                <button
                  type="button"
                  key={d}
                  className={`${styles.flowDayChip} ${selectedDay === d ? styles.flowDayChipActive : ""}`}
                  onClick={() => setSelectedDay(d)}
                >
                  {formatDayLabel(d)} <b>{count}</b>
                </button>
              );
            })}

            <label className={styles.flowDatePickerLabel} title="Выбрать любую дату">
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  if (e.target.value) setSelectedDay(e.target.value);
                }}
              />
            </label>

            <button
              type="button"
              className={`${styles.flowDayToggleBtn} ${onlyDayActions ? styles.flowDayToggleActive : ""}`}
              onClick={() => setOnlyDayActions((v) => !v)}
              aria-pressed={onlyDayActions}
            >
              <TrendingUp style={{ width: 16, height: 16 }} />
              {onlyDayActions ? "Показаны только действия за день" : "Фильтр карты: только касания за день"}
            </button>
          </div>
        </div>

        <div className={styles.flowDailyKpiGrid}>
          <div className={styles.flowDailyKpiCard}>
            <span><PhoneCall /></span>
            <div>
              <small>Всего касаний</small>
              <strong>{dailyAnalysis.totalCalls}</strong>
              <em>зафиксировано касаний</em>
            </div>
          </div>

          <div className={`${styles.flowDailyKpiCard} ${styles.kpiCardSuccess}`}>
            <span><TrendingUp /></span>
            <div>
              <small>Продвинулись вперед</small>
              <strong>{dailyAnalysis.advancedCount}</strong>
              <em>{dailyAnalysis.advancedRatePercent}% конверсия дня</em>
            </div>
          </div>

          <div className={styles.flowDailyKpiCard}>
            <span><Clock /></span>
            <div>
              <small>Повторный контакт</small>
              <strong>{dailyAnalysis.sameStageCount}</strong>
              <em>остались в работе</em>
            </div>
          </div>

          <div className={`${styles.flowDailyKpiCard} ${dailyAnalysis.closedCount ? styles.kpiCardWarning : ""}`}>
            <span><CheckCircle2 /></span>
            <div>
              <small>Отказы / закрыто</small>
              <strong>{dailyAnalysis.closedCount}</strong>
              <em>завершено</em>
            </div>
          </div>
        </div>
      </div>

      {selectedStage !== null ? <button type="button" className={styles.flowReset} onClick={resetFilters}><RotateCcw /> Сбросить этап</button> : null}

      <div className={styles.flowSummary} aria-label="Сводка выбранного потока">
        <span>
          <small>Всего нитей</small>
          <strong>{filteredClients.length}</strong>
          <em>в текущем выборе</em>
        </span>
        <span>
          <small>После презентации</small>
          <strong>{advancedCount}</strong>
          <em>{percent(advancedCount, filteredClients.length)}% потока</em>
        </span>
        <span>
          <small>Встречи и переговоры</small>
          <strong>{meetingCount}</strong>
          <em>самые тёплые</em>
        </span>
        <span className={overdueCount ? styles.flowSummaryAlert : ""}>
          <small>Требуют внимания</small>
          <strong>{overdueCount}</strong>
          <em>срок пропущен или нет продолжения</em>
        </span>
      </div>

      <div
        className={styles.flowViewport}
        role="region"
        aria-label="Интерактивная карта потока клиентов"
      >
        <div className={styles.flowToolbar} aria-label="Масштаб карты">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(0.5, current - 0.1))}
            aria-label="Уменьшить карту"
          >
            <Minus />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.72)}
            aria-label="Сбросить масштаб"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(1.2, current + 0.1))}
            aria-label="Увеличить карту"
          >
            <Plus />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "Свернуть карту" : "Развернуть карту"}
          >
            {expanded ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
        <p className={styles.flowViewportHint}>
          Прокручивайте карту · нажмите на этап или нить для просмотра
        </p>

        <div
          className={styles.flowWorldSpacer}
          style={{ width: worldWidth * zoom, height: worldHeight * zoom }}
        >
          <div
            className={styles.flowWorld}
            style={{ width: worldWidth, height: worldHeight, transform: `scale(${zoom})` }}
          >
            {/* Macro Phase Banners aligned above stage cards */}
            <div className={styles.flowPhases} aria-hidden="true">
              <span style={{ left: 155, width: 680 }}>
                <b>01</b> Контакт
                <small>Единая база · связь · презентация</small>
              </span>
              <span style={{ left: 860, width: 680 }}>
                <b>02</b> Решение
                <small>Повтор · встреча · переговоры</small>
              </span>
              <span style={{ left: 1565, width: 210 }}>
                <b>03</b> Итог
                <small>Закрыто</small>
              </span>
            </div>

            {/* Origin Node on the left */}
            <div className={styles.flowOriginNode} style={{ left: 24, top: 105 }}>
              <span>
                <Layers3 />
              </span>
              <div>
                <small>Входящий поток</small>
                <strong>{filteredClients.length}</strong>
                <em>Единая база</em>
              </div>
            </div>

            {/* Connecting Chevrons between stages */}
            {businessPulseStages.slice(0, 6).map((_, index) => (
              <div
                key={`stage-arrow-${index}`}
                className={styles.flowStageArrow}
                style={{ left: (stageX[index] + stageX[index + 1]) / 2 - 12, top: 148 }}
              >
                <ChevronRight />
              </div>
            ))}

            {/* Stage Cards with full labels and zero truncation */}
            {businessPulseStages.map((stage, index) => {
              const sectorClients = clients;
              const current = sectorClients.filter((client) => client.stage === index).length;
              const reached = sectorClients.filter((client) => reachedPulseStage(client, index)).length;
              const overdue = sectorClients.filter(
                (client) => client.stage === index && pulseRisk(client)
              ).length;
              return (
                <button
                  type="button"
                  key={stage.label}
                  className={`${styles.flowStageNode} ${
                    selectedStage === index ? styles.flowStageSelected : ""
                  }`}
                  style={
                    {
                      left: stageX[index] - 105,
                      top: 105,
                      "--stage-accent": stage.color,
                    } as CSSProperties
                  }
                  onClick={() => onSelectStage(index)}
                  aria-pressed={selectedStage === index}
                >
                  <div className={styles.flowStageHead}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <h3>{stage.label}</h3>
                    <strong>{current}</strong>
                  </div>
                  <div className={styles.flowStageFoot}>
                    <span>
                      <em>{reached}</em> в истории
                    </span>
                    {overdue > 0 ? (
                      <span className={styles.stageAlertBadge}>
                        <em>{overdue}</em> ждут шага
                      </span>
                    ) : (
                      <span>
                        <em>0</em> рисков
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Flow Threads */}
            <svg
              className={styles.flowSvg}
              viewBox={`0 0 ${worldWidth} ${worldHeight}`}
              width={worldWidth}
              height={worldHeight}
              aria-label="Карта продвижения компаний по этапам"
              style={{ width: worldWidth, height: worldHeight }}
            >
              {filteredClients.map((client, index) => {
                const laneY = 260 + index * 4.6;
                const endX = stageX[client.stage] - 105;
                const product = temperatureMeta[clientConversation(client).analysis.temperature];
                const staleFor = inactiveFor(client);
                const isOverdue = !!pulseRisk(client);
                const path = `M ${baseX} ${laneY} C ${baseX + 40} ${laneY}, ${Math.max(
                  baseX + 60,
                  endX - 60
                )} ${laneY}, ${endX} ${laneY}`;
                const open = () => onOpenClient(client);
                const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open();
                  }
                };
                const isActive = activeClientId === client.id;
                const isDayAction = dailyAnalysis.clientIds.includes(client.id);
                const didAdvanceToday = dailyAnalysis.advancedClientIds.includes(client.id);
                return (
                  <g
                    key={client.id}
                    className={`${styles.flowClientThread} ${
                      isOverdue ? styles.flowThreadWaiting : ""
                    } ${didAdvanceToday ? styles.flowThreadAdvanced : ""} ${
                      isActive ? styles.flowThreadActive : ""
                    }`}
                    style={{ "--thread-color": product.color } as CSSProperties}
                    role="button"
                    tabIndex={0}
                    aria-label={`${client.name}, этап ${
                      businessPulseStages[client.stage].label
                    }${didAdvanceToday ? " · 🚀 продвинут сегодня" : ""}${isOverdue ? `, без движения ${inactivityLabel(staleFor)}` : ""}`}
                    onMouseEnter={() => setActiveClientId(client.id)}
                    onMouseLeave={() => setActiveClientId(null)}
                    onFocus={() => setActiveClientId(client.id)}
                    onBlur={() => setActiveClientId(null)}
                    onClick={open}
                    onKeyDown={handleKeyDown}
                  >
                    <title>
                      {client.name} · {businessPulseStages[client.stage].label}
                      {didAdvanceToday ? " · 🚀 Продвинут сегодня" : ""}
                      {isOverdue ? ` · без движения ${inactivityLabel(staleFor)}` : ""} ·{" "}
                      {client.note}
                    </title>
                    <path d={path} />
                    <circle cx={endX} cy={laneY} r={isOverdue ? 3.8 : 2.8} />
                    {didAdvanceToday ? (
                      <circle
                        cx={endX + 6}
                        cy={laneY}
                        r="3.5"
                        fill="#34d399"
                        stroke="#10b981"
                        strokeWidth="1.5"
                      />
                    ) : null}
                    {isActive ? (
                      <circle
                        className={styles.flowTimerRing}
                        cx={endX}
                        cy={laneY}
                        r="9"
                      />
                    ) : null}
                    {isActive && isOverdue ? (
                      <>
                        <rect
                          className={styles.flowThreadTimerBg}
                          x={Math.max(8, endX - 92)}
                          y={laneY - 13}
                          width="84"
                          height="24"
                          rx="7"
                        />
                        <text
                          className={styles.flowThreadTimer}
                          x={Math.max(17, endX - 83)}
                          y={laneY + 4}
                        >
                          ⏱ {inactivityLabel(staleFor)}
                        </text>
                      </>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {selectedStage !== null ? (
        <div className={styles.stageDetails}>
          <header>
            <h3>
              {businessPulseStages[selectedStage].label} · {filteredClients.length}
            </h3>
            <button onClick={() => onSelectStage(-1)}>Все этапы</button>
          </header>
          {filteredClients.length ? (
            filteredClients.map((client) => (
              <button key={client.id} onClick={() => onOpenClient(client)}>
                <strong>{client.name}</strong>
                <span>{client.nextAction || client.note || "Уточнить следующий шаг"}</span>
                <small>
                  {client.manager} · {pulseRisk(client)?.label || "Без просроченного действия"}
                </small>
                <ArrowRight />
              </button>
            ))
          ) : (
            <p>На этом этапе пока нет компаний.</p>
          )}
        </div>
      ) : null}

      <footer className={styles.flowLegend}>
        <span><i style={{ background: '#7fb2ff' }} /> холодный</span><span><i style={{ background: '#f0bd70' }} /> тёплый</span><span><i style={{ background: '#65d7b5' }} /> горячий</span><span><i style={{ background: '#a9b3c5' }} /> интерес не определён</span>
        <span>
          <i className={styles.flowWaitingKey} /> требуется действие
        </span>
        <span>
          <i className={styles.flowAdvanceKey} /> продвинулся сегодня (+1 этап)
        </span>
        <small>
          <ArrowRight /> текущий этап и сохранённая история переходов
        </small>
      </footer>

      {/* Daily Actions & Calls Feed */}
      <section className={styles.dailyFeedSection} aria-label="Журнал касаний за день">
        <div className={styles.dailyFeedHeader}>
          <h3>
            <PhoneCall style={{ width: 20, height: 20, color: "#6da2ff" }} /> Журнал касаний за {dailyAnalysis.dayLabel} ({filteredActions.length})
          </h3>
          <div className={styles.dailyFeedFilterTabs} role="group" aria-label="Фильтр касаний">
            <button type="button" className={feedFilter === 'new' ? styles.activeFilterTab : ''} onClick={() => setFeedFilter('new')}>Новые ({dailyAnalysis.newClientCount})</button>
            <button type="button" className={feedFilter === 'repeat' ? styles.activeFilterTab : ''} onClick={() => setFeedFilter('repeat')}>Повторные ({dailyAnalysis.repeatTouchCount})</button>
            <button
              type="button"
              className={feedFilter === "all" ? styles.activeFilterTab : ""}
              onClick={() => setFeedFilter("all")}
            >
              Все ({dailyAnalysis.totalCalls})
            </button>
            <button
              type="button"
              className={feedFilter === "advanced" ? styles.activeFilterTab : ""}
              onClick={() => setFeedFilter("advanced")}
            >
              🚀 Продвинулись ({dailyAnalysis.advancedCount})
            </button>
            <button
              type="button"
              className={feedFilter === "same" ? styles.activeFilterTab : ""}
              onClick={() => setFeedFilter("same")}
            >
              💬 В работе ({dailyAnalysis.sameStageCount})
            </button>
          </div>
        </div>

        <div className={styles.dailyTouchStats} aria-label="Первые и повторные касания">
          <span><b>{dailyAnalysis.newClientCount}</b> новых · первое касание</span>
          <span><b>{dailyAnalysis.repeatTouchCount}</b> повторных касаний · {dailyAnalysis.repeatClientCount} клиентов</span>
          {[...new Set(dailyAnalysis.actions.map(a => a.touchNumber))].sort((a, b) => a - b).filter(n => n > 1).map(n => <span key={n}><b>{n}-е касание</b> {dailyAnalysis.actions.filter(a => a.touchNumber === n).length}</span>)}
        </div>
        {filteredActions.length === 0 ? (
          <div className={styles.dailyFeedEmpty}>
            В этом выборе касаний нет. Выберите другую дату или фильтр либо добавьте результат контакта в карточку клиента.
          </div>
        ) : (
          <div className={styles.dailyFeedList}>
            {filteredActions.map((action) => {
              const client = clients.find((c) => c.id === action.clientId);
              const isHovered = activeClientId === action.clientId;
              return (
                <article
                  key={action.id}
                  className={`${styles.dailyFeedItem} ${isHovered ? styles.dailyFeedItemActive : ""}`}
                  onMouseEnter={() => setActiveClientId(action.clientId)}
                  onMouseLeave={() => setActiveClientId(null)}
                  onClick={() => client && onOpenClient(client)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (client) onOpenClient(client);
                    }
                  }}
                >
                  <div className={styles.dailyFeedItemTime}>
                    <span>{action.time || "Звонок"}</span>
                    <b>{action.channel}</b>
                  </div>
                  <div className={styles.dailyFeedItemBody}>
                    <div className={styles.dailyFeedItemHead}>
                      <strong>{action.clientName}</strong>
                      <span className={styles.dailyFeedItemBadgeSame}>{action.touchNumber}-е касание{action.touchNumber === 1 ? ' · новый' : ' · повторное'}</span>
                      {action.advanced ? (
                        <span className={styles.dailyFeedItemBadgeAdvanced}>
                          <TrendingUp style={{ width: 14, height: 14 }} /> Продвинулся: {businessPulseStages[action.toStage]?.label || action.toStage}
                        </span>
                      ) : action.toStage === 6 ? (
                        <span className={styles.dailyFeedItemBadgeClosed}>
                          Закрыто / отказ
                        </span>
                      ) : (
                        <span className={styles.dailyFeedItemBadgeSame}>
                          Этап: {businessPulseStages[action.toStage]?.label || action.toStage}
                        </span>
                      )}
                    </div>
                    <p className={styles.dailyFeedItemComment}>{action.comment}</p>
                    {action.contact || action.phone ? (
                      <div className={styles.dailyFeedItemContact}>
                        {action.contact ? `Контакт: ${action.contact}` : ""}
                        {action.contact && action.phone ? " · " : ""}
                        {action.phone ? action.phone : ""}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.dailyFeedItemAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (client) onOpenClient(client);
                    }}
                  >
                    Открыть карточку <ArrowRight style={{ width: 15, height: 15 }} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
