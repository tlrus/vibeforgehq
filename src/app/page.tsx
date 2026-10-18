import type { Metadata } from "next";
import { AgencyHome } from "@/components/agency-home";

export const metadata: Metadata = {
  title: "VibeForge | ИИ, IT-разработка и робототехника",
  description: "Внедрение ИИ, разработка веб-сервисов, CRM, автоматизация и прототипы робототехники. Познакомьтесь с проектами VibeForge и обсудите свою задачу.",
};

export default function Home() {
  return <AgencyHome />;
}
