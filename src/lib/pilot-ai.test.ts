import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzePilotConversation } from "./pilot-ai";

afterEach(() => vi.unstubAllEnvs());

describe("pilot AI fallback", () => {
  it("creates a manager draft without inventing a quote", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await analyzePilotConversation(
      "Клиент: Нужны окна, сколько будет стоить?",
    );
    expect(result.analysis.leadTemperature).toBe("warm");
    expect(result.analysis.needSummary).toContain("окон");
    expect(result.analysis.needsHuman).toBe(true);
    expect(result.usage.inputTokens).toBe(0);
  });
});
