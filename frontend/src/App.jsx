import { useState } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState('encrypt'); // encrypt ou decrypt para texto

  // Estados para arquivos
  const [file, setFile] = useState(null);
  const [filePassword, setFilePassword] = useState('');
  const [encryptedFileUrl, setEncryptedFileUrl] = useState(null);
  const [encryptedFileName, setEncryptedFileName] = useState('');

  const [decryptFile, setDecryptFile] = useState(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decryptedFileName, setDecryptedFileName] = useState('');

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

  // Função para criptografar arquivo no navegador (Web Crypto API - AES-GCM)
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

  // Função para descriptografar arquivo .vault
  const decryptFileFunc = async (file, password) => {
    try {
      const buffer = await file.arrayBuffer();
      const combined = new Uint8Array(buffer);

      // Extrai salt (16 bytes), iv (12 bytes), encrypted (resto)
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encryptedData = combined.slice(28);

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );

      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);

      // Remove .vault do nome para retornar o original
      const originalName = file.name.replace(/\.vault$/i, '');

      return { url, name: originalName };
    } catch (err) {
      throw new Error('Descriptografia falhou. Senha incorreta ou arquivo corrompido: ' + err.message);
    }
  };

  const handleFileDecrypt = async () => {
    if (!decryptFile) {
      alert('Selecione o arquivo .vault primeiro!');
      return;
    }
    if (!decryptPassword) {
      alert('Digite a senha usada na criptografia!');
      return;
    }

    try {
      const { url, name } = await decryptFileFunc(decryptFile, decryptPassword);
      setDecryptedFileUrl(url);
      setDecryptedFileName(name);
      setResult('Arquivo descriptografado com sucesso! Clique para baixar o original.');
    } catch (err) {
      setResult(err.message);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f9f9f9', borderRadius: '10px' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>VaultLock</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Criptografia segura de textos e arquivos</p>

      {!token ? (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <p>Credenciais de teste: <strong>admin</strong> / <strong>123456</strong></p>
          <button 
            onClick={login}
            style={{ padding: '14px 40px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Fazer Login
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#27ae60', textAlign: 'center', fontWeight: 'bold' }}>Logado com sucesso!</p>

          {/* Criptografia / Descriptografia de Texto */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar ou Descriptografar Texto</h3>
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <button 
                onClick={() => setMode('encrypt')}
                style={{ padding: '10px 20px', margin: '0 10px', background: mode === 'encrypt' ? '#3498db' : '#ecf0f1', color: mode === 'encrypt' ? 'white' : '#333', border: 'none', borderRadius: '6px' }}
              >
                Criptografar Texto
              </button>
              <button 
                onClick={() => setMode('decrypt')}
                style={{ padding: '10px 20px', margin: '0 10px', background: mode === 'decrypt' ? '#3498db' : '#ecf0f1', color: mode === 'decrypt' ? 'white' : '#333', border: 'none', borderRadius: '6px' }}
              >
                Descriptografar Texto
              </button>
            </div>

            <textarea 
              placeholder={mode === 'encrypt' ? "Digite o texto aqui..." : "Cole o texto criptografado aqui..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', height: '100px', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <input 
              type="text" 
              placeholder="Chave secreta"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <button 
              onClick={processText}
              style={{ width: '100%', padding: '12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px' }}
            >
              {mode === 'encrypt' ? 'Criptografar Texto' : 'Descriptografar Texto'}
            </button>
          </div>

          {/* Criptografar Arquivo */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar Arquivo (PDF, DOCX, imagens, etc.)</h3>
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
              style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} 
            />
            <button 
              onClick={handleFileEncrypt}
              style={{ width: '100%', padding: '12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px' }}
            >
              Criptografar Arquivo
            </button>

            {encryptedFileUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a 
                  href={encryptedFileUrl} 
                  download={encryptedFileName}
                  style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '16px' }}
                >
                  Baixar arquivo criptografado (.vault)
                </a>
              </div>
            )}
          </div>

          {/* Descriptografar Arquivo */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Descriptografar Arquivo (.vault)</h3>
            <input 
              type="file" 
              accept=".vault" 
              onChange={(e) => setDecryptFile(e.target.files[0])} 
              style={{ margin: '10px 0', display: 'block' }} 
            />
            <input 
              type="password" 
              placeholder="Senha usada na criptografia" 
              value={decryptPassword} 
              onChange={(e) => setDecryptPassword(e.target.value)} 
              style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} 
            />
            <button 
              onClick={handleFileDecrypt}
              style={{ width: '100%', padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px' }}
            >
              Descriptografar Arquivo
            </button>

            {decryptedFileUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a 
                  href={decryptedFileUrl} 
                  download={decryptedFileName}
                  style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '16px' }}
                >
                  Baixar arquivo original
                </a>
              </div>
            )}
          </div>

          {result && (
            <p style={{ marginTop: '30px', padding: '15px', background: '#ecf0f1', borderRadius: '8px', textAlign: 'center' }}>
              {result}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
