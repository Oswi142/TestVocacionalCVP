import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Entrevista from './pages/Entrevista';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/entrevista" element={<Entrevista />} />
        {/* Puedes agregar más rutas después */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
