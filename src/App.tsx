import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Entrevista from './pages/Entrevista';
import CreateUser from './pages/CreateUser';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/entrevista" element={<ProtectedRoute><Entrevista /></ProtectedRoute>} />
        <Route path="/crear-usuario" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} /> 
        {/*Nueva ruta */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
