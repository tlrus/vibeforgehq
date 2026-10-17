import { describe,expect,it } from "vitest";
import { getPublicSelection,preliminaryPrice } from "./selection-service";
import { products } from "./mock-data";

describe("public selection",()=>{
  it("rejects short tokens",async()=>expect((await getPublicSelection("short")).error).toBe("invalid"));
  it("filters demo selection by sash count",async()=>{const result=await getPublicSelection(`demo-${"a".repeat(32)}`);expect(result.data?.products.length).toBeGreaterThan(0);expect(result.data?.products.every(product=>product.sashCount===2)).toBe(true)});
  it("calculates deterministic preliminary price",()=>expect(preliminaryPrice(products[0],1000,1000,2,[])).toEqual({total:110000,approximate:false}));
  it("marks calculation without dimensions as approximate",()=>expect(preliminaryPrice(products[0],null,null,1,[]).approximate).toBe(true));
});
