import re

with open('backend/mariadb.ts', 'r') as f:
    content = f.read()

target = r'console.error\("MariaDB query error:", e.message, "\nSQL:", formattedSql\);'
replacement = r'console.error("MariaDB query error:", e.message, "\\nSQL:", formattedSql);'

new_content = content.replace(target, replacement)
with open('backend/mariadb.ts', 'w') as f:
    f.write(new_content)
print("SUCCESS")
