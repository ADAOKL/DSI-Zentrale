require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'miningvz_geheim_2026_secure_token';
const DB_FILE = path.join(__dirname, 'data', 'miningvz_db.json');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Frontend bedienen
app.use(express.static(path.join(__dirname, '..', 'miningvz.eu')));

if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE));
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({users:[],saves:{},leaderboard:[]}));

function db() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDb(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }

// JWT Validation Middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.body?.token;
  if (!token) return res.status(401).json({error:'No token provided'});
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch(e) { res.status(403).json({error:'Invalid token'}); }
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({error:'Missing credentials'});
        let data = db();
        if (data.users.find(u => u.username === username)) return res.status(409).json({error:'User exists'});
        const hashed = await bcrypt.hash(password, 10);
        const newUser = {id:Date.now(), username, password:hashed, createdAt:new Date().toISOString(), score:0};
        data.users.push(newUser);
        saveDb(data);
        res.json({success:true, userId:newUser.id});
    } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/login', async (req, res) => {
    const { name, username, pass, password } = req.body;
    const user_name = name || username;
    const user_pass = pass || password;
    if (!user_name || !user_pass) return res.status(400).json({error:'Missing credentials'});
    const data = db();
    const user = data.users.find(u => u.username === user_name);
    if (!user || !(await bcrypt.compare(user_pass, user.password))) return res.status(401).json({error:'Invalid credentials'});
    const token = jwt.sign({userId:user.id}, JWT_SECRET, {expiresIn:'7d'});
    res.json({ok:true, token, userId:user.id, name:user.username});
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({error:'Missing credentials'});
    const data = db();
    const user = data.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({error:'Invalid credentials'});
    const token = jwt.sign({userId:user.id}, JWT_SECRET, {expiresIn:'7d'});
    res.json({success:true, token, userId:user.id});
});

// Cloud Save API - POST (save state)
app.post('/api/state', verifyToken, (req, res) => {
    const { state, name } = req.body;
    if (!state) return res.status(400).json({error:'Missing state'});
    let data = db();
    data.saves[req.userId] = {state, name: name || '', lastSync:new Date().toISOString()};
    saveDb(data);
    res.json({ok:true});
});

// Cloud Save API - GET (load state)
app.get('/api/state', verifyToken, (req, res) => {
    const data = db();
    const save = data.saves[req.userId];
    if (!save) return res.status(404).json({error:'No save found'});
    res.json({ok:true, state: save.state, name: save.name});
});

// Legacy endpoints for backward compatibility
app.post('/api/game/save', verifyToken, (req, res) => {
    const { userId, gameData } = req.body;
    const user_id = userId || req.userId;
    if (!gameData) return res.status(400).json({error:'Missing data'});
    let data = db();
    data.saves[user_id] = {...gameData, lastSync:new Date().toISOString()};
    saveDb(data);
    res.json({success:true});
});

app.get('/api/game/load/:userId', verifyToken, (req, res) => {
    const data = db();
    const save = data.saves[req.params.userId];
    if (!save) return res.status(404).json({error:'No save found'});
    res.json({success:true, data:save.gameData || save});
});

// Score API - POST (new style for api.js)
app.post('/api/score', verifyToken, (req, res) => {
    const score = req.body.th_per_sec || req.body.score || 0;
    let data = db();
    const idx = data.users.findIndex(u => u.id === req.userId);
    if (idx === -1) return res.status(404).json({error:'User not found'});
    data.users[idx].score = score;
    data.leaderboard = data.users.sort((a,b) => b.score - a.score).slice(0,100);
    saveDb(data);
    res.json({ok:true, rank:data.leaderboard.findIndex(u => u.id === req.userId)+1});
});

// Stats Update API
app.put('/api/stats/update', verifyToken, (req, res) => {
    const { stats } = req.body;
    if (!stats) return res.status(400).json({error:'Missing stats'});
    let data = db();
    const idx = data.users.findIndex(u => u.id === req.userId);
    if (idx === -1) return res.status(404).json({error:'User not found'});
    data.users[idx].score = stats.th_per_sec || 0;
    data.leaderboard = data.users.sort((a,b) => b.score - a.score).slice(0,100);
    saveDb(data);
    res.json({success:true, rank:data.leaderboard.findIndex(u => u.id === req.userId)+1});
});

// Leaderboard API (public endpoint)
app.get('/api/leaderboard', (req, res) => {
    const data = db();
    res.json({ok:true, success:true, leader:data.leaderboard});
});

app.get('/', (req, res) => {
    res.send('MiningVZ Backend OK - <a href="/index.html">Zum Spiel</a>');
});

app.listen(PORT, () => {
    console.log('--- MiningVZ Backend gestartet ---');
    console.log('Läuft auf http://localhost:' + PORT);
    console.log('Frontend: http://localhost:' + PORT + '/index.html');
    console.log('Datenbank: ' + DB_FILE);
});
