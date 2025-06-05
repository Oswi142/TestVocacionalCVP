import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string;
  section: number;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const IPPR: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const groupedQuestions = allQuestions.reduce((acc: { [key: number]: Question[] }, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => opt.questionid === questionId);

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleNext = () => {
    setCurrentSection(prev => prev + 1);
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  };

  const handleSubmit = async () => {
    const unanswered = allQuestions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      showSnackbar('Debes responder todas las preguntas antes de finalizar.', 'error');
      return;
    }

    setSaving(true);
    try {
      for (const q of allQuestions) {
        await supabase.from('testsanswers').insert({
          clientid: user.id,
          testid: 2,
          questionid: q.id,
          answerid: parseInt(answers[q.id])
        });
      }

      showSnackbar('Respuestas guardadas correctamente.', 'success');
    } catch (err: any) {
      showSnackbar('Error al guardar respuestas: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [questionsRes, optionsRes] = await Promise.all([
        supabase.from('questions').select('id, question, section').eq('testid', 2).order('id'),
        supabase.from('answeroptions').select('id, questionid, answer').order('id')
      ]);

      if (!questionsRes.error) setAllQuestions(questionsRes.data || []);
      if (!optionsRes.error) setAnswerOptions(optionsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', padding: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 600, backgroundColor: '#ffffff', borderRadius: 4, boxShadow: 3, padding: 4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>

        <Typography variant="h5" gutterBottom color="primary">Test: IPP-R</Typography>

        {questions.map(q => (
          <Box key={q.id} mb={3}>
            <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>
            <RadioGroup value={answers[q.id] || ''} onChange={(e) => handleChange(q.id, e.target.value)}>
              {getOptionsForQuestion(q.id).map(opt => (
                <FormControlLabel
                  key={opt.id}
                  value={String(opt.id)}
                  control={<Radio color="primary" />}
                  label={opt.answer}
                />
              ))}
            </RadioGroup>
          </Box>
        ))}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="secondary" fullWidth disabled={currentSection === 1} onClick={handlePrevious}>
            Anterior
          </Button>
          {currentSection < Object.keys(groupedQuestions).length ? (
            <Button variant="contained" color="primary" fullWidth onClick={handleNext}>
              Siguiente
            </Button>
          ) : (
            <Button variant="contained" color="success" fullWidth disabled={saving} onClick={handleSubmit}>
              {saving ? 'Guardando...' : 'Finalizar'}
            </Button>
          )}
        </Box>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default IPPR;
