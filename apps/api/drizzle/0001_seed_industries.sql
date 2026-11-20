-- Reference data: industries offered during onboarding (PRD §7.2).
INSERT INTO "industries" ("code", "name") VALUES
  ('manufacturing', 'Manufacturing'),
  ('oil_gas', 'Oil & gas'),
  ('power_utilities', 'Power & utilities'),
  ('mining_metals', 'Mining & metals'),
  ('chemicals', 'Chemicals'),
  ('construction_real_estate', 'Construction & real estate'),
  ('transport_logistics', 'Transportation & logistics'),
  ('retail_ecommerce', 'Retail & e-commerce'),
  ('food_agriculture', 'Food & agriculture'),
  ('hospitality_tourism', 'Hospitality & tourism'),
  ('healthcare_pharma', 'Healthcare & pharma'),
  ('it_software', 'IT & software services'),
  ('financial_services', 'Financial services'),
  ('telecom', 'Telecommunications'),
  ('higher_education', 'Higher education (colleges & universities)'),
  ('public_sector', 'Government & public sector'),
  ('textiles_apparel', 'Textiles & apparel'),
  ('automotive', 'Automotive')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";
