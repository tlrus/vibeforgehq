import { describe, expect, it } from "vitest";
import { calculateIncome, getPaymentTier } from "./manager-data";

describe("manager payment grid", () => {
  it("keeps 3 million sales in the red zone", () => {
    expect(getPaymentTier(3_000_000).id).toBe("red");
  });

  it("moves 5 million sales to the yellow zone", () => {
    expect(getPaymentTier(5_000_000).id).toBe("yellow");
  });

  it("moves 7 million sales to the green zone", () => {
    expect(getPaymentTier(7_000_000).id).toBe("green");
  });

  it("recalculates salary and commission from the selected scenario", () => {
    expect(calculateIncome(7_000_000)).toMatchObject({ commission: 210_000, total: 470_000 });
  });
});
