import express from 'express';
const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  res.send(`Backend alive. Path: ${req.url}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[*] Minimal server on ${PORT}`);
});
