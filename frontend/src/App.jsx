import { useState } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState('encrypt');
  const [file, setFile] = useState(null);
  const [filePassword, setFilePassword] = useState('');
  const [encryptedFileUrl, setEncryptedFileUrl] = useState(null);
  const [encryptedFileName, setEncryptedFileName] = useState('');

  const login = async () => {
    try {
      const res = await axios.post('/api/login', {
        username: 'admin',
        password: '123456'
      });
      setToken(res.data.token);
      setResult('Login realizado com sucesso!');
    } catch (err) {
      setResult('Erro no login: credenciais inválidas');
    }
  };

  const processText = async () => {
    if (!token) {
      setResult('Faça login primeiro!');
      return;
    }
    if (!text || !key) {
      setResult('Preencha texto e chave!');
      return;
    }

    try {
      const endpoint = mode === 'encrypt' ? '/encrypt' : '/decrypt';
      const payload = mode === 'encrypt' ? { text, key } : { encrypted: text, key };

      const res = await axios.post(`/api${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResult(mode === 'encrypt' ? res.data.encrypted : res.data.decrypted);
    } catch (err) {
      setResult('Erro: ' + (err.response?.data?.error || err.message));
    }
  };

  // Função para criptografar arquivo no navegador (Web Crypto API)
  const encryptFile = async (file, password) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    const buffer = await file.arrayBuffer();
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      buffer
    );

    // Concatena salt + iv + dados criptografados
    const combined = new Uint8Array([
      ...salt,
      ...iv,
      ...new Uint8Array(encryptedBuffer)
    ]);

    const blob = new Blob([combined], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const newName = file.name + '.vault';

    return { url, name: newName };
  };

  const handleFileEncrypt = async () => {
    if (!file) {
      alert('Selecione um arquivo primeiro!');
      return;
    }
    if (!filePassword) {
      alert('Digite uma senha forte para o arquivo!');
      return;
    }

    try {
      const { url, name } = await encryptFile(file, filePassword);
      setEncryptedFileUrl(url);
      setEncryptedFileName(name);
      setResult('Arquivo criptografado com sucesso! Clique para baixar.');
    } catch (err) {
      setResult('Erro ao criptografar arquivo: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '700px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>VaultLock</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Criptografia segura de textos e arquivos</p>

      {!token ? (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <p>Credenciais de teste: <strong>admin</strong> / <strong>123456</strong></p>
          <button onClick={login} style={{ padding: '14px 40px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px' }}>
            Fazer Login
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#27ae60', textAlign: 'center' }}>Logado com sucesso!</p>

          {/* Parte de texto (já existente) */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar/Descriptografar Texto</h3>
            {/* ... seus inputs e botões de texto aqui - mantenha como estava */}
          </div>

          {/* Nova parte: Criptografar Arquivo */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar Arquivo (PDF, DOCX, etc.)</h3>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files[0])} 
              style={{ margin: '10px 0', display: 'block' }} 
            />
            <input 
              type="password" 
              placeholder="Senha forte para o arquivo" 
              value={filePassword} 
              onChange={(e) => setFilePassword(e.target.value)} 
              style={{ width: '100%', padding: '10px', margin: '10px 0' }} 
            />
            <button 
              onClick={handleFileEncrypt}
              style={{ width: '100%', padding: '12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px' }}
            >
              Criptografar Arquivo
            </button>

            {encryptedFileUrl && (
              <div style={{ marginTop: '20px' }}>
                <a 
                  href={encryptedFileUrl} 
                  download={encryptedFileName}
                  style={{ color: '#27ae60', fontWeight: 'bold' }}
                >
                  Baixar arquivo criptografado (.vault)
                </a>
              </div>
            )}
          </div>

          {result && <p style={{ marginTop: '20px', color: '#e74c3c' }}>{result}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
