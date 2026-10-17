import { AdminShell, PageTitle } from "@/components/ui"; import { ProductForm } from "@/components/product-form";
export default function NewProduct(){return <AdminShell active="products"><PageTitle back="/admin/products" title="Новая модель" subtitle="Добавьте окно в каталог"/><ProductForm/></AdminShell>}
