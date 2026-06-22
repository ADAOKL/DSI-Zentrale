const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function createUser() {
  const DB_FILE = path.join(__dirname, 'data', 'miningvz_db.json');
  const data = JSON.parse(fs.readFileSync(DB_FILE));
  
  const hashed = await bcrypt.hash('admin123', 10);
  const userId = Date.now();
  
  const newUser = {
    id: userId,
    username: "admin",
    password: hashed,
    createdAt: new Date().toISOString(),
    score: 0
  };
  
  // Add user
  data.users.push(newUser);
  
  // Add presaved game data for this user
  data.saves[userId] = {
    userId: userId,
    username: "Admin",
    level: 1,
    ths: 0,
    mag: 1000,
    click: 0,
    diamonds: 0,
    karma: 100,
    posts: 0,
    prestigeCount: 0,
    prestigeBonus: 0,
    dailyStreak: 0,
    lastDaily: new Date().toISOString(),
    upgrades: {},
    diamondUpgrades: {},
    milestones: [],
    groups: [],
    badges: [],
    lastSync: new Date().toISOString()
  };
  
  // Add to leaderboard
  data.leaderboard.push({
    id: userId,
    username: "admin",
    score: 0,
    createdAt: new Date().toISOString()
  });
  
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  
  console.log('✓ User created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('User ID:', userId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createUser().catch(console.error);
