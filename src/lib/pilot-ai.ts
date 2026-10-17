import {
  conversationAnalysisSchema,
  conversationJsonSchema,
  type ConversationAnalysis,
} from "./openai-analysis";
import type { OpenAIUsage } from "./openai-server";

const pilotSystemPrompt = `Ты — AI-суфлёр менеджера компании по продаже и установке окон.
Тебе передают последние сообщения диалога с пометками "Клиент" и "Менеджер".

Твоя задача:
1. понять последнее намерение клиента;
2. извлечь только явно названные факты;
3. определить температуру лида: cold, warm или hot;
4. кратко сформулировать потребность клиента без дублирования;
5. подготовить короткий черновик ответа менеджера с максимум одним вопросом.

Черновик не отправляется клиенту автоматически. Не придумывай цены, скидки, сроки,
размеры, наличие, договорённости или выполненные действия. Если нужен документ,
расчёт, решение руководителя или проверка менеджера, поставь needsHuman=true.
Если факт не назван явно, верни null.`;

function fallbackPilotAnalysis(message: string): ConversationAnalysis {
  const lower = message.toLowerCase();
  const hot = /готов|заказ|договор|замер|оплат|оформ|когда установ/.test(lower);
  const warm = /цен|стоим|стоит|сколько|расч[её]т|срок|размер|вариант|кп/.test(lower);
  const needSummary = /двер/.test(lower)
    ? "Подбор и установка двери"
    : /балкон|лоджи/.test(lower)
      ? "Остекление или утепление балкона"
      : /окн/.test(lower)
        ? "Подбор и установка окон"
        : null;
  return {
    reply: warm || hot
      ? "Уточните, пожалуйста, удобное время для следующего шага."
      : "Уточните, пожалуйста, что именно вы хотите подобрать.",
    detectedIntent: hot ? "ready_for_next_step" : warm ? "commercial_question" : "general_inquiry",
    extractedFields: {
      objectType: null,
      windowType: null,
      quantity: null,
      widthMm: null,
      heightMm: null,
      profileMaterial: null,
      openingSashes: null,
      openingType: null,
      openingDirection: null,
      profileColor: null,
      glassType: null,
      extras: [],
      city: null,
      customerName: null,
    },
    needsHuman: /цен|стоим|стоит|сколько|кп|договор|оплат/.test(lower),
    confidence: 0.55,
    leadTemperature: hot ? "hot" : warm ? "warm" : "cold",
    painSummary: null,
    needSummary,
  };
}

export async function analyzePilotConversation(message: string): Promise<{
  analysis: ConversationAnalysis;
  usage: OpenAIUsage;
}> {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  if (!process.env.OPENAI_API_KEY) {
    return {
      analysis: fallbackPilotAnalysis(message),
      usage: {
        provider: "fallback",
        model: "fallback",
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: pilotSystemPrompt },
          { role: "user", content: message },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vibeforge_pilot_analysis",
            strict: true,
            schema: conversationJsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response");
    return {
      analysis: conversationAnalysisSchema.parse(JSON.parse(content)),
      usage: {
        provider: "openai",
        model,
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    return {
      analysis: fallbackPilotAnalysis(message),
      usage: {
        provider: "fallback",
        model: "fallback",
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }
}
