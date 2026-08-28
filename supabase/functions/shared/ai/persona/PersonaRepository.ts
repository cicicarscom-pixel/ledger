// ==============================================================================
// PERSONA ENGINE — PHASE 2: PersonaRepository (data access ONLY)
// ==============================================================================
// Guardrail (locked plan, explicitly required by the product owner): this
// class must never build prompt text, apply business rules (e.g. "is this
// persona allowed in production right now"), or merge/override values. Those
// belong to PersonaService. This class only knows how to read two tables —
// public.ai_personas and public.organization_ai_settings — and, from Phase 5
// onward, write organization_ai_settings on behalf of the settings-save
// refactor. It never writes to ai_personas (that is Phase 8's Admin Persona
// Creator's job, via its own seed/admin path).
// ==============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { OrganizationAiSettingsRow, PersonaRow } from "./PersonaTypes.ts";

export class PersonaRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOrganizationSettings(merchantId: string): Promise<OrganizationAiSettingsRow | null> {
    const { data, error } = await this.supabase
      .from("organization_ai_settings")
      .select("*")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    if (error) {
      console.error("[PersonaRepository] getOrganizationSettings failed:", error.message);
      return null;
    }
    return (data as OrganizationAiSettingsRow) ?? null;
  }

  async getPersonaById(personaId: string): Promise<PersonaRow | null> {
    const { data, error } = await this.supabase
      .from("ai_personas")
      .select("*")
      .eq("id", personaId)
      .maybeSingle();

    if (error) {
      console.error("[PersonaRepository] getPersonaById failed:", error.message);
      return null;
    }
    return (data as PersonaRow) ?? null;
  }

  async getPersonaBySlug(slug: string): Promise<PersonaRow | null> {
    const { data, error } = await this.supabase
      .from("ai_personas")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[PersonaRepository] getPersonaBySlug failed:", error.message);
      return null;
    }
    return (data as PersonaRow) ?? null;
  }

  /** Phase 6's carousel: only ever reads active, published rows. */
  async listPublishedPersonas(): Promise<PersonaRow[]> {
    const { data, error } = await this.supabase
      .from("ai_personas")
      .select("*")
      .eq("status", "published")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[PersonaRepository] listPublishedPersonas failed:", error.message);
      return [];
    }
    return (data as PersonaRow[]) ?? [];
  }

  /**
   * Phase 5's settings-save refactor writes here. Included now (Phase 2) so
   * the repository's write surface is defined and reviewable up front, even
   * though nothing calls it until Phase 5. Upserts by merchant_id.
   */
  async upsertOrganizationSettings(
    row: OrganizationAiSettingsRow,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.supabase
      .from("organization_ai_settings")
      .upsert(row, { onConflict: "merchant_id" });

    if (error) {
      console.error("[PersonaRepository] upsertOrganizationSettings failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }
}
