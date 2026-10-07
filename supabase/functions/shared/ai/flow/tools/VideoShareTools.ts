import type { AIContext } from "../../types.ts";
import type { ITool, ToolResult } from "../../tools/types.ts";
import { localToUtcIso, normalizePlatform, MIN_LEAD_MS, MAX_LEAD_MS, getConnectedPlatforms, getConnectedAccounts } from "./PublishTools.ts";
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

    const rulesMap = new Map<string, FormatRule>();
    const { data: rulesData } = await this.admin.from("social_format_rules").select("*").eq("is_active", true);
    if (rulesData) {
      for (const r of rulesData) rulesMap.set(`${r.platform}-${r.format}`, r);
    }

    if (!Array.isArray(args.platforms) || args.platforms.length === 0) {
      const accounts = await getConnectedAccounts(this.admin, context.organizationId);
      const options = accounts.map((a) => {
        const format = pickFormat(a.platform, facts);
        const rule = rulesMap.get(`${a.platform}-${format}`);
        if (!rule) return { platform: a.platform, handle: a.handle, eligible: false, reason: "Bu platform için biçim kuralı tanımlı değil" };
        const check = checkEligibility(rule, facts);
        return check.ok
          ? { platform: a.platform, handle: a.handle, eligible: true }
          : { platform: a.platform, handle: a.handle, eligible: false, reason: check.reason };
      });
      if (!options.some((o) => o.eligible)) return { status: "NOTHING_ELIGIBLE", data: { skipped: options.filter((o) => !o.eligible).map((o) => ({ platform: o.platform, reason: o.reason })) } };
      return {
        status: "PLATFORMS_REQUIRED",
        data: { options, clientAction: { type: "pick_platforms", options } },
        message: "Panelde hesap seçenekleri gösterildi. Kullanıcıya kısaca 'Aşağıdan paylaşmak istediğin hesapları seç' de ve gönderi metnini henüz vermediyse metni de iste. 'Hazırladım' DEME. Seçim 'Seçilen hesaplar: ...' mesajıyla gelince prepare_video_share'i platforms (ve metin varsa caption) ile çağır."
      };
    }

    let targetPlatforms = args.platforms.map(p => normalizePlatform(p as string));

    const skipped: Array<{ platform: string; reason: string }> = [];
    const validPlatforms: string[] = [];

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

    const captionText = typeof args.caption === "string" ? args.caption.trim() : "";
    if (!captionText) {
      return {
        status: "CAPTION_REQUIRED",
        data: { platforms: validPlatforms, skipped },
        message: "Gönderi metni yok. Videolarda metni AI üretmez. Kullanıcıya bu video için gönderi metnini ne yazmak istediğini SOR (metni UYDURMA). Kullanıcı yazınca prepare_video_share'i caption argümanıyla tekrar çağır."
      };
    }

    for (let i = validPlatforms.length - 1; i >= 0; i--) {
      const p = validPlatforms[i];
      const format = pickFormat(p, facts);
      const rule = rulesMap.get(`${p}-${format}`);
      if (rule && captionText.length > rule.max_caption_chars) {
        skipped.push({ platform: p, reason: "Metin bu platformun sınırını aşıyor" });
        validPlatforms.splice(i, 1);
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
