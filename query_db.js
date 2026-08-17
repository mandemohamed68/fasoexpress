import db from "./backend/db.js";
const row = db.prepare("SELECT pickupProofImage, deliveryProofImage FROM deliveries WHERE pickupProofImage IS NOT NULL OR deliveryProofImage IS NOT NULL LIMIT 5").all();
console.log(JSON.stringify(row, null, 2));
