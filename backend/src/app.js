import { useState } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState('encrypt');

  // Estados para arquivos
  const [file, setFile] = useState(null);
  const [filePassword, setFilePassword] = useState('');
  const [encryptedFileUrl, setEncryptedFileUrl] = useState(null);
  const [encryptedFileName, setEncryptedFileName] = useState('');

  const [decryptFile, setDecryptFile] = useState(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decryptedFileName, setDecryptedFileName] = useState('');

  const [savedFiles, setSavedFiles] = useState([]);

  const login = async () => {
    try {
      const res = await axios.post('/api/login', {
        username: 'admin',
        password: '123456'
      });
      setToken(res.data.token);
      setResult('Login realizado com sucesso!');
      fetchFiles(); // carrega lista após login
    } catch (err) {
      setResult('Erro no login: credenciais inválidas');
    }
  };

  const processText = async () => {
    if (!token) return setResult('Faça login primeiro!');
    if (!text || !key) return setResult('Preencha texto e chave!');
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

  const encryptFile = async (file, password) => {
    try {
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
    } catch (err) {
      throw new Error('Erro ao criptografar arquivo: ' + err.message);
    }
  };

  const handleFileEncrypt = async () => {
    if (!file) return alert('Selecione um arquivo!');
    if (!filePassword) return alert('Digite uma senha!');
    try {
      const { url, name } = await encryptFile(file, filePassword);
      setEncryptedFileUrl(url);
      setEncryptedFileName(name);
      setResult('Arquivo criptografado! Clique para baixar ou salvar no servidor.');
    } catch (err) {
      setResult(err.message);
    }
  };

  const decryptFileFunc = async (file, password) => {
    try {
      const buffer = await file.arrayBuffer();
      const combined = new Uint8Array(buffer);

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
      const originalName = file.name.replace(/\.vault$/i, '');

      return { url, name: originalName };
    } catch (err) {
      throw new Error('Descriptografia falhou. Senha incorreta ou arquivo corrompido: ' + err.message);
    }
  };

  const handleFileDecrypt = async () => {
    if (!decryptFile) return alert('Selecione o arquivo .vault!');
    if (!decryptPassword) return alert('Digite a senha!');
    try {
      const { url, name } = await decryptFileFunc(decryptFile, decryptPassword);
      setDecryptedFileUrl(url);
      setDecryptedFileName(name);
      setResult('Arquivo descriptografado com sucesso! Clique para baixar o original.');
    } catch (err) {
      setResult(err.message);
    }
  };

  const handleSaveToServer = async () => {
    console.log('Botão Salvar no Servidor clicado!');
    if (!token) return setResult('Faça login primeiro!');
    if (!encryptedFileUrl || !encryptedFileName) return setResult('Criptografe um arquivo primeiro!');

    try {
      console.log('Baixando o arquivo criptografado do URL temporário...');
      const response = await fetch(encryptedFileUrl);
      if (!response.ok) throw new Error('Falha ao carregar o blob do arquivo criptografado');

      const blob = await response.blob();
      const fileToUpload = new File([blob], encryptedFileName, { type: 'application/octet-stream' });
      console.log('Arquivo preparado para envio:', fileToUpload.name, fileToUpload.size);

      const formData = new FormData();
      formData.append('vaultFile', fileToUpload);
      formData.append('originalName', encryptedFileName.replace('.vault', ''));

      console.log('Enviando POST para /api/upload-file... Token:', token.substring(0, 20) + '...');

      const res = await axios.post('/api/upload-file', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Resposta do servidor:', res.data);
      setResult('Salvo no servidor com sucesso! Veja na lista abaixo.');
      fetchFiles(); // atualiza a lista automaticamente
    } catch (err) {
      console.error('Erro completo no salvamento:', err);
      console.error('Detalhes do erro:', err.response ? err.response.data : err.message);
      setResult('Erro ao salvar no servidor: ' + (err.response?.data?.error || err.message || 'Erro desconhecido'));
    }
  };

  const fetchFiles = async () => {
    console.log('Atualizando lista de arquivos salvos...');
    try {
      const res = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Arquivos recebidos do servidor:', res.data);
      setSavedFiles(res.data);
      setResult('Lista de arquivos atualizada!');
    } catch (err) {
      console.error('Erro ao listar arquivos:', err);
      setResult('Erro ao atualizar lista: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f9f9f9', borderRadius: '10px' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>VaultLock</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Criptografia segura de textos e arquivos</p>

      {!token ? (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <p>Credenciais de teste: <strong>admin</strong> / <strong>123456</strong></p>
          <button onClick={login} style={{ padding: '14px 40px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Fazer Login
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#27ae60', textAlign: 'center', fontWeight: 'bold' }}>Logado com sucesso!</p>

          {/* Criptografar/Descriptografar Texto */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar ou Descriptografar Texto</h3>
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <button onClick={() => setMode('encrypt')} style={{ padding: '10px 20px', margin: '0 10px', background: mode === 'encrypt' ? '#3498db' : '#ecf0f1', color: mode === 'encrypt' ? 'white' : '#333', border: 'none', borderRadius: '6px' }}>
                Criptografar Texto
              </button>
              <button onClick={() => setMode('decrypt')} style={{ padding: '10px 20px', margin: '0 10px', background: mode === 'decrypt' ? '#3498db' : '#ecf0f1', color: mode === 'decrypt' ? 'white' : '#333', border: 'none', borderRadius: '6px' }}>
                Descriptografar Texto
              </button>
            </div>
            <textarea placeholder={mode === 'encrypt' ? "Texto aqui..." : "Texto criptografado aqui..."} value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', height: '100px', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Chave secreta" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
            <button onClick={processText} style={{ width: '100%', padding: '12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px' }}>
              {mode === 'encrypt' ? 'Criptografar Texto' : 'Descriptografar Texto'}
            </button>
          </div>

          {/* Criptografar Arquivo */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Criptografar Arquivo</h3>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ margin: '10px 0', display: 'block' }} />
            <input type="password" placeholder="Senha forte" value={filePassword} onChange={(e) => setFilePassword(e.target.value)} style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
            <button onClick={handleFileEncrypt} style={{ width: '100%', padding: '12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px' }}>
              Criptografar Arquivo
            </button>
            {encryptedFileUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a href={encryptedFileUrl} download={encryptedFileName} style={{ color: '#27ae60', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                  Baixar .vault
                </a>
                <button onClick={handleSaveToServer} style={{ width: '100%', padding: '12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px' }}>
                  Salvar no Servidor
                </button>
              </div>
            )}
          </div>

          {/* Descriptografar Arquivo */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Descriptografar Arquivo (.vault)</h3>
            <input type="file" accept=".vault" onChange={(e) => setDecryptFile(e.target.files[0])} style={{ margin: '10px 0', display: 'block' }} />
            <input type="password" placeholder="Senha" value={decryptPassword} onChange={(e) => setDecryptPassword(e.target.value)} style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
            <button onClick={handleFileDecrypt} style={{ width: '100%', padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px' }}>
              Descriptografar Arquivo
            </button>
            {decryptedFileUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a href={decryptedFileUrl} download={decryptedFileName} style={{ color: '#27ae60', fontWeight: 'bold' }}>
                  Baixar Original
                </a>
              </div>
            )}
          </div>

          {/* Lista de arquivos salvos */}
          <div style={{ margin: '30px 0', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Arquivos Salvos no Servidor</h3>
            <button onClick={fetchFiles} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '15px' }}>
              Atualizar Lista
            </button>
            {savedFiles.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {savedFiles.map(file => (
                  <li key={file.id} style={{ margin: '10px 0', padding: '10px', background: '#ecf0f1', borderRadius: '6px' }}>
                    <strong>{file.originalName}</strong> ({(file.size / 1024).toFixed(2)} KB) - {new Date(file.uploadDate).toLocaleString()}
                    <br />
                    <a href={`/api/download/${file.storedName}`} download style={{ color: '#27ae60', fontWeight: 'bold' }}>
                      Baixar .vault
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum arquivo salvo ainda. Criptografe e salve um!</p>
            )}
          </div>

          {result && <p style={{ marginTop: '20px', color: '#e74c3c', textAlign: 'center', fontWeight: 'bold' }}>{result}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
