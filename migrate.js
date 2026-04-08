/**
 * One-time migration script: Split Region → Region + Brand/Farm, Process → Process + Grading Spec
 * Run: node migrate.js
 */
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: 'ntn_U82391607806Q8CYXXhedtqNXius4ONMP5LpoPfepiOgSP' });
const DB_ID = 'e959b50638c54fb09ab7c6f7faf30378';

// Brand/Farm names (move from Region to Brand Farm field)
const BRAND_FARM_NAMES = new Set([
  'Niu Culturing', 'Maypop Culturing', 'April Culturing', 'NG Culturing', 'AGI Culturing',
  'Caturra Nitro', 'Sakura Competition', 'April Competition', 'Maypop Competition',
  'Black Moon Farm', 'Lerida Coffee Estate', 'Finca Deborah', 'Granja Paraiso 92',
  'Café Granja La Esperanza', 'El Diviso', 'Finca La Julia', 'Hacienda Esmeralda'
]);

// Grading spec codes (extract from Process field)
const GRADING_SPECS = new Set([
  'G1','G2','G3','G4','G5','G4a','G4b',
  'SHB','HB','Semi-HB','Extra Prime','Prime',
  'Premium','Supremo','Excelso','Extra','UGQ',
  'NY Type 2','NY 2/3','NY 3/4','Type 4','Type 4/5',
  'AA','AB','PB','E','C','TT',
  'Special Grade','Grade 1','Grade 2','Grade 3',
  'A' // single letter grade
]);

function getText(prop, type = 'rich_text') {
  if (type === 'title') return prop?.title?.[0]?.text?.content || '';
  if (type === 'select') return prop?.select?.name || '';
  return prop?.rich_text?.[0]?.text?.content || '';
}

function makeRichText(value) {
  return { rich_text: [{ text: { content: String(value || '') } }] };
}

function parseRegion(regionValue) {
  const trimmed = (regionValue || '').trim();
  if (!trimmed) return { region: '', brandFarm: '' };

  // Check if the whole value is a brand/farm name
  if (BRAND_FARM_NAMES.has(trimmed)) {
    return { region: '', brandFarm: trimmed };
  }

  // Check if it contains a brand/farm name (e.g., "Guji Niu Culturing")
  for (const bf of BRAND_FARM_NAMES) {
    if (trimmed.includes(bf)) {
      const region = trimmed.replace(bf, '').trim();
      return { region, brandFarm: bf };
    }
  }

  // Pure region
  return { region: trimmed, brandFarm: '' };
}

function parseProcess(processValue) {
  const trimmed = (processValue || '').trim();
  if (!trimmed) return { process: '', gradingSpec: '' };

  // Rename "Infusion" → "Infused"
  let val = trimmed.replace(/\bInfusion\b/g, 'Infused');

  // Check if the whole value is a grading spec
  if (GRADING_SPECS.has(val)) {
    return { process: '', gradingSpec: val };
  }

  // Try to split: "Natural G1" → process: Natural, gradingSpec: G1
  // Check from longest grading spec to shortest to avoid partial matches
  const sortedSpecs = [...GRADING_SPECS].sort((a, b) => b.length - a.length);
  for (const spec of sortedSpecs) {
    // Check if value ends with the spec (with space before it)
    if (val.endsWith(' ' + spec)) {
      const process = val.slice(0, -(spec.length + 1)).trim();
      return { process, gradingSpec: spec };
    }
  }

  // Pure process
  return { process: val, gradingSpec: '' };
}

async function migrate() {
  console.log('Fetching all SKUs from Notion...');

  const results = [];
  let cursor;
  do {
    const resp = await notion.databases.query({
      database_id: DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);

  console.log(`Found ${results.length} SKUs to migrate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const page of results) {
    const p = page.properties;
    const skuCode = getText(p['SKU Code'], 'title');
    const regionVal = getText(p['Region']);
    const processVal = getText(p['Process']);
    const existingBrandFarm = getText(p['Brand Farm']);
    const existingProcess2 = getText(p['Process 2']);
    const existingGradingSpec = getText(p['Grading Spec'], 'select');

    // Parse old values
    const { region: newRegion, brandFarm: newBrandFarm } = parseRegion(regionVal);
    const { process: newProcess, gradingSpec: newGradingSpec } = parseProcess(processVal);

    // Build update properties
    const updates = {};
    let changes = [];

    // Update Region if it contained a brand/farm name
    if (newBrandFarm && regionVal !== newRegion) {
      updates['Region'] = makeRichText(newRegion);
      changes.push(`Region: "${regionVal}" → "${newRegion}"`);
    }

    // Set Brand Farm if extracted and not already set
    if (newBrandFarm && !existingBrandFarm) {
      updates['Brand Farm'] = makeRichText(newBrandFarm);
      changes.push(`Brand Farm: "" → "${newBrandFarm}"`);
    }

    // Update Process if it contained a grading spec
    if (newGradingSpec && processVal !== newProcess) {
      updates['Process'] = makeRichText(newProcess);
      changes.push(`Process: "${processVal}" → "${newProcess}"`);
    }

    // Also rename Infusion → Infused in Process even if no grading spec extracted
    if (!newGradingSpec && processVal.includes('Infusion')) {
      const renamed = processVal.replace(/\bInfusion\b/g, 'Infused');
      updates['Process'] = makeRichText(renamed);
      changes.push(`Process: "${processVal}" → "${renamed}"`);
    }

    // Set Grading Spec if extracted and not already set
    if (newGradingSpec && !existingGradingSpec) {
      updates['Grading Spec'] = { select: { name: newGradingSpec } };
      changes.push(`Grading Spec: "" → "${newGradingSpec}"`);
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  [SKIP] ${skuCode} — no changes needed`);
      skipped++;
      continue;
    }

    console.log(`  [UPDATE] ${skuCode}`);
    changes.forEach(c => console.log(`           ${c}`));

    await notion.pages.update({
      page_id: page.id,
      properties: updates,
    });

    updated++;

    // Rate limit
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\nMigration complete: ${updated} updated, ${skipped} skipped (${results.length} total)`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
