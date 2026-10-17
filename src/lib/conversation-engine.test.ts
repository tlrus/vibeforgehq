import { describe,expect,it } from "vitest";
import { initialSession,processMessage } from "./conversation-engine";

describe("conversation engine",()=>{
  it("starts with one action question",()=>expect(initialSession.state).toBe("SELECT_ACTION"));
  it("extracts several values from one message",()=>{const result=processMessage(initialSession,"Рассчитать окно для квартиры, двухстворчатое, 3 окна 1400х1200, ПВХ усиленный");expect(result.answers).toMatchObject({action:"Рассчитать окно",objectType:"Квартира",windowType:"Двухстворчатое",quantity:3,width:1400,height:1200,profile:"ПВХ усиленный"});expect(result.state).toBe("OPENING_SASHES")});
  it("routes manager requests immediately",()=>expect(processMessage(initialSession,"Хочу связаться с менеджером").state).toBe("WAITING_FOR_MANAGER"));
  it("allows unknown dimensions",()=>{const state={state:"WIDTH" as const,answers:{action:"Рассчитать окно",objectType:"Квартира",windowType:"Одностворчатое",quantity:1}};const result=processMessage(state,"Не знаю");expect(result.answers.width).toBeNull();expect(result.state).toBe("HEIGHT")});
});
