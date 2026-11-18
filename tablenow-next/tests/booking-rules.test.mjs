import assert from "node:assert/strict";
import test from "node:test";
import { validateBookingSelection } from "../convex/bookingRules.ts";

const table = { capacity: 4, priceEur: 180.25 };

test("accepts a valid calendar date and converts the table price to cents", () => {
  assert.equal(validateBookingSelection("2028-02-29", 4, table), 18025);
});

test("rejects normalized or malformed dates", () => {
  for (const date of ["2027-02-29", "2027-02-31", "2027-2-03", ""]) {
    assert.throws(() => validateBookingSelection(date, 2, table), /Date/);
  }
});

test("rejects fractional or out-of-capacity guest counts and invalid prices", () => {
  for (const size of [0, 1.5, 5, NaN]) {
    assert.throws(() => validateBookingSelection("2028-02-29", size, table), /personnes/);
  }
  for (const priceEur of [0, -1, Infinity, NaN]) {
    assert.throws(
      () => validateBookingSelection("2028-02-29", 2, { ...table, priceEur }),
      /Prix/,
    );
  }
});
