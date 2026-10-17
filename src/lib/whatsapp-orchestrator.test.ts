import { describe, expect, it } from "vitest";
import { inferWhatsAppEvidenceEvent } from "./whatsapp-orchestrator";

describe("WhatsApp process evidence", () => {
  it("moves a sent proposal to the quote stage", () => {
    expect(
      inferWhatsAppEvidenceEvent({
        direction: "outgoing",
        text: "[Документ: КП-1843.pdf] Отправляю коммерческое предложение",
        currentStage: "DIALOG",
      }),
    ).toBe("QUOTE_SENT");
  });

  it("returns a quote for revision when the customer asks for changes", () => {
    expect(
      inferWhatsAppEvidenceEvent({
        direction: "incoming",
        text: "Исправьте, пожалуйста, КП и добавьте откосы",
        currentStage: "QUOTE",
      }),
    ).toBe("QUOTE_REVISION_REQUESTED");
  });

  it("returns a contract for revision without confusing it with the quote", () => {
    expect(
      inferWhatsAppEvidenceEvent({
        direction: "incoming",
        text: "Нужны правки в договоре по срокам",
        currentStage: "CONTRACT",
      }),
    ).toBe("CONTRACT_REVISION_REQUESTED");
  });

  it("does not treat a price question as a sent quote", () => {
    expect(
      inferWhatsAppEvidenceEvent({
        direction: "incoming",
        text: "Сколько будет стоить окно?",
        currentStage: "DIALOG",
      }),
    ).toBeNull();
  });
});

