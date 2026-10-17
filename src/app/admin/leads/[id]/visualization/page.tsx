import { FileText } from "lucide-react";
import { AdminShell,PageTitle } from "@/components/ui";
import { AdminVisualizationEditor } from "@/components/admin-visualization-editor";
import { getAdminVisualization } from "@/lib/admin-visualization";
export default async function LeadVisualizationPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const data=await getAdminVisualization(id);return <AdminShell><PageTitle back={`/admin/leads/${id}`} title="Визуализация окна" subtitle="Ручная корректировка положения и размера"><a className="button" href={`/admin/leads/${id}/quote`}><FileText/>Создать КП</a></PageTitle><AdminVisualizationEditor leadId={id} data={data}/></AdminShell>}
