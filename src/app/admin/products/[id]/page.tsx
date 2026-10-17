import { AdminShell, PageTitle } from "@/components/ui"; import { ProductForm } from "@/components/product-form";
export default async function EditProduct({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminShell active="products"><PageTitle back="/admin/products" title="Редактирование модели" subtitle={`Карточка ${id}`}/><ProductForm edit productId={id}/></AdminShell>}
