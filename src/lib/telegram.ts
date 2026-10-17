export type TelegramPilotNotification = {
  chatId?: string | null;
  customerName: string;
  stage: string;
  managerName?: string | null;
  suggestion: string;
  conversationUrl?: string | null;
};

export async function sendTelegramPilotNotification(input: TelegramPilotNotification) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = input.chatId || process.env.TELEGRAM_MANAGER_CHAT_ID;
  if (!token || !chatId) return { delivered: false as const, reason: "not_configured" as const };

  const text = [
    `VibeForge · ${input.stage}`,
    `Клиент: ${input.customerName}`,
    input.managerName ? `Менеджер: ${input.managerName}` : null,
    "",
    `AI-черновик: ${input.suggestion}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const replyMarkup = input.conversationUrl
    ? {
        inline_keyboard: [
          [{ text: "Открыть клиента в VibeForge", url: input.conversationUrl }],
        ],
      }
    : undefined;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Telegram sendMessage returned ${response.status}`);
  return { delivered: true as const };
}
