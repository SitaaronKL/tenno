import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { scheduleHorizons } from "./schedules";

// convex-test wants paths relative to the convex root, this test sits one directory down.
const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../**/*.ts")).map(([path, load]) => [
    path.startsWith("../") ? path.replace("../", "./") : path.replace("./", "./ingest/"),
    load,
  ]),
);

const DAY = 86_400_000;

describe("schedule horizon", () => {
  test("says nothing while both schedules have more than a week to run", async () => {
    const t = convexTest(schema, modules);
    const now = Math.min(...Object.values(scheduleHorizons())) - 8 * DAY;
    expect(await t.mutation(internal.ingest.horizon.check, { now })).toEqual([]);
  });

  test("names the schedule that runs out inside a week", async () => {
    const t = convexTest(schema, modules);
    const horizons = scheduleHorizons();
    const now = Math.min(...Object.values(horizons)) - 6 * DAY;
    const due = await t.mutation(internal.ingest.horizon.check, { now });
    expect(due.length).toBeGreaterThan(0);
    expect(due.map((row) => row.schedule)).toContain("arbitrations");
  });

  test("still warns once a schedule has already run out", async () => {
    const t = convexTest(schema, modules);
    const now = Math.max(...Object.values(scheduleHorizons())) + DAY;
    const due = await t.mutation(internal.ingest.horizon.check, { now });
    expect(due.map((row) => row.schedule).sort()).toEqual(["arbitrations", "incursions"]);
  });
});
