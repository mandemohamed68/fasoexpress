import re

with open('vite.config.ts', 'r') as f:
    content = f.read()

# remove my previous addition
content = content.replace('''      workbox: {\n        maximumFileSizeToCacheInBytes: 5000000\n      },''', '')

# add to the actual workbox block
target = '''        workbox: {\n          runtimeCaching: ['''
replacement = '''        workbox: {\n          maximumFileSizeToCacheInBytes: 5000000,\n          runtimeCaching: ['''

if target in content:
    content = content.replace(target, replacement)
    with open('vite.config.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
