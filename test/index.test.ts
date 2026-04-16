import { describe, expect, it } from "vitest";

import { endpointCatalogForTests, pairsToObjectForTests, parseDateRangeForTests } from "../src/index";

describe("parseDateRange", () => {
  it("uses explicit dates when provided", () => {
    expect(parseDateRangeForTests({ startDate: "2026-03-01", endDate: "2026-03-31" })).toEqual({
      start_date: "2026-03-01",
      end_date: "2026-03-31"
    });
  });

  it("rejects missing range inputs", () => {
    expect(() => parseDateRangeForTests({})).toThrow("Provide --start-date and --end-date, or use --last <days>");
  });
});

describe("pairsToObject", () => {
  it("coerces query/body pairs into typed values", () => {
    expect(pairsToObjectForTests(["page=2", "active=true", "name=Metorik", "meta={\"ok\":true}"])).toEqual({
      page: 2,
      active: true,
      name: "Metorik",
      meta: { ok: true }
    });
  });
});

describe("endpoint catalog", () => {
  it("includes the direct request discovery list", () => {
    expect(endpointCatalogForTests()["reports:revenue-by-date"].path).toBe("/reports/revenue-by-date");
    expect(endpointCatalogForTests()["engage:profiles:upsert"].method).toBe("POST");
    expect(endpointCatalogForTests().store.path).toBe("/");
    expect(endpointCatalogForTests()["custom-metrics:value"].path).toBe("/custom-metrics/{metric}/value");
  });
});
