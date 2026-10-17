import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PulseAgentPanel } from "./pulse-agent-panel";
import type { BusinessPulseClient } from "@/lib/business-pulse-data";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockClient: BusinessPulseClient = {
  id: "c1",
  name: "ТОО Астана Групп",
  contact: "Бауыржан",
  phone: "+7 701 000 0000",
  product: "construction",
  source: "2ГИС",
  manager: "Алия",
  stage: 2,
  value: 3000000,
  note: "Ждет КП по теплому алюминию",
  waitingForBusiness: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-08T10:00:00.000Z",
  history: [],
};

describe("PulseAgentPanel Component", () => {
  it("renders buttons for brief, next action, and facts", () => {
    render(<PulseAgentPanel client={mockClient} />);
    expect(screen.getByText("AI-Агент (Comp AI Pulse)")).toBeDefined();
    expect(screen.getByText("Бриф перед звонком")).toBeDefined();
    expect(screen.getByText("Следующий шаг")).toBeDefined();
    expect(screen.getByText("Факты")).toBeDefined();
  });

  it("calls API and displays brief on click", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          summary: "ТОО Астана Групп - ключевой строительный клиент.",
          keyPains: ["Сроки поставки", "Качество профиля"],
          callGoal: "Согласовать спецификацию КП",
          talkingPoints: ["Тезис 1"],
          script: "Здравствуйте, Бауыржан! Подготовили расчет по теплому алюминию.",
          suggestedQuestions: ["Когда планируете монтаж?"],
          objectionTips: [],
          source: "heuristic",
        },
      }),
    } as unknown as Response);

    const onInsertComment = vi.fn();
    render(<PulseAgentPanel client={mockClient} onInsertComment={onInsertComment} />);

    const briefBtn = screen.getByRole("button", { name: /бриф перед звонком/i });
    fireEvent.click(briefBtn);

    await waitFor(() => {
      expect(screen.getByText("Досье клиента")).toBeDefined();
      expect(screen.getByText("ТОО Астана Групп - ключевой строительный клиент.")).toBeDefined();
      expect(screen.getByText("Согласовать спецификацию КП", { exact: false })).toBeDefined();
    });

    const insertBtn = screen.getByTitle("Вставить этот скрипт в поле комментария к клиенту");
    fireEvent.click(insertBtn);
    expect(onInsertComment).toHaveBeenCalledWith("Здравствуйте, Бауыржан! Подготовили расчет по теплому алюминию.");
  });

  it("applies next action to client card on button click", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          action: "Отправить КП в WhatsApp",
          dueAtIso: "2026-09-11T06:00:00.000Z",
          dueLabel: "11 сентября, 11:00",
          channel: "whatsapp",
          messageDraft: "Бауыржан, добрый день! Направляю КП.",
          reason: "Клиент ждет подтверждения спецификации.",
          source: "heuristic",
        },
      }),
    } as unknown as Response);

    const onApplyNextAction = vi.fn();
    render(<PulseAgentPanel client={mockClient} onApplyNextAction={onApplyNextAction} />);

    const nextBtn = screen.getByRole("button", { name: /следующий шаг/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText("Отправить КП в WhatsApp")).toBeDefined();
    });

    const applyBtn = screen.getByText("Применить как следующий шаг в карточку");
    fireEvent.click(applyBtn);
    expect(onApplyNextAction).toHaveBeenCalledWith("Отправить КП в WhatsApp", "2026-09-11T06:00:00.000Z");
  });
});
