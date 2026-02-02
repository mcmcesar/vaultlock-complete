const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const path = require('path'); // Movido para o topo
const multer = require('multer');
const fs = require('fs');
const path = require('path');
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

// Servir o build do React em produção (apenas um bloco)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../frontend/dist');

  app.use(express.static(buildPath));

  // Catch-all route: qualquer rota não-API retorna index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}
// Configuração do multer para salvar arquivos na pasta uploads/
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

  // Salva metadados em um JSON simples (para MVP)
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
    user: 'admin' // depois vamos usar req.user do JWT
  };

  metadata.push(newFile);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  res.json({ message: 'Arquivo salvo com sucesso!', file: newFile });
});

// Rota para listar arquivos do usuário
app.get('/api/files', (req, res) => {
  const metadataPath = path.join(__dirname, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return res.json([]);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  // Filtrar por usuário depois
  res.json(metadata);
});

// Rota para download de arquivo salvo
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Backend VaultLock rodando em http://localhost:${PORT}`);
});
