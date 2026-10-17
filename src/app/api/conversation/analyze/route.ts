import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWithOpenAI } from "@/lib/openai-server";
const requestSchema=z.object({message:z.string().min(1).max(2000)});
export async function POST(request:Request){try{const {message}=requestSchema.parse(await request.json());return NextResponse.json(await analyzeWithOpenAI(message))}catch{return NextResponse.json(await analyzeWithOpenAI(""))}}
