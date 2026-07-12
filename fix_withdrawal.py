import re

with open('src/views/DriverDashboard.tsx', 'r') as f:
    content = f.read()

# Replace earnings < 500
content = content.replace('earnings < 500', 'earnings < 100')
# Replace amount < 500
content = content.replace('amount < 500', 'amount < 100')
# Replace Number(withdrawalAmountInput) < 500
content = content.replace('Number(withdrawalAmountInput) < 500', 'Number(withdrawalAmountInput) < 100')

with open('src/views/DriverDashboard.tsx', 'w') as f:
    f.write(content)

print("SUCCESS")
