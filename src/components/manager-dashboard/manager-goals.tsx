"use client";

import { CircleDollarSign, Goal, Medal, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateIncome, contributionPeriods, formatMoney, managerProfile, paymentTiers, sixMonthHistory } from "./manager-data";
import styles from "@/app/pilot/manager/manager.module.css";

type ContributionPeriod = keyof typeof contributionPeriods;

export function ManagerGoals() {
  const [scenarioSales, setScenarioSales] = useState(managerProfile.plan);
  const [period, setPeriod] = useState<ContributionPeriod>("month");
  const scenario = useMemo(() => calculateIncome(scenarioSales), [scenarioSales]);
  const current = calculateIncome(managerProfile.currentSales);
  const contribution = contributionPeriods[period];
  const contributionShare = Math.round((contribution.revenue / contribution.company) * 100);
  const outOfRed = sixMonthHistory.filter((item) => item.zone !== "red").length;
  const greenMonths = sixMonthHistory.filter((item) => item.zone === "green").length;
  const bestMonth = sixMonthHistory.reduce((best, item) => item.sales > best.sales ? item : best, sixMonthHistory[0]);

  return (
    <main className={`${styles.main} ${styles.goalsMain}`}>
      <section className={styles.sectionHeading}>
        <div><span><Goal /> Цель и доход</span><h1>Увидьте результат до того, как достигнете его</h1><p>Меняйте объём продаж — оклад, процент, зона и вклад пересчитаются сразу.</p></div>
        <div className={`${styles.currentZone} ${styles[`zone_${current.tier.id}`]}`}><small>Сейчас</small><strong>{current.tier.label}</strong><span>{formatMoney(managerProfile.currentSales)}</span></div>
      </section>

      <section className={styles.goalSimulator}>
        <div className={styles.simulatorControls}>
          <span><Sparkles /> Симулятор личной цели</span>
          <label htmlFor="sales-goal">Если я продам на</label>
          <output htmlFor="sales-goal">{formatMoney(scenarioSales)}</output>
          <input id="sales-goal" type="range" min="0" max="12000000" step="100000" value={scenarioSales} onChange={(event) => setScenarioSales(Number(event.target.value))} />
          <div className={styles.goalPresets} role="group" aria-label="Быстрый выбор цели">
            {[3_000_000, 5_000_000, 7_000_000, 10_000_000].map((value) => <button key={value} className={scenarioSales === value ? styles.activePreset : ""} onClick={() => setScenarioSales(value)}>{formatMoney(value)}</button>)}
          </div>
        </div>
        <div className={`${styles.scenarioResult} ${styles[`zone_${scenario.tier.id}`]}`}>
          <header><span>{scenario.tier.label}</span><Medal /></header>
          <div><small>Оклад</small><strong>{formatMoney(scenario.tier.base)}</strong></div>
          <div><small>Процент</small><strong>{Math.round(scenario.tier.rate * 100)}%</strong></div>
          <div><small>Бонус с продаж</small><strong>{formatMoney(scenario.commission)}</strong></div>
          <footer><small>Итого мой доход</small><strong>{formatMoney(scenario.total)}</strong><span>{scenario.total >= current.total ? `+${formatMoney(scenario.total - current.total)} к текущему` : `${formatMoney(current.total - scenario.total)} ниже текущего`}</span></footer>
        </div>
      </section>

      <section className={styles.tierGrid} aria-label="Сетка оплаты менеджера">
        {paymentTiers.map((tier) => (
          <article key={tier.id} className={`${styles.tierCard} ${styles[`zone_${tier.id}`]} ${scenario.tier.id === tier.id ? styles.activeTier : ""}`}>
            <header><span>{tier.label}</span>{scenario.tier.id === tier.id && <b>Ваша цель здесь</b>}</header>
            <strong>от {formatMoney(tier.target)}</strong>
            <dl><div><dt>Оклад</dt><dd>{formatMoney(tier.base)}</dd></div><div><dt>Процент</dt><dd>{Math.round(tier.rate * 100)}%</dd></div></dl>
          </article>
        ))}
      </section>

      <section className={styles.analyticsGrid}>
        <article className={styles.historyCard}>
          <header><div><span>Стабильность</span><h2>Зоны за 6 месяцев</h2></div><strong>{outOfRed} из 6<small>выше красной зоны</small></strong></header>
          <div className={styles.monthBars}>
            {sixMonthHistory.map((item) => <div key={item.month}><span style={{ height: `${Math.max(18, (item.sales / 9_000_000) * 100)}%` }} className={styles[`bar_${item.zone}`]}><em>{formatMoney(item.sales).replace(" млн ₸", "")}</em></span><small>{item.month}</small></div>)}
          </div>
          <footer><span><Medal /> {greenMonths} месяца в зелёной зоне</span><span>Лучший: {bestMonth.month} · {formatMoney(bestMonth.sales)}</span></footer>
        </article>

        <article className={styles.contributionCard}>
          <header><div><span>Моя ценность</span><h2>Вклад в компанию</h2></div><CircleDollarSign /></header>
          <div className={styles.periodTabs} role="group" aria-label="Период вклада">
            {(Object.entries(contributionPeriods) as [ContributionPeriod, (typeof contributionPeriods)[ContributionPeriod]][]).map(([id, item]) => <button key={id} className={period === id ? styles.activePeriod : ""} onClick={() => setPeriod(id)}>{item.label}</button>)}
          </div>
          <div className={styles.contributionValue}><small>Я принёс компании</small><strong>{formatMoney(contribution.revenue)}</strong><span>{contribution.deals} оплаченных сделок</span></div>
          <div className={styles.companyShare}><span><small>Моя доля в выручке команды</small><b>{contributionShare}%</b></span><div><i style={{ width: `${contributionShare}%` }} /></div><p>Общая выручка за период: {formatMoney(contribution.company)}</p></div>
          <footer><TrendingUp /><p>Ваш результат — это не только процент. За всё время вы принесли компании <strong>{formatMoney(managerProfile.lifetimeRevenue)}</strong>.</p></footer>
        </article>
      </section>
    </main>
  );
}
