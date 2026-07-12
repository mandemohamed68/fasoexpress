const fs = require('fs');
let code = fs.readFileSync('backend/mariadb.ts', 'utf8');
code = code.replace(/console\.error\("MariaDB query error:", e\.message, "\n/g, 'console.error("MariaDB query error:", e.message, "\\\\nSQL:", formattedSql); //');
fs.writeFileSync('backend/mariadb.ts', code);
