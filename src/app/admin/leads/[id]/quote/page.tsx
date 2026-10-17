import { AdminShell,PageTitle } from "@/components/ui";
import { QuoteGenerator } from "@/components/quote-generator";
export default async function QuotePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminShell><PageTitle back={`/admin/leads/${id}`} title="Коммерческое предложение" subtitle="Генерация, сохранение и отправка PDF"/><QuoteGenerator leadId={id}/></AdminShell>}
