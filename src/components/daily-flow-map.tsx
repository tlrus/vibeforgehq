"use client";

import {
  Banknote,
  Boxes,
  Building2,
  CalendarRange,
  FileCheck2,
  FileSignature,
  Images,
  Instagram,
  MessageCircle,
  MessageSquareText,
  Maximize2,
  Minus,
  Minimize2,
  Move,
  MapPin,
  PackageCheck,
  Plus,
  Scan,
  TimerReset,
  UserRound,
  Video,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import { temperatureLabel, type LeadTemperature } from "@/lib/pulse-client";

export type CreativeId = "reels" | "carousel" | "stories";
export type ClientSource = CreativeId | "whatsapp" | "instagram" | "coldBase" | "website";
export type BranchId = "abai" | "mega" | "orbita" | "turan";
export type ProductId = "windows" | "doors" | "balconies";
export type NextActionOwner = "business" | "client" | "none";

export const networkBranches: { id: BranchId; label: string; address: string }[] = [
  { id: "abai", label: "Абая", address: "Абая, 12" },
  { id: "mega", label: "Mega", address: "Розыбакиева, 247А" },
  { id: "orbita", label: "Орбита", address: "Орбита-3, 18" },
  { id: "turan", label: "Туран", address: "Туран, 55" },
];

export const productCatalog: { id: ProductId; label: string; short: string; color: string }[] = [
  { id: "windows", label: "Окна", short: "ПВХ и алюминий", color: "#5b91ee" },
  { id: "doors", label: "Двери", short: "Входные и межкомнатные", color: "#a77be8" },
  { id: "balconies", label: "Балконы", short: "Остекление и утепление", color: "#40b99c" },
];

export const productOptionsBySource: Record<ClientSource, ProductId[]> = {
  reels: ["windows", "doors"],
  carousel: ["windows", "balconies"],
  stories: ["doors", "balconies"],
  whatsapp: ["windows", "balconies"],
  instagram: ["doors"],
  coldBase: ["windows", "doors", "balconies"],
  website: ["windows", "doors", "balconies"],
};

export type ClientThread = {
  id: string;
  name: string;
  phoneMasked: string;
  manager: string;
  source: ClientSource;
  branch: BranchId;
  product: ProductId;
  stage: number;
  waitingMinutes: number;
  enteredAt: string;
  changedAt: number;
  previousStage: number | null;
  nextActionOwner: NextActionOwner;
  waitingForBusiness: boolean;
  value: number;
  enteredMinutesAgo: number;
  cycleMinutes?: number;
  temperature: LeadTemperature;
  painDetected: boolean;
  needDetected: boolean;
  painSummary: string;
  needSummary: string;
  /** Visible demo contact. It may move on the map, but is excluded from business KPIs. */
  isDemo?: boolean;
};

export const dailyCreatives = [
  { id: "reels" as const, channel: "Instagram Reels", format: "Видео · 15 сек", title: "Тепло без переплат", offer: "−30% теплопотерь", icon: Video },
  { id: "carousel" as const, channel: "Facebook и Instagram", format: "Карусель · 5 слайдов", title: "Окна: до и после", offer: "Результат за 7 дней", icon: Images },
  { id: "stories" as const, channel: "Instagram Stories", format: "Stories · лид-форма", title: "Расчёт за 1 минуту", offer: "Узнать цену", icon: Instagram },
];

const stages: { label: string; icon: LucideIcon }[] = [
  { label: "Заявка", icon: MessageCircle },
  { label: "Диалог", icon: MessageSquareText },
  { label: "КП", icon: FileCheck2 },
  { label: "Договор", icon: FileSignature },
  { label: "Исполнение", icon: Wrench },
  { label: "Принято", icon: PackageCheck },
  { label: "Оплачено", icon: Banknote },
];

type MetricKind = "backlog" | "duration" | "throughput" | "conversion" | "money" | "progress" | "temperature";
type StageMetric = {
  label: string;
  value: string | number;
  unit: string;
  progress: number;
  kind: MetricKind;
  target: string;
  alert?: boolean;
  segments?: { label: string; value: number; color: string }[];
};

const worldWidth = 3560;
const worldHeight = 1450;
const defaultCanvasView = { x: 0, y: 0, zoom: 0.8 };
const stageX = [680, 1150, 1620, 2090, 2560, 3030, 3500];
const stageNodeHalfWidth = 176;
const sourceThreadX = 390;
const defaultMergeX = 540;
const stageApproachLength = 54;
const transitionSlaMinutes = [30, 60, 120, 1440, 1440, 720];

const periodOptions = [
  { minutes: 60, label: "Сейчас", detail: "последний час" },
  { minutes: 240, label: "4 часа", detail: "последние 4 часа" },
  { minutes: 720, label: "Сегодня", detail: "с начала рабочего дня" },
  { minutes: 4320, label: "3 дня", detail: "последние 3 дня" },
  { minutes: 10080, label: "7 дней", detail: "последние 7 дней" },
] as const;

const sourceMeta: Record<ClientSource, { label: string; format: string; icon: LucideIcon }> = {
  reels: { label: "Reels", format: "Видео · 15 сек", icon: Video },
  carousel: { label: "Карусель", format: "5 слайдов", icon: Images },
  stories: { label: "Stories", format: "Лид-форма", icon: Instagram },
  whatsapp: { label: "WhatsApp", format: "Входящий чат", icon: MessageCircle },
  instagram: { label: "Instagram", format: "Direct", icon: Instagram },
  coldBase: { label: "Холодная база", format: "Исходящий контакт", icon: UserRound },
  website: { label: "Сайт", format: "Форма на сайте", icon: MessageSquareText },
};

type CampaignCard = {
  id: string;
  source: ClientSource;
  product: ProductId;
  title: string;
  offer: string;
};

const campaignCatalog: CampaignCard[] = [
  { id: "windows-reels", source: "reels", product: "windows", title: "Тепло без переплат", offer: "−30% теплопотерь" },
  { id: "windows-carousel", source: "carousel", product: "windows", title: "Окна: до и после", offer: "5 реальных объектов" },
  { id: "windows-whatsapp", source: "whatsapp", product: "windows", title: "Расчёт окон в чате", offer: "Цена за 1 минуту" },
  { id: "doors-reels", source: "reels", product: "doors", title: "Тихая дверь за 1 день", offer: "Монтаж включён" },
  { id: "doors-stories", source: "stories", product: "doors", title: "Бесплатный замер двери", offer: "Ответить в Stories" },
  { id: "doors-instagram", source: "instagram", product: "doors", title: "Дверь под ваш интерьер", offer: "Подбор в Direct" },
  { id: "balconies-carousel", source: "carousel", product: "balconies", title: "Балкон: было / стало", offer: "5 вариантов отделки" },
  { id: "balconies-stories", source: "stories", product: "balconies", title: "Тёплый балкон за 7 дней", offer: "Узнать стоимость" },
  { id: "balconies-whatsapp", source: "whatsapp", product: "balconies", title: "Расчёт балкона в чате", offer: "Ответ за 1 минуту" },
  { id: "windows-website", source: "website", product: "windows", title: "Калькулятор окон", offer: "Заявка с сайта" },
  { id: "doors-coldBase", source: "coldBase", product: "doors", title: "Повторный контакт", offer: "Клиенты из базы" },
];

const productMeta = Object.fromEntries(productCatalog.map((product) => [product.id, product])) as Record<ProductId, (typeof productCatalog)[number]>;
const campaignKey = (source: ClientSource, product: ProductId) => `${product}-${source}`;
const pluralRu = (value: number, one: string, few: string, many: string) => {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last > 1 && last < 5) return few;
  return many;
};
const campaignSourceY = (index: number) => 112 + index * 120;
const campaignLaneY = (index: number) => 305 + index * 22;

export function DailyFlowMap({
  clients,
  selectedStage,
  selectedSource,
  selectedBranch,
  paused,
  crmBasePath = "/demo/sales-copilot/crm",
  onOpenClient,
  onOpenConversation,
  onOpenStage,
  onSelectStage,
  onSelectSource,
  onSelectBranch,
}: {
  clients: ClientThread[];
  selectedStage: number | null;
  selectedSource: ClientSource | null;
  selectedBranch: BranchId | null;
  paused: boolean;
  crmBasePath?: string;
  onOpenClient?: (client: ClientThread) => void;
  onOpenConversation?: (client: ClientThread) => void;
  onOpenStage?: (stage: number) => void;
  onSelectStage: (stage: number) => void;
  onSelectSource: (source: ClientSource) => void;
  onSelectBranch: (branch: BranchId | null) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; originX: number; originY: number } | null>(null);
  const expandedScrollYRef = useRef<number | null>(null);
  const [canvasView, setCanvasView] = useState(defaultCanvasView);
  const [isPanning, setIsPanning] = useState(false);
  const [periodIndex, setPeriodIndex] = useState(2);
  const [canvasCustomPeriodOpen, setCanvasCustomPeriodOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductId | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [attentionPanelOpen, setAttentionPanelOpen] = useState(false);
  const activeClientId = selectedClientId ?? hoveredClientId;
  const presetPeriod = periodOptions[periodIndex];
  const periodMinutes = customMinutes ?? presetPeriod.minutes;
  const periodLabel = customMinutes === null ? presetPeriod.label : "Свой период";
  const isHistoricalPeriod = customMinutes !== null || periodIndex > 0;

  const toggleExpanded = () => {
    if (!isExpanded) {
      expandedScrollYRef.current = window.scrollY;
      viewportRef.current?.scrollTo({ top: 0, left: 0 });
      window.scrollTo({ top: 0, left: 0 });
      setIsExpanded(true);
      return;
    }
    const restoreY = expandedScrollYRef.current ?? 0;
    setIsExpanded(false);
    expandedScrollYRef.current = null;
    window.requestAnimationFrame(() => window.scrollTo({ top: restoreY, left: 0 }));
  };

  const applyCustomPeriod = () => {
    const from = new Date(customFrom).getTime();
    const to = new Date(customTo).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return;
    setCustomMinutes(Math.max(1, Math.round((to - from) / 60_000)));
    setCanvasCustomPeriodOpen(false);
  };

  const zoomAroundCenter = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    setCanvasView((current) => {
      const zoom = Math.min(2.4, Math.max(0.5, current.zoom * factor));
      const worldX = (centerX - current.x) / current.zoom;
      const worldY = (centerY - current.y) / current.zoom;
      return { zoom, x: centerX - worldX * zoom, y: centerY - worldY * zoom };
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: canvasView.x,
      originY: canvasView.y,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setCanvasView((current) => ({
      ...current,
      x: drag.originX + event.clientX - drag.clientX,
      y: drag.originY + event.clientY - drag.clientY,
    }));
  };

  const stopPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setCanvasView((current) => {
      const zoom = Math.min(2.4, Math.max(0.5, current.zoom * Math.exp(-event.deltaY * 0.0025)));
      const worldX = (pointerX - current.x) / current.zoom;
      const worldY = (pointerY - current.y) / current.zoom;
      return { zoom, x: pointerX - worldX * zoom, y: pointerY - worldY * zoom };
    });
  };

  const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 24;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAroundCenter(1.12);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomAroundCenter(0.88);
    } else if (event.key === "0") {
      event.preventDefault();
      setCanvasView(defaultCanvasView);
    } else if (event.key === "Escape" && isExpanded) {
      event.preventDefault();
      toggleExpanded();
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setCanvasView((current) => ({
        ...current,
        x: current.x + (event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0),
        y: current.y + (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0),
      }));
    }
  };

  const branchClients = useMemo(
    () => selectedBranch === null ? clients : clients.filter((client) => client.branch === selectedBranch),
    [clients, selectedBranch],
  );
  const periodVisibleNewClients = useMemo(
    () => branchClients.filter((client) => client.enteredMinutesAgo <= periodMinutes),
    [branchClients, periodMinutes],
  );
  const periodVisibleCarryoverClients = useMemo(
    () => branchClients.filter((client) => client.enteredMinutesAgo > periodMinutes && client.stage > 0 && client.stage < 6),
    [branchClients, periodMinutes],
  );
  const periodNewClients = useMemo(
    () => periodVisibleNewClients.filter((client) => !client.isDemo),
    [periodVisibleNewClients],
  );
  const periodCarryoverClients = useMemo(
    () => periodVisibleCarryoverClients.filter((client) => !client.isDemo),
    [periodVisibleCarryoverClients],
  );
  const visibleNewClients = periodNewClients;
  const visibleCarryoverClients = useMemo(
    () => periodMinutes >= 10_080 ? [] : periodCarryoverClients,
    [periodCarryoverClients, periodMinutes],
  );
  const visibleDemoClients = useMemo(
    () => [...periodVisibleNewClients, ...(periodMinutes >= 10_080 ? [] : periodVisibleCarryoverClients)]
      .filter((client) => client.isDemo),
    [periodMinutes, periodVisibleCarryoverClients, periodVisibleNewClients],
  );
  const visibleClients = useMemo(
    () => [...visibleDemoClients, ...visibleNewClients, ...visibleCarryoverClients],
    [visibleCarryoverClients, visibleDemoClients, visibleNewClients],
  );
  const hasDataFocus = selectedCampaignId !== null || selectedProduct !== null || selectedSource !== null;
  const scopedNewClients = useMemo(
    () => periodNewClients.filter((client) => (
      (!selectedCampaignId || campaignKey(client.source, client.product) === selectedCampaignId)
      && (!selectedProduct || client.product === selectedProduct)
      && (!selectedSource || client.source === selectedSource)
    )),
    [periodNewClients, selectedCampaignId, selectedProduct, selectedSource],
  );
  const scopedCarryoverClients = useMemo(
    () => visibleCarryoverClients.filter((client) => (
      (!selectedCampaignId || campaignKey(client.source, client.product) === selectedCampaignId)
      && (!selectedProduct || client.product === selectedProduct)
      && (!selectedSource || client.source === selectedSource)
    )),
    [visibleCarryoverClients, selectedCampaignId, selectedProduct, selectedSource],
  );
  const metricClients = useMemo(
    () => [...scopedNewClients, ...scopedCarryoverClients],
    [scopedCarryoverClients, scopedNewClients],
  );
  const metricClientIds = useMemo(() => new Set(metricClients.map((client) => client.id)), [metricClients]);
  const carryoverIds = useMemo(() => new Set(visibleCarryoverClients.map((client) => client.id)), [visibleCarryoverClients]);
  const currentByStage = useMemo(
    () => stages.map((_, stage) => metricClients.filter((client) => client.stage === stage).length),
    [metricClients],
  );
  const stageCounts = useMemo(
    () => stages.map((_, stage) => metricClients.filter((client) => client.stage >= stage).length),
    [metricClients],
  );
  const waitingByStage = useMemo(
    () => stages.map((_, stage) => metricClients.filter(
      (client) => client.stage === stage && client.waitingForBusiness,
    ).length),
    [metricClients],
  );
  const displayedCampaigns = campaignCatalog;
  const selectedCampaign = selectedCampaignId === null
    ? null
    : campaignCatalog.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const campaignCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignCatalog.forEach((campaign) => { counts[campaign.id] = 0; });
    periodNewClients.forEach((client) => {
      const id = campaignKey(client.source, client.product);
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [periodNewClients]);
  const campaignCarryoverCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignCatalog.forEach((campaign) => { counts[campaign.id] = 0; });
    visibleCarryoverClients.forEach((client) => {
      const id = campaignKey(client.source, client.product);
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [visibleCarryoverClients]);
  const campaignThreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignCatalog.forEach((campaign) => {
      counts[campaign.id] = campaignCounts[campaign.id] + campaignCarryoverCounts[campaign.id];
    });
    return counts;
  }, [campaignCarryoverCounts, campaignCounts]);
  const geometryThreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignCatalog.forEach((campaign) => { counts[campaign.id] = 0; });
    visibleClients.forEach((client) => {
      const id = campaignKey(client.source, client.product);
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
  }, [visibleClients]);
  const campaignIndex = useMemo(
    () => new Map(displayedCampaigns.map((campaign, index) => [campaign.id, index])),
    [displayedCampaigns],
  );
  const networkProductClients = clients;
  const branchStats = useMemo(
    () => networkBranches.map((branch) => {
      const scopedBranchClients = networkProductClients.filter((client) => client.branch === branch.id);
      return {
        ...branch,
        clients: scopedBranchClients.length,
        waiting: scopedBranchClients.filter((client) => client.stage < 6 && client.waitingForBusiness).length,
      };
    }),
    [networkProductClients],
  );
  const productStats = useMemo(
    () => productCatalog.map((product) => {
      const productBranchClients = branchClients.filter((client) => client.product === product.id);
      const newClients = productBranchClients.filter((client) => client.enteredMinutesAgo <= periodMinutes);
      const activeClients = productBranchClients.filter((client) => client.stage < 6);
      const paidClients = newClients.filter((client) => client.stage === 6);
      return {
        ...product,
        newClients: newClients.length,
        activeClients: activeClients.length,
        paidClients: paidClients.length,
        revenue: paidClients.reduce((sum, client) => sum + client.value, 0),
      };
    }),
    [branchClients, periodMinutes],
  );
  const selectedBranchMeta = selectedBranch === null
    ? null
    : networkBranches.find((branch) => branch.id === selectedBranch) ?? null;
  const conversion = stageCounts[0] ? Math.round((stageCounts[6] / stageCounts[0]) * 1000) / 10 : 0;
  const delayedCount = metricClients.filter(
    (client) => client.stage < 6 && client.waitingForBusiness && client.waitingMinutes >= 60,
  ).length;
  const networkWaitingCount = networkProductClients.filter((client) => client.stage < 6 && client.waitingForBusiness).length;
  const hasThreadFocus = selectedStage !== null || selectedProduct !== null || selectedSource !== null || selectedCampaignId !== null;
  const isClientMuted = (client: ClientThread) => hasThreadFocus && (
    (selectedStage !== null && client.stage !== selectedStage)
    || (selectedProduct !== null && client.product !== selectedProduct)
    || (selectedSource !== null && client.source !== selectedSource)
    || (selectedCampaignId !== null && campaignKey(client.source, client.product) !== selectedCampaignId)
  );
  const revenue = scopedNewClients.reduce((sum, client) => sum + client.value, 0);
  const money = revenue === 0
    ? "0 ₸"
    : revenue < 1_000_000
      ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(revenue / 1_000)} тыс. ₸`
      : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(revenue / 1_000_000)} млн ₸`;

  const periodHours = Math.max(periodMinutes / 60, 1);
  const newLeadRate = Math.round((scopedNewClients.length / periodHours) * 10) / 10;
  const averageWait = (stage: number) => {
    const stageClients = metricClients.filter((client) => client.stage === stage);
    return stageClients.length === 0
      ? 0
      : Math.round(stageClients.reduce((sum, client) => sum + client.waitingMinutes, 0) / stageClients.length);
  };
  const percent = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
  const formatCompactMoney = (value: number) => value >= 1_000_000
    ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value / 1_000_000)} млн`
      : `${Math.round(value / 1_000)} тыс.`;
  const metricProgress = (value: number, max: number) => Math.min(100, Math.max(0, Math.round((value / Math.max(max, 1)) * 100)));
  const dialogClients = metricClients.filter((client) => client.stage === 1);
  const dialogQualifiedCount = dialogClients.filter((client) => client.painDetected && client.needDetected).length;
  const dialogReadyForQuoteCount = dialogClients.filter(
    (client) => client.painDetected && client.needDetected && client.temperature !== "cold",
  ).length;
  const dialogTemperature = {
    cold: dialogClients.filter((client) => client.temperature === "cold").length,
    warm: dialogClients.filter((client) => client.temperature === "warm").length,
    hot: dialogClients.filter((client) => client.temperature === "hot").length,
  };
  const transitionBases = [12, 38, 74, 360, 720, 180];
  const transitionSpreads = [22, 58, 120, 540, 960, 360];
  const transitionAverages = stages.slice(1).map((_, index) => {
    const targetStage = index + 1;
    const reachedClients = metricClients.filter((client) => client.stage >= targetStage);
    if (reachedClients.length === 0) return 0;
    const totalMinutes = reachedClients.reduce((sum, client) => {
      const seed = Number(client.id.replace(/\D/g, "")) || 1;
      return sum + transitionBases[index] + ((seed * 17 + targetStage * 29) % transitionSpreads[index]);
    }, 0);
    return Math.round(totalMinutes / reachedClients.length);
  });
  const maximumTransitionMinutes = Math.max(...transitionAverages, 1);
  const transitionStats = transitionAverages.map((minutes, index) => {
    const passed = stageCounts[index + 1];
    const remaining = currentByStage[index];
    const total = passed + remaining;
    const rank = minutes === 0
      ? transitionAverages.length
      : [...transitionAverages]
        .sort((left, right) => right - left)
        .findIndex((value) => value === minutes) + 1;
    return {
      minutes,
      passed,
      remaining,
      rank,
      isLongest: minutes > 0 && rank === 1,
      comparison: minutes === 0 ? 0 : Math.max(6, Math.round((minutes / maximumTransitionMinutes) * 100)),
      passedShare: total === 0 ? 0 : Math.round((passed / total) * 100),
    };
  });
  const formatTransitionTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    if (minutes < 1_440) return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(minutes / 60)} ч`;
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(minutes / 1_440)} д`;
  };
  const stageMetrics: StageMetric[][] = [
    [
      { label: "Не отвечено", value: waitingByStage[0], unit: pluralRu(waitingByStage[0], "заявка", "заявки", "заявок"), progress: metricProgress(waitingByStage[0], currentByStage[0]), kind: "backlog", target: "цель 0", alert: waitingByStage[0] > 0 },
      { label: "Темп входа", value: newLeadRate, unit: "клиента/ч", progress: metricProgress(newLeadRate, 5), kind: "throughput", target: "входящий поток" },
      { label: "Первый ответ", value: averageWait(0), unit: "мин", progress: metricProgress(averageWait(0), 10), kind: "duration", target: "SLA ≤ 10 мин", alert: averageWait(0) > 10 },
    ],
    [
      { label: "Ждут менеджера", value: waitingByStage[1], unit: pluralRu(waitingByStage[1], "диалог", "диалога", "диалогов"), progress: metricProgress(waitingByStage[1], currentByStage[1]), kind: "backlog", target: "ответить всем", alert: waitingByStage[1] > 0 },
      { label: "Квалифицировано", value: dialogQualifiedCount, unit: `из ${dialogClients.length}`, progress: percent(dialogQualifiedCount, dialogClients.length), kind: "progress", target: "понятны задача и параметры" },
      {
        label: "Температура лидов",
        value: dialogTemperature.hot,
        unit: pluralRu(dialogTemperature.hot, "горячий", "горячих", "горячих"),
        progress: percent(dialogTemperature.hot, dialogClients.length),
        kind: "temperature",
        target: "приоритет менеджера",
        segments: [
          { label: "Холодные", value: dialogTemperature.cold, color: "#65aaf4" },
          { label: "Тёплые", value: dialogTemperature.warm, color: "#f0b052" },
          { label: "Горячие", value: dialogTemperature.hot, color: "#ff7867" },
        ],
      },
      { label: "Готовы к КП", value: dialogReadyForQuoteCount, unit: `из ${dialogClients.length}`, progress: percent(dialogReadyForQuoteCount, dialogClients.length), kind: "progress", target: "квалифицированы и тёплые" },
    ],
    [
      { label: "КП просрочено", value: waitingByStage[2], unit: pluralRu(waitingByStage[2], "документ", "документа", "документов"), progress: metricProgress(waitingByStage[2], currentByStage[2]), kind: "backlog", target: "закрыть до 0", alert: waitingByStage[2] > 0 },
      { label: "Подготовка", value: averageWait(2), unit: "мин", progress: metricProgress(averageWait(2), 60), kind: "duration", target: "SLA ≤ 60 мин", alert: averageWait(2) > 60 },
      { label: "В договор", value: percent(stageCounts[3], stageCounts[2]), unit: "%", progress: percent(stageCounts[3], stageCounts[2]), kind: "conversion", target: "конверсия КП → договор" },
    ],
    [
      { label: "Требуют правок", value: waitingByStage[3], unit: pluralRu(waitingByStage[3], "договор", "договора", "договоров"), progress: metricProgress(waitingByStage[3], currentByStage[3]), kind: "backlog", target: "закрыть до 0", alert: waitingByStage[3] > 0 },
      { label: "До подписи", value: Math.round(averageWait(3) / 60 * 10) / 10, unit: "ч", progress: metricProgress(averageWait(3), 1440), kind: "duration", target: "норма ≤ 24 ч", alert: averageWait(3) > 1440 },
      { label: "Передано в работу", value: percent(stageCounts[4], stageCounts[3]), unit: "%", progress: percent(stageCounts[4], stageCounts[3]), kind: "conversion", target: "доля запущенных заказов" },
    ],
    [
      { label: "Срок нарушен", value: waitingByStage[4], unit: pluralRu(waitingByStage[4], "заказ", "заказа", "заказов"), progress: metricProgress(waitingByStage[4], currentByStage[4]), kind: "backlog", target: "устранить до 0", alert: waitingByStage[4] > 0 },
      { label: "Без движения", value: Math.round(averageWait(4) / 60 * 10) / 10, unit: "ч", progress: metricProgress(averageWait(4), 1440), kind: "duration", target: "контроль ≤ 24 ч", alert: averageWait(4) > 1440 },
      { label: "В срок", value: Math.max(0, 100 - percent(waitingByStage[4], currentByStage[4])), unit: "%", progress: Math.max(0, 100 - percent(waitingByStage[4], currentByStage[4])), kind: "conversion", target: "доля без нарушений" },
    ],
    [
      { label: "Ждут приёмки", value: metricClients.filter((client) => client.stage === 5 && client.nextActionOwner === "client").length, unit: pluralRu(metricClients.filter((client) => client.stage === 5 && client.nextActionOwner === "client").length, "заказ", "заказа", "заказов"), progress: metricProgress(metricClients.filter((client) => client.stage === 5 && client.nextActionOwner === "client").length, currentByStage[5]), kind: "backlog", target: "получить приёмку" },
      { label: "На замечаниях", value: waitingByStage[5], unit: pluralRu(waitingByStage[5], "заказ", "заказа", "заказов"), progress: metricProgress(waitingByStage[5], currentByStage[5]), kind: "backlog", target: "устранить до 0", alert: waitingByStage[5] > 0 },
      { label: "Приёмка", value: Math.round(averageWait(5) / 60 * 10) / 10, unit: "ч", progress: metricProgress(averageWait(5), 1440), kind: "duration", target: "норма ≤ 24 ч", alert: averageWait(5) > 1440 },
    ],
    [
      { label: "Получено", value: formatCompactMoney(revenue), unit: "₸", progress: metricProgress(revenue, 6_800_000), kind: "money", target: "план 6,8 млн ₸" },
      { label: "Средний чек", value: formatCompactMoney(stageCounts[6] ? revenue / stageCounts[6] : 0), unit: "₸", progress: metricProgress(stageCounts[6] ? revenue / stageCounts[6] : 0, 700_000), kind: "money", target: "ориентир 700 тыс. ₸" },
      { label: "Конверсия", value: conversion, unit: "%", progress: conversion, kind: "conversion", target: "заявка → оплата" },
    ],
  ];

  const geometry = useMemo(() => {
    const campaignSeen: Record<string, number> = {};
    return visibleClients.map((client) => {
      const id = campaignKey(client.source, client.product);
      const cardIndex = campaignIndex.get(id) ?? 0;
      const sourceIndex = campaignSeen[id] ?? 0;
      campaignSeen[id] = sourceIndex + 1;
      const sourceTotal = geometryThreadCounts[id] ?? 0;
      const sourceSpread = Math.min(74, Math.max(28, sourceTotal * 4));
      const laneSpread = Math.min(42, Math.max(18, sourceTotal * 2.4));
      const startY = campaignSourceY(cardIndex) + (sourceTotal <= 1 ? 0 : ((sourceIndex / (sourceTotal - 1)) - 0.5) * sourceSpread);
      const laneY = campaignLaneY(cardIndex) + (sourceTotal <= 1 ? 0 : ((sourceIndex / (sourceTotal - 1)) - 0.5) * laneSpread);
      const isCarryover = !isHistoricalPeriod && carryoverIds.has(client.id);
      const endX = stageX[client.stage] - stageNodeHalfWidth;
      // Keep the merge point before the current stage. The previous fixed merge at x=540
      // sat behind the first card (whose edge is x=504), so stage-zero threads doubled
      // back on themselves and produced a visibly dirty seam.
      const mergeX = Math.max(sourceThreadX + 32, Math.min(defaultMergeX, endX - stageApproachLength));
      const curveDistance = mergeX - sourceThreadX;
      const path = `M${sourceThreadX} ${startY} C${sourceThreadX + curveDistance * 0.45} ${startY} ${mergeX - curveDistance * 0.28} ${laneY} ${mergeX} ${laneY} L${endX} ${laneY}`;
      let advancePath: string | null = null;
      if (client.changedAt > 0) {
        if (client.previousStage === null) {
          advancePath = path;
        } else if (client.stage > client.previousStage) {
          advancePath = `M${stageX[client.previousStage] + stageNodeHalfWidth} ${laneY} L${stageX[client.stage] - stageNodeHalfWidth} ${laneY}`;
        } else if (client.stage < client.previousStage) {
          advancePath = `M${stageX[client.previousStage] - stageNodeHalfWidth} ${laneY} L${stageX[client.stage] + stageNodeHalfWidth} ${laneY}`;
        }
      }
      return {
        client,
        path,
        advancePath,
        laneY,
        isCarryover,
      };
    });
  }, [campaignIndex, carryoverIds, geometryThreadCounts, isHistoricalPeriod, visibleClients]);
  const activeGeometry = activeClientId === null
    ? null
    : geometry.find(({ client }) => client.id === activeClientId) ?? null;
  const attentionGeometries = geometry
    .filter(({ client }) => client.waitingForBusiness && client.waitingMinutes >= 60 && client.stage < 6)
    .sort((left, right) => Number(right.client.isDemo) - Number(left.client.isDemo) || right.client.waitingMinutes - left.client.waitingMinutes)
    .slice(0, 2);
  const attentionClientIds = new Set(attentionGeometries.map(({ client }) => client.id));
  const clientNextStep = (client: ClientThread) => {
    if (client.waitingForBusiness) return `Ответить клиенту — ожидание ${client.waitingMinutes} мин`;
    if (client.stage === 1 && client.painDetected && client.needDetected && client.temperature !== "cold") return "Подготовить персональное КП";
    if (client.stage === 1) return "Завершить квалификацию";
    if (client.stage === 2) return "Согласовать КП";
    if (client.stage === 3) return "Согласовать и подписать договор";
    return `Продвинуть этап «${stages[client.stage].label}»`;
  };

  return (
    <section className={`${styles.sankeyPanel} ${isExpanded ? styles.sankeyPanelExpanded : ""}`} aria-label="Поток клиентов сети">
      <header className={styles.sankeyHeader}>
        <div className={styles.sankeyTitleBlock}>
          <span className={styles.sankeyEyebrow}><Building2 /> Сеть из 4 точек · {periodLabel.toLowerCase()}</span>
          <h2>Поток сети</h2>
          <p>{isHistoricalPeriod
            ? "Исторический срез: все клиенты показаны цельными нитями и входят в выбранный период."
            : "Последний час: цельная нить — новый клиент, пунктирная — уже был в работе."}</p>
          {hasDataFocus && (
            <button
              className={styles.sankeyFilterChip}
              style={{ "--channel": selectedProduct === null ? "#8fa7ef" : productMeta[selectedProduct].color } as CSSProperties}
              onClick={() => {
                setSelectedCampaignId(null);
                setSelectedProduct(null);
                if (selectedSource !== null) onSelectSource(selectedSource);
              }}
            >
              {selectedCampaign !== null
                ? `Данные по креативу: ${selectedCampaign.title}`
                : `Данные по выбору: ${selectedSource === null ? "все каналы" : sourceMeta[selectedSource].label}${selectedProduct === null ? "" : ` → ${productMeta[selectedProduct].label}`}`} <X />
            </button>
          )}
        </div>
        <div className={styles.sankeyResult}><small>{hasDataFocus ? "Итого по выбору" : "Итого на карте"}</small><strong>{money}</strong><span>{stageCounts[6]} оплат · конверсия {conversion}%</span></div>
      </header>

      <div className={styles.sankeyBranchSwitcher} role="group" aria-label="Точка продаж">
        <button className={selectedBranch === null ? styles.sankeyBranchSelected : ""} onClick={() => { onSelectBranch(null); setSelectedCampaignId(null); }} aria-pressed={selectedBranch === null}>
          <span><Building2 /></span>
          <div><strong>Вся сеть</strong><small>4 точки</small></div>
          <em>{networkProductClients.length}<small>{networkWaitingCount} просроч.</small></em>
        </button>
        {branchStats.map((branch) => (
          <button key={branch.id} className={selectedBranch === branch.id ? styles.sankeyBranchSelected : ""} onClick={() => { onSelectBranch(branch.id); setSelectedCampaignId(null); }} aria-pressed={selectedBranch === branch.id}>
            <span><MapPin /></span>
            <div><strong>{branch.label}</strong><small>{branch.address}</small></div>
            <em>{branch.clients}<small>{branch.waiting} просроч.</small></em>
          </button>
        ))}
      </div>

      <section className={styles.sankeyProductSwitcher} aria-label="Продукт">
        <div className={styles.sankeyProductTitle}><Boxes /><span><strong>Что продаётся</strong><small>Нажмите на продукт, чтобы подсветить его нити</small></span></div>
        <button className={selectedProduct === null ? styles.sankeyProductSelected : ""} onClick={() => {
          setSelectedProduct(null);
          setSelectedCampaignId(null);
          if (selectedSource !== null) onSelectSource(selectedSource);
        }} aria-pressed={selectedProduct === null}>
          <span><strong>Все продукты</strong><small>{branchClients.length} процессов</small></span>
        </button>
        {productStats.map((product) => {
          const maximum = Math.max(...productStats.map((item) => item.newClients), 1);
          return (
            <button
              key={product.id}
              className={selectedProduct === product.id ? styles.sankeyProductSelected : ""}
              style={{ "--product": product.color } as CSSProperties}
              onClick={() => {
                setSelectedProduct((current) => current === product.id ? null : product.id);
                setSelectedCampaignId(null);
                if (selectedSource !== null) onSelectSource(selectedSource);
              }}
              aria-pressed={selectedProduct === product.id}
            >
              <span><strong>{product.label}</strong><small>{product.short}</small></span>
              <em><b>{product.newClients}</b> новых</em>
              <i><span style={{ width: `${Math.round((product.newClients / maximum) * 100)}%` }} /></i>
              <small>{product.activeClients} в работе · {product.paidClients} оплат · {formatCompactMoney(product.revenue)} ₸</small>
            </button>
          );
        })}
      </section>

      <div className={styles.sankeySummary}>
        <span><small>Новых за выбранный период</small><strong>{scopedNewClients.length}</strong> клиентов</span>
        <span><small>Всего клиентов в воронке</small><strong>{metricClients.length}</strong> клиентов</span>
        <span><small>Активных сделок</small><strong>{metricClients.length - stageCounts[6]}</strong> клиентов</span>
        <div className={styles.sankeyAttentionAnchor}>
          <button
            type="button"
            className={styles.sankeyAttention}
            onClick={() => setAttentionPanelOpen((open) => !open)}
            aria-expanded={attentionPanelOpen}
            aria-controls="delayed-client-threads"
          >
            <small>Просрочено компанией</small><strong>{delayedCount}</strong><span>обещаний</span><i aria-hidden="true">{attentionPanelOpen ? "−" : "+"}</i>
          </button>
          {attentionPanelOpen && (
            <aside id="delayed-client-threads" className={styles.sankeyClientPicker} aria-label="Клиенты, которые ждут ответа компании">
              <header>
                <span><i /> Светящиеся нити</span>
                <b>{attentionGeometries.length}</b>
                <button type="button" onClick={() => setAttentionPanelOpen(false)} aria-label="Закрыть список светящихся нитей"><X /></button>
              </header>
              <p>Выберите клиента — его нить закрепится на карте.</p>
              {attentionGeometries.length === 0 ? (
                <div className={styles.sankeyClientPickerEmpty}>Нет обещаний, просроченных больше часа.</div>
              ) : (
                <div>
                  {attentionGeometries.map(({ client }) => (
                    <button
                      key={`attention-${client.id}`}
                      type="button"
                      className={selectedClientId === client.id ? styles.sankeyClientPickerSelected : ""}
                      style={{ "--channel": productMeta[client.product].color } as CSSProperties}
                      aria-pressed={selectedClientId === client.id}
                      onMouseEnter={() => setHoveredClientId(client.id)}
                      onMouseLeave={() => setHoveredClientId(null)}
                      onFocus={() => setHoveredClientId(client.id)}
                      onBlur={() => setHoveredClientId(null)}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setAttentionPanelOpen(false);
                      }}
                    >
                      <i />
                      <span><strong>{client.name}</strong><small>{client.id} · {stages[client.stage].label} · {client.manager}</small></span>
                      <b>{client.waitingMinutes} мин</b>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`${styles.sankeyViewport} ${isPanning ? styles.sankeyPanning : ""}`}
        role="region"
        aria-label="Интерактивная карта потока клиентов. Перетаскивайте для перемещения, используйте кнопки для масштаба."
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onWheel={handleWheel}
        onKeyDown={handleCanvasKeyDown}
      >
        <div className={styles.sankeyCanvasTimeDock} aria-label="Быстрый выбор периода карты">
          <span><TimerReset /><small>Период</small></span>
          {periodOptions.map((option, index) => (
            <button
              key={`canvas-${option.label}`}
              className={index === periodIndex && customMinutes === null ? styles.sankeyCanvasTimeSelected : ""}
              onClick={() => { setPeriodIndex(index); setCustomMinutes(null); setCanvasCustomPeriodOpen(false); }}
              aria-pressed={index === periodIndex && customMinutes === null}
            >{option.label}</button>
          ))}
          <button
            className={customMinutes !== null ? styles.sankeyCanvasTimeSelected : ""}
            onClick={() => setCanvasCustomPeriodOpen((open) => !open)}
            aria-expanded={canvasCustomPeriodOpen}
          ><CalendarRange /> {customMinutes === null ? "Даты" : periodLabel}</button>
        </div>
        {canvasCustomPeriodOpen && (
          <div className={styles.sankeyCanvasCustomPeriodPanel}>
            <header><CalendarRange /><div><strong>Свой период</strong><small>Дата и время прямо на карте</small></div><button onClick={() => setCanvasCustomPeriodOpen(false)} aria-label="Закрыть"><X /></button></header>
            <label>От<input type="datetime-local" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
            <label>До<input type="datetime-local" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
            <button className={styles.sankeyApplyPeriod} onClick={applyCustomPeriod} disabled={!customFrom || !customTo}>Показать на карте</button>
          </div>
        )}
        <div className={styles.sankeyCanvasToolbar} aria-label="Масштаб карты">
          <button onClick={() => zoomAroundCenter(0.88)} aria-label="Уменьшить карту"><Minus /></button>
          <button className={styles.sankeyZoomLevel} onClick={() => setCanvasView(defaultCanvasView)} aria-label="Сбросить масштаб и положение">{Math.round(canvasView.zoom * 100)}%</button>
          <button onClick={() => zoomAroundCenter(1.12)} aria-label="Увеличить карту"><Plus /></button>
          <button onClick={() => setCanvasView(defaultCanvasView)} aria-label="Показать карту целиком"><Scan /></button>
          <button onClick={toggleExpanded} aria-label={isExpanded ? "Свернуть карту" : "Развернуть карту на весь экран"} aria-pressed={isExpanded}>{isExpanded ? <Minimize2 /> : <Maximize2 />}</button>
        </div>
        <div className={styles.sankeyCanvasHint}><Move /> Перетаскивайте карту · Ctrl + колесо — масштаб</div>
        <div
          className={`${styles.sankeyCanvas} ${styles.sankeyWorld} ${paused ? styles.flowPaused : ""}`}
          style={{ transform: `translate3d(${canvasView.x}px, ${canvasView.y}px, 0) scale(${canvasView.zoom})` }}
        >
          <span className={styles.sankeySourcesTitle}>{selectedBranchMeta === null ? "Креативы и каналы · цвет = продукт" : `Реклама · ${selectedBranchMeta.label} · цвет = продукт`}</span>
          <div className={styles.sankeyPhaseLabels} aria-hidden="true">
            <span className={styles.sankeyDemandPhase}><b>01</b> Спрос<small>Заявка · Диалог · КП</small></span>
            <span className={styles.sankeyCommitmentPhase}><b>02</b> Обязательство<small>Договор · Исполнение · Приёмка</small></span>
            <span className={styles.sankeyMoneyPhase}><b>03</b> Деньги<small>Ожидается · Получено</small></span>
          </div>

          {stages.slice(1).map((stage, index) => {
            const targetStage = index + 1;
            const midpoint = (stageX[index] + stageX[targetStage]) / 2;
            const transition = transitionStats[index];
            const slaMinutes = transitionSlaMinutes[index];
            const isTransitionSlow = transition.minutes > slaMinutes;
            return (
              <span
                key={`segment-${stage.label}`}
                className={styles.sankeySegmentCount}
                style={{ left: `${(midpoint / worldWidth) * 100}%` }}
                data-state={transition.isLongest ? "critical" : isTransitionSlow ? "slow" : "normal"}
                aria-label={`${stages[index].label} → ${stage.label}: среднее время ${formatTransitionTime(transition.minutes)}, ${transition.passed} прошли, ${transition.remaining} остались`}
              >
                <span className={styles.sankeyTransitionHeader}>
                  <small>{stages[index].label} → {stage.label}</small>
                  <b>{transition.isLongest ? "Максимальный лаг" : `№ ${transition.rank} по времени`}</b>
                </span>
                <span className={styles.sankeyTransitionTime}>
                  <strong>{formatTransitionTime(transition.minutes)}</strong>
                  <small>{transition.comparison}% от максимума</small>
                </span>
                <i className={styles.sankeyTransitionCompare}><span style={{ width: `${transition.comparison}%` }} /></i>
                <span className={styles.sankeyTransitionFlow}>
                  <span><b>{transition.passed}</b><small>прошли</small></span>
                  <i><span style={{ width: `${transition.passedShare}%` }} /></i>
                  <span><b>{transition.remaining}</b><small>остались</small></span>
                </span>
              </span>
            );
          })}

          {displayedCampaigns.map((campaign, index) => {
            const meta = sourceMeta[campaign.source];
            const product = productMeta[campaign.product];
            const Icon = meta.icon;
            const newCount = campaignCounts[campaign.id] ?? 0;
            const carryoverCount = campaignCarryoverCounts[campaign.id] ?? 0;
            const threadCount = campaignThreadCounts[campaign.id] ?? 0;
            const paidCount = periodNewClients.filter((client) => (
              client.source === campaign.source && client.product === campaign.product && client.stage === 6
            )).length;
            const isSelected = selectedCampaignId === campaign.id;
            const isDimmed = selectedCampaignId !== null
              ? !isSelected
              : selectedProduct !== null
                ? selectedProduct !== campaign.product
                : selectedSource !== null && selectedSource !== campaign.source;
            const content = <>
              <span className={styles.sankeyCreativePreview}>
                <Icon />
                <i>{campaign.offer}</i>
              </span>
              <span className={styles.sankeySourceCopy}>
                <small>{meta.format}</small>
                <b>{campaign.title}</b>
                <em>{product.label} · {meta.label}</em>
              </span>
              <span className={styles.sankeySourceCount}>
                <strong>{threadCount}</strong>
                <small>{pluralRu(threadCount, "клиент в потоке", "клиента в потоке", "клиентов в потоке")}</small>
              </span>
              <span className={styles.sankeySourceMetrics}>
                <em><b>{Math.round((newCount / periodHours) * 10) / 10}</b><small>клиента/ч</small></em>
                <em><b>{carryoverCount}</b><small>уже в работе</small></em>
                <em><b>{percent(paidCount, newCount)}%</b><small>в оплату</small></em>
              </span>
            </>;
            const shared = { top: `${(campaignSourceY(index) / worldHeight) * 100}%`, "--channel": product.color } as CSSProperties;
            return (
              <button
                key={campaign.id}
                className={`${styles.sankeySourceNode} ${isSelected ? styles.sankeySourceSelected : ""} ${isDimmed ? styles.sankeySourceDimmed : ""}`}
                style={shared}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCampaignId(null);
                    setSelectedProduct(null);
                    if (selectedSource === campaign.source) onSelectSource(campaign.source);
                    return;
                  }
                  setSelectedCampaignId(campaign.id);
                  setSelectedProduct(campaign.product);
                  if (selectedSource !== campaign.source) onSelectSource(campaign.source);
                }}
                aria-pressed={isSelected}
                aria-label={`${product.label}, ${meta.label}, креатив «${campaign.title}»: ${threadCount} ${pluralRu(threadCount, "клиент в потоке", "клиента в потоке", "клиентов в потоке")}; из них ${newCount} ${pluralRu(newCount, "новый", "новых", "новых")}; ${carryoverCount} уже в работе`}
              >{content}</button>
            );
          })}

          <svg viewBox={`0 0 ${worldWidth} ${worldHeight}`} preserveAspectRatio="none" role="group" aria-label="Клиентские нити. Наведите на нить, чтобы увидеть клиента и менеджера.">
            {geometry.map(({ client, path, isCarryover }) => {
              const isMuted = isClientMuted(client);
              const isFocused = hasThreadFocus && !isMuted;
              const isActive = activeClientId === client.id;
              return (
                <path
                  key={client.id}
                  className={`${styles.sankeyClientThread} ${isCarryover ? styles.sankeyCarryoverThread : ""} ${isFocused ? styles.sankeyThreadFocused : ""} ${isActive ? styles.sankeyThreadActive : ""} ${isMuted ? styles.sankeyThreadMuted : ""}`}
                  d={path}
                  pathLength="1"
                  style={{ "--channel": productMeta[client.product].color } as CSSProperties}
                />
              );
            })}
            {geometry.map(({ client, path }) => {
              if (!attentionClientIds.has(client.id)) return null;
              return (
                <path
                  key={`waiting-${client.id}-${client.stage}`}
                  className={`${styles.sankeyThreadWaiting} ${activeClientId === client.id ? styles.sankeyThreadWaitingActive : ""}`}
                  d={path}
                  pathLength="1"
                  style={{ "--channel": productMeta[client.product].color } as CSSProperties}
                />
              );
            })}
            {geometry.map(({ client, advancePath }) => {
              if (!advancePath || !metricClientIds.has(client.id)) return null;
              return (
                <path
                  key={`advance-${client.id}-${client.changedAt}`}
                  className={`${styles.sankeyThreadAdvance} ${client.previousStage !== null && client.stage < client.previousStage ? styles.sankeyThreadAdvanceBack : ""}`}
                  d={advancePath}
                  pathLength="1"
                  style={{ "--channel": productMeta[client.product].color } as CSSProperties}
                />
              );
            })}
            {geometry.map(({ client, advancePath }) => {
              if (!advancePath || !metricClientIds.has(client.id)) return null;
              const isNewArrival = client.previousStage === null;
              const travelDuration = isNewArrival ? "1.45s" : "1.2s";
              return (
                <g
                  key={`travel-tip-${client.id}-${client.changedAt}`}
                  className={`${styles.sankeyTravelMarker} ${isNewArrival ? styles.sankeyNewClientMarker : styles.sankeyStageTravelMarker}`}
                  style={{ "--channel": productMeta[client.product].color } as CSSProperties}
                  aria-hidden="true"
                >
                  <circle className={styles.sankeyTravelHalo} r="15" />
                  <circle className={styles.sankeyTravelRim} r="7.5" />
                  <circle className={styles.sankeyTravelCore} r="3.5" />
                  <animateMotion
                    path={advancePath}
                    dur={travelDuration}
                    begin="0s"
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.22 1 0.36 1"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.08;0.84;1"
                    dur={travelDuration}
                    begin="0s"
                    fill="freeze"
                  />
                </g>
              );
            })}
            {geometry.map(({ client, path }) => (
              <a
                key={`client-hit-${client.id}`}
                href={`${crmBasePath}/${encodeURIComponent(client.id)}?product=${client.product}&stage=${client.stage}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`${client.name}, менеджер ${client.manager}, этап ${stages[client.stage].label}. Открыть карточку клиента.`}
                aria-current={selectedClientId === client.id ? "true" : undefined}
                onMouseEnter={() => setHoveredClientId(client.id)}
                onMouseLeave={() => setHoveredClientId(null)}
                onFocus={() => setHoveredClientId(client.id)}
                onBlur={() => setHoveredClientId(null)}
                onClick={(event) => {
                  if (onOpenClient) {
                    event.preventDefault();
                    if (selectedClientId === client.id) onOpenClient(client);
                    else setSelectedClientId(client.id);
                    return;
                  }
                  if (selectedClientId !== client.id) {
                    event.preventDefault();
                    setSelectedClientId(client.id);
                  }
                }}
              >
                <path className={styles.sankeyThreadHitArea} d={path} />
              </a>
            ))}
          </svg>

          {geometry.map(({ client, advancePath, laneY }) => {
            if (!advancePath || client.previousStage === null || !metricClientIds.has(client.id)) return null;
            const isBackward = client.stage < client.previousStage;
            const midpointX = (stageX[client.previousStage] + stageX[client.stage]) / 2;
            return (
              <span
                key={`transition-label-${client.id}-${client.changedAt}`}
                className={`${styles.sankeyTransitionBadge} ${isBackward ? styles.sankeyTransitionBadgeBack : ""}`}
                style={{
                  left: `${(midpointX / worldWidth) * 100}%`,
                  top: `${(laneY / worldHeight) * 100}%`,
                  "--channel": productMeta[client.product].color,
                } as CSSProperties}
                aria-hidden="true"
              >
                <b>{isBackward ? "Возврат" : "Переход"}</b>
                <small>{stages[client.previousStage].label} → {stages[client.stage].label}</small>
              </span>
            );
          })}

          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.label}
                className={`${styles.sankeyStageNode} ${index <= 2 ? styles.sankeyDemandNode : ""} ${index >= 3 && index <= 5 ? styles.sankeyCommitmentNode : ""} ${selectedStage === index ? styles.sankeyStageSelected : ""} ${index === 6 ? styles.sankeyOutcomeNode : ""}`}
                style={{ left: `${(stageX[index] / worldWidth) * 100}%` }}
                onClick={() => onOpenStage ? onOpenStage(index) : onSelectStage(index)}
                aria-pressed={selectedStage === index}
                aria-label={`${stage.label}: сейчас ${currentByStage[index]}, дошли ${stageCounts[index]}, просрочено компанией ${waitingByStage[index]}`}
              >
                <span className={styles.sankeyStageHead}><i><Icon /></i><small>{stage.label}</small></span>
                <strong>{currentByStage[index]}</strong>
                <div className={styles.sankeyStageMetrics}>
                  {stageMetrics[index].map((metric) => {
                    const numericValue = Number(metric.value) || 0;
                    return (
                      <span key={metric.label} data-kind={metric.kind} className={metric.alert ? styles.sankeyStageMetricAlert : ""}>
                        <small>{metric.label}</small>
                        <b>{metric.value}</b>
                        <em>{metric.unit}</em>
                        <div className={styles.sankeyMetricVisual} aria-hidden="true">
                          {metric.kind === "backlog" && (
                            <span className={styles.sankeyQueueWidget}>
                              <span className={`${styles.sankeyQueueStack} ${numericValue === 0 ? styles.sankeyQueueStackClear : ""}`}>
                                {numericValue === 0 ? (
                                  <i className={styles.sankeyQueueComplete}><span /></i>
                                ) : (
                                  Array.from({ length: Math.min(3, numericValue) }, (_, task) => (
                                    <i key={task} style={{ "--queue-offset": task } as CSSProperties}><span /></i>
                                  ))
                                )}
                              </span>
                              <strong>{numericValue === 0 ? "Очередь закрыта" : `${numericValue} в очереди`}</strong>
                            </span>
                          )}
                          {metric.kind === "duration" && (
                            <span className={styles.sankeySlaWidget}>
                              <i><span style={{ width: `${metric.progress}%` }} /><b /></i>
                              <small>0</small><small>SLA</small>
                            </span>
                          )}
                          {metric.kind === "throughput" && (
                            <span className={styles.sankeyThroughputSpark}>
                              {[0.42, 0.62, 0.48, 0.78, 0.58, 0.88, 1].map((factor, bar) => <i key={bar} style={{ height: `${Math.max(16, Math.round(metric.progress * factor))}%` }} />)}
                              <b>↗</b>
                            </span>
                          )}
                          {metric.kind === "conversion" && (
                            <i className={styles.sankeyConversionRing} style={{ "--metric-progress": `${metric.progress}%` } as CSSProperties}>
                              <span><b>{metric.value}</b><small>%</small></span>
                            </i>
                          )}
                          {metric.kind === "progress" && (
                            <span className={styles.sankeyQualificationWidget}>
                              <i><span style={{ width: `${metric.progress}%` }} /></i>
                              <strong>{metric.progress}%</strong>
                            </span>
                          )}
                          {metric.kind === "temperature" && (
                            <span className={styles.sankeyTemperatureWidget}>
                              <i>
                                {(metric.segments ?? []).map((segment) => (
                                  <span
                                    key={segment.label}
                                    style={{
                                      width: `${percent(segment.value, dialogClients.length)}%`,
                                      background: segment.color,
                                    }}
                                  />
                                ))}
                              </i>
                              <em>
                                {(metric.segments ?? []).map((segment) => <span key={segment.label}><i style={{ background: segment.color }} />{segment.label} <b>{segment.value}</b></span>)}
                              </em>
                            </span>
                          )}
                          {metric.kind === "money" && (
                            <span className={styles.sankeyMoneyWidget}>
                              <i><span style={{ width: `${metric.progress}%` }} /><b /></i>
                              <small>0</small><small>план</small>
                            </span>
                          )}
                          <small>{metric.target}</small>
                        </div>
                      </span>
                    );
                  })}
                </div>
                <footer>
                  <span>{stageCounts[index]} клиентов дошли</span>
                  {waitingByStage[index] > 0 && <b>{waitingByStage[index]} просрочено</b>}
                </footer>
              </button>
            );
          })}
        </div>
        {activeGeometry !== null && (
          <aside className={`${styles.sankeyClientInspector} ${selectedClientId !== null ? styles.sankeyClientInspectorPinned : ""}`} aria-live="polite">
            <header>
              <span className={styles.sankeyClientAvatar}><UserRound /></span>
              <div><small>{activeGeometry.client.id} · {stages[activeGeometry.client.stage].label}</small><strong>{activeGeometry.client.name}</strong><span>{activeGeometry.client.phoneMasked}</span></div>
              <button onClick={() => {
                setSelectedClientId(null);
                setHoveredClientId(null);
              }} aria-label="Закрыть карточку клиента"><X /></button>
            </header>
            <div className={styles.sankeyClientSelectionState}>
              {selectedClientId === activeGeometry.client.id ? "Нить закреплена" : "Предпросмотр — нажмите на нить, чтобы закрепить"}
            </div>
            {activeGeometry.client.waitingForBusiness && (
              <div className={styles.sankeyClientWaiting}><i /> Клиент ждёт компанию уже {activeGeometry.client.waitingMinutes} мин</div>
            )}
            <dl>
              <div><dt>Менеджер</dt><dd>{activeGeometry.client.manager}</dd></div>
              <div><dt>Температура</dt><dd data-temperature={activeGeometry.client.temperature}>{temperatureLabel[activeGeometry.client.temperature]}</dd></div>
              <div><dt>Запрос клиента</dt><dd>{activeGeometry.client.needSummary || activeGeometry.client.painSummary}</dd></div>
              <div><dt>Следующий шаг</dt><dd>{clientNextStep(activeGeometry.client)}</dd></div>
            </dl>
            <div className={styles.sankeyClientActions}>
              {onOpenConversation && (
                <button
                  type="button"
                  className={styles.sankeyOpenConversation}
                  onClick={() => onOpenConversation(activeGeometry.client)}
                >
                  <MessageCircle /> Открыть переписку <span>→</span>
                </button>
              )}
              {onOpenClient ? (
                <button
                  type="button"
                  className={styles.sankeyOpenClient}
                  onClick={() => onOpenClient(activeGeometry.client)}
                >
                  Карточка клиента в CRM <span>→</span>
                </button>
              ) : (
                <a
                  className={styles.sankeyOpenClient}
                  href={`${crmBasePath}/${encodeURIComponent(activeGeometry.client.id)}?product=${activeGeometry.client.product}&stage=${activeGeometry.client.stage}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Карточка клиента в CRM <span>↗</span>
                </a>
              )}
            </div>
            <small className={styles.sankeyClientPrivacy}>Владелец может открыть карточку клиента или сразу перейти в полный диалог WhatsApp.</small>
          </aside>
        )}
      </div>

      <footer className={styles.sankeyLegend}>
        <div>{productCatalog.map((product) => <span key={product.id}><i style={{ background: product.color }} />{product.label}</span>)}</div>
        <div className={styles.sankeyStateLegend}>
          <span><i className={styles.sankeyNormalKey} />Обычный процесс</span>
          {!isHistoricalPeriod && <span><i className={styles.sankeyCarryoverKey} />Был в работе до последнего часа</span>}
          <span><i className={styles.sankeyWaitingKey} />Обещание компании просрочено &gt; 1 ч</span>
          <span><i className={styles.sankeyAdvanceKey} />Переход вперёд</span>
          <span><i className={styles.sankeyReturnKey} />Возврат на доработку</span>
        </div>
        <small>Пульсируют только 2 самых срочных клиента</small>
      </footer>
    </section>
  );
}
