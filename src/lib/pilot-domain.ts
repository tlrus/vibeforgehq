export const PILOT_STAGES = [
  "LEAD",
  "DIALOG",
  "QUOTE",
  "CONTRACT",
  "FULFILLMENT",
  "PAYMENT",
] as const;

export type PilotStage = (typeof PILOT_STAGES)[number];

export const PILOT_EVENT_TYPES = [
  "LEAD_CREATED",
  "CUSTOMER_MESSAGE_RECEIVED",
  "MANAGER_MESSAGE_SENT",
  "AI_ANALYSIS_COMPLETED",
  "AI_DRAFT_CREATED",
  "QUOTE_SENT",
  "QUOTE_REVISION_REQUESTED",
  "CONTRACT_SENT",
  "CONTRACT_REVISION_REQUESTED",
  "CONTRACT_SIGNED",
  "FULFILLMENT_STARTED",
  "FULFILLMENT_COMPLETED",
  "PAYMENT_RECEIVED",
  "PAYMENT_REVERSED",
] as const;

export type PilotEventType = (typeof PILOT_EVENT_TYPES)[number];

export type PilotEventSource =
  | "chatwoot"
  | "whatsapp"
  | "telegram"
  | "twenty"
  | "meta_ads"
  | "ai"
  | "system";

export type PilotAction =
  | { type: "STORE_EVENT"; eventType: PilotEventType }
  | { type: "ANALYZE_WITH_AI" }
  | { type: "SAVE_REPLY_DRAFT" }
  | { type: "NOTIFY_MANAGER_IN_TELEGRAM" };

/**
 * The pilot never sends an AI-generated message to a customer.
 * An incoming customer message is stored, analyzed, and shown to a human.
 */
export function planIncomingCustomerMessage(): PilotAction[] {
  return [
    { type: "STORE_EVENT", eventType: "CUSTOMER_MESSAGE_RECEIVED" },
    { type: "ANALYZE_WITH_AI" },
    { type: "SAVE_REPLY_DRAFT" },
    { type: "NOTIFY_MANAGER_IN_TELEGRAM" },
  ];
}

/**
 * AI analysis alone cannot move a process. Only evidence-producing business
 * events change the factual stage, including backward transitions.
 */
export function getStageAfterEvent(
  currentStage: PilotStage,
  eventType: PilotEventType,
): PilotStage {
  switch (eventType) {
    case "LEAD_CREATED":
      return "LEAD";
    case "CUSTOMER_MESSAGE_RECEIVED":
    case "MANAGER_MESSAGE_SENT":
      return currentStage === "LEAD" ? "DIALOG" : currentStage;
    case "QUOTE_SENT":
      return "QUOTE";
    case "QUOTE_REVISION_REQUESTED":
      return "DIALOG";
    case "CONTRACT_SENT":
    case "CONTRACT_SIGNED":
      return "CONTRACT";
    case "CONTRACT_REVISION_REQUESTED":
      return "QUOTE";
    case "FULFILLMENT_STARTED":
    case "FULFILLMENT_COMPLETED":
      return "FULFILLMENT";
    case "PAYMENT_RECEIVED":
      return "PAYMENT";
    case "PAYMENT_REVERSED":
      return "FULFILLMENT";
    case "AI_ANALYSIS_COMPLETED":
    case "AI_DRAFT_CREATED":
      return currentStage;
  }
}

export function shouldCreateWaitingSignal(input: {
  waitingFor: "business" | "customer" | null;
  waitingSince: Date | null;
  now: Date;
  slaMinutes?: number;
}) {
  if (input.waitingFor !== "business" || !input.waitingSince) return false;
  const slaMs = (input.slaMinutes ?? 60) * 60_000;
  return input.now.getTime() - input.waitingSince.getTime() >= slaMs;
}
