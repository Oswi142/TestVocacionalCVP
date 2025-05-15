import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string;
  section: number;
}

interface School {
  id: number;
  schoolname: string;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const departamentos = [
  'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí',
  'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

const Entrevista: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [birthdayDate, setBirthdayDate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const groupedQuestions = allQuestions.reduce((acc: { [key: number]: Question[] }, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => opt.questionid === questionId);

  useEffect(() => {
    const fetchData = async () => {
      const [questionsRes, schoolsRes, optionsRes] = await Promise.all([
        supabase.from('questions').select('id, question, section').eq('testid', 1).order('section').order('id'),
        supabase.from('schools').select('id, schoolname').order('schoolname'),
        supabase.from('answeroptions').select('id, questionid, answer').order('id')
      ]);

      if (!questionsRes.error) setAllQuestions(questionsRes.data || []);
      if (!schoolsRes.error) setSchools(schoolsRes.data || []);
      if (!optionsRes.error) setAnswerOptions(optionsRes.data || []);

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    setCurrentSection(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMessage('');

    try {
      const section1 = groupedQuestions[1] || [];
      const mapped = {
        gender: answers[section1[0]?.id] || '',
        birthday: birthdayDate ? birthdayDate.format('YYYY-MM-DD') : '',
        birthplace: answers[section1[2]?.id] || '',
        address: answers[section1[3]?.id] || '',
        grade: answers[section1[5]?.id] || '',
        hobbies: answers[section1[6]?.id] || '',
      };

      const { error: infoError } = await supabase.from('clientsinfo').upsert({
        userid: user.id,
        gender: mapped.gender,
        birthday: mapped.birthday,
        birthplace: mapped.birthplace,
        address: mapped.address,
        schoolid: selectedSchoolId,
        grade: mapped.grade,
        hobbies: mapped.hobbies,
      });

      if (infoError) throw infoError;

      const section2 = groupedQuestions[2] || [];
      for (const q of section2) {
        const detail = answers[q.id];
        if (detail && detail.trim() !== '') {
          const { error: insertError } = await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            details: detail,
          });
          if (insertError) throw insertError;
        }
      }

      const section3 = groupedQuestions[3] || [];
      for (const q of section3) {
        const value = answers[q.id];
        if (!value || String(value).trim() === '') continue;

        const options = getOptionsForQuestion(q.id);
        if (options.length > 0) {
          const answerId = parseInt(value);
          await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            answerid: answerId
          });
        } else {
          await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            details: value
          });
        }
      }

      const section4 = groupedQuestions[4] || [];
      for (const q of section4) {
        const value = answers[q.id];
        if (!value || String(value).trim() === '') continue;

        const options = getOptionsForQuestion(q.id);
        if (options.length > 0) {
          const answerId = parseInt(value);
          await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            answerid: answerId
          });
        } else {
          await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            details: value
          });
        }
      }

      const section5 = groupedQuestions[5] || [];
        for (const q of section5) {
          const value = answers[q.id];
          if (!value || String(value).trim() === '') continue;

          await supabase.from('testsanswers').insert({
            clientid: user.id,
            testid: 1,
            questionid: q.id,
            details: value
          });
        }

      const section6 = groupedQuestions[6] || [];
        for (const q of section6) {
          const value = answers[q.id];
          if (!value || String(value).trim() === '') continue;

          const options = getOptionsForQuestion(q.id);
          if (options.length > 0) {
            const answerId = parseInt(value);
            await supabase.from('testsanswers').insert({
              clientid: user.id,
              testid: 1,
              questionid: q.id,
              answerid: answerId
            });
          }
        }

        const section7 = groupedQuestions[7] || [];
          for (const q of section7) {
            const value = answers[q.id];
            if (!value || String(value).trim() === '') continue;

            const options = getOptionsForQuestion(q.id);
            if (options.length > 0) {
              const answerId = parseInt(value);
              await supabase.from('testsanswers').insert({
                clientid: user.id,
                testid: 1,
                questionid: q.id,
                answerid: answerId
              });
            }
          }

          const section8 = groupedQuestions[8] || [];
            for (const q of section8) {
              const value = answers[q.id];
              if (!value || String(value).trim() === '') continue;

              const options = getOptionsForQuestion(q.id);
              if (options.length > 0) {
                const answerId = parseInt(value);
                await supabase.from('testsanswers').insert({
                  clientid: user.id,
                  testid: 1,
                  questionid: q.id,
                  answerid: answerId
                });
              }
            }

      setMessage('Respuestas guardadas correctamente.');
    } catch (err: any) {
      setMessage('Error al guardar respuestas: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 600, backgroundColor: '#ffffff', borderRadius: 4, boxShadow: 3, padding: 4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>

        <Typography variant="h5" gutterBottom color="primary">Test: Entrevista</Typography>

        {currentSection === 2 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Profundizar en la relación y ocupación de cada uno de sus familiares y otras personas significativas.
            Incluir datos como convivencia, estudios, ocupación y lugar de nacimiento.
          </Alert>
        )}

        {currentSection === 3 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Responde con sinceridad a las siguientes preguntas relacionadas con tu etapa escolar. Algunas requieren respuestas abiertas y otras selección.
          </Alert>
        )}

        {currentSection === 4 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Indica cuánto piensas que ha influido cada factor en tu elección vocacional. Selecciona una opción por cada uno.
          </Alert>
        )}

        {currentSection === 5 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Comparte tus reflexiones personales. Responde con sinceridad a las siguientes preguntas abiertas.
          </Alert>
        )}

        {currentSection === 6 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Responde si las siguientes afirmaciones son verdaderas o falsas respecto a tus planes de carrera.
          </Alert>
        )}

        {currentSection === 7 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Por favor indica si necesitas la siguiente información relacionada con tus decisiones vocacionales. Marca “Sí” o “No”.
          </Alert>
        )}

        {currentSection === 8 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Indica si presentas alguna de las siguientes dificultades relacionadas con tu elección vocacional.
          </Alert>
        )}


        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {questions.map((q) => {
            const options = getOptionsForQuestion(q.id);
            const isSelect = (currentSection === 3 || currentSection === 4|| currentSection === 6|| currentSection === 7|| currentSection === 8) && options.length > 0;

            return (
              <Box key={q.id} mb={3}>
                <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>

                {isSelect ? (
                  <FormControl fullWidth variant="outlined">
                    <Select
                      displayEmpty
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                    >
                      <MenuItem value="" disabled>Selecciona una opción</MenuItem>
                      {options.map((opt) => (
                        <MenuItem key={opt.id} value={opt.id}>{opt.answer}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : q.question.toLowerCase().includes('sexo') ? (
                  <FormControl fullWidth variant="outlined">
                    <Select
                      displayEmpty
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      inputProps={{ 'aria-label': 'Selecciona tu género' }}
                    >
                      <MenuItem value="" disabled>Selecciona tu género</MenuItem>
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Femenino">Femenino</MenuItem>
                    </Select>
                  </FormControl>
                ) : q.question.toLowerCase().includes('fecha') ? (
                  <DatePicker
                    value={birthdayDate}
                    onChange={(newValue) => setBirthdayDate(newValue)}
                    format="DD/MM/YYYY"
                  />
                ) : q.question.toLowerCase().includes('departamento') ? (
                  <FormControl fullWidth variant="outlined">
                    <Select
                      displayEmpty
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      inputProps={{ 'aria-label': 'Departamento' }}
                    >
                      <MenuItem value="" disabled>Departamento</MenuItem>
                      {departamentos.map((dep) => (
                        <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : q.question.toLowerCase().includes('colegio') ? (
                  <FormControl fullWidth variant="outlined">
                    <Select
                      displayEmpty
                      value={selectedSchoolId !== null ? String(selectedSchoolId) : ''}
                      onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                      inputProps={{ 'aria-label': 'Selecciona tu colegio' }}
                    >
                      <MenuItem value="" disabled>Selecciona tu colegio</MenuItem>
                      {schools.map((school) => (
                        <MenuItem key={school.id} value={school.id}>{school.schoolname}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={answers[q.id] || ''}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                  />
                )}
              </Box>
            );
          })}
        </LocalizationProvider>

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

        {message && (
          <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default Entrevista;