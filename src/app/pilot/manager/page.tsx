import type { Metadata } from "next";
import { ManagerWorkspace } from "@/components/manager-dashboard/manager-workspace";

export const metadata: Metadata = {
  title: "Кабинет менеджера — АлмаОкна",
  description: "Игровой кабинет продаж: задачи, AI-подсказки, цели, доход и вклад менеджера.",
};

export default function ManagerPage() {
  return <ManagerWorkspace />;
}
