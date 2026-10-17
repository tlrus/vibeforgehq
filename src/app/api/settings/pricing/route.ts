import { NextResponse } from "next/server";
import { pricingRulesSchema } from "@/lib/pricing-engine";
import { getPricingRules,savePricingRules } from "@/lib/pricing-settings";
export async function GET(){return NextResponse.json({rules:await getPricingRules()})}
export async function PUT(request:Request){try{const rules=pricingRulesSchema.parse(await request.json());return NextResponse.json({ok:true,...await savePricingRules(rules)})}catch{return NextResponse.json({ok:false,message:"Проверьте значения правил"},{status:400})}}
