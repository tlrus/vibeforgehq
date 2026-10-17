-- Six repeatable VibeForge catalog products. Safe to run more than once.
insert into public.products
  (name, slug, description, window_type, sash_count, opening_type, profile_material, available_colors, available_glass_types, transparent_image_url, preview_image_url, base_price_per_m2, active, sort_order)
values
  ('Standard Solo', 'standard-solo', 'Одностворчатое окно · одна открывающаяся створка', 'Окно', 1, 'Поворотно-откидное', 'ПВХ 60 мм', '["Белый", "Антрацит"]', '["Двухкамерный", "Энергосберегающий"]', '/windows/standard-solo.svg', '/windows/standard-solo.svg', 55000, true, 10),
  ('Comfort Duo', 'comfort-duo', 'Двухстворчатое окно · одна открывающаяся створка', 'Окно', 2, 'Поворотно-откидное', 'ПВХ 70 мм', '["Белый", "Антрацит", "Дуб"]', '["Двухкамерный", "Энергосберегающий"]', '/windows/comfort-duo.svg', '/windows/comfort-duo.svg', 68000, true, 20),
  ('Comfort Duo Plus', 'comfort-duo-plus', 'Двухстворчатое окно · две открывающиеся створки', 'Окно', 2, 'Поворотно-откидное', 'ПВХ 70 мм', '["Белый", "Антрацит", "Орех"]', '["Энергосберегающий", "Шумозащитный"]', '/windows/comfort-duo-plus.svg', '/windows/comfort-duo-plus.svg', 78000, true, 30),
  ('Family Trio', 'family-trio', 'Трёхстворчатое окно · одна открывающаяся створка', 'Окно', 3, 'Поворотно-откидное', 'ПВХ 70 мм', '["Белый", "Дуб"]', '["Двухкамерный", "Энергосберегающий"]', '/windows/family-trio.svg', '/windows/family-trio.svg', 72000, true, 40),
  ('Family Trio Plus', 'family-trio-plus', 'Трёхстворчатое окно · две открывающиеся створки', 'Окно', 3, 'Поворотно-откидное', 'ПВХ 80 мм', '["Белый", "Антрацит", "Орех", "Дуб"]', '["Энергосберегающий", "Шумозащитный"]', '/windows/family-trio-plus.svg', '/windows/family-trio-plus.svg', 85000, true, 50),
  ('Balcony Comfort', 'balcony-comfort', 'Балконный блок с открывающимся окном и дверью', 'Балконный блок', 2, 'Поворотно-откидное', 'ПВХ 70 мм', '["Белый", "Антрацит", "Дуб"]', '["Энергосберегающий", "Мультифункциональный"]', '/windows/balcony-comfort.svg', '/windows/balcony-comfort.svg', 110000, true, 60)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, window_type = excluded.window_type,
  sash_count = excluded.sash_count, opening_type = excluded.opening_type, profile_material = excluded.profile_material,
  available_colors = excluded.available_colors, available_glass_types = excluded.available_glass_types,
  transparent_image_url = excluded.transparent_image_url, preview_image_url = excluded.preview_image_url,
  base_price_per_m2 = excluded.base_price_per_m2, active = excluded.active, sort_order = excluded.sort_order;
