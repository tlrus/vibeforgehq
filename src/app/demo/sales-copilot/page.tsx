import type { Metadata } from "next";
import { BusinessPulseDemo } from "@/components/business-pulse-demo";

export const metadata: Metadata = {
  title: "VibeForge — AI-Суфлёр для отдела продаж",
  description: "Интерактивное демо AI-Суфлёра и AI-Ревизора для продаж окон",
};

export default function SalesCopilotDemoPage() {
  return <BusinessPulseDemo />;
}
