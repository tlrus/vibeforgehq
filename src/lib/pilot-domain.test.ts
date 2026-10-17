import { describe, expect, it } from "vitest";
import {
  getStageAfterEvent,
  planIncomingCustomerMessage,
  shouldCreateWaitingSignal,
} from "./pilot-domain";

describe("pilot process domain", () => {
  it("keeps the customer reply under human control", () => {
    const actions = planIncomingCustomerMessage();
    expect(actions.map((action) => action.type)).toEqual([
      "STORE_EVENT",
      "ANALYZE_WITH_AI",
      "SAVE_REPLY_DRAFT",
      "NOTIFY_MANAGER_IN_TELEGRAM",
    ]);
    expect(actions.some((action) => action.type.includes("SEND_WHATSAPP"))).toBe(false);
  });

  it("moves stages only on factual business events", () => {
    expect(getStageAfterEvent("DIALOG", "AI_ANALYSIS_COMPLETED")).toBe("DIALOG");
    expect(getStageAfterEvent("DIALOG", "QUOTE_SENT")).toBe("QUOTE");
    expect(getStageAfterEvent("QUOTE", "CONTRACT_SENT")).toBe("CONTRACT");
    expect(getStageAfterEvent("CONTRACT", "CONTRACT_SIGNED")).toBe("CONTRACT");
    expect(getStageAfterEvent("CONTRACT", "FULFILLMENT_STARTED")).toBe("FULFILLMENT");
    expect(getStageAfterEvent("FULFILLMENT", "PAYMENT_RECEIVED")).toBe("PAYMENT");
  });

  it("preserves nonlinear returns as explicit backward transitions", () => {
    expect(getStageAfterEvent("QUOTE", "QUOTE_REVISION_REQUESTED")).toBe("DIALOG");
    expect(getStageAfterEvent("CONTRACT", "CONTRACT_REVISION_REQUESTED")).toBe("QUOTE");
    expect(getStageAfterEvent("PAYMENT", "PAYMENT_REVERSED")).toBe("FULFILLMENT");
  });

  it("lights a thread only when the business owes an overdue action", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    expect(
      shouldCreateWaitingSignal({
        waitingFor: "business",
        waitingSince: new Date("2026-07-25T10:59:59.000Z"),
        now,
      }),
    ).toBe(true);
    expect(
      shouldCreateWaitingSignal({
        waitingFor: "customer",
        waitingSince: new Date("2026-07-25T10:00:00.000Z"),
        now,
      }),
    ).toBe(false);
  });
});
