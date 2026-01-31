import { useState } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState('encrypt'); // 'encrypt' ou 'decrypt'

  const login = async () => {
    try {
      const res = await axios.post('/api/login', {
        username: 'admin',
        password: '123456'
      });
      setToken(res.data.token);
      setResult('Login realizado com sucesso! Você agora pode usar a criptografia.');
    } catch (err) {
      setResult('Erro no login: credenciais inválidas (verifique admin / 123456)');
      console.error('Erro login:', err);
    }
  };

  const processData = async () => {
    if (!token) {
      setResult('Faça login primeiro para usar a funcionalidade!');
      return;
    }

    if (!text || !key) {
      setResult('Preencha o texto e a chave secreta!');
      return;
    }

    try {
      const endpoint = mode === 'encrypt' ? '/encrypt' : '/decrypt';
      const payload = mode === 'encrypt'
        ? { text, key }
        : { encrypted: text, key };

      const res = await axios.post(`/api${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const output = mode === 'encrypt' ? res.data.encrypted : res.data.decrypted;
      setResult(output);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido';
      setResult(`Erro ao processar: ${errorMsg}`);
      console.error('Erro processData:', err);
    }
  };

  return (
    <div style={{
      padding: '30px',
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      background: '#f9f9f9',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>VaultLock</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Criptografia e descriptografia segura com AES</p>

      {!token ? (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>
            Credenciais de teste: <strong>admin</strong> / <strong>123456</strong>
          </p>
          <button
            onClick={login}
            style={{
              padding: '14px 40px',
              fontSize: '18px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            Fazer Login
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#27ae60', fontWeight: 'bold', textAlign: 'center' }}>
            Logado com sucesso!
          </p>

          <div style={{ margin: '25px 0', textAlign: 'center' }}>
            <button
              onClick={() => setMode('encrypt')}
              style={{
                padding: '10px 25px',
                margin: '0 10px',
                background: mode === 'encrypt' ? '#3498db' : '#ecf0f1',
                color: mode === 'encrypt' ? 'white' : '#2c3e50',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: mode === 'encrypt' ? 'bold' : 'normal'
              }}
            >
              Criptografar
            </button>

            <button
              onClick={() => setMode('decrypt')}
              style={{
                padding: '10px 25px',
                margin: '0 10px',
                background: mode === 'decrypt' ? '#3498db' : '#ecf0f1',
                color: mode === 'decrypt' ? 'white' : '#2c3e50',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: mode === 'decrypt' ? 'bold' : 'normal'
              }}
            >
              Descriptografar
            </button>
          </div>

          <input
            type="text"
            placeholder={mode === 'encrypt' ? "Digite o texto que deseja proteger..." : "Cole aqui o texto criptografado..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              margin: '12px 0',
              borderRadius: '6px',
              border: '1px solid #bdc3c7',
              fontSize: '16px'
            }}
          />

          <input
            type="text"
            placeholder="Digite sua chave secreta (mantenha em segurança!)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              margin: '12px 0',
              borderRadius: '6px',
              border: '1px solid #bdc3c7',
              fontSize: '16px'
            }}
          />

          <button
            onClick={processData}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              background: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '20px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
            }}
          >
            {mode === 'encrypt' ? 'Criptografar Agora' : 'Descriptografar Agora'}
          </button>

          {result && (
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: '#ecf0f1',
              borderRadius: '8px',
              border: '1px solid #bdc3c7',
              wordBreak: 'break-all'
            }}>
              <strong style={{ display: 'block', marginBottom: '10px' }}>
                Resultado:
              </strong>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
