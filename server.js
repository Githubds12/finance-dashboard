import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  const dataPath = path.join(__dirname, 'src', 'data.json');

  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construct Context for AI
    const financialContext = `
      You are a Professional Financial Analyst. You have access to the user's bank transactions.
      User Name: ${data.metadata.name}
      Current Balance: ${data.transactions[data.transactions.length - 1]?.balance}
      Total Transactions: ${data.transactions.length}
      
      Instructions:
      1. Provide concise, helpful financial advice.
      2. If asked about spending, analyze the transaction history.
      3. Be encouraging but realistic.
      4. Always format currency in INR (₹).
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: financialContext }] },
        { role: "model", parts: [{ text: "Understood. I am ready to analyze your financial data and provide insights. How can I help you today?" }] },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }))
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ text: response.text() });

  } catch (err) {
    console.error('Chat Error:', err);
    res.status(500).json({ error: 'Failed to connect to AI Analyst.' });
  }
});

// Sync Endpoint
app.post('/api/sync', (req, res) => {
  const overrides = req.body;
  const dataPath = path.join(__dirname, 'src', 'data.json');
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    data.transactions = data.transactions.map(t => {
      if (overrides[t.id]) {
        t.nickname = overrides[t.id].nickname || '';
        t.notes = overrides[t.id].notes || '';
      }
      return t;
    });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    if (process.env.GITHUB_TOKEN) {
      const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Githubds12/finance-dashboard.git`;
      const cmd = `
        git config user.email "bot@render.com" && \
        git config user.name "Render Bot" && \
        git add src/data.json && \
        git commit -m "Auto-sync notes" && \
        git push ${repoUrl} master
      `;
      exec(cmd, (error, stdout, stderr) => {
        if (error) console.error('Git Push Error:', stderr);
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
