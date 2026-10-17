import { Clock3, Link2Off, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui";
import { PublicSelection } from "@/components/selection";
import { getPublicSelection, type SelectionError } from "@/lib/selection-service";

export default async function SelectPage({params}:{params:Promise<{token:string}>}){const {token}=await params;const result=await getPublicSelection(token);if(!result.data)return <LinkError type={result.error||"invalid"}/>;return <PublicSelection token={token} data={result.data}/>}
function LinkError({type}:{type:SelectionError}){const copy={invalid:["Ссылка не найдена","Проверьте адрес или запросите новую подборку у менеджера."],expired:["Срок ссылки истёк","Подборка была доступна 24 часа. Менеджер может создать новую ссылку."],disabled:["Ссылка отключена","Менеджер закрыл доступ к этой подборке."]}[type];return <main className="public-error"><header><Logo/></header><section><span>{type==="expired"?<Clock3/>:<Link2Off/>}</span><h1>{copy[0]}</h1><p>{copy[1]}</p><div><ShieldCheck/>Внутренние данные заявки не раскрыты</div></section></main>}
