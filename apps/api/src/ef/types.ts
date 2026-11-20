/** A factor as parsed from a published dataset, before it is stored. */
export interface ParsedFactor {
  externalId: string;
  name: string;
  category: string;
  scopeHint: 1 | 2 | 3 | null;
  region: string;
  unit: string | null;
  unitLabel: string;
  co2ePerUnit: number;
  co2PerUnit: number | null;
  ch4PerUnit: number | null;
  n2oPerUnit: number | null;
}

export interface ParsedDataset {
  source: {
    code: string;
    publisher: string;
    name: string;
    version: string;
    year: number;
    licence: string;
    url: string;
  };
  factors: ParsedFactor[];
}
