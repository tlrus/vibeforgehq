import type { Metadata } from "next";
import { BusinessPulseDemo } from "@/components/business-pulse-demo";

export const metadata: Metadata = {
  title: "VibeForge Pilot — живой пульс продаж",
  description: "Защищённая тестовая версия VibeForge для одного клиента.",
};

export default function PilotPage() {
  return <BusinessPulseDemo liveMode />;
}
