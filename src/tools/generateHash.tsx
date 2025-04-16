import React, { useState } from 'react';
import bcrypt from 'bcryptjs';

const GenerateHash: React.FC = () => {
  const [password, setPassword] = useState('');
  const [hash, setHash] = useState('');

  const handleGenerate = async () => {
    const hashed = await bcrypt.hash(password, 10);
    setHash(hashed);
  };

  return (
    <div>
      <h2>Generar Hash</h2>
      <input
        type="text"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleGenerate}>Generar</button>

      {hash && (
        <div>
          <p><strong>Hash:</strong></p>
          <textarea value={hash} readOnly rows={4} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default GenerateHash;
