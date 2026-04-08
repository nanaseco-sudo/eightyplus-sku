/**
 * Netlify Function: Parse PDF/Image documents using Claude Vision API
 * Extracts structured coffee contract data from uploaded documents
 */

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from coffee trade documents (invoices, contracts, order lists, proforma invoices).

Extract ALL line items from this document. For each item, extract:
- exporter: The exporter/seller/supplier company name
- productNo: Item number or product code (if visible)
- productName: The coffee product name (variety, processing, region, etc.)
- quantity: Total quantity (in kg or bags)
- unit: The unit (kg, lb, bags, etc.)
- fobPrice: FOB price per unit
- priceUnit: Price unit (USD/kg, USD/lb, etc.)
- currency: Currency code (USD, EUR, etc.)
- notes: Any flavor notes, special descriptions, or additional info

Also extract document-level info:
- documentType: "invoice", "contract", "order_list", or "proforma"
- exporterName: Main exporter/seller name
- importerName: Buyer name (if visible)
- country: Origin country of the coffee
- exchangeRate: If shown in document
- date: Document date

Return ONLY valid JSON in this exact format:
{
  "document": {
    "type": "invoice",
    "exporterName": "Company Name",
    "importerName": "Buyer Name",
    "country": "Colombia",
    "exchangeRate": null,
    "date": "2026-01-26"
  },
  "items": [
    {
      "exporter": "Company Name",
      "productNo": "1",
      "productName": "Gesha Natural",
      "quantity": 300,
      "unit": "kg",
      "fobPrice": 25.50,
      "priceUnit": "USD/kg",
      "currency": "USD",
      "notes": ""
    }
  ]
}

If you cannot determine a value, use null. Extract ALL items — do not skip any rows.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  try {
    const { fileData, fileType, fileName } = JSON.parse(event.body);

    if (!fileData || !fileType) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'fileData and fileType required' }) };
    }

    // Build the content array for Claude API
    const content = [];

    if (fileType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileData },
      });
    } else {
      // Image: jpg, png, gif, webp
      const mediaType = fileType === 'image/jpg' ? 'image/jpeg' : fileType;
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: fileData },
      });
    }

    content.push({ type: 'text', text: EXTRACTION_PROMPT });

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Claude API error:', response.status, errBody);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `Claude API error: ${response.status}`, details: errBody }) };
    }

    const result = await response.json();
    const textContent = result.content?.find(c => c.type === 'text')?.text || '';

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileName,
        ...parsed,
      }),
    };

  } catch (err) {
    console.error('Parse document error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
