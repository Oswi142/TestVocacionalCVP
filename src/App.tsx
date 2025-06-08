import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Entrevista from './pages/Entrevista';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './pages/UserManagement';
import IPPR from './pages/IPPR';
import ClientsResults from './pages/ClientsResults';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/entrevista" element={<ProtectedRoute><Entrevista /></ProtectedRoute>} />
        <Route path="/gestion-usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} /> 
        <Route path="/ippr" element={<ProtectedRoute><IPPR /></ProtectedRoute>} />
        <Route path="/resultados-clientes" element={<ProtectedRoute><ClientsResults /></ProtectedRoute>} />
        {/*Nueva ruta */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
