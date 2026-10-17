import type { ChatwootWebhookPayload } from "./chatwoot";

export type MetaAdAttribution = {
  adAccountId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  creativeId: string | null;
  creativeName: string | null;
  referral: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function valueAsString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return null;
}

export function createMetaAdAttributionFromReferral(
  referral: Record<string, unknown> | null | undefined,
): MetaAdAttribution | null {
  if (!referral) return null;
  const adId = valueAsString(referral, "ad_id", "source_id");
  const clickId = valueAsString(referral, "ctwa_clid");
  if (!adId && !clickId) return null;
  return {
    adAccountId: process.env.META_AD_ACCOUNT_ID ?? null,
    campaignId: valueAsString(referral, "campaign_id"),
    campaignName: valueAsString(referral, "campaign_name"),
    adsetId: valueAsString(referral, "adset_id"),
    adsetName: valueAsString(referral, "adset_name"),
    adId,
    adName: valueAsString(referral, "ad_name", "headline"),
    creativeId: valueAsString(referral, "creative_id"),
    creativeName: valueAsString(referral, "creative_name", "headline"),
    referral,
  };
}

export function extractMetaAdAttribution(
  payload: ChatwootWebhookPayload,
): MetaAdAttribution | null {
  const candidates = [
    payload.content_attributes.referral,
    payload.additional_attributes.referral,
    payload.conversation.additional_attributes.referral,
    payload.conversation.custom_attributes.referral,
  ];
  const referral = candidates.map(asRecord).find(Boolean);
  return createMetaAdAttributionFromReferral(referral);
}

export async function enrichMetaAdAttribution(input: MetaAdAttribution) {
  const token = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION;
  if (!token || !apiVersion || !input.adId) return input;
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${input.adId}`);
  url.searchParams.set(
    "fields",
    "id,name,account_id,campaign{id,name},adset{id,name},creative{id,name}",
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Meta Ads lookup returned ${response.status}`);
  const body = (await response.json()) as {
    id?: string;
    name?: string;
    account_id?: string;
    campaign?: { id?: string; name?: string };
    adset?: { id?: string; name?: string };
    creative?: { id?: string; name?: string };
  };
  return {
    ...input,
    adAccountId: body.account_id ?? input.adAccountId,
    campaignId: body.campaign?.id ?? input.campaignId,
    campaignName: body.campaign?.name ?? input.campaignName,
    adsetId: body.adset?.id ?? input.adsetId,
    adsetName: body.adset?.name ?? input.adsetName,
    adId: body.id ?? input.adId,
    adName: body.name ?? input.adName,
    creativeId: body.creative?.id ?? input.creativeId,
    creativeName: body.creative?.name ?? input.creativeName,
  };
}
