import re

with open('server.ts', 'r') as f:
    content = f.read()

target = '''      // Replace literal 
 with actual newlines in case it was passed as a single line string
      cleanedVar = cleanedVar.replace(/\\\\n/g, '\\n');
      
      // Sometimes env vars might have escaped quotes
      if (cleanedVar.includes('\\\\"')) {
        cleanedVar = cleanedVar.replace(/\\\\"/g, '"');
      }

      const serviceAccount = JSON.parse(cleanedVar);'''

replacement = '''      // Replace literal backslash-n with actual newlines in case it was passed as a single line string
      cleanedVar = cleanedVar.replace(/\\\\n/g, '\\n');
      
      // Sometimes env vars might have escaped quotes
      if (cleanedVar.includes('\\\\"')) {
        cleanedVar = cleanedVar.replace(/\\\\"/g, '"');
      }

      const serviceAccount = JSON.parse(cleanedVar);'''

if target in content:
    content = content.replace(target, replacement)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
