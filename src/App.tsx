import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import ClientDashboard from './features/dashboard/pages/ClientDashboard';
import AdminDashboard from './features/dashboard/pages/AdminDashboard';
import Entrevista from './features/tests/pages/Entrevista';
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
import DatEspacial from './features/tests/pages/dat/DatEspacial';
import DatOrtografia from './features/tests/pages/dat/DatOrtografia';

import Introduccion from './features/tests/pages/Introduccion';

import { AuthProvider } from './components/AuthContext';

import { useOnlineStatus } from './hooks/useOnlineStatus';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { Box, Tooltip, Zoom } from '@mui/material';
import AnimatedBackground from './components/AnimatedBackground';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const isOnline = useOnlineStatus();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedBackground />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/introduccion" element={<ProtectedRoute requiredRole="client"><Introduccion /></ProtectedRoute>} />
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
            <Route path="/dat/espaciales" element={<ProtectedRoute requiredRole="client"><DatEspacial /></ProtectedRoute>} />
            <Route path="/dat/ortografia" element={<ProtectedRoute requiredRole="client"><DatOrtografia /></ProtectedRoute>} />
            {/*Nueva ruta acá*/}

          </Routes>
        </BrowserRouter>

        {/* Indicador de Offline sutil */}
        <Zoom in={!isOnline}>
          <Tooltip title="Sin conexión - Trabajando localmente" arrow placement="left">
            <Box
              sx={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 9999,
                backgroundColor: 'rgba(255, 111, 0, 0.9)',
                color: 'white',
                p: 1.5,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 111, 0, 0.4)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <WifiOffIcon />
            </Box>
          </Tooltip>
        </Zoom>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
