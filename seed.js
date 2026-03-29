const https = require('https');

const skus = [
  {skuCode:"COCB7601",lotNumber:"80-0001",country:"Colombia",countryCode:"CO",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 35",packCode:"B",supplier:"FINCA MILAN",supplierCode:"76",region:"NG Culturing",process:"Washed",description:"Colombia NG Culturing Washed FINCA MILAN COMMERCIAL Bag 35",saleName:"",notes:"",createdAt:"2026-03-15T10:00:00.000Z"},
  {skuCode:"COCB7602",lotNumber:"80-0002",country:"Colombia",countryCode:"CO",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 35",packCode:"B",supplier:"FINCA MILAN",supplierCode:"76",region:"Niu Culturing",process:"Washed",description:"Colombia Niu Culturing Washed FINCA MILAN COMMERCIAL Bag 35",saleName:"",notes:"",createdAt:"2026-03-15T10:01:00.000Z"},
  {skuCode:"COCB7603",lotNumber:"80-0003",country:"Colombia",countryCode:"CO",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 35",packCode:"B",supplier:"FINCA MILAN",supplierCode:"76",region:"Maypop Culturing",process:"Washed",description:"Colombia Maypop Culturing Washed FINCA MILAN COMMERCIAL Bag 35",saleName:"",notes:"",createdAt:"2026-03-15T10:02:00.000Z"},
  {skuCode:"COCB7604",lotNumber:"80-0004",country:"Colombia",countryCode:"CO",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 35",packCode:"B",supplier:"FINCA MILAN",supplierCode:"76",region:"April Culturing",process:"Washed",description:"Colombia April Culturing Washed FINCA MILAN COMMERCIAL Bag 35",saleName:"",notes:"",createdAt:"2026-03-15T10:03:00.000Z"},
  {skuCode:"CODH7605",lotNumber:"80-0005",country:"Colombia",countryCode:"CO",grade:"DISCOVERY",gradeCode:"D",packSize:"Box 24",packCode:"H",supplier:"FINCA MILAN",supplierCode:"76",region:"AGI Culturing",process:"Washed",description:"Colombia AGI Culturing Washed FINCA MILAN DISCOVERY Box 24",saleName:"",notes:"",createdAt:"2026-03-20T10:00:00.000Z"},
  {skuCode:"CODH7606",lotNumber:"80-0006",country:"Colombia",countryCode:"CO",grade:"DISCOVERY",gradeCode:"D",packSize:"Box 24",packCode:"H",supplier:"FINCA MILAN",supplierCode:"76",region:"Caturra Nitro",process:"Washed",description:"Colombia Caturra Nitro Washed FINCA MILAN DISCOVERY Box 24",saleName:"",notes:"",createdAt:"2026-03-26T10:00:00.000Z"},
  {skuCode:"COZH7607",lotNumber:"80-0007",country:"Colombia",countryCode:"CO",grade:"COMPETITION",gradeCode:"Z",packSize:"Box 24",packCode:"H",supplier:"FINCA MILAN",supplierCode:"76",region:"Sakura Competition",process:"Washed",description:"Colombia Sakura Competition Washed FINCA MILAN COMPETITION Box 24",saleName:"",notes:"",createdAt:"2026-03-26T10:01:00.000Z"},
  {skuCode:"COZH7608",lotNumber:"80-0008",country:"Colombia",countryCode:"CO",grade:"COMPETITION",gradeCode:"Z",packSize:"Box 24",packCode:"H",supplier:"FINCA MILAN",supplierCode:"76",region:"April Competition",process:"Washed",description:"Colombia April Competition Washed FINCA MILAN COMPETITION Box 24",saleName:"",notes:"",createdAt:"2026-03-26T10:02:00.000Z"},
  {skuCode:"COZH7609",lotNumber:"80-0009",country:"Colombia",countryCode:"CO",grade:"COMPETITION",gradeCode:"Z",packSize:"Box 24",packCode:"H",supplier:"FINCA MILAN",supplierCode:"76",region:"Maypop Competition",process:"Washed",description:"Colombia Maypop Competition Washed FINCA MILAN COMPETITION Box 24",saleName:"",notes:"",createdAt:"2026-03-26T10:03:00.000Z"},
  {skuCode:"COCB7611",lotNumber:"80-0010",country:"Colombia",countryCode:"CO",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 35",packCode:"B",supplier:"FINCA MILAN",supplierCode:"76",region:"Risaralda State",process:"Washed",description:"Colombia Risaralda State Washed FINCA MILAN COMMERCIAL Bag 35",saleName:"",notes:"",createdAt:"2026-03-27T10:00:00.000Z"},
  {skuCode:"CRRA0101",lotNumber:"80-0011",country:"Costa Rica",countryCode:"CR",grade:"SPECIALTY",gradeCode:"R",packSize:"Bag 30",packCode:"A",supplier:"Oklao",supplierCode:"01",region:"San Ramon",process:"Yeast Washed",description:"Costa Rica San Ramon Yeast Washed Oklao SPECIALTY Bag 30",saleName:"Costa Rica Hummingbird Yeast Washed",notes:"",createdAt:"2026-03-20T10:01:00.000Z"},
  {skuCode:"CRRA0102",lotNumber:"80-0012",country:"Costa Rica",countryCode:"CR",grade:"SPECIALTY",gradeCode:"R",packSize:"Bag 30",packCode:"A",supplier:"Oklao",supplierCode:"01",region:"Mozart",process:"Washed",description:"Costa Rica Mozart Washed Oklao SPECIALTY Bag 30",saleName:"Costa Rica Hummingbird Mozart Washed",notes:"",createdAt:"2026-03-20T10:02:00.000Z"},
  {skuCode:"ETCA6501",lotNumber:"80-0013",country:"Ethiopia",countryCode:"ET",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 30",packCode:"A",supplier:"ARDENT",supplierCode:"65",region:"Sidama",process:"Natural G1",description:"Ethiopia Sidama Natural G1 ARDENT COMMERCIAL Bag 30",saleName:"Ethiopia Ardent Sidama Natural G1",notes:"",createdAt:"2026-03-27T10:01:00.000Z"},
  {skuCode:"ETCA6502",lotNumber:"80-0014",country:"Ethiopia",countryCode:"ET",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 30",packCode:"A",supplier:"ARDENT",supplierCode:"65",region:"Yirgacheffe",process:"Natural G1",description:"Ethiopia Yirgacheffe Natural G1 ARDENT COMMERCIAL Bag 30",saleName:"Ethiopia Ardent Yirgacheffe Natural G1",notes:"",createdAt:"2026-03-27T10:02:00.000Z"},
  {skuCode:"ETCA6503",lotNumber:"80-0015",country:"Ethiopia",countryCode:"ET",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 30",packCode:"A",supplier:"ARDENT",supplierCode:"65",region:"Guji",process:"Natural G1",description:"Ethiopia Guji Natural G1 ARDENT COMMERCIAL Bag 30",saleName:"Ethiopia Ardent Guji Natural G1",notes:"",createdAt:"2026-03-27T10:03:00.000Z"},
  {skuCode:"ETDA4801",lotNumber:"80-0016",country:"Ethiopia",countryCode:"ET",grade:"DISCOVERY",gradeCode:"D",packSize:"Bag 30",packCode:"A",supplier:"Daye Bensa",supplierCode:"48",region:"Sidama",process:"Natural",description:"Ethiopia Sidama Natural Daye Bensa DISCOVERY Bag 30",saleName:"Ethiopia Daye Bensa Sidama Natural",notes:"",createdAt:"2026-03-20T10:03:00.000Z"},
  {skuCode:"ETDA4802",lotNumber:"80-0017",country:"Ethiopia",countryCode:"ET",grade:"DISCOVERY",gradeCode:"D",packSize:"Bag 30",packCode:"A",supplier:"Daye Bensa",supplierCode:"48",region:"Guji Hambella",process:"Natural",description:"Ethiopia Guji Hambella Natural Daye Bensa DISCOVERY Bag 30",saleName:"Ethiopia Daye Bensa Guji Hambella Natural",notes:"",createdAt:"2026-03-20T10:04:00.000Z"},
  {skuCode:"ETDA4803",lotNumber:"80-0018",country:"Ethiopia",countryCode:"ET",grade:"DISCOVERY",gradeCode:"D",packSize:"Bag 30",packCode:"A",supplier:"Daye Bensa",supplierCode:"48",region:"West Arsi",process:"Washed",description:"Ethiopia West Arsi Washed Daye Bensa DISCOVERY Bag 30",saleName:"Ethiopia Daye Bensa West Arsi Washed",notes:"",createdAt:"2026-03-20T10:05:00.000Z"},
  {skuCode:"THMA3901",lotNumber:"80-0019",country:"Thailand",countryCode:"TH",grade:"Merchandise",gradeCode:"M",packSize:"Bag 30",packCode:"A",supplier:"กาแฟไทย",supplierCode:"39",region:"Chiangmai",process:"Natural",description:"Thailand Chiangmai Natural กาแฟไทย Merchandise Bag 30",saleName:"Thai กาแฟไทย Chiangmai Natural",notes:"",createdAt:"2026-03-15T10:04:00.000Z"},
  {skuCode:"GTCA0101",lotNumber:"80-0020",country:"Guatemala",countryCode:"GT",grade:"COMMERCIAL",gradeCode:"C",packSize:"Bag 30",packCode:"A",supplier:"Oklao",supplierCode:"01",region:"",process:"SHB",description:"Guatemala SHB Oklao COMMERCIAL Bag 30",saleName:"Guatemala Oklao SHB",notes:"",createdAt:"2026-03-15T10:05:00.000Z"},
  {skuCode:"EQMO0101",lotNumber:"80-0021",country:"Equipment",countryCode:"EQ",grade:"Merchandise",gradeCode:"M",packSize:"ITEM/PCS",packCode:"O",supplier:"Oklao",supplierCode:"01",region:"",process:"",description:"Equipment Oklao Merchandise ITEM/PCS",saleName:"Equipment",notes:"",createdAt:"2026-03-15T10:06:00.000Z"}
];

const data = JSON.stringify(skus);
const options = {
  hostname: 'eightyplus-sku-manager.netlify.app',
  path: '/.netlify/functions/skus',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const result = JSON.parse(body);
      if (Array.isArray(result)) {
        console.log('Created:', result.length, 'SKUs');
        result.forEach(r => console.log(' -', r.skuCode, r.notionId));
      } else {
        console.log('Result:', JSON.stringify(result));
      }
    } catch(e) { console.log('Raw:', body.substring(0, 500)); }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
