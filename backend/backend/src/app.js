const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-forte-aqui';

app.post('/api/encrypt', (req, res) => {
  const { text, key } = req.body;
  try {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    res.json({ encrypted });
  } catch (err) {
    res.status(500).json({ error: 'Erro na criptografia' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // Simples auth de teste - troque por real depois
  if (username === 'admin' && password === '123') {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
