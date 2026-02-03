import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Entrevista from './pages/Entrevista';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './pages/UserManagement';
import IPPR from './pages/IPPR';
import ClientsAnswers from './pages/ClientsAnswers';
import Chaside from './pages/Chaside';
import MACI from './pages/MACI';
import ClientsReports from './pages/ClientsReports';
import DatDashboard from './pages/DatDashboard';
import DatVerbal from './pages/DatVerbal';
import DatNumerico from './pages/DatNumerico';
import DatAbstracto from './pages/DatAbstracto';

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
        <Route path="/respuestas-clientes" element={<ProtectedRoute><ClientsAnswers /></ProtectedRoute>} />
        <Route path="/chaside" element={<ProtectedRoute><Chaside/></ProtectedRoute>} />
        <Route path="/maci" element={<ProtectedRoute><MACI/></ProtectedRoute>} />
        <Route path="/reportes-clientes" element={<ProtectedRoute><ClientsReports/></ProtectedRoute>} />
        <Route path="/dat" element={<DatDashboard />} />
        <Route path="/dat/verbal" element={<DatVerbal />} />
        <Route path="/dat/numerico" element={<DatNumerico />} />
        <Route path="/dat/abstracto" element={<DatAbstracto />} />
        {/*Nueva ruta */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
