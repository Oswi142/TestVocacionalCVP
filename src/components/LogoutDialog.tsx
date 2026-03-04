import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface LogoutDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutDialog: React.FC<LogoutDialogProps> = ({ open, onClose, onConfirm }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderRadius: 4, // 16px
                    backgroundColor: 'rgba(255, 235, 238, 0.85)', // #ffebee base
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
                <WarningAmberIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 1 }} />
                <DialogTitle sx={{ fontWeight: '800', color: '#c62828', p: 0, pb: 1, fontSize: '1.25rem' }}>
                    ¿Cerrar sesión?
                </DialogTitle>
                <DialogContent sx={{ p: 0, pb: 3 }}>
                    <DialogContentText sx={{ color: '#5f2120', fontWeight: 500 }}>
                        Estás a punto de salir de tu cuenta.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', p: 0, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        color="error"
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderWidth: '2px',
                            '&:hover': { borderWidth: '2px', backgroundColor: 'rgba(211, 47, 47, 0.05)' }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        color="error"
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(211, 47, 47, 0.4)',
                            }
                        }}
                    >
                        Salir
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default LogoutDialog;
