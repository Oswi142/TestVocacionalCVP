import React from 'react';
import { Box, Typography, CircularProgress, Dialog } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

interface ActionOverlayProps {
    open: boolean;
    message: string;
    submessage?: string;
}

const ActionOverlay: React.FC<ActionOverlayProps> = ({ open, message, submessage }) => {
    return (
        <Dialog
            open={open}
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    overflow: 'hidden',
                    maxWidth: '400px',
                    width: '100%'
                }
            }}
            sx={{
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                }
            }}
        >
            <Box sx={{ textAlign: 'center', p: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress size={64} thickness={4} sx={{ color: '#0ea5e9' }} />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CheckIcon sx={{ color: '#0ea5e9', fontSize: 24, opacity: 0.5 }} />
                    </Box>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                        {message}
                    </Typography>
                    {submessage && (
                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                            {submessage}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

export default ActionOverlay;
