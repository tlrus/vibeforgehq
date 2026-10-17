import type { Metadata } from "next";
import { ManualBusinessPulse } from "@/components/manual-business-pulse";

export const metadata: Metadata = {
  title: "Business Pulse — ручная CRM",
  description: "Ручной контур Business Pulse с CRM-канбаном для ведения клиентов.",
};

export default function BusinessPulsePage() {
  return <ManualBusinessPulse />;
}
