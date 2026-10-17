import { z } from "zod";

export const pricingRulesSchema=z.object({
  profiles:z.object({standard:z.number().nonnegative(),reinforced:z.number().nonnegative(),aluminum:z.number().nonnegative()}),
  glass:z.object({standard:z.number().nonnegative(),energySaving:z.number().nonnegative(),soundproof:z.number().nonnegative(),tinted:z.number().nonnegative()}),
  openingSash:z.number().nonnegative(),mosquitoNet:z.number().nonnegative(),windowSill:z.number().nonnegative(),slopes:z.number().nonnegative(),dismantling:z.number().nonnegative(),installation:z.number().nonnegative(),delivery:z.number().nonnegative(),minimumOrder:z.number().nonnegative(),rangePercent:z.number().min(0).max(50),
});
export type PricingRules=z.infer<typeof pricingRulesSchema>;
export const defaultPricingRules:PricingRules={profiles:{standard:55000,reinforced:68000,aluminum:95000},glass:{standard:0,energySaving:12000,soundproof:18000,tinted:15000},openingSash:20000,mosquitoNet:15000,windowSill:12000,slopes:25000,dismantling:15000,installation:25000,delivery:20000,minimumOrder:90000,rangePercent:15};
export type PricingInput={widthMm:number|null;heightMm:number|null;quantity:number;profileMaterial:string;glassType:string;openingSashes:number;extras:string[];productPriceRange?:{min:number;max:number}};
export type PriceBreakdown={areaPerWindow:number|null;totalArea:number|null;base:number;glass:number;openingSashes:number;additionalOptions:number;installation:number;dismantling:number;delivery:number;subtotal:number;minimumAdjustment:number;total:number;range:{min:number;max:number};exactDimensions:boolean;note:string|null};

export function calculatePrice(input:PricingInput,rules:PricingRules=defaultPricingRules):PriceBreakdown{
  const safe=pricingRulesSchema.parse(rules);const quantity=Math.max(1,Math.floor(input.quantity||1));
  if(!input.widthMm||!input.heightMm){const range=input.productPriceRange||{min:safe.minimumOrder,max:Math.round(safe.minimumOrder*1.3)};return {areaPerWindow:null,totalArea:null,base:range.min,glass:0,openingSashes:0,additionalOptions:0,installation:0,dismantling:0,delivery:0,subtotal:range.min,minimumAdjustment:0,total:range.min,range,exactDimensions:false,note:"Размеры не указаны. Точный расчёт будет выполнен после профессионального замера."}}
  const areaPerWindow=input.widthMm/1000*(input.heightMm/1000);const totalArea=areaPerWindow*quantity;const profileRate=profileRateFor(input.profileMaterial,safe);const glassRate=glassRateFor(input.glassType,safe);const base=round(profileRate*totalArea);const glass=round(glassRate*totalArea);const openingSashes=Math.max(0,input.openingSashes)*quantity*safe.openingSash;
  const has=(name:string)=>input.extras.some(item=>item.toLowerCase().includes(name));const additionalOptions=(has("москит")?safe.mosquitoNet*quantity:0)+(has("подокон")?safe.windowSill*quantity:0)+(has("откос")?safe.slopes*quantity:0);const installation=has("монтаж")&&!has("демонтаж только")?safe.installation*quantity:0;const dismantling=has("демонтаж")?safe.dismantling*quantity:0;const delivery=has("достав")?safe.delivery:0;const subtotal=base+glass+openingSashes+additionalOptions+installation+dismantling+delivery;const total=Math.max(safe.minimumOrder,subtotal);const minimumAdjustment=Math.max(0,safe.minimumOrder-subtotal);const delta=safe.rangePercent/100;return {areaPerWindow:round2(areaPerWindow),totalArea:round2(totalArea),base,glass,openingSashes,additionalOptions,installation,dismantling,delivery,subtotal,minimumAdjustment,total,range:{min:round(total*(1-delta)),max:round(total*(1+delta))},exactDimensions:true,note:null};
}
function profileRateFor(value:string,r:PricingRules){const low=value.toLowerCase();return low.includes("алюмин")?r.profiles.aluminum:low.includes("усилен")||low.includes("80")?r.profiles.reinforced:r.profiles.standard}
function glassRateFor(value:string,r:PricingRules){const low=value.toLowerCase();return low.includes("энерг")?r.glass.energySaving:low.includes("шумо")?r.glass.soundproof:low.includes("тонир")?r.glass.tinted:r.glass.standard}
const round=(value:number)=>Math.round(value);const round2=(value:number)=>Math.round(value*100)/100;
