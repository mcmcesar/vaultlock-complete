const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-forte-aqui-mude-isso!';

// Rotas de criptografia de texto
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

// Rota de login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VaultLock backend online' });
});

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Rota para upload de arquivo criptografado
app.post('/api/upload-file', upload.single('vaultFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const metadataPath = path.join(__dirname, 'metadata.json');
  let metadata = [];
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }

  const newFile = {
    id: Date.now(),
    originalName: req.body.originalName || req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    uploadDate: new Date().toISOString(),
    user: 'admin' // futuro: usar req.user do JWT
  };

  metadata.push(newFile);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  res.json({ message: 'Arquivo salvo com sucesso!', file: newFile });
});

// Lista de arquivos
app.get('/api/files', (req, res) => {
  const metadataPath = path.join(__dirname, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return res.json([]);
  }
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  res.json(metadata);
});

// Download de arquivo
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Servir o frontend React (deve ser o ÚLTIMO!)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Backend VaultLock rodando em http://localhost:${PORT}`);
});
