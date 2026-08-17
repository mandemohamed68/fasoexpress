import db from "./backend/db";
const row = db.prepare("SELECT id, status, proofImage, pickupProofImage, deliveryProofImage FROM deliveries ORDER BY createdAt DESC LIMIT 10").all();
console.log(JSON.stringify(row, null, 2));
