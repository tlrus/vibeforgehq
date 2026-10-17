import { leads as demoLeads, products as demoProducts } from "@/lib/mock-data";
import { getSupabaseServerClient } from "./server";

export async function getLeads() {
  const client = getSupabaseServerClient();
  if (!client) return demoLeads;
  const { data, error } = await client.from("leads").select("id, customer_name, whatsapp_name, whatsapp_phone, city, status, created_at").order("created_at", { ascending: false });
  if (error || !data?.length) return demoLeads;
  return data.map((lead) => ({
    id: lead.id,
    name: lead.customer_name || lead.whatsapp_name || "Новый клиент",
    phone: lead.whatsapp_phone || "Телефон не указан",
    city: lead.city || "Город не указан",
    need: "Новая заявка",
    status: lead.status === "NEW" ? "Новая" : lead.status === "WON" ? "Согласовано" : "В работе",
    time: new Intl.DateTimeFormat("ru", { day: "2-digit", month: "short" }).format(new Date(lead.created_at)),
    budget: "Уточняется",
    source: "WhatsApp",
  }));
}

export async function getProducts() {
  const client = getSupabaseServerClient();
  if (!client) return demoProducts;
  const { data, error } = await client.from("products").select("*").order("sort_order");
  if (error || !data?.length) return demoProducts;
  const colors = ["#c7d8df", "#a9c4bc", "#b6bdc8", "#d8c8b2"];
  return data.map((product, index) => ({
    id: product.id,
    name: product.name,
    type: `${product.profile_material || "ПВХ"} · ${product.sash_count || 2} створки`,
    price: `от ₸ ${Number(product.base_price_per_m2 || 0).toLocaleString("ru-RU")}/м²`,
    description: product.description || "Окно из каталога VibeForge",
    color: colors[index % colors.length],
    active: product.active,
    heat: "Высокая",
    sound: "42 дБ",
  }));
}
