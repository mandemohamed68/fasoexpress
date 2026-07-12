import re

with open('src/views/Messaging.tsx', 'r') as f:
    content = f.read()

target = '''                  const newChat = await api.deliveries.create({
                    from: { address: "SUPPORT" },
                    to: { address: "SUPPORT" },
                    pickupAddress: "SUPPORT",
                    deliveryAddress: "SUPPORT",'''

replacement = '''                  const newChat = await api.deliveries.create({
                    from: { address: "SUPPORT" },
                    to: { address: "SUPPORT" },
                    pickupCode: "SUPPORT",
                    deliveryCode: "SUPPORT",'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/views/Messaging.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
