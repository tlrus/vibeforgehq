import { buildPilotDemoClients, demoBranchNames, demoProductNames, demoStageCodes, getDemoDialogueInsight, type DemoDialogueInsight } from "@/lib/pilot-demo-data";
import { getPilotConversations, getPilotSnapshot } from "@/lib/pilot-store";

type Snapshot = NonNullable<Awaited<ReturnType<typeof getPilotSnapshot>>>;
type SnapshotRecord = Snapshot["processes"][number];

export type PilotCrmRecord = SnapshotRecord & {
  dialogue: DemoDialogueInsight;
  lastClientMessage: string;
  isSynthetic: boolean;
  isPresenterDemo: boolean;
};

const stageIndex: Record<string, number> = { LEAD: 0, DIALOG: 1, QUOTE: 2, CONTRACT: 3, FULFILLMENT: 4, PAYMENT: 6 };

function productId(name: string) {
  const value = name.toLocaleLowerCase("ru-RU");
  if (value.includes("двер")) return "doors" as const;
  if (value.includes("балкон")) return "balconies" as const;
  return "windows" as const;
}

function presenterDemo(name: string, phone = "") {
  return /руслан/i.test(name.trim()) || phone.replace(/\D/g, "") === "77081102995";
}

function isLegacyPlaceholder(record: SnapshotRecord) {
  return (
    record.id.startsWith("b1000000-") ||
    record.customer.name.startsWith("Демо-клиент") ||
    record.customer.name.startsWith("Тестовый клиент") ||
    record.customer.name.startsWith("Demo client")
  );
}

function extractFact(text: string, expression: RegExp, fallback: string) {
  return text.match(expression)?.[0]?.trim() || fallback;
}

function enrichRealRecord(record: SnapshotRecord, transcript: string, lastClientMessage: string): DemoDialogueInsight {
  const stage = stageIndex[record.stage] ?? 0;
  const seed = {
    id: record.id,
    stage,
    product: productId(record.productName),
    value: record.value,
    painSummary: record.customer.painSummary || "Причина покупки ещё уточняется",
    needSummary: record.customer.needSummary || `Интерес к продукту «${record.productName}»`,
    nextActionOwner: record.waitingFor === "business" ? "business" as const : record.waitingFor === "customer" ? "client" as const : "none" as const,
  };
  const base = getDemoDialogueInsight(seed);
  const dimensions = extractFact(transcript, /\b\d{2,4}\s*(?:х|×|x)\s*\d{2,4}(?:\s*мм)?\b/iu, base.dimensions);
  const budget = extractFact(transcript, /(?:до|бюджет|ориентир|за)\s*[\d\s]{2,}(?:тыс\.?|миллион\w*|₸|тг|к)/iu, base.budget);
  const timeline = extractFact(transcript, /(?:сегодня|завтра|на этой неделе|до конца месяца|за \d+ (?:дней|дня)|в течение \d+ (?:дней|дня))/iu, base.timeline);
  return {
    ...base,
    summary: `${seed.needSummary}. ${seed.painSummary}. Последнее сообщение клиента: «${lastClientMessage || "нет нового сообщения"}».`,
    budget,
    timeline,
    dimensions,
    confidence: Math.max(base.confidence, Math.round(Number(record.customer.qualificationConfidence || 0) * 100)),
  };
}

export async function getPilotCrmRecords(): Promise<PilotCrmRecord[]> {
  const [snapshot, storedConversations] = await Promise.all([getPilotSnapshot(), getPilotConversations()]);
  const conversations = storedConversations ?? [];
  const conversationsByProcess = new Map(conversations.map((conversation) => [conversation.processId, conversation]));
  const realRecords: PilotCrmRecord[] = (snapshot?.processes ?? [])
    .filter((record) => !isLegacyPlaceholder(record))
    .map((record) => {
    const conversation = conversationsByProcess.get(record.id);
    const clientMessages = conversation?.messages.filter((message) => message.sender === "client") ?? [];
    const transcript = clientMessages.map((message) => message.text).join(" ");
    const lastClientMessage = clientMessages.at(-1)?.text || "Новых сообщений нет";
    return {
      ...record,
      dialogue: enrichRealRecord(record, transcript, lastClientMessage),
      lastClientMessage,
      isSynthetic: false,
      isPresenterDemo: presenterDemo(record.customer.name, conversation?.phone),
    };
  });

  const now = Date.now();
  const synthetic = buildPilotDemoClients().map<PilotCrmRecord>((client) => {
    const dialogue = getDemoDialogueInsight(client);
    const createdAt = new Date(now - client.enteredMinutesAgo * 60_000).toISOString();
    const updatedAt = new Date(now - Math.max(2, client.waitingMinutes) * 60_000).toISOString();
    return {
      id: `HIST-${client.id}`,
      channel: client.source,
      locationName: demoBranchNames[client.branch],
      productName: demoProductNames[client.product],
      stage: demoStageCodes[client.stage],
      managerName: client.manager,
      waitingFor: client.nextActionOwner === "business" ? "business" : client.nextActionOwner === "client" ? "customer" : null,
      waitingSince: client.stage === 6 ? null : updatedAt,
      waitingMinutes: client.waitingMinutes,
      obligationDueAt: client.waitingForBusiness ? new Date(now - 5 * 60_000).toISOString() : null,
      overdue: client.waitingForBusiness,
      createdAt,
      updatedAt,
      value: client.value,
      customer: {
        name: client.name,
        phoneMasked: client.phoneMasked,
        temperature: client.temperature,
        painSummary: client.painSummary,
        needSummary: client.needSummary,
        qualificationConfidence: dialogue.confidence / 100,
      },
      attribution: null,
      dialogue,
      lastClientMessage: client.nextActionOwner === "business" ? dialogue.objection : client.nextActionOwner === "client" ? "Ожидает материалы компании" : "Сделка завершена",
      isSynthetic: true,
      isPresenterDemo: false,
    };
  });

  const businessRealCount = realRecords.filter((record) => !record.isPresenterDemo).length;
  const backdropCount = Math.max(0, synthetic.length - businessRealCount);
  return [...realRecords, ...synthetic.slice(0, backdropCount)];
}

export function isPresenterDemoRecord(record: PilotCrmRecord) {
  return record.isPresenterDemo;
}
