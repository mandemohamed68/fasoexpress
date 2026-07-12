import re

with open('backend/mariadb.ts', 'r') as f:
    content = f.read()

target1 = '''  let connection: any = null;
  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {'''

target2 = '''         try {
           const result = connection.query(formattedSql);
           return result;
         } catch(e: any) {
           console.error("MariaDB query error:", e.message, "\\nSQL:", formattedSql);
           throw e;
         }'''

print("Target 1 found:", target1 in content)
print("Target 2 found:", target2 in content)
