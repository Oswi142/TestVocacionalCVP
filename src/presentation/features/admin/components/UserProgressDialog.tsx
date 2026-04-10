import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { testService } from '@/infrastructure/services/testService';

interface UserProgressDialogProps {
    open: boolean;
    onClose: () => void;
    user: any | null;
    onShowMessage: (msg: string, type: 'success' | 'error') => void;
}

const UserProgressDialog: React.FC<UserProgressDialogProps> = ({ open, onClose, user, onShowMessage }) => {
    const [loading, setLoading] = useState(false);
    const [progressData, setProgressData] = useState<any>(null);

    const fetchProgress = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await testService.getDetailedProgress(user.userid);
            setProgressData(data);
        } catch (e) {
            console.error(e);
            onShowMessage('Error al cargar progreso', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && user) {
            fetchProgress();
        } else {
            setProgressData(null);
        }
    }, [open, user]);



    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: '28px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    maxHeight: '85vh'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
                Gestionar Tests: <span style={{ color: '#0891b2' }}>{user?.name}</span>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                {loading && !progressData ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="#64748b" fontWeight={600} sx={{ mb: 1 }}>
                            Estado actual de los tests del usuario.
                        </Typography>

                        {[
                            { id: 1, name: 'Entrevista Personal' },
                            { id: 2, name: 'Test IPP-R' },
                            { id: 3, name: 'Test CHASIDE' },
                            { id: 4, name: 'Test MACI' },
                            {
                                id: 5, name: 'Test DAT', subtests: [
                                    { id: 'razonamiento_verbal', name: 'R. Verbal' },
                                    { id: 'razonamiento_numerico', name: 'R. Numérico' },
                                    { id: 'razonamiento_abstracto', name: 'R. Abstracto' },
                                    { id: 'razonamiento_mecanico', name: 'R. Mecánico' },
                                    { id: 'razonamiento_espacial', name: 'R. Espacial' },
                                    { id: 'ortografia', name: 'Ortografía' }
                                ]
                            }
                        ].map((test) => (
                            <Box key={test.id} sx={{ p: 2, borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        {((test.id !== 5 && progressData?.completedMainTestIds.includes(test.id)) ||
                                            (test.id === 5 && progressData?.completedDatTypes.length >= 6)) ? (
                                            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                        )}
                                        <Typography variant="subtitle2" fontWeight={700}>{test.name}</Typography>
                                    </Box>


                                </Box>

                                {test.subtests && (
                                    <Box sx={{ mt: 1.5, pl: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1 }}>
                                        {test.subtests.map(sub => (
                                            <Box key={sub.id} display="flex" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: '10px', backgroundColor: 'white' }}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    {progressData?.completedDatTypes.includes(sub.id) ? (
                                                        <CheckCircleIcon sx={{ color: '#10b981', fontSize: 16 }} />
                                                    ) : (
                                                        <RadioButtonUncheckedIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                                                    )}
                                                    <Typography variant="caption" fontWeight={600} color="#334155">{sub.name}</Typography>
                                                </Box>

                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={onClose} variant="contained" sx={{ borderRadius: '50px', fontWeight: 700, px: 4 }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserProgressDialog;
