"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Check, ImagePlus, LoaderCircle, Save, Upload } from "lucide-react";
import { products } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ProductForm({ edit = false, productId }: { edit?: boolean; productId?: string }) {
  const product = useMemo(() => products.find((item) => item.id === productId) ?? (edit ? products[0] : undefined), [edit, productId]);
  const [transparentFile, setTransparentFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File | null, kind: string) {
    if (!file) return null;
    const client = getSupabaseBrowserClient();
    if (!client) return URL.createObjectURL(file);
    const safeName = `${kind}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "vibeforge-windows";
    const result = await client.storage.from(bucket).upload(safeName, file);
    if (result.error) throw result.error;
    return client.storage.from(bucket).getPublicUrl(safeName).data.publicUrl;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const [transparentUrl, previewUrl] = await Promise.all([upload(transparentFile, "transparent"), upload(previewFile, "previews")]);
      const payload = {
        name: String(data.get("name")), slug: String(data.get("slug")), description: String(data.get("description")),
        window_type: String(data.get("windowType")), sash_count: Number(data.get("sashCount")), opening_type: String(data.get("openingType")),
        profile_material: String(data.get("profile")), available_colors: String(data.get("colors")).split(",").map((value) => value.trim()).filter(Boolean),
        available_glass_types: String(data.get("glassTypes")).split(",").map((value) => value.trim()).filter(Boolean),
        base_price_per_m2: Number(data.get("price")), active: data.get("active") === "on",
        ...(transparentUrl && { transparent_image_url: transparentUrl }), ...(previewUrl && { preview_image_url: previewUrl }),
      };
      const client = getSupabaseBrowserClient();
      if (client) {
        const result = edit && productId ? await client.from("products").update(payload).eq("id", productId) : await client.from("products").insert(payload);
        if (result.error) throw result.error;
        setMessage("Товар сохранён в Supabase");
      } else setMessage("Товар сохранён в демо-режиме");
    } catch (error) { setMessage(error instanceof Error ? `Не удалось сохранить: ${error.message}` : "Не удалось сохранить товар"); }
    finally { setSaving(false); }
  }

  return <form className="edit-layout product-editor" onSubmit={submit}>
    <section className="form-panel"><h2>Основная информация</h2>
      <div className="field-row"><label>Название модели<input name="name" required defaultValue={product?.name} placeholder="Comfort Duo"/></label><label>Slug<input name="slug" required defaultValue={product?.id} placeholder="comfort-duo"/></label></div>
      <label>Описание<textarea name="description" defaultValue={product?.description} placeholder="Коротко опишите конфигурацию окна"/></label>
      <div className="field-row"><label>Тип окна<select name="windowType" defaultValue={product?.windowType || "Окно"}><option>Окно</option><option>Балконный блок</option><option>Панорамное окно</option></select></label><label>Профиль<select name="profile" defaultValue={product?.profile || "ПВХ 70 мм"}><option>ПВХ 60 мм</option><option>ПВХ 70 мм</option><option>ПВХ 80 мм</option><option>Алюминий</option></select></label></div>
      <div className="field-row"><label>Количество створок<select name="sashCount" defaultValue={product?.sashCount || 2}><option value="1">1 створка</option><option value="2">2 створки</option><option value="3">3 створки</option></select></label><label>Тип открывания<select name="openingType" defaultValue={product?.openingType || "Поворотно-откидное"}><option>Глухое</option><option>Поворотное</option><option>Откидное</option><option>Поворотно-откидное</option><option>Раздвижное</option></select></label></div>
      <div className="field-row"><label>Цена за м², ₸<input name="price" required min="0" type="number" defaultValue={product?.pricePerM2} placeholder="68000"/></label><label>Доступные цвета<input name="colors" defaultValue={product?.colors.join(", ")} placeholder="Белый, Антрацит, Дуб"/><small>Перечислите через запятую</small></label></div>
      <label>Доступные стеклопакеты<input name="glassTypes" defaultValue={product?.glassTypes.join(", ")} placeholder="Двухкамерный, Энергосберегающий"/><small>Перечислите через запятую</small></label>
    </section>
    <aside className="upload-panel"><h2>Изображения товара</h2>
      <FileUpload title="PNG с прозрачным фоном" hint="Используется в визуализации" accept="image/png" file={transparentFile} onChange={setTransparentFile} fallback={product?.image}/>
      <FileUpload title="Обычное изображение" hint="Карточка товара в каталоге" accept="image/png,image/jpeg,image/webp" file={previewFile} onChange={setPreviewFile}/>
      <label className="toggle"><input name="active" type="checkbox" defaultChecked={product?.active ?? true}/><i/><span><strong>Показывать в каталоге</strong><small>Товар доступен менеджерам и клиентам</small></span></label>
      <div className="form-actions"><Link className="button secondary" href="/admin/products">Отмена</Link><button disabled={saving} className="button">{saving ? <LoaderCircle className="spin"/> : <Save/>}{edit ? "Сохранить" : "Создать товар"}</button></div>
      {message && <p className={message.startsWith("Не") ? "saved error" : "saved"}><Check/>{message}</p>}
    </aside>
  </form>;
}

function FileUpload({ title, hint, accept, file, onChange, fallback }: { title: string; hint: string; accept: string; file: File | null; onChange: (file: File | null) => void; fallback?: string }) {
  const preview = file ? URL.createObjectURL(file) : fallback;
  return <label className="file-upload"><input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)}/>{preview ? <Image src={preview} width={220} height={140} alt="Предпросмотр" unoptimized/> : <ImagePlus/>}<span><strong>{file?.name || title}</strong><small>{hint}</small></span><em><Upload/>Выбрать</em></label>;
}
