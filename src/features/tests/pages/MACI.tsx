import React from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import { useTestLogic } from '../../../hooks/useTestLogic';

interface Question {
  id: number;
  question: string;
  section: number;
}

const MACI: React.FC = () => {
  const {
    allQuestions,
    answerOptions,
    currentSection,
    setCurrentSection,
    answers,
    setAnswers,
    loading,
    saving,
    lastSaved,
    snackbar,
    handleSnackbarClose,
    dialogs,
    setDialogs,
    handleManualSave,
    submitTest,
    groupedQuestions,
    isSectionComplete,
    navigate,
  } = useTestLogic<Question>(4, 'maci');

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => opt.questionid === questionId);

  const isAllComplete = (): boolean => {
    return Object.keys(groupedQuestions).every((key) => {
      const section = parseInt(key);
      return isSectionComplete(section);
    });
  };

  const handleFinalSubmit = () => {
    const unanswered = allQuestions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert('Debes responder todas las preguntas antes de finalizar.');
      return;
    }
    submitTest();
  };

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #f9c9a4, #cafacc)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 2, overflow: 'hidden' }}>
      <Box sx={{ width: '100%', maxWidth: 600, height: '90vh', backgroundColor: '#ffffff', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <IconButton onClick={() => setDialogs(prev => ({ ...prev, exit: true }))}>
              <ArrowBackIcon />
            </IconButton>
            <Button variant="outlined" size="small" startIcon={<SaveIcon />} onClick={handleManualSave} sx={{ borderColor: '#4caf50', color: '#4caf50', '&:hover': { borderColor: '#388e3c', backgroundColor: '#f1f8e9' } }}>
              Guardar
            </Button>
          </Box>
          <Typography variant="h5" color="primary">Test: MACI</Typography>
          <Typography variant="subtitle1" color="primary">Sección {currentSection}</Typography>
          {lastSaved && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <SaveIcon sx={{ fontSize: 12, mr: 0.5, color: '#4caf50' }} />
              Guardado: {lastSaved}
            </Typography>
          )}
        </Box>

        {/* Content */}
        <Box id="scroll-container" sx={{ flex: 1, overflow: 'auto', padding: 3, paddingTop: 2 }}>
          {questions.map((q) => (
            <Box key={q.id} mb={4}>
              <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>
              <RadioGroup value={answers[q.id] || ''} onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}>
                {getOptionsForQuestion(q.id).map((opt) => (
                  <FormControlLabel key={opt.id} value={String(opt.id)} control={<Radio color="primary" />} label={opt.answer} />
                ))}
              </RadioGroup>
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box sx={{ padding: 2, borderTop: '1px solid #e0e0e0', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(groupedQuestions).map((key) => {
              const section = parseInt(key);
              const complete = isSectionComplete(section);
              const isCurrent = currentSection === section;
              return (
                <Button key={section} onClick={() => setCurrentSection(section)}
                  sx={{
                    minWidth: 36, height: 36, borderRadius: '50%', color: complete || isCurrent ? '#fff' : '#333',
                    backgroundColor: complete ? '#4caf50' : isCurrent ? '#1976d2' : '#f0f0f0',
                    '&:hover': { backgroundColor: complete ? '#388e3c' : isCurrent ? '#1565c0' : '#e0e0e0' }
                  }}>
                  {section}
                </Button>
              );
            })}
            <Button onClick={() => setDialogs(prev => ({ ...prev, confirm: true }))} disabled={saving || !isAllComplete()}
              sx={{
                minWidth: 36, height: 36, borderRadius: '50%', backgroundColor: isAllComplete() ? '#0288d1' : '#cfd8dc', color: isAllComplete() ? 'white' : '#757575',
                '&:hover': { backgroundColor: isAllComplete() ? '#0277bd' : '#cfd8dc' }
              }}>
              <CheckIcon fontSize="small" />
            </Button>
          </Box>
        </Box>

        {/* Dialogs */}
        <Dialog open={dialogs.confirm} onClose={() => setDialogs(prev => ({ ...prev, confirm: false }))}>
          <Box sx={{ textAlign: 'center', p: 3, backgroundColor: '#fffde7' }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#f9a825', mb: 1 }} />
            <DialogTitle sx={{ fontWeight: 'bold', color: '#f57f17' }}>¿Enviar respuestas?</DialogTitle>
            <DialogContent><DialogContentText>Una vez enviadas, no podrás modificarlas.</DialogContentText></DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
              <Button onClick={() => setDialogs(prev => ({ ...prev, confirm: false }))} variant="outlined" color="warning">Cancelar</Button>
              <Button onClick={() => { setDialogs(prev => ({ ...prev, confirm: false })); handleFinalSubmit(); }} variant="contained" color="warning" disabled={saving}>Confirmar</Button>
            </DialogActions>
          </Box>
        </Dialog>

        <Dialog open={dialogs.exit} onClose={() => setDialogs(prev => ({ ...prev, exit: false }))}>
          <Box sx={{ textAlign: 'center', p: 3, backgroundColor: '#e3f2fd' }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1565c0' }}>¿Seguro que quieres salir?</DialogTitle>
            <DialogContent><DialogContentText>Tus respuestas serán guardadas automáticamente.</DialogContentText></DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
              <Button onClick={() => setDialogs(prev => ({ ...prev, exit: false }))} variant="outlined" color="primary">Continuar</Button>
              <Button onClick={() => { setDialogs(prev => ({ ...prev, exit: false })); navigate(-1); }} variant="contained" color="primary">Salir</Button>
            </DialogActions>
          </Box>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default MACI;
