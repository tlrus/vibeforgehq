import { describe, expect, it } from "vitest";
import {
  fallbackClientBrief,
  fallbackNextAction,
  fallbackExtractFacts,
  generateClientBrief,
  suggestNextAction,
  extractFacts,
  materialSendingState,
} from "./pulse-agent";
import type { BusinessPulseClient } from "./business-pulse-data";

const sampleClient: BusinessPulseClient = {
  id: "client-test-1",
  name: "ТОО СтройХолдинг",
  contact: "Ерлан Серикович",
  phone: "+7 777 123 4567",
  product: "construction",
  source: "2ГИС",
  manager: "Алия",
  stage: 2,
  value: 4500000,
  note: "Обсуждаем фасадное остекление ЖК. Клиент просил перезвонить после обеда.",
  waitingForBusiness: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-08T15:00:00.000Z",
  history: [
    {
      date: "2026-09-02",
      order: 1,
      company: "ТОО СтройХолдинг",
      contact: "Ерлан Серикович",
      channel: "call",
      result: "Первичный звонок",
      achieved: "Выяснили объем 150 кв.м.",
      difficulty: "Сравнивают с конкурентами",
      nextAction: "Отправить КП в WhatsApp",
      tools: "",
      missed: "",
      pain: "Нужен строгий ГОСТ и быстрая поставка",
      details: ["Передадут проект в WhatsApp"],
    },
  ],
};

describe("Pulse Agent", () => {
  it.each(['отправить презу', 'оптравить презу', 'отпарвить презентацию', 'ещё не отправил презентацию', 'отправиьт презу'])('treats %s as pending, regardless of the funnel stage', text => {
    const client = { ...sampleClient, note: text, stage: 4 };
    expect(materialSendingState(client)).toBe('pending');
    expect(fallbackNextAction(client).action).toContain('Отправить');
    expect(fallbackNextAction(client).reason).toContain('не выполненная');
  });
  it('lets an explicit correction override a previously reported sending', () => {
    const client = { ...sampleClient, note: 'Отправил презентацию', agentComment: 'Ошибся: ещё не отправил презентацию' };
    expect(materialSendingState(client)).toBe('pending');
    expect(fallbackClientBrief(client).callGoal).toContain('Сначала отправить');
  });
  it('recognizes a later completed sending and does not treat stage alone as proof', () => {
    expect(materialSendingState({ ...sampleClient, note: 'Отправил презу' })).toBe('sent');
    expect(fallbackNextAction({ ...sampleClient, note: '', history: [] }).action).toContain('Уточнить');
  });
  it("generates a comprehensive client brief", async () => {
    const brief = fallbackClientBrief(sampleClient);
    expect(brief.summary).toContain("ТОО СтройХолдинг");
    expect(brief.summary).toContain("Ерлан Серикович");
    expect(brief.callGoal).toBeTruthy();
    expect(brief.script).toContain("Здравствуйте");
    expect(brief.keyPains.length).toBeGreaterThan(0);
    expect(brief.talkingPoints.length).toBeGreaterThan(0);
    expect(brief.suggestedQuestions.length).toBeGreaterThan(0);
    expect(brief.source).toBe("heuristic");
  });

  it("suggests a relevant next action with deadline and message draft", () => {
    const next = fallbackNextAction(sampleClient);
    expect(next.action).toBeTruthy();
    expect(next.dueAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(next.dueLabel).toBeTruthy();
    expect(next.messageDraft).toContain("Здравствуйте");
    expect(next.reason).toBeTruthy();
    expect(["phone", "whatsapp", "email"]).toContain(next.channel);
  });

  it("extracts structured facts including budget and objections", () => {
    const facts = fallbackExtractFacts(sampleClient);
    expect(facts.budget).toContain("4");
    expect(facts.decisionMaker).toBe("Ерлан Серикович");
    expect(facts.competitors.length).toBeGreaterThan(0);
    expect(facts.keyFacts.length).toBeGreaterThan(0);
  });

  it("adapts briefing depending on deal stage (stage 0 vs stage 4)", () => {
    const newClient: BusinessPulseClient = {
      ...sampleClient,
      stage: 0,
      history: [],
    };
    const briefNew = fallbackClientBrief(newClient);
    expect(briefNew.callGoal).toContain("Познакомиться с ЛПР");

    const matureClient: BusinessPulseClient = {
      ...sampleClient,
      stage: 4,
      note: 'Материалы отправлены',
      history: [],
    };
    const briefMature = fallbackClientBrief(matureClient);
    expect(briefMature.callGoal).toContain("договор");
  });

  it("handles client with empty contact and note without throwing", async () => {
    const emptyClient: BusinessPulseClient = {
      id: "empty-1",
      name: "Тест",
      contact: "",
      phone: "",
      product: "other",
      source: "2ГИС",
      manager: "Менеджер BP",
      value: 0,
      note: "",
      waitingForBusiness: false,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      stage: 1,
      history: [],
    };
    const brief = await generateClientBrief(emptyClient);
    expect(brief.summary).toBeTruthy();
    expect(brief.script).toBeTruthy();

    const next = await suggestNextAction(emptyClient);
    expect(next.action).toBeTruthy();

    const facts = await extractFacts(emptyClient);
    expect(facts.keyFacts).toBeTruthy();
  });
});
