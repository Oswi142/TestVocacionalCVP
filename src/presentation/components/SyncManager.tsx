import React, { useState, useEffect } from 'react';
import { Box, Tooltip, Zoom, CircularProgress, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { testService } from '@/infrastructure/services/testService';
import { supabase } from '@/infrastructure/config/supabaseClient';

const SyncManager: React.FC<{ isOnline: boolean }> = ({ isOnline }) => {
    const [hasPending, setHasPending] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);

    const checkPending = () => {
        const pendingTests = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        const pendingInfo = JSON.parse(localStorage.getItem('pending_clients_info') || '[]');
        setHasPending(pendingTests.length > 0 || pendingInfo.length > 0);
    };

    useEffect(() => {
        checkPending();
        window.addEventListener('storage', checkPending);
        // Also check periodically just in case
        const interval = setInterval(checkPending, 3000);
        return () => {
            window.removeEventListener('storage', checkPending);
            clearInterval(interval);
        };
    }, []);

    const handleSync = async () => {
        if (!isOnline) return;
        setSyncing(true);

        try {
            // Sync Intro Info
            const pendingInfo = JSON.parse(localStorage.getItem('pending_clients_info') || '[]');
            const remainingInfo = [];
            for (const info of pendingInfo) {
                const { user_id, gender, birthday, birthplace, address, school, grade, hobbies } = info;
                const { error } = await supabase.from('clients_info').upsert({
                    user_id, gender, birthday, birthplace, address, school, grade, hobbies
                });
                if (error) {
                    console.error('Error syncing clients_info', error);
                    remainingInfo.push(info);
                }
            }
            localStorage.setItem('pending_clients_info', JSON.stringify(remainingInfo));

            // Sync Tests
            const pendingTests = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
            const remainingTests = [];
            for (const item of pendingTests) {
                try {
                    await testService.submitAnswers(item.payload);
                } catch (e) {
                    console.error('Error syncing test', e);
                    remainingTests.push(item);
                }
            }
            localStorage.setItem('pending_submissions', JSON.stringify(remainingTests));

            checkPending();
            if (remainingInfo.length === 0 && remainingTests.length === 0) {
                setSyncSuccess(true);
                setTimeout(() => setSyncSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error in general sync', error);
        } finally {
            setSyncing(false);
        }
    };

    if (!isOnline) return null;

    return (
        <Zoom in={hasPending || syncSuccess}>
            <Tooltip title={syncSuccess ? "¡Sincronizado con el servidor!" : "Presiona para enviar tus respuestas guardadas offline"} arrow placement="left">
                <Box
                    sx={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        zIndex: 9999,
                        backgroundColor: syncSuccess ? 'rgba(76, 175, 80, 0.9)' : 'rgba(25, 118, 210, 0.9)',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <IconButton onClick={handleSync} disabled={syncing || syncSuccess} sx={{ color: 'white', p: 1.5 }}>
                        {syncSuccess ? (
                            <CheckCircleIcon />
                        ) : syncing ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            <CloudUploadIcon />
                        )}
                    </IconButton>
                </Box>
            </Tooltip>
        </Zoom>
    );
};

export default SyncManager;
