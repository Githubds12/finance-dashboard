import express from 'express';
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/health', (req, res) => res.json({ status: 'ok', msg: 'IF YOU SEE THIS THE SERVER IS RUNNING' }));

// INTENTIONALLY BROKEN STATIC PATH
app.use(express.static('DISABLED_STATIC_PATH'));

app.use((req, res) => {
  res.send(`SERVER IS RUNNING. Path: ${req.url}. If you see the dashboard UI instead of this text, then Render is serving a Static Site and ignoring server.js.`);
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
