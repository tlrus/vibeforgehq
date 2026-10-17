import type { BusinessPulseClient } from "./business-pulse-data";
import type { PulseEvent } from "./business-pulse-workspace";
import type { BusinessPulseJournalEntry } from "@/data/business-pulse-journal";

export type CompAiConfig = {
  apiUrl?: string;
  apiKey?: string;
};

export type CompAiContactPayload = {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  title?: string;
};

export type CompAiActivityType = "CALL" | "NOTE" | "TASK" | "MEETING" | "EMAIL";

export type CompAiActivityPayload = {
  type: CompAiActivityType;
  subject?: string;
  body?: string;
  contactId?: string;
};

export function splitContactName(fullName: string): { firstName: string; lastName?: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "Клиент" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function formatCompAiContact(client: BusinessPulseClient): CompAiContactPayload {
  const contactName = client.contact?.trim() || client.name?.trim() || "Контакт";
  const { firstName, lastName } = splitContactName(contactName);

  return {
    firstName,
    lastName,
    phone: client.phone?.trim() || undefined,
    title: client.name?.trim() || undefined,
  };
}

export function mapEventTypeToCompAiActivity(eventType: string): CompAiActivityType {
  switch (eventType.toLowerCase()) {
    case "call":
    case "звонок":
    case "activity":
      return "CALL";
    case "meeting":
    case "встреча":
      return "MEETING";
    case "task":
    case "задача":
    case "stage":
      return "TASK";
    case "email":
    case "письмо":
      return "EMAIL";
    default:
      return "NOTE";
  }
}

export function formatCompAiActivityFromEvent(
  event: PulseEvent,
  contactId?: string
): CompAiActivityPayload {
  const type = mapEventTypeToCompAiActivity(event.type);
  return {
    type,
    subject: event.text || `Событие (${event.at})`,
    body: event.actor ? `Ответственный: ${event.actor}` : undefined,
    contactId,
  };
}

export function formatCompAiActivityFromJournal(
  entry: BusinessPulseJournalEntry,
  contactId?: string
): CompAiActivityPayload {
  const bodyParts = [
    entry.achieved ? `Достигнуто: ${entry.achieved}` : null,
    entry.nextAction ? `Следующий шаг: ${entry.nextAction}` : null,
    entry.difficulty ? `Сложность: ${entry.difficulty}` : null,
  ].filter(Boolean);

  return {
    type: "CALL",
    subject: `Касание (${entry.channel || "канал"}): ${entry.result || "Разговор"}`,
    body: bodyParts.length > 0 ? bodyParts.join(". ") : undefined,
    contactId,
  };
}

function resolveConfig(customConfig?: CompAiConfig): { apiUrl: string; apiKey: string | undefined } {
  const apiUrl = (
    customConfig?.apiUrl ||
    process.env.COMPAI_CRM_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const apiKey = customConfig?.apiKey || process.env.COMPAI_CRM_API_KEY;
  return { apiUrl, apiKey };
}

export async function checkCompAiHealth(customConfig?: CompAiConfig): Promise<{ online: boolean; database?: string }> {
  const { apiUrl } = resolveConfig(customConfig);
  try {
    const res = await fetch(`${apiUrl}/health`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { online: false };
    const data = (await res.json()) as { status?: string; database?: string };
    return { online: data.status === "ok", database: data.database };
  } catch {
    return { online: false };
  }
}

export async function syncClientToCompAi(
  client: BusinessPulseClient,
  customConfig?: CompAiConfig
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  const { apiUrl, apiKey } = resolveConfig(customConfig);
  if (!apiKey) {
    return { success: false, error: "API-ключ Comp AI CRM не настроен (COMPAI_CRM_API_KEY)" };
  }

  const payload = formatCompAiContact(client);

  try {
    const res = await fetch(`${apiUrl}/rest/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Ошибка Comp AI API: ${res.status} ${errText}` };
    }

    const created = (await res.json()) as { id?: string };
    const contactId = created.id;

    if (contactId && (client.note || (client.events && client.events.length > 0))) {
      try {
        const latestEvent = client.events && client.events.length > 0
          ? client.events[client.events.length - 1]
          : null;

        const activityPayload: CompAiActivityPayload = latestEvent
          ? formatCompAiActivityFromEvent(latestEvent, contactId)
          : {
              type: "NOTE",
              subject: "Заметка из Business Pulse CRM",
              body: client.note,
              contactId,
            };

        await fetch(`${apiUrl}/rest/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(activityPayload),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore activity failure
      }
    }

    return { success: true, contactId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}