import { convexTest } from "convex-test";
import { expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const provider = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn(), capture: vi.fn(), cancel: vi.fn() }));
vi.mock("stripe", () => ({
  default: class Stripe {
    paymentIntents = provider;
  },
}));

it("recovers a captured payment when the provider response was interrupted", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "local-fixture");
  try {
    const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
    const client = await t.action(api.auth.clientSignup, {
      email: "checkout@example.test", password: "test-passphrase", firstName: "Test", lastName: "Guest",
    });
    const partnerId = await t.run(async (ctx) => {
      const partner = await ctx.db.insert("partners", { email: "venue@example.test", passwordHash: "unused", clubName: "Fixture" });
      await ctx.db.insert("tables", { partnerId: partner, number: 1, zone: "vip", capacity: 4, priceEur: 180, row: 0, col: 0 });
      return partner;
    });
    let payment: Record<string, unknown>;
    provider.create.mockImplementation((params) => {
      payment = { ...params, id: "fixture-payment", client_secret: "fixture-secret", status: "requires_capture" };
      return payment;
    });
    provider.retrieve.mockImplementation(() => payment);
    provider.capture.mockImplementation(() => {
      payment = { ...payment, status: "succeeded", amount_received: 18000 };
      throw new Error("Fixture provider response lost");
    });

    const { paymentIntentId } = await t.action(api.payments.createPaymentIntent, {
      token: client.token, partnerId, date: "2027-12-31", partySize: 2, tableNumber: 1,
    });
    expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({ capture_method: "manual", amount: 18000 }));
    const confirmation = { paymentIntentId, token: client.token };
    await expect(t.action(api.payments.confirmReservationPayment, confirmation)).rejects.toThrow("Fixture provider response lost");
    expect(await t.query(api.reservations.listByClient, client)).toMatchObject([{ status: "pending" }]);
    await t.action(internal.payments.recoverCheckout, { paymentIntentId, attempt: 0 });
    const reservations = await t.query(api.reservations.listByClient, client);
    expect(reservations).toMatchObject([{ status: "confirmed" }]);
    await expect(t.action(api.payments.confirmReservationPayment, confirmation)).resolves.toEqual({ reservationId: reservations[0]._id });
    expect(provider.capture).toHaveBeenCalledTimes(1);
    expect(provider.cancel).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
  }
});
