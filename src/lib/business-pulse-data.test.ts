import { describe, expect, it } from "vitest";
import { businessPulseJournal } from "@/data/business-pulse-journal";
import { buildBusinessPulseSeedClients, nextActionForClient } from "./business-pulse-data";

describe("business pulse journal", () => {
  it("keeps every supplied activity and merges repeated companies into threads", () => {
    const clients = buildBusinessPulseSeedClients();
    expect(businessPulseJournal).toHaveLength(271);
    expect(clients).toHaveLength(222);
    expect(clients.reduce((sum, client) => sum + client.history.length, 0)).toBe(271);
  });

  it("keeps repeated activity inside the matching company", () => {
    const clients = buildBusinessPulseSeedClients();
    const blackwood = clients.find((client) => client.name.toLocaleLowerCase("ru-RU") === "blackwood");
    expect(blackwood?.history.length).toBeGreaterThan(1);
    expect(nextActionForClient(blackwood!)).toBeTruthy();
  });

  it("does not mark unanswered calls as closed refusals", () => {
    const clients = buildBusinessPulseSeedClients();
    const unanswered = clients.find((client) => client.note.toLocaleLowerCase("ru-RU").includes("не ответил"));
    expect(unanswered?.stage).not.toBe(6);
  });
});
