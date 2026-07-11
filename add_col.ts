import db from './backend/db';

try {
  const result = db.run("ALTER TABLE deliveries ADD COLUMN cancelledBy varchar(255) DEFAULT NULL");
  console.log("Migration added cancelledBy column.");
} catch (e: any) {
  if (e.message && e.message.includes("Duplicate column name")) {
    console.log("Column cancelledBy already exists.");
  } else {
    console.error("Error adding cancelledBy:", e);
  }
}
