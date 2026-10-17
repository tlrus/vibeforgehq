import { NextResponse } from "next/server";
import { summarizeWithOpenAI } from "@/lib/openai-server";
export async function POST(request:Request){try{return NextResponse.json({summary:await summarizeWithOpenAI(await request.json())})}catch{return NextResponse.json({summary:await summarizeWithOpenAI({})})}}
