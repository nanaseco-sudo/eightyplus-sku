const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getTextContent(prop, type = 'rich_text') {
  if (type === 'title') return prop?.title?.[0]?.text?.content || '';
  if (type === 'select') return prop?.select?.name || '';
  if (type === 'date') return prop?.date?.start || '';
  return prop?.rich_text?.[0]?.text?.content || '';
}

function makeRichText(value) {
  return { rich_text: [{ text: { content: String(value || '') } }] };
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // ─── GET: List all SKUs ───
    if (event.httpMethod === 'GET') {
      const results = [];
      let cursor;
      do {
        const resp = await notion.databases.query({
          database_id: DB_ID,
          start_cursor: cursor,
          page_size: 100,
          sorts: [{ property: 'Registered', direction: 'ascending' }],
        });
        results.push(...resp.results);
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } while (cursor);

      const skus = results.map(page => {
        const p = page.properties;
        return {
          notionId: page.id,
          skuCode: getTextContent(p['SKU Code'], 'title'),
          lotNumber: getTextContent(p['LOT Number']),
          country: getTextContent(p['Country'], 'select'),
          countryCode: getTextContent(p['Country Code']),
          grade: getTextContent(p['Grade'], 'select'),
          gradeCode: getTextContent(p['Grade Code']),
          packSize: getTextContent(p['Pack Size'], 'select'),
          packCode: getTextContent(p['Pack Code']),
          supplier: getTextContent(p['Supplier']),
          supplierCode: getTextContent(p['Supplier Code']),
          region: getTextContent(p['Region']),
          brandFarm: getTextContent(p['Brand Farm']),
          process: getTextContent(p['Process']),
          process2: getTextContent(p['Process 2']),
          gradingSpec: getTextContent(p['Grading Spec'], 'select'),
          description: getTextContent(p['Description']),
          saleName: getTextContent(p['Sale Name']),
          notes: getTextContent(p['Notes']),
          costPrice: p['Cost Price']?.number ?? null,
          sellingPrice: p['Selling Price']?.number ?? null,
          currency: getTextContent(p['Currency'], 'select') || 'THB',
          createdAt: getTextContent(p['Registered'], 'date') || page.created_time,
        };
      });

      return { statusCode: 200, headers, body: JSON.stringify(skus) };
    }

    // ─── POST: Create SKU(s) ───
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const items = Array.isArray(body) ? body : [body];
      const created = [];

      for (const data of items) {
        const properties = {
          'SKU Code': { title: [{ text: { content: data.skuCode } }] },
          'LOT Number': makeRichText(data.lotNumber),
          'Country': { select: { name: data.country } },
          'Country Code': makeRichText(data.countryCode),
          'Grade': { select: { name: data.grade } },
          'Grade Code': makeRichText(data.gradeCode),
          'Pack Size': { select: { name: data.packSize } },
          'Pack Code': makeRichText(data.packCode),
          'Supplier': makeRichText(data.supplier),
          'Supplier Code': makeRichText(data.supplierCode),
          'Region': makeRichText(data.region),
          'Brand Farm': makeRichText(data.brandFarm),
          'Process': makeRichText(data.process),
          'Process 2': makeRichText(data.process2),
          'Description': makeRichText(data.description),
          'Sale Name': makeRichText(data.saleName),
          'Notes': makeRichText(data.notes),
          'Registered': { date: { start: data.createdAt || new Date().toISOString() } },
        };

        // Add price fields only if they exist (number properties)
        if (data.gradingSpec) properties['Grading Spec'] = { select: { name: data.gradingSpec } };
        if (data.costPrice != null) properties['Cost Price'] = { number: data.costPrice };
        if (data.sellingPrice != null) properties['Selling Price'] = { number: data.sellingPrice };
        if (data.currency) properties['Currency'] = { select: { name: data.currency } };

        const page = await notion.pages.create({
          parent: { database_id: DB_ID },
          properties,
        });

        created.push({ notionId: page.id, skuCode: data.skuCode });

        // Rate limit: Notion API allows ~3 requests/sec
        if (items.length > 1) {
          await new Promise(r => setTimeout(r, 350));
        }
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(Array.isArray(body) ? created : created[0]),
      };
    }

    // ─── DELETE: Archive SKU ───
    if (event.httpMethod === 'DELETE') {
      const { notionId } = JSON.parse(event.body);
      if (!notionId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'notionId required' }) };
      }
      await notion.pages.update({ page_id: notionId, archived: true });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('Notion API error:', err);
    return {
      statusCode: err.status || 500,
      headers,
      body: JSON.stringify({ error: err.message, code: err.code }),
    };
  }
};
