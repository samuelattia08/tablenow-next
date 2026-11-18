import assert from "node:assert/strict";
import test from "node:test";
import { clientAuthHref, clientDestination } from "../lib/client-navigation.ts";

test("keeps protected destinations through login and signup", () => {
  for (const route of ["/client/reservations", "/client/book", "/client/chat", "/client/community"]) {
    for (const screen of ["login", "signup"]) {
      const url = new URL(clientAuthHref(screen, route), "https://tablenow.example");
      assert.equal(url.pathname, `/client/${screen}`);
      assert.equal(clientDestination(url.searchParams.get("next")), route);
    }
  }
});

test("defaults to reservations for unsafe or unsupported destinations", () => {
  for (const route of [null, "", "//example.com", "https://example.com", "/partner/dashboard", "/client/login", "/client/book?next=https://example.com"]) {
    assert.equal(clientDestination(route), "/client/reservations");
  }
});
