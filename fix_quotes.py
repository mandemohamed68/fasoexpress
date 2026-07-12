with open('backend/mariadb.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'console.error("MariaDB query error:", e.message, "' in line:
        new_lines.append('           console.error("MariaDB query error:", e.message, "\\\\nSQL:", formattedSql);\n')
    elif 'SQL:", formattedSql);' in line and not 'console.error' in line:
        pass # ignore the broken newline
    else:
        new_lines.append(line)

with open('backend/mariadb.ts', 'w') as f:
    f.writelines(new_lines)
