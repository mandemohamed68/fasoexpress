import re

with open('server.ts', 'r') as f:
    content = f.read()

target = '''    try {
      let cleanedVar = serviceAccountVar.trim();
      if ((cleanedVar.startsWith("'") && cleanedVar.endsWith("'")) || (cleanedVar.startsWith('"') && cleanedVar.endsWith('"'))) {
        cleanedVar = cleanedVar.substring(1, cleanedVar.length - 1).trim();
      }
      // Replace literal backslash-n with actual newlines in case it was passed as a single line string
      cleanedVar = cleanedVar.replace(/\\\\n/g, '\\n');
      
      // Sometimes env vars might have escaped quotes
      if (cleanedVar.includes('\\\\"')) {
        cleanedVar = cleanedVar.replace(/\\\\"/g, '"');
      }

      const serviceAccount = JSON.parse(cleanedVar);'''

replacement = '''    try {
      let cleanedVar = serviceAccountVar.trim();
      if ((cleanedVar.startsWith("'") && cleanedVar.endsWith("'")) || (cleanedVar.startsWith('"') && cleanedVar.endsWith('"'))) {
        cleanedVar = cleanedVar.substring(1, cleanedVar.length - 1).trim();
      }
      // Replace literal backslash-n with actual newlines in case it was passed as a single line string
      cleanedVar = cleanedVar.replace(/\\\\n/g, '\\n');
      
      // Sometimes env vars might have escaped quotes
      if (cleanedVar.includes('\\\\"')) {
        cleanedVar = cleanedVar.replace(/\\\\"/g, '"');
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(cleanedVar);
      } catch (err) {
        // Fallback for malformed JSON (like single quotes instead of double quotes)
        // Since this is an env variable set by the admin, eval is acceptable as a fallback to parse JS-object-like strings
        serviceAccount = new Function("return " + cleanedVar)();
      }'''

if target in content:
    content = content.replace(target, replacement)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
