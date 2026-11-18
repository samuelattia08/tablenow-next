import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const client = await t.action(api.auth.clientSignup, {
    email: "guest@example.test", password: "test-passphrase", firstName: "Test", lastName: "Guest",
  });
  const other = await t.action(api.auth.clientSignup, {
    email: "other@example.test", password: "test-passphrase", firstName: "Other", lastName: "Guest",
  });
  const partnerId = await t.run((ctx) => ctx.db.insert("partners", {
    email: "venue@example.test", passwordHash: "unused", clubName: "Fixture",
  }));
  return { t, client, other, partnerId };
}

describe("server-side access and inventory", () => {
  it("protects reservation history and revokes a logged-out client", async () => {
    const { t, client, other } = await setup();
    expect(await t.query(api.reservations.listByClient, client)).toEqual([]);
    await expect(t.query(api.reservations.listByClient, { ...client, token: other.token })).rejects.toThrow();
    await t.mutation(api.sessions.logout, { token: client.token });
    expect(await t.query(api.sessions.current, { token: client.token })).toBeNull();
    await expect(t.query(api.reservations.listByClient, client)).rejects.toThrow();
  });

  it("allows only one competing payment to hold a table and settles idempotently", async () => {
    const { t, client, other, partnerId } = await setup();
    const table = { partnerId, tableId: "1", zone: "vip", date: "2027-12-31", partySize: 2, priceEur: 100 };
    const requests = [
      { ...table, clientId: client.clientId, stripePaymentIntentId: "fixture-payment-one" },
      { ...table, clientId: other.clientId, stripePaymentIntentId: "fixture-payment-two" },
    ];
    const holds = await Promise.all(requests.map((request) => t.mutation(internal.reservations.holdForCapture, request)));
    const winner = holds.findIndex((hold) => hold !== null);
    expect(holds.filter(Boolean)).toHaveLength(1);
    expect(holds[winner]?.status).toBe("pending");
    const paymentIntentId = requests[winner].stripePaymentIntentId;
    for (let retry = 0; retry < 2; retry++) {
      await expect(t.mutation(internal.reservations.settleCapture, { paymentIntentId, status: "confirmed" }))
        .resolves.toBe(holds[winner]?.reservationId);
    }
    const bookedBy = winner === 0 ? client : other;
    expect(await t.query(api.reservations.listByClient, bookedBy)).toMatchObject([{ status: "confirmed" }]);
  });
});

it("matches published venues and events by destination, music, and travel dates", async () => {
  const { t, client, partnerId } = await setup();
  const token = "b".repeat(64);
  const { createHash } = await import("node:crypto");
  await t.run((ctx) => ctx.db.insert("accountSessions", {
    owner: { role: "partners", id: partnerId },
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: Date.now() + 60_000,
  }));
  const profile = {
    country: "Hungary", city: "Budapest", music: ["House"], description: "Test venue",
    address: "", openingHours: "", dressCode: "", contact: "", website: "",
    instagram: "", tiktok: "", facebook: "", whatsapp: "", logo: "", video: "", published: true,
  };
  await expect(t.mutation(api.venues.save, { token: client.token, profile })).rejects.toThrow();
  await t.mutation(api.venues.save, { token, profile });
  await t.mutation(api.venueEvents.save, {
    token, name: "Fixture party", date: "2027-12-31", startTime: "23:00", description: "", published: true,
  });
  const filters = {
    country: "Hungary", city: "Budapest", music: "House", from: "2027-12-30", to: "2028-01-02",
    guests: 2, eventsOnly: true, availableOnly: false,
  };
  expect(await t.query(api.venues.search, filters)).toMatchObject([{ partnerId, event: { name: "Fixture party" } }]);
  expect(await t.query(api.venues.search, { ...filters, from: "2028-01-01" })).toEqual([]);
  await t.mutation(api.availability.setClosed, { token, date: "2027-12-31", closed: true });
  const booking = { partnerId, clientId: client.clientId, partySize: 2, date: "2027-12-31",
    tableId: "1", zone: "vip", priceEur: 100, stripePaymentIntentId: "fixture-payment-closed" };
  await expect(t.mutation(internal.reservations.holdForCapture, booking)).resolves.toBeNull();
  await t.mutation(api.availability.setClosed, { token, date: "2027-12-31", closed: false });
  await expect(t.mutation(internal.reservations.holdForCapture, booking)).resolves.toMatchObject({ status: "pending" });
  await t.mutation(api.venues.save, { token, profile: { ...profile, published: false } });
  expect(await t.query(api.venues.detail, { venueId: partnerId })).toBeNull();
  expect(await t.query(api.venues.search, filters)).toEqual([]);
});
