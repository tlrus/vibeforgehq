import { describe,expect,it } from "vitest";
import { conversationAnalysisSchema,fallbackAnalyze } from "./openai-analysis";

describe("OpenAI analysis fallback",()=>{
  it("extracts two white windows and dimensions",()=>{const result=fallbackAnalyze("Нужно два белых окна 140 на 150");expect(result.extractedFields).toMatchObject({quantity:2,profileColor:"Белый",widthMm:1400,heightMm:1500});expect(result.detectedIntent).toBe("provide_dimensions")});
  it("handles unknown dimensions without inventing them",()=>{const result=fallbackAnalyze("Не знаю размеры");expect(result.detectedIntent).toBe("unknown_dimensions");expect(result.extractedFields.widthMm).toBeNull();expect(result.extractedFields.heightMm).toBeNull()});
  it("requests a human",()=>{const result=fallbackAnalyze("Хочу поговорить с менеджером");expect(result.needsHuman).toBe(true);expect(result.detectedIntent).toBe("request_human")});
  it("extracts installation and dismantling",()=>expect(fallbackAnalyze("Нужен монтаж и демонтаж").extractedFields.extras).toEqual(["Монтаж","Демонтаж"]));
  it("marks meaningless input as low confidence",()=>{const result=fallbackAnalyze("абракадабра бум ъъъ");expect(result.confidence).toBeLessThan(.65);expect(conversationAnalysisSchema.safeParse(result).success).toBe(true)});
  it("extracts pain, need and a warm temperature for a price discussion",()=>{const result=fallbackAnalyze("Старые окна продувают. Хочу узнать цену новых окон");expect(result).toMatchObject({leadTemperature:"warm",painSummary:"Холод, сквозняк или теплопотери",needSummary:"Подбор и установка окон"})});
});
