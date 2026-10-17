import { describe, expect, it } from "vitest";
import { parseChatwootWebhook } from "./chatwoot";
import { extractMetaAdAttribution } from "./meta-ads";

describe("Meta click-to-WhatsApp attribution", () => {
  it("extracts the ad and creative referral from the Chatwoot message", () => {
    const payload = parseChatwootWebhook({
      event: "message_created",
      id: 1,
      message_type: "incoming",
      content: "Хочу узнать цену",
      content_attributes: {
        referral: {
          source_id: "ad-123",
          ctwa_clid: "click-456",
          headline: "Тепло без переплат",
        },
      },
      conversation: { id: 7, custom_attributes: {}, meta: {} },
    })!;

    expect(extractMetaAdAttribution(payload)).toMatchObject({
      adId: "ad-123",
      adName: "Тепло без переплат",
      creativeName: "Тепло без переплат",
    });
  });

  it("does not invent attribution for an organic WhatsApp message", () => {
    const payload = parseChatwootWebhook({
      event: "message_created",
      id: 2,
      message_type: "incoming",
      content: "Здравствуйте",
      conversation: { id: 8, custom_attributes: {}, meta: {} },
    })!;
    expect(extractMetaAdAttribution(payload)).toBeNull();
  });
});
