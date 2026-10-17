import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailyFlowMap, type ClientThread } from "@/components/daily-flow-map";

const makeClient = (overrides: Partial<ClientThread>): ClientThread => ({
  id: "VF-test",
  name: "Тестовый клиент",
  phoneMasked: "+7 ••• •••-••-••",
  manager: "Тестовый менеджер",
  source: "whatsapp",
  branch: "abai",
  product: "windows",
  stage: 1,
  waitingMinutes: 20,
  enteredAt: "2026-08-01T10:00:00.000Z",
  changedAt: 0,
  previousStage: 0,
  nextActionOwner: "business",
  waitingForBusiness: false,
  value: 0,
  enteredMinutesAgo: 60,
  temperature: "warm",
  painDetected: true,
  needDetected: true,
  painSummary: "Нужно сохранить тепло",
  needSummary: "Нужны новые окна",
  ...overrides,
});

describe("DailyFlowMap campaign counters", () => {
  it("shows every visible thread, including a client who entered before the selected period", () => {
    render(
      <DailyFlowMap
        clients={[
          makeClient({ id: "VF-new", enteredMinutesAgo: 60 }),
          makeClient({ id: "VF-carryover", enteredMinutesAgo: 1_000 }),
        ]}
        selectedStage={null}
        selectedSource={null}
        selectedBranch={null}
        paused={false}
        onSelectStage={vi.fn()}
        onSelectSource={vi.fn()}
        onSelectBranch={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", {
      name: /креатив «Расчёт окон в чате»: 2 клиента в потоке; из них 1 новый; 1 уже в работе/,
    })).toBeInTheDocument();
  });

  it("joins a new-client thread before the first stage and renders a moving bright tip", () => {
    const { container } = render(
      <DailyFlowMap
        clients={[
          makeClient({
            id: "VF-new-arrival",
            stage: 0,
            changedAt: Date.now(),
            previousStage: null,
            enteredMinutesAgo: 0,
          }),
        ]}
        selectedStage={null}
        selectedSource={null}
        selectedBranch={null}
        paused={false}
        onSelectStage={vi.fn()}
        onSelectSource={vi.fn()}
        onSelectBranch={vi.fn()}
      />,
    );

    const threadPath = Array.from(container.querySelectorAll("svg path"))
      .map((path) => path.getAttribute("d"))
      .find((path) => path?.startsWith("M390 ") && / L504 [\d.]+$/.test(path));
    const travelMotion = container.querySelector("animateMotion");

    expect(threadPath).toContain(" C417 ");
    expect(threadPath).toMatch(/ 450 ([\d.]+) L504 \1$/);
    expect(threadPath).not.toMatch(/ 540 ([\d.]+) L504 \1$/);
    expect(travelMotion).toHaveAttribute("path", threadPath);
    expect(travelMotion?.parentElement?.getAttribute("class")).toContain("sankeyNewClientMarker");
  });
});
