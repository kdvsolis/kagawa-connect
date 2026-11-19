import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEmergencyReply } from "../src/lib/emergency-parse.ts";
import { quoteBookingFee } from "../src/lib/markets.ts";
import { toTelDigits } from "../src/lib/phone.ts";

test("booking fee is 5 percent of the daily minimum", () => {
  const ph = quoteBookingFee("Makati", 14.55, 121.02);
  assert.equal(ph.market.id, "PH");
  assert.equal(ph.amount, 32);

  const es = quoteBookingFee("Alicante", 38.35, -0.48);
  assert.equal(es.market.id, "ES");
  assert.equal(es.amount, 2.27);
});

test("phone links accept 09 and +639", () => {
  assert.equal(toTelDigits("09171234567"), "+639171234567");
  assert.equal(toTelDigits("+639171234567"), "+639171234567");
  assert.equal(toTelDigits("0917"), null);
});

test("emergency reply rejects prose and keeps digits", () => {
  assert.deepEqual(
    parseEmergencyReply(
      '{"country":"Japan","countryCode":"jp","number":"110"}'
    ),
    { number: "110", country: "Japan", countryCode: "JP" }
  );
  assert.equal(parseEmergencyReply("call 911"), null);
  assert.equal(
    parseEmergencyReply('{"country":"X","countryCode":"PH","number":"1"}'),
    null
  );
});
