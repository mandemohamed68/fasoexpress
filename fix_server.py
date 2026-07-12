import re

with open('server.ts', 'r') as f:
    content = f.read()

target = '''    try {
      const serviceAccount = JSON.parse(serviceAccountVar);'''
replacement = '''    try {
      let cleanedVar = serviceAccountVar.trim();
      // If it starts with a single quote and ends with a single quote, strip them
      if (cleanedVar.startsWith("'") && cleanedVar.endsWith("'")) {
        cleanedVar = cleanedVar.substring(1, cleanedVar.length - 1).trim();
      }
      const serviceAccount = JSON.parse(cleanedVar);'''

if target in content:
    content = content.replace(target, replacement)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
