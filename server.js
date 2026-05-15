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
  const chatPath = path.join(__dirname, 'src', 'chats.json');
  if (!fs.existsSync(chatPath)) return { sessions: [] };
  try { return JSON.parse(fs.readFileSync(chatPath, 'utf8')); } catch (e) { return { sessions: [] }; }
};

const saveChats = (data) => {
  const chatPath = path.join(__dirname, 'src', 'chats.json');
  fs.writeFileSync(chatPath, JSON.stringify(data, null, 2));
  if (process.env.GITHUB_TOKEN) {
    const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Githubds12/finance-dashboard.git`;
    const cmd = `git config user.email "bot@render.com" && git config user.name "Render Bot" && git add src/chats.json && git commit -m "Update chats" && git push ${repoUrl} master`;
    exec(cmd);
  }
};

// --- API ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/chats', (req, res) => {
  res.json(getChats());
});

app.post('/api/chats', (req, res) => {
  const { title } = req.body;
  const chats = getChats();
  const newSession = {
    id: uuidv4(),
    title: title || `Analysis ${chats.sessions.length + 1}`,
    timestamp: new Date().toISOString(),
    history: []
  };
  chats.sessions.unshift(newSession);
  saveChats(chats);
  res.json(newSession);
});

app.patch('/api/chats/:id', (req, res) => {
  const { title } = req.body;
  const { id } = req.params;
  const chats = getChats();
  const session = chats.sessions.find(s => s.id === id);
  if (session) {
    session.title = title;
    saveChats(chats);
    res.json(session);
  } else res.status(404).json({ error: 'Not found' });
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
        { role: "user", parts: [{ text: `Analyst context: ${financialData.metadata.name}. Use ₹.` }] },
        { role: "model", parts: [{ text: "Understood." }] },
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

// --- STATIC & FALLBACK ---
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  // If request starts with /api but didn't match any route above, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  // Otherwise, serve SPA
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
