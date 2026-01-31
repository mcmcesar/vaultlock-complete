const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-forte-aqui-mude-isso!';

app.post('/api/encrypt', (req, res) => {
  const { text, key } = req.body;
  if (!text || !key) {
    return res.status(400).json({ error: 'Text e key são obrigatórios' });
  }
  try {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    res.json({ encrypted });
  } catch (err) {
    res.status(500).json({ error: 'Erro na criptografia: ' + err.message });
  }
});

app.post('/api/decrypt', (req, res) => {
  const { encrypted, key } = req.body;
  if (!encrypted || !key) {
    return res.status(400).json({ error: 'Encrypted e key são obrigatórios' });
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    res.json({ decrypted: originalText });
  } catch (err) {
    res.status(500).json({ error: 'Erro na descriptografia: ' + err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // Auth simples de teste - em produção use bcrypt + banco de dados!
  if (username === 'admin' && password === '123456') {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VaultLock backend online' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend VaultLock rodando em http://localhost:${PORT}`);
});
