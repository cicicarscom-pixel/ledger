import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { formatPhone, isValidSessionName, joinSessions, phoneFromWahaId } from "./wahaAdmin.ts";

const U1 = "1c07a76c-d68f-40e7-83ed-c9f4c59b1886";
const U2 = "a3555b70-b73f-46bc-af47-0daee20c7a13";

Deno.test("telefon: @c.us çözülür, @lid telefon değildir", () => {
  assertEquals(phoneFromWahaId("905515318458@c.us"), "905515318458");
  assertEquals(phoneFromWahaId("54211949686840@lid"), null);
  assertEquals(phoneFromWahaId(undefined), null);
  assertEquals(formatPhone("905515318458"), "+90 551 531 84 58");
  assertEquals(formatPhone("4915112345678"), "+4915112345678");
});

Deno.test("oturum adı yalnız UUID olabilir (yol/komut enjeksiyonu yok)", () => {
  assertEquals(isValidSessionName(U1), true);
  assertEquals(isValidSessionName("../../sessions"), false);
  assertEquals(isValidSessionName(U1 + "/stop"), false);
  assertEquals(isValidSessionName(undefined), false);
});

Deno.test("eşleştirme: işletme/e-posta/durum gelir; sahipsiz oturum işaretlenir; WORKING önce", () => {
  const rows = joinSessions(
    [{ name: U2, status: "STOPPED" }, { name: U1, status: "WORKING", me: { id: "905515318458@c.us", pushName: "workigom" } }],
    [{ id: U1, business_name: "Fahri alem", email: "a@b.c", account_status: "active" }],
    [{ id: "org1", owner_id: U1, name: "Fahri alem" }],
  );
  assertEquals(rows[0].session, U1);
  assertEquals(rows[0].businessName, "Fahri alem");
  assertEquals(rows[0].orgId, "org1");
  assertEquals(rows[0].phoneDisplay, "+90 551 531 84 58");
  assertEquals(rows[0].orphan, false);
  assertEquals(rows[1].orphan, true);
  assertEquals(rows[1].businessName, null);
});
