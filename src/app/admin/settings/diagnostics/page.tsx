import { AdminShell,PageTitle } from "@/components/ui";
import { DiagnosticsPanel } from "@/components/diagnostics-panel";
export default function DiagnosticsPage(){return <AdminShell><PageTitle back="/admin/settings" title="Диагностика" subtitle="Безопасная проверка подключений без отображения секретов"/><DiagnosticsPanel/></AdminShell>}
