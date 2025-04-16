import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
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
      <p>Este es tu panel de administrador.</p>

      {/* Aquí puedes poner botones como “Crear usuario”, “Ver resultados”, etc. */}
    </div>
  );
};

export default AdminDashboard;
