import { AdminShell, PageTitle } from "@/components/ui";
import { ProductCatalog } from "@/components/product-catalog";

export default function ProductsPage() {
  return <AdminShell active="products"><PageTitle title="Каталог окон" subtitle="Модели, характеристики, изображения и цены"/><ProductCatalog/></AdminShell>;
}
