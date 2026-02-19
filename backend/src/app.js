kconst express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Garantir que a pasta uploads/ existe SEMPRE ao iniciar ───────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o777 });
    console.log(`✅ Pasta uploads criada automaticamente em: ${UPLOAD_DIR}`);
  } else {
    console.log(`📁 Pasta uploads já existe em: ${UPLOAD_DIR}`);
  }
}

ensureUploadDir(); // roda na inicialização

// ─── Configuração do Multer ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir(); // garante novamente antes de cada upload
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const METADATA_PATH = path.join(__dirname, '..', 'metadata.json');

function readMetadata() {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao ler metadata.json:', e.message);
  }
  return [];
}

function writeMetadata(data) {
  fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2));
}

// ─── Rotas ─────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    uploadDir: UPLOAD_DIR,
    uploadDirExists: fs.existsSync(UPLOAD_DIR),
  });
});

// Login simples
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    return res.json({ success: true, token: 'vault-token-admin' });
  }
  res.status(401).json({ error: 'Usuário ou senha inválidos' });
});

// Upload de arquivo .vault
app.post('/api/upload-file', upload.single('vaultFile'), async (req, res) => {
  console.log('📥 POST /api/upload-file recebido');

  try {
    if (!req.file) {
      console.log('⚠️  Nenhum arquivo em req.file');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    console.log(
      `📄 Arquivo recebido: ${req.file.originalname} | ${req.file.size} bytes | salvo em: ${req.file.path}`
    );

    const metadata = readMetadata();

    const newFile = {
      id: Date.now(),
      originalName: req.body.originalName || req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      user: req.body.user || 'admin',
    };

    metadata.push(newFile);
    writeMetadata(metadata);
    console.log('💾 Metadados salvos:', newFile);

    res.json({ message: 'Arquivo salvo com sucesso!', file: newFile });
  } catch (err) {
    console.error('❌ Erro no upload:', err.message, err.stack);
    res.status(500).json({ error: 'Erro ao salvar arquivo: ' + err.message });
  }
});

// Listar arquivos
app.get('/api/files', (req, res) => {
  try {
    const metadata = readMetadata();
    res.json({ files: metadata });
  } catch (err) {
    console.error('❌ Erro ao listar arquivos:', err.message);
    res.status(500).json({ error: 'Erro ao listar arquivos: ' + err.message });
  }
});

// Download de arquivo
app.get('/api/download/:storedName', (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Busca o nome original nos metadados
    const metadata = readMetadata();
    const fileInfo = metadata.find((f) => f.storedName === req.params.storedName);
    const downloadName = fileInfo ? fileInfo.originalName : req.params.storedName;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('❌ Erro no download:', err.message);
    res.status(500).json({ error: 'Erro ao baixar arquivo: ' + err.message });
  }
});

// Deletar arquivo
app.delete('/api/files/:id', (req, res) => {
  try {
    const metadata = readMetadata();
    const index = metadata.findIndex((f) => String(f.id) === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const fileInfo = metadata[index];
    const filePath = path.join(UPLOAD_DIR, fileInfo.storedName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Arquivo deletado: ${filePath}`);
    }

    metadata.splice(index, 1);
    writeMetadata(metadata);

    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao deletar:', err.message);
    res.status(500).json({ error: 'Erro ao deletar arquivo: ' + err.message });
  }
});

// Encrypt/Decrypt texto (passa pelo backend para logging)
app.post('/api/encrypt', (req, res) => {
  // A criptografia real é feita no frontend via Web Crypto API
  // Este endpoint apenas registra a operação
  console.log('🔒 Operação de encrypt solicitada');
  res.json({ message: 'Use a Web Crypto API no frontend para criptografar' });
});

// ─── Tratamento de erros global ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err.message, err.stack);

  // Erros do Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande (máximo 50MB)' });
  }

  res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
});

// ─── 404 para rotas não encontradas ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` });
});

// ─── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 VaultLock Backend rodando na porta ${PORT}`);
  console.log(`📁 Pasta de uploads: ${UPLOAD_DIR}`);
  console.log(`🕐 Iniciado em: ${new Date().toISOString()}`);
});

module.exports = app;
