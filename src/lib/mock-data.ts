export const leads = [
  { id: "vf-1048", name: "Алексей Морозов", phone: "+7 701 882-14-22", city: "Кызылорда", need: "Остекление квартиры", status: "Новая", time: "12 мин", budget: "₸ 1,2–1,5 млн", source: "WhatsApp" },
  { id: "vf-1047", name: "Динара Ахметова", phone: "+7 777 451-08-90", city: "Астана", need: "Панорамные окна", status: "В работе", time: "34 мин", budget: "₸ 2,4 млн", source: "Сайт" },
  { id: "vf-1046", name: "ТОО Nova Build", phone: "+7 705 221-93-16", city: "Алматы", need: "12 окон для офиса", status: "Выбор отправлен", time: "2 ч", budget: "₸ 4,8 млн", source: "WhatsApp" },
  { id: "vf-1045", name: "Мария Ким", phone: "+7 747 903-44-17", city: "Шымкент", need: "Балконный блок", status: "Согласовано", time: "вчера", budget: "₸ 680 тыс.", source: "Рекомендация" },
];

export type CatalogProduct = {
  id: string; name: string; type: string; windowType: string; profile: string;
  sashCount: number; openingSashes: number; openingType: string; pricePerM2: number;
  price: string; description: string; color: string; colors: string[]; glassTypes: string[];
  active: boolean; heat: string; sound: string; image: string;
};

export const products: CatalogProduct[] = [
  { id: "standard-solo", name: "Standard Solo", type: "Одностворчатое окно", windowType: "Окно", profile: "ПВХ 60 мм", sashCount: 1, openingSashes: 1, openingType: "Поворотно-откидное", pricePerM2: 55000, price: "55 000 ₸/м²", description: "Одна открывающаяся створка", color: "#c7d8df", colors: ["Белый", "Антрацит"], glassTypes: ["Двухкамерный", "Энергосберегающий"], active: true, heat: "Высокая", sound: "40 дБ", image: "/windows/standard-solo.svg" },
  { id: "comfort-duo", name: "Comfort Duo", type: "Двухстворчатое окно", windowType: "Окно", profile: "ПВХ 70 мм", sashCount: 2, openingSashes: 1, openingType: "Поворотно-откидное", pricePerM2: 68000, price: "68 000 ₸/м²", description: "Одна открывающаяся створка", color: "#a9c4bc", colors: ["Белый", "Антрацит", "Дуб"], glassTypes: ["Двухкамерный", "Энергосберегающий"], active: true, heat: "Высокая", sound: "42 дБ", image: "/windows/comfort-duo.svg" },
  { id: "comfort-duo-plus", name: "Comfort Duo Plus", type: "Двухстворчатое окно", windowType: "Окно", profile: "ПВХ 70 мм", sashCount: 2, openingSashes: 2, openingType: "Поворотно-откидное", pricePerM2: 78000, price: "78 000 ₸/м²", description: "Две открывающиеся створки", color: "#b6bdc8", colors: ["Белый", "Антрацит", "Орех"], glassTypes: ["Энергосберегающий", "Шумозащитный"], active: true, heat: "Высокая", sound: "44 дБ", image: "/windows/comfort-duo-plus.svg" },
  { id: "family-trio", name: "Family Trio", type: "Трёхстворчатое окно", windowType: "Окно", profile: "ПВХ 70 мм", sashCount: 3, openingSashes: 1, openingType: "Поворотно-откидное", pricePerM2: 72000, price: "72 000 ₸/м²", description: "Одна открывающаяся створка", color: "#d8c8b2", colors: ["Белый", "Дуб"], glassTypes: ["Двухкамерный", "Энергосберегающий"], active: true, heat: "Высокая", sound: "42 дБ", image: "/windows/family-trio.svg" },
  { id: "family-trio-plus", name: "Family Trio Plus", type: "Трёхстворчатое окно", windowType: "Окно", profile: "ПВХ 80 мм", sashCount: 3, openingSashes: 2, openingType: "Поворотно-откидное", pricePerM2: 85000, price: "85 000 ₸/м²", description: "Две открывающиеся створки", color: "#bbcbd0", colors: ["Белый", "Антрацит", "Орех", "Дуб"], glassTypes: ["Энергосберегающий", "Шумозащитный"], active: true, heat: "Очень высокая", sound: "47 дБ", image: "/windows/family-trio-plus.svg" },
  { id: "balcony-comfort", name: "Balcony Comfort", type: "Балконный блок", windowType: "Балконный блок", profile: "ПВХ 70 мм", sashCount: 2, openingSashes: 2, openingType: "Поворотно-откидное", pricePerM2: 110000, price: "110 000 ₸/м²", description: "Окно и полноценная балконная дверь", color: "#bacdc9", colors: ["Белый", "Антрацит", "Дуб"], glassTypes: ["Энергосберегающий", "Мультифункциональный"], active: true, heat: "Высокая", sound: "43 дБ", image: "/windows/balcony-comfort.svg" },
];
