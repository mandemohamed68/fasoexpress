import re

with open('server.ts', 'r') as f:
    content = f.read()

target = '''  app.post("/api/withdrawals", authenticate, (req: any, res) => {
    if (req.user.role !== 'driver') return res.status(400).json({ error: "Drivers only" });
    const { amount, method, phone, withdrawalInfo } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });'''

replacement = '''  app.post("/api/withdrawals", authenticate, (req: any, res) => {
    if (req.user.role !== 'driver') return res.status(400).json({ error: "Drivers only" });
    const { amount, method, phone, withdrawalInfo } = req.body;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: "Invalid amount" });'''

if target in content:
    content = content.replace(target, replacement)
    content = content.replace('''    try {
      const driver = db.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId) as any;
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const pendingWithdrawalsSum = (db.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND status = 'en_attente'`).get(driver.userId) as any)?.sum || 0;
      const earnings = calculateDriverEarnings(driver.userId) - pendingWithdrawalsSum;

      if (amount > earnings) return res.status(400).json({ error: "Amount exceeds available balance" });

      const id = uuidv4();
      db.prepare(`
        INSERT INTO withdrawals (id, driverId, driverName, amount, status, method, phone, withdrawalInfo)
        VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?)
      `).run(id, req.user.userId, req.user.name, amount, method, phone, withdrawalInfo || phone);''', '''    try {
      const driver = db.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId) as any;
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const pendingWithdrawalsSum = (db.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND status = 'en_attente'`).get(driver.userId) as any)?.sum || 0;
      const earnings = calculateDriverEarnings(driver.userId) - pendingWithdrawalsSum;

      if (amountNum > earnings) return res.status(400).json({ error: "Amount exceeds available balance" });

      const id = uuidv4();
      db.prepare(`
        INSERT INTO withdrawals (id, driverId, driverName, amount, status, method, phone, withdrawalInfo)
        VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?)
      `).run(id, req.user.userId, req.user.name, amountNum, method, phone, withdrawalInfo || phone);''')
    with open('server.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
