import { describe,expect,it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateQuotePdf,type QuotePdfData } from "./quote-pdf";
const sample:QuotePdfData={quoteNumber:"TEST-001",date:new Date("2026-07-13"),validUntil:new Date("2026-07-20"),customerName:"Алексей Морозов",phone:"+7 700 000-00-00",city:"Кызылорда",address:"Тестовый адрес",model:"Comfort Duo",widthMm:1400,heightMm:1500,quantity:2,profile:"ПВХ усиленный",color:"Белый",glassType:"Энергосберегающий",extras:["Монтаж","Доставка"],managerName:"Алия",managerPhone:"+7 700 000-00-00",price:{base:285600,glass:50400,options:40000,installation:50000,dismantling:0,delivery:20000,total:446000,rangeMin:379100,rangeMax:512900}};
describe("quote PDF",()=>{it("creates a valid three-page PDF",async()=>{const bytes=await generateQuotePdf(sample);expect(new TextDecoder().decode(bytes.slice(0,4))).toBe("%PDF");const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(3)})});
