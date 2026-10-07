export interface FormatRule {
  platform: string;
  format: string;
  media_type: string;
  min_duration_sec: number | null;
  max_duration_sec: number | null;
  min_aspect: number | null;
  max_aspect: number | null;
  max_file_mb: number | null;
  max_caption_chars: number;
}

export interface MediaFacts {
  durationSec: number;
  aspect: number;
  sizeBytes: number;
}

export function pickFormat(platform: string, m: MediaFacts): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'reel';
    case 'youtube':
      return m.durationSec <= 180 && m.aspect <= 1.0 ? 'short' : 'video';
    case 'facebook':
      return m.durationSec <= 90 && m.aspect <= 0.8 ? 'reel' : 'video';
    case 'tiktok':
    case 'linkedin':
    case 'twitter':
    case 'threads':
    case 'bluesky':
      return 'video';
    default:
      return 'video';
  }
}

export function checkEligibility(rule: FormatRule, m: MediaFacts): { ok: true } | { ok: false; reason: string } {
  if (rule.min_duration_sec !== null && m.durationSec < rule.min_duration_sec) {
    return { ok: false, reason: `Video çok kısa (en az ${rule.min_duration_sec} sn).` };
  }
  if (rule.max_duration_sec !== null && m.durationSec > rule.max_duration_sec) {
    return { ok: false, reason: `Video ${Math.round(m.durationSec)} sn; bu biçim en fazla ${rule.max_duration_sec} sn kabul eder.` };
  }
  if (rule.min_aspect !== null && m.aspect < rule.min_aspect) {
    return { ok: false, reason: 'Video oranı uygun değil; bu biçim daha geniş bir oran ister.' };
  }
  if (rule.max_aspect !== null && m.aspect > rule.max_aspect) {
    return { ok: false, reason: 'Yatay çekilmiş; bu biçim dikey (9:16) ister.' };
  }
  if (rule.max_file_mb !== null) {
    const mb = m.sizeBytes / (1024 * 1024);
    if (mb > rule.max_file_mb) {
      return { ok: false, reason: `Dosya ${Math.round(mb)} MB; bu biçim en fazla ${rule.max_file_mb} MB kabul eder.` };
    }
  }
  return { ok: true };
}
