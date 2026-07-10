const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'local.db'));
const row = db.prepare("SELECT value FROM config WHERE key = 'app_config'").get();
if (row) {
  const config = JSON.parse(row.value);
  config.flashInfoActive = true;
  config.flashInfoMessages = ["📢 Bienvenue sur FASO EXPRESS !", "🚀 Livraison rapide et sécurisée", "🎁 Profitez de nos promotions !"];
  db.prepare("UPDATE config SET value = ? WHERE key = 'app_config'").run(JSON.stringify(config));
  console.log("Updated app_config to active");
} else {
  console.log("app_config NOT FOUND");
}
