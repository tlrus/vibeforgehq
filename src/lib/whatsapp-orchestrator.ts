import {
  createMetaAdAttributionFromReferral,
  enrichMetaAdAttribution,
} from "./meta-ads";
import { analyzePilotConversation } from "./pilot-ai";
import type { PilotEventType, PilotStage } from "./pilot-domain";
import {
  appendPilotEvent,
  ensurePilotProcess,
  getRecentPilotMessages,
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
import {
  extractWhatsAppMessages,
  type WhatsAppMessageEnvelope,
  type WhatsAppWebhookPayload,
} from "./whatsapp-cloud";

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

function buildReplyDraft(input: {
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

export function inferWhatsAppEvidenceEvent(input: {
  direction: "incoming" | "outgoing";
  text: string;
  currentStage: PilotStage;
  detectedIntent?: string | null;
}): PilotEventType | null {
  const value = `${input.detectedIntent ?? ""} ${input.text}`.toLowerCase();
  const asksForChanges = /правк|исправ|измен|передел|скоррект|не устраива/.test(value);
  const mentionsQuote =
    /(^|[\s,.;:()])кп($|[\s,.;:()])|коммерческ|предложени|расч[её]т|смет/.test(value);
  const mentionsContract = /договор|контракт/.test(value);

  if (input.direction === "incoming") {
    if (mentionsContract && asksForChanges) return "CONTRACT_REVISION_REQUESTED";
    if (mentionsQuote && asksForChanges) return "QUOTE_REVISION_REQUESTED";
    if (mentionsContract && /подписал|подписан|согласован/.test(value)) {
      return "CONTRACT_SIGNED";
    }
    return null;
  }

  if (mentionsContract && /отправ|направ|прикреп|документ/.test(value)) {
    return "CONTRACT_SENT";
  }
  if (
    mentionsQuote &&
    (/отправ|направ|прикреп|готов/.test(value) || input.text.startsWith("[Документ:"))
  ) {
    return "QUOTE_SENT";
  }
  return null;
}

async function deliverSafely(
  context: PilotContext,
  channel: "telegram" | "twenty" | "meta_ads",
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

async function syncPilotLeadToTwenty(
  context: PilotContext,
  input: {
    temperature: "cold" | "warm" | "hot";
    painSummary?: string | null;
    needSummary?: string | null;
  },
) {
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

function pilotProcessUrl(processId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/pilot?process=${encodeURIComponent(processId)}` : null;
}

async function handleIncoming(message: WhatsAppMessageEnvelope, context: PilotContext) {
  const evidenceRef = `whatsapp:${message.messageId}:incoming`;
  const received = await appendPilotEvent({
    context,
    eventType: "CUSTOMER_MESSAGE_RECEIVED",
    source: "whatsapp",
    actorType: "customer",
    evidenceRef,
    evidenceType: message.messageType,
    occurredAt: message.occurredAt,
  });
  if (!received.stored) return { duplicate: true as const };

  const attribution = createMetaAdAttributionFromReferral(message.referral);
  if (attribution) {
    let enriched = attribution;
    await deliverSafely(context, "meta_ads", async () => {
      enriched = await enrichMetaAdAttribution(attribution);
    });
    await savePilotAttribution(context, enriched);
  }

  const recentMessages = await getRecentPilotMessages(context, 5);
  const { analysis, usage } = await analyzePilotConversation(
    buildAnalysisInput(recentMessages, message.text),
  );
  await Promise.all([
    savePilotAnalysis({ context, analysis }),
    appendPilotEvent({
      context,
      eventType: "AI_ANALYSIS_COMPLETED",
      source: "ai",
      actorType: "ai",
      evidenceRef: `whatsapp:${message.messageId}:analysis`,
      evidenceType: "message_analysis",
      occurredAt: new Date().toISOString(),
      metadata: {
        intent: analysis.detectedIntent,
        confidence: analysis.confidence,
        leadTemperature: analysis.leadTemperature,
      },
    }),
  ]);

  const evidenceEvent = inferWhatsAppEvidenceEvent({
    direction: "incoming",
    text: message.text,
    currentStage: context.stage,
    detectedIntent: analysis.detectedIntent,
  });
  if (evidenceEvent) {
    await appendPilotEvent({
      context,
      eventType: evidenceEvent,
      source: "whatsapp",
      actorType: "customer",
      evidenceRef: `whatsapp:${message.messageId}:${evidenceEvent}`,
      evidenceType: "message_context",
      occurredAt: message.occurredAt,
      metadata: { detectedIntent: analysis.detectedIntent },
    });
  }

  const draft = buildReplyDraft({
    reply: analysis.reply,
    intent: analysis.detectedIntent,
    temperature: analysis.leadTemperature,
    need: analysis.needSummary,
    confidence: analysis.confidence,
  });
  await savePilotDraft({
    context,
    sourceMessageId: `whatsapp:${message.messageId}`,
    content: draft,
    usage,
  });
  await appendPilotEvent({
    context,
    eventType: "AI_DRAFT_CREATED",
    source: "ai",
    actorType: "ai",
    evidenceRef: `whatsapp:${message.messageId}:draft`,
    evidenceType: "reply_draft",
    occurredAt: new Date().toISOString(),
  });

  await Promise.all([
    deliverSafely(
      context,
      "telegram",
      () =>
        sendTelegramPilotNotification({
          customerName: context.customerName,
          stage: context.stage,
          managerName: context.managerName,
          suggestion: analysis.reply,
          conversationUrl: pilotProcessUrl(context.processId),
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

async function handleOutgoing(message: WhatsAppMessageEnvelope, context: PilotContext) {
  const sent = await appendPilotEvent({
    context,
    eventType: "MANAGER_MESSAGE_SENT",
    source: "whatsapp",
    actorType: "manager",
    evidenceRef: `whatsapp:${message.messageId}:outgoing`,
    evidenceType: message.messageType,
    occurredAt: message.occurredAt,
  });
  if (!sent.stored) return { duplicate: true as const };

  const evidenceEvent = inferWhatsAppEvidenceEvent({
    direction: "outgoing",
    text: message.text,
    currentStage: context.stage,
  });
  if (evidenceEvent) {
    await appendPilotEvent({
      context,
      eventType: evidenceEvent,
      source: "whatsapp",
      actorType: "manager",
      evidenceRef: `whatsapp:${message.messageId}:${evidenceEvent}`,
      evidenceType: "message_context",
      occurredAt: message.occurredAt,
    });
  }
  await syncPilotLeadToTwenty(context, { temperature: "warm" });
  return { duplicate: false as const, stage: context.stage };
}

async function processWhatsAppMessage(message: WhatsAppMessageEnvelope) {
  const context = await ensurePilotProcess({
    channel: "whatsapp",
    externalConversationId: message.externalConversationId,
    customerName: message.customerName,
    phone: message.customerWaId,
    managerName: process.env.MANAGER_NAME ?? null,
  });
  if (!context) return { accepted: false as const, reason: "database_not_configured" as const };

  await recordPilotMessage({
    context,
    externalMessageId: message.messageId,
    direction: message.direction,
    text: message.text,
    createdAt: message.occurredAt,
    source: "whatsapp",
    messageType: message.messageType,
  });
  return message.direction === "incoming"
    ? handleIncoming(message, context)
    : handleOutgoing(message, context);
}

export async function processWhatsAppPilotWebhook(payload: WhatsAppWebhookPayload) {
  const messages = extractWhatsAppMessages(payload, {
    wabaId: process.env.WHATSAPP_WABA_ID,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  });
  const results = [];
  for (const message of messages) {
    results.push(await processWhatsAppMessage(message));
  }
  return { received: messages.length, results };
}
