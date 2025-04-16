import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setName(user.name);
    } else {
      navigate('/');
    }
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Bienvenido, {name} 👋</h2>
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={() => navigate('/entrevista')}>📝 Entrevista</button>
        <button onClick={() => navigate('/ippr')}>🧠 IPPR</button>
        <button onClick={() => navigate('/chaside')}>🎨 CHASIDE</button>
        <button onClick={() => navigate('/dat')}>🔧 DAT</button>
      </div>
    </div>
  );
};

export default ClientDashboard;
