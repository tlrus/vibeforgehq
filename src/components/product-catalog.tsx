"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { products as initialProducts } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ProductCatalog() {
  const [items, setItems] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [windowType, setWindowType] = useState("all");
  const [sashes, setSashes] = useState("all");
  const [profile, setProfile] = useState("all");
  const [visibility, setVisibility] = useState("all");

  const filtered = useMemo(() => items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) &&
    (windowType === "all" || item.windowType === windowType) &&
    (sashes === "all" || item.sashCount === Number(sashes)) &&
    (profile === "all" || item.profile === profile) &&
    (visibility === "all" || item.active === (visibility === "active"))
  ), [items, query, windowType, sashes, profile, visibility]);

  async function toggleProduct(id: string, active: boolean) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, active } : item));
    const client = getSupabaseBrowserClient();
    if (client) await client.from("products").update({ active }).eq("id", id);
  }

  return <>
    <div className="catalog-actions">
      <label className="catalog-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти модель…"/></label>
      <Link className="button" href="/admin/products/new"><Plus/>Добавить окно</Link>
    </div>
    <section className="catalog-filters">
      <span><SlidersHorizontal/>Фильтры</span>
      <label>Тип окна<select value={windowType} onChange={(event) => setWindowType(event.target.value)}><option value="all">Все типы</option><option>Окно</option><option>Балконный блок</option></select></label>
      <label>Створки<select value={sashes} onChange={(event) => setSashes(event.target.value)}><option value="all">Любое количество</option><option value="1">1 створка</option><option value="2">2 створки</option><option value="3">3 створки</option></select></label>
      <label>Профиль<select value={profile} onChange={(event) => setProfile(event.target.value)}><option value="all">Все профили</option><option>ПВХ 60 мм</option><option>ПВХ 70 мм</option><option>ПВХ 80 мм</option></select></label>
      <label>Видимость<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Все товары</option><option value="active">Активные</option><option value="hidden">Скрытые</option></select></label>
    </section>
    <div className="catalog-summary"><strong>{filtered.length}</strong> моделей <span>· Цена указана за квадратный метр</span></div>
    <div className="product-grid expanded">{filtered.map((product) =>
      <article className={`product-card catalog-card ${product.active ? "" : "is-hidden"}`} key={product.id}>
        <div className="product-image"><Image src={product.image} alt={product.name} width={360} height={260}/><span className={product.active ? "availability" : "availability off"}>{product.active ? "Активно" : "Скрыто"}</span></div>
        <div className="product-info"><h2>{product.name}</h2><p>{product.type} · {product.profile}</p><small>{product.description}</small>
          <div className="catalog-specs"><span>Створки<b>{product.sashCount}</b></span><span>Открываются<b>{product.openingSashes}</b></span><span>Открывание<b>{product.openingType}</b></span></div>
          <div className="chip-row">{product.colors.slice(0, 3).map((color) => <span key={color}>{color}</span>)}</div>
          <div className="price"><strong>{product.price}</strong></div>
          <div className="card-actions"><Link href={`/admin/products/${product.id}`}><Pencil/>Изменить</Link><button onClick={() => toggleProduct(product.id, !product.active)}>{product.active ? <><EyeOff/>Скрыть</> : <><Eye/>Показать</>}</button></div>
        </div>
      </article>)}</div>
    {!filtered.length && <div className="empty-catalog"><Search/><h2>Ничего не найдено</h2><p>Измените фильтры или поисковый запрос.</p></div>}
  </>;
}
