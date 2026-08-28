// ==============================================================================
// PERSONA ENGINE — PHASE 2: PersonaPromptBuilder (text rendering ONLY)
// ==============================================================================
// This is the ONLY class in the Persona Engine allowed to build prompt text.
// It takes the config PersonaService already resolved (see PersonaService.ts)
// and turns it into the BOT PERSONALITY block that the top-level
// PromptBuilder.buildBotPersonality() will splice in (Phase 3 wiring — not
// done yet, see the plan's Phase 3 section). It never touches the database
// and never applies business rules about *which* persona/settings are valid
// — that already happened in PersonaService.
// ==============================================================================

import { PersonaRenderConfig } from "./PersonaTypes.ts";

// Intensity/humor/modern-adaptation dials all share the same three-band
// interpretation: low / medium / high. Kept as named constants so the bands
// are consistent across every dial and easy to tune in one place.
const BAND_LOW = 30;
const BAND_HIGH = 70;

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export class PersonaPromptBuilder {
  render(config: PersonaRenderConfig): string {
    const sections: string[] = [];

    sections.push(this.renderIdentity(config));

    const businessRoleSection = this.renderBusinessRole(config);
    if (businessRoleSection) sections.push(businessRoleSection);

    sections.push(this.renderByIntensity(config));
    sections.push(this.renderStyleGuidance(config));
    sections.push(this.renderModernAdaptation(config));

    // Safety-critical: forbidden behaviors + boundaries are ALWAYS rendered
    // in full, regardless of persona_intensity. Intensity controls "flavor",
    // never safety — this is intentionally outside renderByIntensity().
    if (config.forbiddenBehaviors.length > 0) {
      sections.push(`YAPMAMAN GEREKENLER:\n${bulletList(config.forbiddenBehaviors)}`);
    }
    if (config.boundaries.length > 0) {
      sections.push(`SINIRLARIN:\n${bulletList(config.boundaries)}`);
    }

    if (config.tone) {
      sections.push(`Genel ton tercihi: ${config.tone}.`);
    }
    if (config.customInstruction) {
      sections.push(`Ek talimat (işletme tarafından girildi): ${config.customInstruction}`);
    }

    return sections.filter(Boolean).join("\n\n");
  }

  private renderIdentity(config: PersonaRenderConfig): string {
    return `Sen ${config.name} kişiliğini üstlenmiş bir yapay zeka asistanısın.\n${config.identityPrompt}`;
  }

  private renderBusinessRole(config: PersonaRenderConfig): string | null {
    if (!config.businessRole) return null;
    return (
      `Bu persona, "${config.businessRole}" iş koluyla uğraşan bir işletmenin sanal asistanı rolünde ` +
      `konumlandırılmıştır. Kimliğini korurken, verdiğin örnekleri ve tavsiyeleri bu iş koluna uyarlayabilirsin, ` +
      `ama işletmenin gerçek hizmet/ürün bilgisini asla persona kisvesi altında gizleme veya çarpıtma.`
    );
  }

  /**
   * personaIntensity controls how much of the persona's "flavor" (worldview,
   * metaphors, vocabulary, favorite expressions, greeting/farewell style)
   * leaks into everyday responses. Low intensity = mostly a normal assistant
   * with a light accent; high intensity = fully in character.
   */
  private renderByIntensity(config: PersonaRenderConfig): string {
    const parts: string[] = [];

    if (config.personaIntensity < BAND_LOW) {
      parts.push(
        `Persona yoğunluğu DÜŞÜK (${config.personaIntensity}/100): karakterini hafif bir üslup ipucu olarak ` +
          `kullan, ama çoğunlukla standart, net ve doğrudan bir asistan gibi konuş. Uzun karakter göndermeleri yapma.`,
      );
      return parts.join("\n");
    }

    if (config.personaIntensity < BAND_HIGH) {
      parts.push(`Persona yoğunluğu ORTA (${config.personaIntensity}/100): karakterini belirgin ama ölçülü kullan.`);
      if (config.vocabulary.length > 0) {
        parts.push(`Zaman zaman kullanabileceğin kelime/ifadeler: ${config.vocabulary.join(", ")}.`);
      }
      if (config.favoriteExpressions.length > 0) {
        parts.push(`Sevdiğin ifadelerden biri: "${config.favoriteExpressions[0]}"`);
      }
      return parts.join("\n");
    }

    parts.push(`Persona yoğunluğu YÜKSEK (${config.personaIntensity}/100): karakterini tam anlamıyla yansıt.`);
    if (config.worldview.length > 0) {
      parts.push(`Dünya görüşün: ${config.worldview.join(", ")}.`);
    }
    if (config.preferredMetaphors.length > 0) {
      parts.push(`Sevdiğin benzetmeler: ${config.preferredMetaphors.join(", ")}.`);
    }
    if (config.vocabulary.length > 0) {
      parts.push(`Kullanabileceğin kelime/ifadeler: ${config.vocabulary.join(", ")}.`);
    }
    if (config.favoriteExpressions.length > 0) {
      parts.push(`Sık kullandığın ifadeler:\n${bulletList(config.favoriteExpressions)}`);
    }
    if (config.greetingStyle) {
      parts.push(`Selamlama tarzın: "${config.greetingStyle}"`);
    }
    if (config.farewellStyle) {
      parts.push(`Vedalaşma tarzın: "${config.farewellStyle}"`);
    }
    return parts.join("\n");
  }

  private renderStyleGuidance(config: PersonaRenderConfig): string {
    const { formal, warm, humorous, metaphorical } = config.speakingStyle;

    const humorNote =
      config.humorLevel < BAND_LOW
        ? "Mizahı minimumda tut, işletmenin talebi ciddi bir ton."
        : config.humorLevel > BAND_HIGH
        ? `Mizah tarzın "${config.humorStyle}" — rahatça esprili olabilirsin, ama müşteri hizmetini asla gölgede bırakma.`
        : `Mizah tarzın "${config.humorStyle}" — ölçülü kullan.`;

    return [
      `Konuşma tarzı ağırlıkları (0-100): resmiyet=${formal}, sıcaklık=${warm}, mizah=${humorous}, mecazilik=${metaphorical}.`,
      humorNote,
      `Emoji kullanım seviyesi: ${config.emojiLevel}.`,
    ].join("\n");
  }

  private renderModernAdaptation(config: PersonaRenderConfig): string {
    if (config.modernAdaptation > BAND_HIGH) {
      return (
        `Modern uyum YÜKSEK (${config.modernAdaptation}/100): tarihsel kişiliğini bugünün diliyle, güncel ` +
        `örneklerle harmanla — müşteri seni "eski moda" veya anlaşılmaz bulmasın.`
      );
    }
    if (config.modernAdaptation < BAND_LOW) {
      return (
        `Modern uyum DÜŞÜK (${config.modernAdaptation}/100): tarihsel/klasik üslubuna daha sadık kal, modern ` +
        `argo veya güncel referanslardan kaçın.`
      );
    }
    return `Modern uyum ORTA (${config.modernAdaptation}/100): tarihsel kişiliğinle günümüz dili arasında dengeli bir üslup kullan.`;
  }
}
