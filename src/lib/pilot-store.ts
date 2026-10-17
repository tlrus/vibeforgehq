import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationAnalysis } from "./openai-analysis";
import type { OpenAIUsage } from "./openai-server";
import {
  getStageAfterEvent,
  type PilotEventSource,
  type PilotEventType,
  type PilotStage,
} from "./pilot-domain";
import type { MetaAdAttribution } from "./meta-ads";
import { getSupabaseServerClient } from "./supabase/server";

export type PilotContext = {
  processId: string;
  leadId: string;
  conversationId: string;
  channel: "chatwoot" | "whatsapp";
  externalConversationId: string;
  chatwootConversationId: string | null;
  customerName: string;
  phone: string | null;
  managerName: string | null;
  stage: PilotStage;
};

type EnsurePilotProcessInput = {
  channel?: "chatwoot" | "whatsapp";
  externalConversationId?: string;
  chatwootConversationId?: string | number;
  customerName: string;
  phone: string | null;
  managerName: string | null;
};

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Database record was not returned");
  return data;
}

async function loadContext(
  client: SupabaseClient,
  process: {
    id: string;
    lead_id: string;
    stage: PilotStage;
    channel: "chatwoot" | "whatsapp" | null;
    external_conversation_id: string | null;
    chatwoot_conversation_id: number | string | null;
    manager_name: string | null;
  },
): Promise<PilotContext> {
  const [{ data: lead, error: leadError }, { data: conversation, error: conversationError }] =
    await Promise.all([
      client
        .from("leads")
        .select("customer_name,whatsapp_name,whatsapp_phone")
        .eq("id", process.lead_id)
        .single(),
      client.from("conversations").select("id").eq("lead_id", process.lead_id).single(),
    ]);
  const leadData = requireData(lead, leadError);
  const conversationData = requireData(conversation, conversationError);
  return {
    processId: process.id,
    leadId: process.lead_id,
    conversationId: conversationData.id,
    channel: process.channel ?? "chatwoot",
    externalConversationId:
      process.external_conversation_id ?? String(process.chatwoot_conversation_id),
    chatwootConversationId:
      process.chatwoot_conversation_id === null
        ? null
        : String(process.chatwoot_conversation_id),
    customerName: leadData.customer_name || leadData.whatsapp_name || "Новый клиент",
    phone: leadData.whatsapp_phone ?? null,
    managerName: process.manager_name,
    stage: process.stage,
  };
}

export async function ensurePilotProcess(
  input: EnsurePilotProcessInput,
): Promise<PilotContext | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;
  const channel = input.channel ?? "chatwoot";
  const clientKey = process.env.PILOT_CLIENT_KEY || "pilot-client";
  const externalConversationId =
    input.externalConversationId ??
    (input.chatwootConversationId === undefined ? null : String(input.chatwootConversationId));
  if (!externalConversationId) throw new Error("External conversation id is required");
  const chatwootConversationId =
    channel === "chatwoot" && input.chatwootConversationId !== undefined
      ? Number(input.chatwootConversationId)
      : null;

  let existingQuery = client
    .from("pilot_processes")
    .select(
      "id,lead_id,stage,channel,external_conversation_id,chatwoot_conversation_id,manager_name",
    )
    .eq("client_key", clientKey);
  existingQuery =
    channel === "chatwoot" && chatwootConversationId !== null
      ? existingQuery.eq("chatwoot_conversation_id", chatwootConversationId)
      : existingQuery
          .eq("channel", channel)
          .eq("external_conversation_id", externalConversationId);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    if (input.managerName && input.managerName !== existing.manager_name) {
      await client
        .from("pilot_processes")
        .update({ manager_name: input.managerName })
        .eq("id", existing.id);
      existing.manager_name = input.managerName;
    }
    return loadContext(client, existing as Parameters<typeof loadContext>[1]);
  }

  let lead: { id: string } | null = null;
  if (input.phone) {
    const result = await client
      .from("leads")
      .select("id")
      .eq("whatsapp_phone", input.phone)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    lead = result.data;
  }
  if (lead && input.customerName !== "Клиент WhatsApp") {
    const { error } = await client
      .from("leads")
      .update({ whatsapp_name: input.customerName, customer_name: input.customerName })
      .eq("id", lead.id);
    if (error) throw new Error(error.message);
  }
  if (!lead) {
    const result = await client
      .from("leads")
      .insert({
        whatsapp_phone: input.phone,
        whatsapp_name: input.customerName,
        customer_name: input.customerName,
        status: "LEAD",
        current_state: "LEAD",
        assigned_manager: input.managerName,
      })
      .select("id")
      .single();
    lead = requireData(result.data, result.error);
  }

  let conversation: { id: string } | null = null;
  const conversationResult = await client
    .from("conversations")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();
  if (conversationResult.error) throw new Error(conversationResult.error.message);
  conversation = conversationResult.data;
  if (!conversation) {
    const result = await client
      .from("conversations")
      .insert({ lead_id: lead.id })
      .select("id")
      .single();
    conversation = requireData(result.data, result.error);
  }

  const processResult = await client
    .from("pilot_processes")
    .insert({
      lead_id: lead.id,
      client_key: clientKey,
      location_name: process.env.PILOT_LOCATION_NAME || "Пилотная точка",
      product_name: process.env.PILOT_PRODUCT_NAME || "Пилотный продукт",
      stage: "LEAD",
      channel,
      external_conversation_id: externalConversationId,
      chatwoot_conversation_id: chatwootConversationId,
      manager_name: input.managerName,
    })
    .select(
      "id,lead_id,stage,channel,external_conversation_id,chatwoot_conversation_id,manager_name",
    )
    .single();
  const processRecord = requireData(processResult.data, processResult.error);
  return {
    processId: processRecord.id,
    leadId: lead.id,
    conversationId: conversation.id,
    channel,
    externalConversationId,
    chatwootConversationId:
      processRecord.chatwoot_conversation_id === null
        ? null
        : String(processRecord.chatwoot_conversation_id),
    customerName: input.customerName,
    phone: input.phone,
    managerName: input.managerName,
    stage: processRecord.stage,
  };
}

export async function recordPilotMessage(input: {
  context: PilotContext;
  externalMessageId: string;
  direction: "incoming" | "outgoing";
  text: string | null;
  createdAt: string;
  source?: "chatwoot" | "whatsapp";
  messageType?: string;
}) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const { error } = await client.from("messages").upsert(
    {
      conversation_id: input.context.conversationId,
      external_message_id: `${input.source ?? input.context.channel}:${input.externalMessageId}`,
      sender_type: input.direction === "incoming" ? "CLIENT" : "MANAGER",
      message_type: (input.messageType || "TEXT").toUpperCase(),
      text: input.text,
      delivery_status: input.direction === "incoming" ? "received" : "sent",
      created_at: input.createdAt,
    },
    { onConflict: "external_message_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return true;
}

export async function getRecentPilotMessages(context: PilotContext, limit = 5) {
  const client = getSupabaseServerClient();
  if (!client) return [];
  const { data, error } = await client
    .from("messages")
    .select("sender_type,text,created_at")
    .eq("conversation_id", context.conversationId)
    .not("text", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .reverse()
    .map((message) => ({
      direction: message.sender_type === "CLIENT" ? ("customer" as const) : ("manager" as const),
      content: String(message.text),
    }));
}

export async function appendPilotEvent(input: {
  context: PilotContext;
  eventType: PilotEventType;
  source: PilotEventSource;
  actorType: "customer" | "manager" | "owner" | "ai" | "system";
  evidenceRef: string;
  evidenceType?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}) {
  const client = getSupabaseServerClient();
  if (!client) return { stored: false as const, stage: input.context.stage };
  const { data: current, error: currentError } = await client
    .from("pilot_processes")
    .select("stage")
    .eq("id", input.context.processId)
    .single();
  if (currentError || !current) throw new Error(currentError?.message || "Process not found");
  const stageFrom = current.stage as PilotStage;
  const stageTo = getStageAfterEvent(stageFrom, input.eventType);
  const insertResult = await client.from("process_events").insert({
    process_id: input.context.processId,
    event_type: input.eventType,
    source: input.source,
    actor_type: input.actorType,
    stage_from: stageFrom,
    stage_to: stageTo,
    evidence_type: input.evidenceType,
    evidence_ref: input.evidenceRef,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt,
  });
  if (insertResult.error?.code === "23505") {
    return { stored: false as const, stage: stageFrom, duplicate: true as const };
  }
  if (insertResult.error) throw new Error(insertResult.error.message);

  const processChanges: Record<string, unknown> = { stage: stageTo };
  if (
    input.eventType === "CUSTOMER_MESSAGE_RECEIVED" ||
    input.eventType === "QUOTE_REVISION_REQUESTED" ||
    input.eventType === "CONTRACT_REVISION_REQUESTED"
  ) {
    processChanges.waiting_for = "business";
    processChanges.waiting_since = input.occurredAt;
    processChanges.obligation_due_at = new Date(
      new Date(input.occurredAt).getTime() +
        Number(process.env.PILOT_SLA_MINUTES || 60) * 60_000,
    ).toISOString();
  } else if (
    input.eventType === "MANAGER_MESSAGE_SENT" ||
    input.eventType === "QUOTE_SENT" ||
    input.eventType === "CONTRACT_SENT"
  ) {
    processChanges.waiting_for = "customer";
    processChanges.waiting_since = input.occurredAt;
    processChanges.obligation_due_at = null;
  }

  const [{ error: processError }, { error: leadError }] = await Promise.all([
    client.from("pilot_processes").update(processChanges).eq("id", input.context.processId),
    client
      .from("leads")
      .update({ status: stageTo, current_state: stageTo })
      .eq("id", input.context.leadId),
  ]);
  if (processError) throw new Error(processError.message);
  if (leadError) throw new Error(leadError.message);
  input.context.stage = stageTo;
  return { stored: true as const, stage: stageTo };
}

export async function savePilotAnalysis(input: {
  context: PilotContext;
  analysis: ConversationAnalysis;
}) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const { error } = await client
    .from("leads")
    .update({
      lead_temperature: input.analysis.leadTemperature,
      pain_summary: input.analysis.painSummary,
      need_summary: input.analysis.needSummary,
      qualification_confidence: input.analysis.confidence,
    })
    .eq("id", input.context.leadId);
  if (error) throw new Error(error.message);
  return true;
}

function estimateCostUsd(usage: OpenAIUsage) {
  const inputRate = Number(process.env.OPENAI_INPUT_USD_PER_MILLION || 0);
  const outputRate = Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION || 0);
  return (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000;
}

export async function savePilotDraft(input: {
  context: PilotContext;
  sourceMessageId: string;
  content: string;
  usage: OpenAIUsage;
}) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const { error } = await client.from("reply_drafts").upsert(
    {
      process_id: input.context.processId,
      source_message_id: input.sourceMessageId,
      content: input.content,
      provider: input.usage.provider,
      model: input.usage.model,
      input_tokens: input.usage.inputTokens,
      output_tokens: input.usage.outputTokens,
      estimated_cost_usd: estimateCostUsd(input.usage),
    },
    { onConflict: "source_message_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return true;
}

export async function savePilotAttribution(
  context: PilotContext,
  attribution: MetaAdAttribution,
) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const { error } = await client.from("ad_attributions").insert({
    process_id: context.processId,
    platform: "meta",
    ad_account_id: attribution.adAccountId,
    campaign_id: attribution.campaignId,
    campaign_name: attribution.campaignName,
    adset_id: attribution.adsetId,
    adset_name: attribution.adsetName,
    ad_id: attribution.adId,
    ad_name: attribution.adName,
    creative_id: attribution.creativeId,
    creative_name: attribution.creativeName,
    referral: attribution.referral,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function recordIntegrationDelivery(input: {
  context: PilotContext;
  channel: "chatwoot" | "whatsapp" | "telegram" | "twenty" | "meta_ads";
  status: "SENT" | "FAILED" | "SKIPPED";
  target?: string | null;
  error?: unknown;
}) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const { error } = await client.from("integration_deliveries").insert({
    process_id: input.context.processId,
    channel: input.channel,
    target: input.target,
    status: input.status,
    attempts: input.status === "SKIPPED" ? 0 : 1,
    last_error: input.error instanceof Error ? input.error.message.slice(0, 500) : null,
    delivered_at: input.status === "SENT" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function recordPilotError(input: {
  context?: PilotContext | null;
  scope: string;
  error: unknown;
}) {
  const client = getSupabaseServerClient();
  if (!client) return false;
  const message =
    input.error instanceof Error ? input.error.message : "Unknown pilot integration error";
  const { error } = await client.from("audit_logs").insert({
    lead_id: input.context?.leadId ?? null,
    actor_type: "SYSTEM",
    action: "PILOT_INTEGRATION_ERROR",
    metadata: { scope: input.scope, message: message.slice(0, 500) },
  });
  if (error) throw new Error(error.message);
  return true;
}

function maskPhone(value: string | null) {
  if (!value) return "не указан";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `+${digits.slice(0, 1)} ••• •••-${digits.slice(-4, -2)}-${digits.slice(-2)}`;
}

export async function getPilotSnapshot() {
  const client = getSupabaseServerClient();
  if (!client) return null;
  const { data: processes, error } = await client
    .from("pilot_processes")
    .select(
      "id,lead_id,channel,external_conversation_id,location_name,product_name,stage,manager_name,waiting_for,waiting_since,obligation_due_at,created_at,updated_at,lead:leads(customer_name,whatsapp_name,whatsapp_phone,lead_temperature,pain_summary,need_summary,qualification_confidence,quotes(grand_total,status,created_at)),ad_attributions(campaign_id,campaign_name,ad_id,ad_name,creative_id,creative_name)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const processIds = (processes ?? []).map((process) => process.id);
  let events: Array<Record<string, unknown>> = [];
  if (processIds.length) {
    const result = await client
      .from("process_events")
      .select(
        "id,process_id,event_type,source,actor_type,stage_from,stage_to,metadata,occurred_at",
      )
      .in("process_id", processIds)
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (result.error) throw new Error(result.error.message);
    events = result.data ?? [];
  }
  const now = Date.now();
  const sanitizedProcesses = (processes ?? []).map((process) => {
    const lead = Array.isArray(process.lead) ? process.lead[0] : process.lead;
    const attributions = Array.isArray(process.ad_attributions)
      ? process.ad_attributions
      : [];
    const quotes = Array.isArray(lead?.quotes) ? lead.quotes : [];
    const latestQuote = [...quotes].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ).at(-1);
    const waitingSince = process.waiting_since
      ? new Date(process.waiting_since).getTime()
      : null;
    return {
      id: process.id,
      channel: process.channel,
      locationName: process.location_name,
      productName: process.product_name,
      stage: process.stage,
      managerName: process.manager_name,
      waitingFor: process.waiting_for,
      waitingSince: process.waiting_since,
      waitingMinutes: waitingSince ? Math.max(0, Math.floor((now - waitingSince) / 60_000)) : 0,
      obligationDueAt: process.obligation_due_at,
      overdue:
        process.waiting_for === "business" &&
        Boolean(process.obligation_due_at) &&
        new Date(process.obligation_due_at).getTime() <= now,
      createdAt: process.created_at,
      updatedAt: process.updated_at,
      value: Number(latestQuote?.grand_total ?? 0),
      customer: {
        name: lead?.customer_name || lead?.whatsapp_name || "Новый клиент",
        phoneMasked: maskPhone(lead?.whatsapp_phone ?? null),
        temperature: lead?.lead_temperature ?? "cold",
        painSummary: lead?.pain_summary ?? null,
        needSummary: lead?.need_summary ?? null,
        qualificationConfidence: Number(lead?.qualification_confidence ?? 0),
      },
      attribution: attributions.at(-1) ?? null,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    processes: sanitizedProcesses,
    events,
    totals: {
      processes: sanitizedProcesses.length,
      waitingForBusiness: sanitizedProcesses.filter(
        (process) => process.waitingFor === "business",
      ).length,
      overdue: sanitizedProcesses.filter((process) => process.overdue).length,
    },
  };
}

export type PilotConversationMessage = {
  id: string;
  sender: "client" | "manager" | "ai" | "system";
  text: string;
  messageType: string;
  deliveryStatus: string | null;
  createdAt: string;
};

export type PilotConversation = {
  processId: string;
  leadId: string;
  customerName: string;
  phone: string;
  managerName: string;
  stage: string;
  productName: string;
  locationName: string;
  waitingFor: "business" | "customer" | null;
  waitingSince: string | null;
  updatedAt: string;
  messages: PilotConversationMessage[];
};

export async function getPilotConversations(): Promise<PilotConversation[] | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  const { data: processes, error: processError } = await client
    .from("pilot_processes")
    .select(
      "id,lead_id,stage,manager_name,product_name,location_name,waiting_for,waiting_since,updated_at,lead:leads(customer_name,whatsapp_name,whatsapp_phone)",
    )
    .order("updated_at", { ascending: false });
  if (processError) throw new Error(processError.message);
  if (!processes?.length) return [];

  const leadIds = processes.map((process) => process.lead_id);
  const { data: conversations, error: conversationError } = await client
    .from("conversations")
    .select("id,lead_id")
    .in("lead_id", leadIds);
  if (conversationError) throw new Error(conversationError.message);

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  let messages: Array<{
    id: string;
    conversation_id: string;
    sender_type: "CLIENT" | "MANAGER" | "AI" | "SYSTEM";
    message_type: string;
    text: string | null;
    transcription: string | null;
    delivery_status: string | null;
    created_at: string;
  }> = [];
  if (conversationIds.length) {
    const result = await client
      .from("messages")
      .select(
        "id,conversation_id,sender_type,message_type,text,transcription,delivery_status,created_at",
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true })
      .limit(2_000);
    if (result.error) throw new Error(result.error.message);
    messages = result.data ?? [];
  }

  const conversationByLead = new Map(
    (conversations ?? []).map((conversation) => [conversation.lead_id, conversation.id]),
  );
  const messagesByConversation = new Map<string, PilotConversationMessage[]>();
  for (const message of messages) {
    const content = message.text?.trim() || message.transcription?.trim();
    const text = content || `[${String(message.message_type || "сообщение").toLowerCase()}]`;
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push({
      id: message.id,
      sender:
        message.sender_type === "CLIENT"
          ? "client"
          : message.sender_type === "MANAGER"
            ? "manager"
            : message.sender_type === "AI"
              ? "ai"
              : "system",
      text,
      messageType: message.message_type,
      deliveryStatus: message.delivery_status,
      createdAt: message.created_at,
    });
    messagesByConversation.set(message.conversation_id, list);
  }

  return processes.map((process) => {
    const lead = Array.isArray(process.lead) ? process.lead[0] : process.lead;
    const conversationId = conversationByLead.get(process.lead_id);
    return {
      processId: process.id,
      leadId: process.lead_id,
      customerName:
        lead?.customer_name || lead?.whatsapp_name || "Новый клиент WhatsApp",
      phone: lead?.whatsapp_phone || "Номер не указан",
      managerName: process.manager_name || "Не назначен",
      stage: process.stage,
      productName: process.product_name || "Продукт не указан",
      locationName: process.location_name || "Точка не указана",
      waitingFor: process.waiting_for,
      waitingSince: process.waiting_since,
      updatedAt: process.updated_at,
      messages: conversationId ? messagesByConversation.get(conversationId) ?? [] : [],
    };
  }).filter((conversation) => !/тестов(ый|ая|ое)|demo-client|демо-клиент/i.test(conversation.customerName));
}
