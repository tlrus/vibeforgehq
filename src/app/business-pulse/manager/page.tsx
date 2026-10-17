import type { Metadata } from "next";
import { BusinessPulseManager } from "@/components/business-pulse-manager";

export const metadata: Metadata = {
  title: "Кабинет менеджера — Business Pulse",
  description: "Рабочая очередь менеджера на основе журнала активности Business Pulse.",
};

export default function BusinessPulseManagerPage() {
  return <BusinessPulseManager />;
}
