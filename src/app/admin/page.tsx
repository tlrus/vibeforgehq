import { AdminShell,PageTitle } from "@/components/ui";
import { AdminLeadList } from "@/components/admin-lead-list";
import { getAdminLeads } from "@/lib/admin-data";
export default async function AdminPage(){const leads=await getAdminLeads();return <AdminShell><PageTitle title="Заявки" subtitle="Все обращения, диалоги, замеры и сделки"/><AdminLeadList leads={leads}/></AdminShell>}
