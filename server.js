import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// DEBUG ROUTE: Match everything and tell me what you see
app.get('/debug', (req, res) => {
  res.json({
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    params: req.params,
    query: req.query,
    env: process.env.NODE_ENV,
    cwd: process.cwd()
  });
});

app.get('/ping', (req, res) => res.send('pong'));

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server listening on port ${PORT}`);
});
