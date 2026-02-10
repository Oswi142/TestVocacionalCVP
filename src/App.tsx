import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import ClientDashboard from './features/dashboard/pages/ClientDashboard';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import Entrevista from './features/dashboard/pages/Entrevista';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import UserManagement from './features/admin/pages/UserManagement';
import IPPR from './features/tests/pages/IPPR';
import ClientsAnswers from './features/admin/pages/ClientsAnswers';
import Chaside from './features/tests/pages/Chaside';
import MACI from './features/tests/pages/MACI';
import ClientsReports from './features/admin/pages/ClientsReports';
import DatDashboard from './features/tests/pages/dat/DatDashboard';
import DatVerbal from './features/tests/pages/dat/DatVerbal';
import DatNumerico from './features/tests/pages/dat/DatNumerico';
import DatAbstracto from './features/tests/pages/dat/DatAbstracto';
import DatMecanico from './features/tests/pages/dat/DatMecanico';

import { AuthProvider } from './components/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/entrevista" element={<ProtectedRoute requiredRole="client"><Entrevista /></ProtectedRoute>} />
          <Route path="/gestion-usuarios" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
          <Route path="/ippr" element={<ProtectedRoute requiredRole="client"><IPPR /></ProtectedRoute>} />
          <Route path="/respuestas-clientes" element={<ProtectedRoute requiredRole="admin"><ClientsAnswers /></ProtectedRoute>} />
          <Route path="/chaside" element={<ProtectedRoute requiredRole="client"><Chaside /></ProtectedRoute>} />
          <Route path="/maci" element={<ProtectedRoute requiredRole="client"><MACI /></ProtectedRoute>} />
          <Route path="/reportes-clientes" element={<ProtectedRoute requiredRole="admin"><ClientsReports /></ProtectedRoute>} />
          <Route path="/dat" element={<ProtectedRoute requiredRole="client"><DatDashboard /></ProtectedRoute>} />
          <Route path="/dat/verbal" element={<ProtectedRoute requiredRole="client"><DatVerbal /></ProtectedRoute>} />
          <Route path="/dat/numerico" element={<ProtectedRoute requiredRole="client"><DatNumerico /></ProtectedRoute>} />
          <Route path="/dat/abstracto" element={<ProtectedRoute requiredRole="client"><DatAbstracto /></ProtectedRoute>} />
          <Route path="/dat/mecanico" element={<ProtectedRoute requiredRole="client"><DatMecanico /></ProtectedRoute>} />
          {/*Nueva ruta */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
