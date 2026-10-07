import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { pickFormat, checkEligibility, FormatRule } from "./FormatEligibility.ts";

Deno.test("pickFormat - instagram", () => {
  assertEquals(pickFormat("instagram", { durationSec: 10, aspect: 1, sizeBytes: 100 }), "reel");
});

Deno.test("pickFormat - youtube", () => {
  assertEquals(pickFormat("youtube", { durationSec: 100, aspect: 0.5, sizeBytes: 100 }), "short");
  assertEquals(pickFormat("youtube", { durationSec: 200, aspect: 0.5, sizeBytes: 100 }), "video");
  assertEquals(pickFormat("youtube", { durationSec: 100, aspect: 1.5, sizeBytes: 100 }), "video");
  assertEquals(pickFormat("youtube", { durationSec: 30, aspect: 0.5625, sizeBytes: 1 }), "short");
});

Deno.test("pickFormat - facebook", () => {
  assertEquals(pickFormat("facebook", { durationSec: 60, aspect: 0.5, sizeBytes: 100 }), "reel");
  assertEquals(pickFormat("facebook", { durationSec: 100, aspect: 0.5, sizeBytes: 100 }), "video");
  assertEquals(pickFormat("facebook", { durationSec: 60, aspect: 1.5, sizeBytes: 100 }), "video");
});

Deno.test("pickFormat - other", () => {
  assertEquals(pickFormat("tiktok", { durationSec: 10, aspect: 1, sizeBytes: 100 }), "video");
  assertEquals(pickFormat("twitter", { durationSec: 10, aspect: 1, sizeBytes: 100 }), "video");
});

Deno.test("checkEligibility", () => {
  const rule: FormatRule = {
    platform: "instagram",
    format: "reel",
    media_type: "video",
    min_duration_sec: 3,
    max_duration_sec: 90,
    min_aspect: null,
    max_aspect: 0.8,
    max_file_mb: 100,
    max_caption_chars: 2000
  };

  assertEquals(checkEligibility(rule, { durationSec: 30, aspect: 0.5, sizeBytes: 10 * 1024 * 1024 }), { ok: true });
  assertEquals(checkEligibility(rule, { durationSec: 2, aspect: 0.5, sizeBytes: 10 * 1024 * 1024 }), { ok: false, reason: "Video çok kısa (en az 3 sn)." });
  assertEquals(checkEligibility(rule, { durationSec: 100, aspect: 0.5, sizeBytes: 10 * 1024 * 1024 }), { ok: false, reason: "Video 100 sn; bu biçim en fazla 90 sn kabul eder." });
  assertEquals(checkEligibility(rule, { durationSec: 30, aspect: 1.0, sizeBytes: 10 * 1024 * 1024 }), { ok: false, reason: "Yatay çekilmiş; bu biçim dikey (9:16) ister." });
  assertEquals(checkEligibility(rule, { durationSec: 30, aspect: 0.5, sizeBytes: 200 * 1024 * 1024 }), { ok: false, reason: "Dosya 200 MB; bu biçim en fazla 100 MB kabul eder." });
});
