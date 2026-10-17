import { describe, expect, it } from "vitest";
import { leadSchema, productSchema } from "./schemas";
describe("data schemas", () => { it("accepts a valid lead", () => { expect(leadSchema.safeParse({ id: "1", name: "Анна", phone: "+77001234567", status: "new" }).success).toBe(true); }); it("rejects a negative price", () => { expect(productSchema.safeParse({ id: "1", name: "Окно", type: "ПВХ", price: -1, active: true }).success).toBe(false); }); });
