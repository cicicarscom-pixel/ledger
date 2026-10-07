import type { AIContext } from "../../types.ts";
import type { ITool, ToolResult } from "../../tools/types.ts";
import { localToUtcIso, normalizePlatform, MIN_LEAD_MS, MAX_LEAD_MS, getConnectedPlatforms } from "./PublishTools.ts";
import { pickFormat, checkEligibility, FormatRule } from "./FormatEligibility.ts";

export class PrepareVideoShareTool implements ITool {
  readonly name = "prepare_video_share";
  readonly description = "Kullanıcı videoyla birlikte paylaşım veya yayınlama istediğinde çağrılır. Hiçbir yere yayın yapmaz; istemciyi yönlendirir.";
  readonly riskLevel = "PREPARE" as const;
  readonly schema = {
    type: "object",
    properties: {
      platforms: { type: "array", items: { type: "string" } },
      scheduledLocal: { type: "string" },
      caption: { type: "string" },
      captionHint: { type: "string" }
    }
  };

  constructor(private readonly admin: any, private readonly captions: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (!context.attachment || context.attachment.kind !== "video") {
      return { status: "NO_ATTACHMENT", message: "Önce panelden bir video ekleyin." };
    }

    const att = context.attachment;
    const facts = { durationSec: att.durationSec, aspect: att.width / att.height, sizeBytes: att.sizeBytes };

    const connected = await getConnectedPlatforms(this.admin, context.organizationId);
    if (connected.size === 0) return { status: "NO_ACCOUNTS" };

    let targetPlatforms = Array.isArray(args.platforms)
      ? args.platforms.map(p => normalizePlatform(p))
      : Array.from(connected);

    const skipped: Array<{ platform: string; reason: string }> = [];
    const validPlatforms: string[] = [];
    const rulesMap = new Map<string, FormatRule>();

    if (targetPlatforms.length > 0) {
      const { data: rulesData } = await this.admin.from("social_format_rules").select("*").eq("is_active", true);
      if (rulesData) {
        for (const r of rulesData) rulesMap.set(`${r.platform}-${r.format}`, r);
      }
    }

    for (const p of targetPlatforms) {
      if (!connected.has(p)) {
        skipped.push({ platform: p, reason: "Hesap bağlı değil" });
        continue;
      }
      const format = pickFormat(p, facts);
      const rule = rulesMap.get(`${p}-${format}`);
      if (!rule) {
        skipped.push({ platform: p, reason: "Bu platform için biçim kuralı tanımlı değil" });
        continue;
      }
      const check = checkEligibility(rule, facts);
      if (!check.ok) {
        skipped.push({ platform: p, reason: check.reason });
      } else {
        validPlatforms.push(p);
      }
    }

    if (validPlatforms.length === 0) {
      return { status: "NOTHING_ELIGIBLE", data: { skipped } };
    }

    let captionText = typeof args.caption === "string" ? args.caption : undefined;
    if (!captionText) {
      const r = await this.captions.generate({
        orgId: context.organizationId,
        userId: context.customerId,
        brief: typeof args.captionHint === "string" ? args.captionHint : "",
        platforms: validPlatforms
      });
      if (r.status === "SUCCESS") {
        captionText = r.text;
      }
    }

    if (captionText) {
      for (let i = validPlatforms.length - 1; i >= 0; i--) {
        const p = validPlatforms[i];
        const format = pickFormat(p, facts);
        const rule = rulesMap.get(`${p}-${format}`);
        if (rule && captionText.length > rule.max_caption_chars) {
          skipped.push({ platform: p, reason: "Metin bu platformun sınırını aşıyor" });
          validPlatforms.splice(i, 1);
        }
      }
    }

    if (validPlatforms.length === 0) {
      return { status: "NOTHING_ELIGIBLE", data: { skipped } };
    }

    let scheduledUtc = undefined;
    if (typeof args.scheduledLocal === "string") {
      scheduledUtc = localToUtcIso(args.scheduledLocal, context.timezone);
      if (!scheduledUtc) return { status: "INVALID_TIME" };
      const lead = new Date(scheduledUtc).getTime() - Date.now();
      if (lead < MIN_LEAD_MS) return { status: "TOO_SOON" };
      if (lead > MAX_LEAD_MS) return { status: "TOO_FAR" };
    }

    return {
      status: "SUCCESS",
      data: {
        caption: captionText,
        platforms: validPlatforms,
        skipped,
        scheduledText: null,
        clientAction: {
          type: "share_video",
          caption: captionText,
          platforms: validPlatforms,
          skipped,
          scheduledLocal: typeof args.scheduledLocal === "string" ? args.scheduledLocal : null,
          timezone: context.timezone
        }
      },
      message: "Paylaşım ekranı hazırlandı; kullanıcı panelde onaylayınca paylaşılacak. Henüz YAYINLANMADI."
    };
  }
}
