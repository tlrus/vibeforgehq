import { after, NextResponse } from "next/server";
import { processWhatsAppWebhook } from "@/lib/whatsapp-webhook";
import { verifyWhatsAppSignature } from "@/lib/whatsapp";
import type { WhatsAppWebhook } from "@/lib/whatsapp-types";

export async function GET(request:Request){const url=new URL(request.url);const mode=url.searchParams.get("hub.mode");const token=url.searchParams.get("hub.verify_token");const challenge=url.searchParams.get("hub.challenge");if(mode==="subscribe"&&token&&token===process.env.WHATSAPP_VERIFY_TOKEN)return new NextResponse(challenge,{status:200});return new NextResponse("Forbidden",{status:403})}
export async function POST(request:Request){const raw=await request.text();if(!verifyWhatsAppSignature(raw,request.headers.get("x-hub-signature-256")))return new NextResponse("Invalid signature",{status:401});let payload:WhatsAppWebhook;try{payload=JSON.parse(raw) as WhatsAppWebhook}catch{return NextResponse.json({received:true})}after(()=>processWhatsAppWebhook(payload));return NextResponse.json({received:true})}
