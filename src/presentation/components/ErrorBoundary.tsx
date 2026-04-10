import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            borderRadius: 8,
                            maxWidth: 500,
                            textAlign: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(255,255,255,0.5)'
                        }}
                    >
                        <WarningAmberIcon sx={{ fontSize: 80, color: '#f59e0b', mb: 2 }} />
                        <Typography variant="h4" fontWeight={800} color="#1e293b" gutterBottom>
                            Algo no salió bien
                        </Typography>
                        <Typography variant="body1" color="#64748b" sx={{ mb: 4, fontWeight: 500 }}>
                            La aplicación encontró un error inesperado al cargar. Esto puede deberse a datos antiguos guardados en tu navegador.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={this.handleReset}
                            sx={{
                                borderRadius: '50px',
                                px: 4,
                                py: 1.5,
                                fontWeight: 700,
                                backgroundColor: '#FF6F00',
                                '&:hover': { backgroundColor: '#E65100' }
                            }}
                        >
                            Limpiar cache y reiniciar
                        </Button>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
