import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Endpoint to sync notes
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

    // Git Sync Logic
    if (process.env.GITHUB_TOKEN) {
      const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Githubds12/finance-dashboard.git`;
      const cmd = `
        git config user.email "bot@render.com" && \
        git config user.name "Render Bot" && \
        git add src/data.json && \
        git commit -m "Auto-sync notes from dashboard" && \
        git push ${repoUrl} master
      `;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) console.error('Git Push Error:', stderr);
        else console.log('Git Push Success:', stdout);
      });
    }

    res.json({ success: true, message: 'Data synced.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
