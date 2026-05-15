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

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const getChats = () => {
  const p = path.join(__dirname, 'src', 'chats.json');
  if (!fs.existsSync(p)) return { sessions: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { sessions: [] }; }
};

const saveChats = (data) => {
  const p = path.join(__dirname, 'src', 'chats.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  if (process.env.GITHUB_TOKEN) {
    const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Githubds12/finance-dashboard.git`;
    const cmd = `git config user.email "bot@render.com" && git config user.name "Render Bot" && git add src/chats.json && git commit -m "Update chats" && git push ${repoUrl} master`;
    exec(cmd);
  }
};

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', engine: 'Express 4' }));
app.get('/api/chats', (req, res) => res.json(getChats()));

app.post('/api/chats', (req, res) => {
  const chats = getChats();
  const s = { id: uuidv4(), title: `Analysis ${chats.sessions.length + 1}`, timestamp: new Date().toISOString(), history: [] };
  chats.sessions.unshift(s);
  saveChats(chats);
  res.json(s);
});

app.post('/api/chat/:sessionId', async (req, res) => {
  const { message } = req.body;
  const { sessionId } = req.params;
  const chats = getChats();
  const session = chats.sessions.find(s => s.id === sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const dataPath = path.join(__dirname, 'src', 'data.json');
  try {
    const financialData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `Context: ${financialData.metadata.name}. Use ₹.` }] },
        { role: "model", parts: [{ text: "Active." }] },
        ...session.history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }))
      ],
    });
    const result = await chat.sendMessage(message);
    const aiText = (await result.response).text();
    session.history.push({ role: 'user', text: message }, { role: 'ai', text: aiText });
    saveChats(chats);
    res.json({ text: aiText });
  } catch (err) { res.status(500).json({ error: 'AI Error' }); }
});

// Static
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Catch-all (Express 4 syntax)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`[*] Finance Server Active on Port ${PORT}`));
