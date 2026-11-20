import { describe, expect, it } from 'vitest';
import type { FactorHit } from '../../../src/repositories/emission-factor.repository.js';
import { primaryQuery, rerank, type MatchInput } from '../../../src/services/factor-matching.js';

const hit = (name: string, score: number, scopeHint = 1): FactorHit =>
  ({
    factor: { id: name, name, category: name.split(' › ')[0], region: 'UK', unit: 't', scopeHint, co2ePerUnit: 1 },
    source: { code: 'DEFRA_2026' },
    score,
  }) as unknown as FactorHit;

const input = (description: string, code: string, scope = 1): MatchInput => ({
  activity: { description, unit: 'kg', location: 'Bengaluru, IN' },
  countryName: 'India',
  scope,
  category: { code, name: 'Stationary combustion' },
});

describe('factor re-ranking', () => {
  it('prefers the fuel named in the description over waste-combustion factors', () => {
    const ranked = rerank(
      [
        hit('Metal › Metal: steel cans › Combustion › (tonnes)', 0.149, 3),
        hit('Refuse › Commercial and industrial waste › Combustion › (tonnes)', 0.148, 3),
        hit('Gaseous fuels › LPG › (tonnes)', 0.12, 1),
      ],
      input('LPG – office cafeteria', 'S1_STATIONARY'),
    );
    expect(ranked[0]!.factor.name).toBe('Gaseous fuels › LPG › (tonnes)');
  });

  it('keeps disposal factors first for waste categories', () => {
    const ranked = rerank(
      [
        hit('Paper › Paper and board: paper › Primary material production › (tonnes)', 0.2, 3),
        hit('Refuse › Commercial and industrial waste › Landfill › (tonnes)', 0.18, 3),
      ],
      input('Mixed waste to landfill', 'S3_C5', 3),
    );
    expect(ranked[0]!.factor.name).toContain('Landfill');
  });

  it('uses the activity description as the primary query', () => {
    expect(primaryQuery(input('Diesel – DG set', 'S1_STATIONARY'))).toBe('Diesel – DG set');
  });
});
