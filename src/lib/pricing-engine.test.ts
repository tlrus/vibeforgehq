import { describe,expect,it } from "vitest";
import { calculatePrice,defaultPricingRules } from "./pricing-engine";
describe("pricing engine",()=>{
  it("calculates a full standard order",()=>{const result=calculatePrice({widthMm:1000,heightMm:1500,quantity:2,profileMaterial:"ПВХ стандарт",glassType:"энергосберегающий",openingSashes:1,extras:["Москитная сетка","Монтаж","Демонтаж","Доставка"]});expect(result).toMatchObject({areaPerWindow:1.5,totalArea:3,base:165000,glass:36000,openingSashes:40000,additionalOptions:30000,installation:50000,dismantling:30000,delivery:20000,total:371000,range:{min:315350,max:426650}})});
  it("uses reinforced PVC rate",()=>expect(calculatePrice({widthMm:1000,heightMm:1000,quantity:1,profileMaterial:"ПВХ усиленный",glassType:"стандартный",openingSashes:0,extras:[]}).base).toBe(68000));
  it("enforces minimum order",()=>expect(calculatePrice({widthMm:500,heightMm:500,quantity:1,profileMaterial:"ПВХ стандарт",glassType:"стандартный",openingSashes:0,extras:[]}).total).toBe(defaultPricingRules.minimumOrder));
  it("uses product range without dimensions",()=>{const result=calculatePrice({widthMm:null,heightMm:null,quantity:1,profileMaterial:"ПВХ стандарт",glassType:"стандартный",openingSashes:0,extras:[],productPriceRange:{min:100000,max:140000}});expect(result.range).toEqual({min:100000,max:140000});expect(result.exactDimensions).toBe(false);expect(result.note).toContain("после профессионального замера")});
  it("charges delivery once",()=>expect(calculatePrice({widthMm:1000,heightMm:1000,quantity:3,profileMaterial:"ПВХ стандарт",glassType:"стандартный",openingSashes:0,extras:["Доставка"]}).delivery).toBe(20000));
});
