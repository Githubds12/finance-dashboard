import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Log all requests
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', msg: 'Express 5 Active' });
});

app.get('/ping', (req, res) => res.send('pong'));

// Chat logic
const getChats = () => {
  const p = path.join(__dirname, 'src', 'chats.json');
  if (!fs.existsSync(p)) return { sessions: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { sessions: [] }; }
};

const saveChats = (data) => {
  const p = path.join(__dirname, 'src', 'chats.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
};

app.get('/api/chats', (req, res) => res.json(getChats()));

app.post('/api/chats', (req, res) => {
  const chats = getChats();
  const s = { id: uuidv4(), title: `Analysis ${chats.sessions.length + 1}`, timestamp: new Date().toISOString(), history: [] };
  chats.sessions.unshift(s);
  saveChats(chats);
  res.json(s);
});

// Static
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback
app.use((req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[*] Server running on 0.0.0.0:${PORT}`);
});
