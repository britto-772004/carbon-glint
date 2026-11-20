import type { ActivityModel, EmissionFactorModel, EfSourceModel, GhgCategoryModel } from '../models/index.js';
import type { AiClient } from '../lib/gemini.js';
import type { FactorHit } from '../repositories/emission-factor.repository.js';
import { UNITS, findUnit } from '../lib/units.js';

/** Catalogue units an activity unit can be converted into (same dimension; currencies only to themselves). */
export function compatibleUnits(unit: string): string[] {
  const u = findUnit(unit);
  if (!u) return [unit];
  if (u.dimension === 'currency') return [u.code];
  return UNITS.filter((x) => x.dimension === u.dimension).map((x) => x.code);
}

export interface MatchInput {
  activity: Pick<ActivityModel, 'description' | 'unit' | 'location'>;
  countryName: string | null;
  scope: number;
  category: Pick<GhgCategoryModel, 'code' | 'name'>;
}

export interface MatchChoice {
  hit: FactorHit | null;
  method: 'ai' | 'search' | 'none';
  confidence: number;
  rationale: string;
  alternatives: FactorHit[];
}

/** Search text for an activity: what it is, where, and the GHG category it belongs to. */
/** The activity's own words — what the search weights most. */
export const primaryQuery = ({ activity }: MatchInput) => activity.description;

export const matchQuery = ({ activity, countryName, category }: MatchInput) =>
  [activity.description, activity.location, countryName, category.name.replace(/^\d+\.\s*/, '')]
    .filter(Boolean)
    .join(' ');

/** Domain-aware re-ranking of search hits for an activity. */
export function rerank(hits: FactorHit[], input: MatchInput): FactorHit[] {
  const wantsWtt = input.category.code === 'S3_C3'; // fuel- & energy-related activities = WTT / T&D
  const wasteCategory = input.category.code === 'S3_C5' || input.category.code === 'S3_C12';
  const country = input.countryName?.toLowerCase();
  const words = new Set(
    input.activity.description
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
  return hits
    .map((h) => {
      let s = h.score;
      if (h.factor.scopeHint === input.scope) s += 0.15;
      const isWtt = /^WTT|T&D|Transmission/i.test(`${h.factor.category} ${h.factor.name}`);
      if (isWtt !== wantsWtt) s -= 0.12;
      if (/outside of scopes/i.test(h.factor.category)) s -= 0.2;
      if (country && h.factor.region.toLowerCase() === country) s += 0.2;
      // Waste-disposal factors (combustion/landfill/composting of materials) only fit waste categories.
      const disposal = /›\s*(Combustion|Landfill|Composting|Anaerobic digestion|Open-loop|Closed-loop)\s*›/i.test(
        h.factor.name,
      );
      if (disposal) s += wasteCategory ? 0.15 : -0.25;
      // Reward factors that name the activity's own words (e.g. "LPG", "diesel", "R410A").
      if (words.size) {
        const name = h.factor.name.toLowerCase();
        const hits = [...words].filter((w) => name.includes(w)).length;
        s += 0.2 * (hits / words.size);
      }
      return { ...h, score: s };
    })
    .sort((a, b) => b.score - a.score);
}

const AI_SCHEMA = {
  type: 'object',
  properties: {
    factorId: { type: 'string', nullable: true },
    confidence: { type: 'number' },
    rationale: { type: 'string' },
  },
  required: ['factorId', 'confidence', 'rationale'],
};

const describe = (f: EmissionFactorModel, s: EfSourceModel) =>
  `${f.id} | ${s.code} | ${f.category} | ${f.name} | region ${f.region} | per ${f.unit} | scope ${f.scopeHint ?? '-'}`;

/**
 * Pick one factor for an activity. Gemini (when configured) chooses ONLY among the given candidate ids and never
 * produces numbers; otherwise the top re-ranked search hit is used with a score-derived confidence.
 */
export async function chooseFactor(ai: AiClient, input: MatchInput, candidates: FactorHit[]): Promise<MatchChoice> {
  const alternatives = candidates.slice(0, 5);
  if (candidates.length === 0) {
    return {
      hit: null,
      method: 'none',
      confidence: 0,
      rationale: 'No unit-compatible emission factor found.',
      alternatives: [],
    };
  }
  if (ai.available) {
    try {
      const prompt = [
        'You are a GHG Protocol carbon accountant. Choose the single best emission factor for this activity from the candidates.',
        'Only answer with a factorId from the list (or null if none fits). Prefer the right fuel/material/mode, the right region,',
        'and combustion/direct factors unless the category is fuel- & energy-related (well-to-tank / T&D).',
        '',
        `Activity: ${input.activity.description}`,
        `Unit: ${input.activity.unit}`,
        `Location: ${[input.activity.location, input.countryName].filter(Boolean).join(', ') || 'unknown'}`,
        `GHG Protocol: Scope ${input.scope} — ${input.category.name}`,
        '',
        'Candidates (id | source | category | name | region | unit | scope):',
        ...candidates.slice(0, 12).map((c) => describe(c.factor, c.source)),
        '',
        'Return confidence 0–1 and a one-sentence rationale.',
      ].join('\n');
      const out = await ai.generateJson<{ factorId: string | null; confidence: number; rationale: string }>(
        prompt,
        AI_SCHEMA,
      );
      const hit = candidates.find((c) => c.factor.id === out.factorId) ?? null;
      if (out.factorId && !hit) throw new Error('model returned an unknown factor id');
      return {
        hit,
        method: hit ? 'ai' : 'none',
        confidence: hit ? Math.max(0, Math.min(1, Number(out.confidence) || 0)) : 0,
        rationale: String(out.rationale ?? '').slice(0, 500),
        alternatives: alternatives.filter((a) => a.factor.id !== hit?.factor.id),
      };
    } catch {
      // fall through to search-based choice
    }
  }
  const top = candidates[0]!;
  const runnerUp = candidates[1]?.score ?? 0;
  const confidence = Math.max(0.1, Math.min(0.85, top.score * 1.2 + (top.score - runnerUp)));
  return {
    hit: top,
    method: 'search',
    confidence: Number(confidence.toFixed(2)),
    rationale: ai.available
      ? 'AI unavailable — best full-text match used.'
      : 'Best full-text match (AI not configured).',
    alternatives: alternatives.slice(1),
  };
}
