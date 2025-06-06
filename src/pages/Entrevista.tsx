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
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';



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
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const conditionalVisibility: Record<number, number> = {
    17: 16,
    20: 19,
    27: 26
  };

  const shouldDisplayQuestion = (questionId: number): boolean => {
    const dependentId = conditionalVisibility[questionId];
    if (!dependentId) return true;

    const selectedAnswerId = answers[dependentId];
    const options = getOptionsForQuestion(dependentId);
    const selectedAnswer = options.find(opt => String(opt.id) === String(selectedAnswerId));
    return selectedAnswer?.answer?.toLowerCase() === 'sí';
  };

  const isSectionComplete = (section: number): boolean => {
    const questions = groupedQuestions[section] || [];

    return questions.every((q) => {
      if (!shouldDisplayQuestion(q.id)) return true;

      const value = answers[q.id];

      // Fecha de nacimiento
      if (q.question.toLowerCase().includes('fecha')) {
        return !!birthdayDate;
      }

      // Colegio
      if (q.question.toLowerCase().includes('colegio')) {
        return selectedSchoolId !== null;
      }

      return !!value && value.trim() !== '';
    });
  };

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
    const trimmed = value.trim();

    setAnswers(prev => ({
      ...prev,
      [id]: trimmed === '' ? '' : value
    }));
  };

  const isAllComplete = (): boolean => {
    return Object.keys(groupedQuestions).every((key) => {
      const section = parseInt(key);
      return isSectionComplete(section);
    });
  };
  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      // Debug: log current state
      console.log('Current answers:', answers);
      console.log('Selected school:', selectedSchoolId);
      console.log('Birthday:', birthdayDate);
      console.log('User:', user);
      
      // Verificar que el usuario esté disponible
      if (!user || !user.id) {
        throw new Error('Usuario no encontrado en localStorage');
      }

      // Validación mejorada
      const allVisibleQuestions = allQuestions.filter(q => shouldDisplayQuestion(q.id));
      console.log('All visible questions:', allVisibleQuestions.map(q => ({ id: q.id, question: q.question })));
      
      const unansweredRequired = allVisibleQuestions.filter(q => {
        // Excluir preguntas condicionales que no deben validarse
        if ([17, 20, 27].includes(q.id)) return false;
        
        const value = answers[q.id];
        
        // Para la pregunta de fecha de nacimiento
        if (q.question.toLowerCase().includes('fecha')) {
          return !birthdayDate;
        }
        
        // Para la pregunta de colegio
        if (q.question.toLowerCase().includes('colegio')) {
          return !selectedSchoolId;
        }
        
        return !value || String(value).trim() === '';
      });

      console.log('Unanswered required questions:', unansweredRequired.map(q => ({ id: q.id, question: q.question })));

      if (unansweredRequired.length > 0) {
        const missingSections = [
          ...new Set(unansweredRequired.map(q => q.section))
        ];

        const secciones = missingSections.join(', ');
        showSnackbar(`Faltan preguntas por contestar en la(s) sección(es): ${secciones}`, 'error');
        setSaving(false);
        return;
      }


      // Mapear respuestas de la sección 1
      const section1 = groupedQuestions[1] || [];
      console.log('Section 1 questions:', section1);
      
      const mapped = {
        gender: answers[section1[0]?.id] || '',
        birthday: birthdayDate ? birthdayDate.format('YYYY-MM-DD') : '',
        birthplace: answers[section1[2]?.id] || '',
        address: answers[section1[3]?.id] || '',
        grade: answers[section1[5]?.id] || '',
        hobbies: answers[section1[6]?.id] || '',
      };
      
      console.log('Mapped data for clientsinfo:', mapped);

      // Insertar/actualizar información del cliente
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

      if (infoError) {
        console.error('Error inserting clientsinfo:', infoError);
        throw infoError;
      }

      console.log('Successfully inserted clientsinfo');

      // Procesar respuestas de cada sección
      const sectionsToProcess = [2, 3, 4, 5, 6, 7, 8];
      
      for (const sectionNum of sectionsToProcess) {
        const sectionQuestions = groupedQuestions[sectionNum] || [];
        console.log(`Processing section ${sectionNum}:`, sectionQuestions.length, 'questions');
        
        for (const q of sectionQuestions) {
          if (!shouldDisplayQuestion(q.id)) {
            console.log(`Skipping question ${q.id} due to conditional visibility`);
            continue;
          }
          
          const value = answers[q.id];
          if (!value || String(value).trim() === '') {
            console.log(`Skipping question ${q.id} - no answer provided`);
            continue;
          }

          const options = getOptionsForQuestion(q.id);
          let insertData: any = {
            clientid: user.id,
            testid: 1,
            questionid: q.id
          };

          if (options.length > 0) {
            // Pregunta con opciones - usar answerid
            const answerId = parseInt(value);
            if (isNaN(answerId)) {
              console.error(`Invalid answer ID for question ${q.id}:`, value);
              continue;
            }
            insertData.answerid = answerId;
          } else {
            // Pregunta abierta - usar details
            insertData.details = value;
          }
          
          console.log(`Inserting answer for question ${q.id}:`, insertData);
          
          const { error: insertError } = await supabase.from('testsanswers').insert(insertData);
          if (insertError) {
            console.error(`Error inserting answer for question ${q.id}:`, insertError);
            throw insertError;
          }
        }
      }

      showSnackbar('Respuestas guardadas correctamente.', 'success');
      setTimeout(() => {
        navigate('/client');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error saving data:', err);
      showSnackbar('Error al guardar respuestas: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(to right, #f9c9a4, #cafacc)' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'linear-gradient(to right, #f9c9a4, #cafacc)', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 2,
      overflow: 'hidden' // Prevenir scroll en el contenedor principal
    }}>
      <Box sx={{ 
        width: '100%', 
        maxWidth: 600, 
        height: '90vh', // Altura fija para el contenedor
        backgroundColor: '#ffffff', 
        borderRadius: 4, 
        boxShadow: 3,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // Prevenir desbordamiento
      }}>
        {/* Header fijo */}
        <Box sx={{ 
          padding: 2, 
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0 // No se encoge
        }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" color="primary">Test: Entrevista</Typography>
          <Typography variant="subtitle1" color="primary">
            Sección {currentSection}
          </Typography>

        </Box>

        {/* Contenido scrolleable */}
        <Box 
          id="scroll-container"
          sx={{ 
            flex: 1, // Toma todo el espacio disponible
            overflow: 'auto', // Scroll vertical cuando sea necesario
            padding: 3,
            paddingTop: 2
          }}
        >
          {/* Alerts para cada sección */}
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
              Por favor indica si necesitas la siguiente información relacionada con tus decisiones vocacionales. Marca "Sí" o "No".
            </Alert>
          )}

          {currentSection === 8 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Indica si presentas alguna de las siguientes dificultades relacionadas con tu elección vocacional.
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {questions.map((q) => {
              if (!shouldDisplayQuestion(q.id)) return null;
              const options = getOptionsForQuestion(q.id);
              const isSelect = (currentSection === 3 || currentSection === 4|| currentSection === 6|| currentSection === 7|| currentSection === 8) && options.length > 0;

              return (
                <Box key={q.id} mb={3}>
                  <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>

                  {isSelect && !q.question.toLowerCase().includes('colegio') ? (
                    <RadioGroup
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                    >
                      {options.map((opt) => (
                        <FormControlLabel
                          key={opt.id}
                          value={String(opt.id)}
                          control={<Radio color="primary" />}
                          label={opt.answer}
                        />
                      ))}
                    </RadioGroup>
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
                    <>
                      <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        minRows={1}
                        maxRows={10}
                        inputProps={{ maxLength: 100 }}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      />
                      <Typography variant="caption" color="textSecondary">
                        Máx. de caracteres: {(answers[q.id] || '').length}/100
                      </Typography>
                    </>
                  )}
                </Box>
              );
            })}
          </LocalizationProvider>
        </Box>

        {/* Footer fijo con botones */}
<Box sx={{
  padding: 2,
  borderTop: '1px solid #e0e0e0',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2
}}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
    {Object.keys(groupedQuestions).map((key) => {
      const section = parseInt(key);
      const complete = isSectionComplete(section);
      const isCurrent = currentSection === section;

      return (
        <Button
          key={section}
          onClick={() => setCurrentSection(section)}
          sx={{
            minWidth: 36,
            height: 36,
            borderRadius: '50%',
            color: complete ? '#fff' : isCurrent ? '#fff' : '#333',
            backgroundColor: complete
              ? '#4caf50'
              : isCurrent
              ? '#1976d2'
              : '#f0f0f0',
            '&:hover': {
              backgroundColor: complete
                ? '#388e3c'
                : isCurrent
                ? '#1565c0'
                : '#e0e0e0',
            }
          }}
        >
          {section}
        </Button>
      );
    })}

    {/* Botón Finalizar redondo con ícono */}
    <Button
      onClick={() => setConfirmOpen(true)}
      disabled={saving || !isAllComplete()}
      sx={{
        minWidth: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: isAllComplete() ? '#0288d1' : '#cfd8dc',
        color: isAllComplete() ? 'white' : '#757575',
        '&:hover': {
          backgroundColor: isAllComplete() ? '#0277bd' : '#cfd8dc',
        },
        transition: 'all 0.3s ease'
      }}
    >
      <CheckIcon fontSize="small" />
    </Button>

  </Box>
</Box>

<Dialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  PaperProps={{
    sx: {
      borderRadius: 3,
      padding: 2,
      border: '2px solid #fbc02d',
      backgroundColor: '#fffde7',
      maxWidth: 400
    }
  }}
>
  <Box sx={{ textAlign: 'center', px: 2, py: 1 }}>
    <WarningAmberIcon sx={{ fontSize: 48, color: '#f9a825', mb: 1 }} />
    <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#f57f17', pb: 0 }}>
      ¿Estás seguro de enviar tus respuestas?
    </DialogTitle>

    <DialogContent>
      <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f' }}>
        Una vez que envíes, <strong>no podrás modificarlas</strong>. Asegúrate de haber completado todo correctamente.
      </DialogContentText>
    </DialogContent>
  </Box>

  <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
    <Button
      onClick={() => setConfirmOpen(false)}
      variant="outlined"
      color="warning"
      sx={{ borderColor: '#fbc02d', color: '#f57f17' }}
    >
      Cancelar
    </Button>
    <Button
      onClick={() => {
        setConfirmOpen(false);
        handleSubmit();
      }}
      variant="contained"
      color="warning"
      sx={{ backgroundColor: '#fbc02d', color: '#white', '&:hover': { backgroundColor: '#f9a825' } }}
      disabled={saving}
    >
      Confirmar y Enviar
    </Button>
  </DialogActions>
</Dialog>




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

export default Entrevista;