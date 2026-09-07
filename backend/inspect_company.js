const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('tienda.db');

db.serialize(() => {
  db.get("SELECT datos FROM documentos WHERE tabla_nombre = 'company_profile' LIMIT 1", (err, row) => {
    if (err) console.error(err);
    else console.log("Company profile:", JSON.stringify(JSON.parse(row.datos), null, 2));
  });
});
