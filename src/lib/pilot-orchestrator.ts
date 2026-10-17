import {
  createChatwootPrivateNote,
  getChatwootContact,
  getChatwootConversationUrl,
  getChatwootEvidenceEvent,
  getChatwootManager,
  getChatwootMessageDirection,
  getRecentChatwootMessages,
  type ChatwootWebhookPayload,
} from "./chatwoot";
import { enrichMetaAdAttribution, extractMetaAdAttribution } from "./meta-ads";
import { analyzePilotConversation } from "./pilot-ai";
import {
  appendPilotEvent,
  ensurePilotProcess,
  recordIntegrationDelivery,
  recordPilotError,
  recordPilotMessage,
  savePilotAnalysis,
  savePilotAttribution,
  savePilotDraft,
  type PilotContext,
} from "./pilot-store";
import { sendTelegramPilotNotification } from "./telegram";
import { syncLeadToTwenty } from "./twenty-crm";

function normalizeCreatedAt(value: string | number | undefined) {
  if (typeof value === "number") return new Date(value * 1_000).toISOString();
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function buildAnalysisInput(
  messages: Array<{ direction: "customer" | "manager"; content: string }>,
  currentMessage: string,
) {
  const history = messages.length
    ? messages
    : [{ direction: "customer" as const, content: currentMessage }];
  return history
    .slice(-5)
    .map((message) => `${message.direction === "customer" ? "Клиент" : "Менеджер"}: ${message.content}`)
    .join("\n");
}

function buildPrivateNote(input: {
  reply: string;
  intent: string;
  temperature: "cold" | "warm" | "hot";
  need: string | null;
  confidence: number;
}) {
  const temperature = { cold: "холодный", warm: "тёплый", hot: "горячий" }[
    input.temperature
  ];
  return [
    "AI-суфлёр · черновик, клиенту не отправлен",
    "",
    input.reply,
    "",
    `Контекст: ${input.intent} · клиент ${temperature} · уверенность ${Math.round(input.confidence * 100)}%`,
    input.need ? `Потребность: ${input.need}` : null,
    "Менеджер проверяет и отправляет ответ самостоятельно.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

async function deliverSafely(
  context: PilotContext,
  channel: "chatwoot" | "telegram" | "twenty" | "meta_ads",
  action: () => Promise<{ delivered?: boolean; synced?: boolean; reason?: string } | void>,
  target?: string | null,
) {
  try {
    const result = await action();
    const skipped =
      result &&
      (("delivered" in result && result.delivered === false) ||
        ("synced" in result && result.synced === false));
    await recordIntegrationDelivery({
      context,
      channel,
      target,
      status: skipped ? "SKIPPED" : "SENT",
    });
  } catch (error) {
    await recordIntegrationDelivery({
      context,
      channel,
      target,
      status: "FAILED",
      error,
    }).catch(() => undefined);
    await recordPilotError({ context, scope: channel, error }).catch(() => undefined);
  }
}

async function syncPilotLeadToTwenty(context: PilotContext, input: {
  temperature: "cold" | "warm" | "hot";
  painSummary?: string | null;
  needSummary?: string | null;
}) {
  await deliverSafely(context, "twenty", () =>
    syncLeadToTwenty({
      externalId: context.leadId,
      name: context.customerName,
      phone: context.phone ?? "",
      source: "WhatsApp",
      stage: context.stage,
      manager: context.managerName,
      leadTemperature: input.temperature,
      painSummary: input.painSummary,
      needSummary: input.needSummary,
      updatedAt: new Date().toISOString(),
    }),
  );
}

async function handleIncoming(
  payload: ChatwootWebhookPayload,
  context: PilotContext,
  occurredAt: string,
) {
  if (!context.chatwootConversationId) {
    throw new Error("Chatwoot conversation id is missing");
  }
  const chatwootConversationId = context.chatwootConversationId;
  const evidenceRef = `chatwoot:${payload.id}:incoming`;
  const event = await appendPilotEvent({
    context,
    eventType: "CUSTOMER_MESSAGE_RECEIVED",
    source: "chatwoot",
    actorType: "customer",
    evidenceRef,
    evidenceType: "message",
    occurredAt,
  });
  if (!event.stored) return { duplicate: true as const };

  const attribution = extractMetaAdAttribution(payload);
  if (attribution) {
    let enriched = attribution;
    await deliverSafely(context, "meta_ads", async () => {
      enriched = await enrichMetaAdAttribution(attribution);
    });
    await savePilotAttribution(context, enriched);
  }

  let recentMessages: Array<{ direction: "customer" | "manager"; content: string }> = [];
  try {
    recentMessages = await getRecentChatwootMessages(context.chatwootConversationId, 5);
  } catch (error) {
    await recordPilotError({ context, scope: "chatwoot_history", error }).catch(() => undefined);
  }
  const analysisInput = buildAnalysisInput(recentMessages, payload.content ?? "");
  const { analysis, usage } = await analyzePilotConversation(analysisInput);
  await Promise.all([
    savePilotAnalysis({ context, analysis }),
    appendPilotEvent({
      context,
      eventType: "AI_ANALYSIS_COMPLETED",
      source: "ai",
      actorType: "ai",
      evidenceRef: `chatwoot:${payload.id}:analysis`,
      evidenceType: "message_analysis",
      occurredAt: new Date().toISOString(),
      metadata: {
        intent: analysis.detectedIntent,
        confidence: analysis.confidence,
        leadTemperature: analysis.leadTemperature,
      },
    }),
  ]);

  const draft = buildPrivateNote({
    reply: analysis.reply,
    intent: analysis.detectedIntent,
    temperature: analysis.leadTemperature,
    need: analysis.needSummary,
    confidence: analysis.confidence,
  });
  await savePilotDraft({
    context,
    sourceMessageId: `chatwoot:${payload.id}`,
    content: draft,
    usage,
  });
  await appendPilotEvent({
    context,
    eventType: "AI_DRAFT_CREATED",
    source: "ai",
    actorType: "ai",
    evidenceRef: `chatwoot:${payload.id}:draft`,
    evidenceType: "reply_draft",
    occurredAt: new Date().toISOString(),
  });

  await Promise.all([
    deliverSafely(
      context,
      "chatwoot",
      () => createChatwootPrivateNote(chatwootConversationId, draft),
      chatwootConversationId,
    ),
    deliverSafely(
      context,
      "telegram",
      () =>
        sendTelegramPilotNotification({
          customerName: context.customerName,
          stage: context.stage,
          managerName: context.managerName,
          suggestion: analysis.reply,
          conversationUrl: getChatwootConversationUrl(chatwootConversationId),
        }),
      process.env.TELEGRAM_MANAGER_CHAT_ID,
    ),
    syncPilotLeadToTwenty(context, {
      temperature: analysis.leadTemperature,
      painSummary: analysis.painSummary,
      needSummary: analysis.needSummary,
    }),
  ]);
  return { duplicate: false as const, stage: context.stage };
}

async function handleOutgoing(
  payload: ChatwootWebhookPayload,
  context: PilotContext,
  occurredAt: string,
) {
  const event = await appendPilotEvent({
    context,
    eventType: "MANAGER_MESSAGE_SENT",
    source: "chatwoot",
    actorType: "manager",
    evidenceRef: `chatwoot:${payload.id}:outgoing`,
    evidenceType: "message",
    occurredAt,
  });
  if (!event.stored) return { duplicate: true as const };

  const evidenceEvent = getChatwootEvidenceEvent(payload);
  if (evidenceEvent && evidenceEvent !== "MANAGER_MESSAGE_SENT") {
    await appendPilotEvent({
      context,
      eventType: evidenceEvent,
      source: "chatwoot",
      actorType: "manager",
      evidenceRef: `chatwoot:${payload.id}:${evidenceEvent}`,
      evidenceType: "chatwoot_attribute",
      occurredAt,
    });
  }
  await syncPilotLeadToTwenty(context, { temperature: "warm" });
  return { duplicate: false as const, stage: context.stage };
}

export async function processChatwootPilotWebhook(payload: ChatwootWebhookPayload) {
  if (payload.event !== "message_created" || payload.private) {
    return { ignored: true as const };
  }
  const direction = getChatwootMessageDirection(payload);
  if (!direction) return { ignored: true as const };
  const contact = getChatwootContact(payload);
  const context = await ensurePilotProcess({
    chatwootConversationId: payload.conversation.id,
    customerName: contact.name,
    phone: contact.phone,
    managerName: getChatwootManager(payload),
  });
  if (!context) return { accepted: false as const, reason: "database_not_configured" as const };

  const occurredAt = normalizeCreatedAt(payload.created_at);
  await recordPilotMessage({
    context,
    externalMessageId: String(payload.id),
    direction,
    text: payload.content ?? null,
    createdAt: occurredAt,
    source: "chatwoot",
  });
  return direction === "incoming"
    ? handleIncoming(payload, context, occurredAt)
    : handleOutgoing(payload, context, occurredAt);
}
