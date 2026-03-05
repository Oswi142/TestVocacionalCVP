import React from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';

interface TestLayoutProps {
    title: string;
    currentSection: number;
    loading: boolean;
    saving: boolean;
    lastSaved: string;
    groupedQuestions: { [key: number]: any[] };
    isSectionComplete: (section: number) => boolean;
    onSectionChange: (section: number) => void;
    onExitClick: () => void;
    onSaveClick: () => void;
    onSubmitClick: () => void;
    onSnackbarClose: () => void;
    snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
    dialogs: { confirm: boolean; exit: boolean };
    setDialogs: React.Dispatch<React.SetStateAction<{ confirm: boolean; exit: boolean }>>;
    onConfirmExit: () => void;
    onConfirmSubmit: () => void;
    children: React.ReactNode;
}

const TestLayout: React.FC<TestLayoutProps> = ({
    title,
    currentSection,
    loading,
    saving,
    lastSaved,
    groupedQuestions,
    isSectionComplete,
    onSectionChange,
    onExitClick,
    onSaveClick,
    onSubmitClick,
    onSnackbarClose,
    snackbar,
    dialogs,
    setDialogs,
    onConfirmExit,
    onConfirmSubmit,
    children,
}) => {
    const availableSections = Object.keys(groupedQuestions)
        .map(Number)
        .sort((a, b) => a - b);

    const isAllComplete = availableSections.every(isSectionComplete);

    React.useEffect(() => {
        const container = document.getElementById('scroll-container');
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentSection]);

    if (loading) {
        return (
            <Box
                sx={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 2,
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 700, // Slightly wider for better test reading
                    height: '92vh', // Marginally taller
                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: 6, // 24px
                    boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <Box sx={{
                    padding: 2,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    flexShrink: 0
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <IconButton onClick={onExitClick}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={onSaveClick}
                            sx={{
                                borderColor: '#4caf50',
                                color: '#4caf50',
                                '&:hover': { borderColor: '#388e3c', backgroundColor: '#f1f8e9' },
                            }}
                        >
                            Guardar
                        </Button>
                    </Box>
                    <Typography variant="h5" color="#1e293b" fontWeight={800}>
                        Test: {title}
                    </Typography>
                    <Typography variant="subtitle1" color="#64748b" fontWeight={600}>
                        Sección {currentSection}
                    </Typography>
                    {lastSaved && (
                        <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: 'flex', alignItems: 'center', mt: 1 }}
                        >
                            <SaveIcon sx={{ fontSize: 12, mr: 0.5, color: '#4caf50' }} />
                            Guardado: {lastSaved}
                        </Typography>
                    )}
                </Box>

                {/* Content */}
                <Box
                    id="scroll-container"
                    sx={{ flex: 1, overflow: 'auto', padding: 3, paddingTop: 2 }}
                >
                    {children}
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        padding: 2,
                        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {availableSections.map((section) => {
                            const complete = isSectionComplete(section);
                            const isCurrent = currentSection === section;
                            return (
                                <Button
                                    key={section}
                                    onClick={() => onSectionChange(section)}
                                    sx={{
                                        minWidth: 40,
                                        height: 40,
                                        borderRadius: '50%', // Circle
                                        fontWeight: 700,
                                        color: complete || isCurrent ? '#fff' : '#475569',
                                        backgroundColor: complete ? '#4caf50' : isCurrent ? '#3b82f6' : 'rgba(255,255,255,0.8)',
                                        boxShadow: (complete || isCurrent) ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            backgroundColor: complete ? '#388e3c' : isCurrent ? '#2563eb' : '#fff',
                                            boxShadow: '0 6px 15px rgba(0,0,0,0.15)',
                                        },
                                    }}
                                >
                                    {section}
                                </Button>
                            );
                        })}
                        <Button
                            onClick={onSubmitClick}
                            disabled={saving || !isAllComplete}
                            sx={{
                                minWidth: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: isAllComplete ? '#0ea5e9' : 'rgba(207, 216, 220, 0.5)',
                                color: isAllComplete ? 'white' : '#94a3b8',
                                boxShadow: isAllComplete ? '0 4px 10px rgba(14, 165, 233, 0.3)' : 'none',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: isAllComplete ? '#0284c7' : 'rgba(207, 216, 220, 0.8)',
                                    transform: isAllComplete ? 'translateY(-2px)' : 'none',
                                    boxShadow: isAllComplete ? '0 6px 15px rgba(14, 165, 233, 0.4)' : 'none',
                                },
                            }}
                        >
                            <CheckIcon fontSize="small" />
                        </Button>
                    </Box>
                </Box>

                {/* Dialogs */}
                <Dialog
                    open={dialogs.confirm}
                    onClose={() => setDialogs((prev) => ({ ...prev, confirm: false }))}
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            backgroundColor: 'rgba(255, 253, 231, 0.85)', // #fffde7 base
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            overflow: 'hidden'
                        }
                    }}
                    sx={{
                        '& .MuiBackdrop-root': {
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                        }
                    }}
                >
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <WarningAmberIcon sx={{ fontSize: 48, color: '#f9a825', mb: 1 }} />
                        <DialogTitle sx={{ fontWeight: '800', color: '#f57f17', p: 0, pb: 1, fontSize: '1.25rem' }}>
                            ¿Enviar respuestas?
                        </DialogTitle>
                        <DialogContent sx={{ p: 0, pb: 3 }}>
                            <DialogContentText sx={{ color: '#f57f17', fontWeight: 500 }}>
                                Una vez enviadas, no podrás modificarlas.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions sx={{ justifyContent: 'center', p: 0, gap: 1 }}>
                            <Button
                                onClick={() => setDialogs((prev) => ({ ...prev, confirm: false }))}
                                variant="outlined"
                                color="warning"
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderWidth: '2px',
                                    '&:hover': { borderWidth: '2px', backgroundColor: 'rgba(245, 127, 23, 0.05)' }
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={onConfirmSubmit}
                                variant="contained"
                                color="warning"
                                disabled={saving}
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    boxShadow: '0 4px 12px rgba(245, 127, 23, 0.3)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 16px rgba(245, 127, 23, 0.4)',
                                    }
                                }}
                            >
                                Confirmar
                            </Button>
                        </DialogActions>
                    </Box>
                </Dialog>

                <Dialog
                    open={dialogs.exit}
                    onClose={() => setDialogs((prev) => ({ ...prev, exit: false }))}
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            backgroundColor: 'rgba(227, 242, 253, 0.85)', // #e3f2fd base
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            overflow: 'hidden'
                        }
                    }}
                    sx={{
                        '& .MuiBackdrop-root': {
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                        }
                    }}
                >
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <WarningAmberIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                        <DialogTitle sx={{ fontWeight: '800', color: '#1565c0', p: 0, pb: 1, fontSize: '1.25rem' }}>
                            ¿Seguro que quieres salir?
                        </DialogTitle>
                        <DialogContent sx={{ p: 0, pb: 3 }}>
                            <DialogContentText sx={{ color: '#1565c0', fontWeight: 500 }}>
                                Tus respuestas serán guardadas automáticamente.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions sx={{ justifyContent: 'center', p: 0, gap: 1 }}>
                            <Button
                                onClick={() => setDialogs((prev) => ({ ...prev, exit: false }))}
                                variant="outlined"
                                color="primary"
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderWidth: '2px',
                                    '&:hover': { borderWidth: '2px', backgroundColor: 'rgba(21, 101, 192, 0.05)' }
                                }}
                            >
                                Continuar
                            </Button>
                            <Button
                                onClick={onConfirmExit}
                                variant="contained"
                                color="primary"
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 16px rgba(21, 101, 192, 0.4)',
                                    }
                                }}
                            >
                                Salir
                            </Button>
                        </DialogActions>
                    </Box>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={onSnackbarClose}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert onClose={onSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
};

export default TestLayout;
