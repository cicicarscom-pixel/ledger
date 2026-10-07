import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { PrepareVideoShareTool } from "./VideoShareTools.ts";

Deno.test("PrepareVideoShareTool - no attachment", async () => {
  const tool = new PrepareVideoShareTool(null, null);
  const result = await tool.execute({} as any, {});
  assertEquals(result.status, "NO_ATTACHMENT");
});

Deno.test("PrepareVideoShareTool - skips", async () => {
  const mockAdmin = {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [{ platform: "instagram", is_active: true, needs_reconnection: false }], error: null })
        })
      })
    }),
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [
          { platform: "instagram", format: "reel", is_active: true, min_duration_sec: 10, max_duration_sec: 90, max_caption_chars: 100 }
        ], error: null })
      })
    })
  };

  const mockCaptions = {
    generate: () => Promise.resolve({ status: "SUCCESS", text: "Test caption" })
  };

  const tool = new PrepareVideoShareTool(mockAdmin, mockCaptions);
  const context = {
    organizationId: "org-1",
    customerId: "user-1",
    timezone: "Europe/Istanbul",
    attachment: { kind: "video", mimeType: "video/mp4", durationSec: 100, width: 1080, height: 1920, sizeBytes: 1000 }
  };

  const res = await tool.execute(context as any, {});
  assertEquals(res.status, "NOTHING_ELIGIBLE");
  assertEquals((res.data as any).skipped[0].platform, "instagram");
});
