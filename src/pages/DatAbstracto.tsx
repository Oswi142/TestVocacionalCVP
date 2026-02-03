import React, { useEffect, useState, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string | null;
  section: number;
  dat_type?: string | null;
  image_path?: string | null;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const DatAbstracto: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const TEST_ID = 5;
  const DAT_TYPE = 'razonamiento_abstracto';
  const MIN_QUESTION_ID = 618;

  const STORAGE_KEY = `dat_abstracto_${user.id || 'anonymous'}`;

  // Bucket público
  const STORAGE_BUCKET = 'question_images';
  const getPublicImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    const base = import.meta.env.VITE_SUPABASE_URL;
    return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${imagePath}`;
  };

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Guardado local
  const saveToLocal = useCallback(() => {
    try {
      const data = {
        answers,
        currentSection,
        lastSaved: new Date().toLocaleString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(data.lastSaved);
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      return false;
    }
  }, [answers, currentSection, STORAGE_KEY]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Agrupar por section
  const groupedQuestions = allQuestions.reduce((acc: { [key: number]: Question[] }, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => opt.questionid === questionId);

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleSectionChange = (section: number) => setCurrentSection(section);

  const handleExit = () => setExitConfirmOpen(true);

  const confirmExit = () => {
    saveToLocal();
    setExitConfirmOpen(false);
    navigate(-1);
  };

  const handleManualSave = () => {
    const success = saveToLocal();
    showSnackbar(
      success ? 'Respuestas guardadas correctamente' : 'Error al guardar',
      success ? 'success' : 'error'
    );
  };

  const handleOpenPreview = (src: string) => {
    setPreviewSrc(src);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewSrc(null);
  };

  const isSectionComplete = (section: number): boolean => {
    const sectionQuestions = groupedQuestions[section] || [];
    return sectionQuestions.every(q => !!answers[q.id]);
  };

  const isAllComplete = (): boolean => {
    return Object.keys(groupedQuestions).every((key) => {
      const section = parseInt(key);
      return isSectionComplete(section);
    });
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
          testid: TEST_ID,
          questionid: q.id,
          answerid: parseInt(answers[q.id])
        });
      }

      localStorage.removeItem(STORAGE_KEY);
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate('/client'), 2000);
    } catch (err: any) {
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Traer preguntas del abstracto desde id >= 618
      const questionsRes = await supabase
        .from('questions')
        .select('id, question, section, dat_type, image_path')
        .eq('testid', TEST_ID)
        .eq('dat_type', DAT_TYPE)
        .gte('id', MIN_QUESTION_ID)
        .order('id');

      if (questionsRes.error) {
        console.error('questions error:', questionsRes.error);
        showSnackbar('Error cargando preguntas', 'error');
        setLoading(false);
        return;
      }

      const qs: Question[] = questionsRes.data || [];
      setAllQuestions(qs);

      const sectionsSorted = Array.from(new Set(qs.map(q => q.section))).sort((a, b) => a - b);
      if (sectionsSorted.length > 0) {
        setCurrentSection(prev => (sectionsSorted.includes(prev) ? prev : sectionsSorted[0]));
      }

      // Traer opciones solo para esas preguntas
      const questionIds = qs.map(q => q.id);
      if (questionIds.length === 0) {
        setAnswerOptions([]);
      } else {
        const CHUNK = 200;
        const allOpts: AnswerOption[] = [];

        for (let i = 0; i < questionIds.length; i += CHUNK) {
          const slice = questionIds.slice(i, i + CHUNK);
          const optsRes = await supabase
            .from('answeroptions')
            .select('id, questionid, answer')
            .in('questionid', slice)
            .order('id');

          if (optsRes.error) {
            console.error('answeroptions error:', optsRes.error);
            showSnackbar('Error cargando opciones', 'error');
            setAnswerOptions([]);
            break;
          }

          allOpts.push(...(optsRes.data || []));
        }

        setAnswerOptions(allOpts);
      }

      // Cargar guardado local
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const localData = JSON.parse(stored);
          setAnswers(localData.answers || {});
          setCurrentSection(localData.currentSection || (sectionsSorted[0] ?? 1));
          setLastSaved(localData.lastSaved || '');
          showSnackbar('Respuestas cargadas', 'success');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }

      setLoading(false);
    };

    fetchData();
  }, [STORAGE_KEY]);

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [currentSection]);

  // Resetear scroll de la vista previa al inicio cuando se abre
  useEffect(() => {
    if (previewOpen) {
      const previewContainer = document.getElementById('preview-scroll-container');
      if (previewContainer) {
        previewContainer.scrollLeft = 0;
        previewContainer.scrollTop = 0;
      }
    }
  }, [previewOpen]);

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
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(to right, #f9c9a4, #cafacc)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          height: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: 4,
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <IconButton onClick={handleExit}>
              <ArrowBackIcon />
            </IconButton>

            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleManualSave}
              sx={{
                borderColor: '#4caf50',
                color: '#4caf50',
                '&:hover': { borderColor: '#388e3c', backgroundColor: '#f1f8e9' }
              }}
            >
              Guardar
            </Button>
          </Box>

          <Typography variant="h5" color="primary">Test: Razonamiento Abstracto</Typography>
          <Typography variant="subtitle1" color="primary">
            Sección {currentSection}
          </Typography>

          {lastSaved && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <SaveIcon sx={{ fontSize: 12, mr: 0.5, color: '#4caf50' }} />
              Guardado: {lastSaved}
            </Typography>
          )}
        </Box>

        {/* Contenido */}
        <Box
          id="scroll-container"
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 3,
            paddingTop: 2
          }}
        >
          {questions.map((q) => {
            const imgUrl = getPublicImageUrl(q.image_path);
            const opts = getOptionsForQuestion(q.id);

            return (
              <Box key={q.id} mb={4}>
                {/* Imagen */}
                {imgUrl && (
                  <Box
                    sx={{
                      mt: 1,
                      mb: 1.5,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.08)',
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      position: 'relative',
                      '&:hover .zoom-hint': {
                        opacity: 1
                      }
                    }}
                  >
                    <Box
                      component="img"
                      src={imgUrl}
                      alt={`Pregunta ${q.id}`}
                      loading="lazy"
                      onClick={() => handleOpenPreview(imgUrl)}
                      sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 520,
                        height: 'auto',
                        width: 'auto',
                        objectFit: 'contain',
                        margin: '0 auto',
                        cursor: 'zoom-in',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.02)'
                        }
                      }}
                    />
                    {/* Hint de zoom */}
                    <Box
                      className="zoom-hint"
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: 2,
                        fontSize: '0.75rem',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      🔍 Clic para ampliar
                    </Box>
                  </Box>
                )}

                {/* Texto (si existe) */}
                {q.question && (
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {q.question}
                  </Typography>
                )}

                {/* Opciones (si existen) */}
                {opts.length > 0 ? (
                  <RadioGroup
                    value={answers[q.id] || ''}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                  >
                    {opts.map((opt) => (
                      <FormControlLabel
                        key={opt.id}
                        value={String(opt.id)}
                        control={<Radio color="primary" />}
                        label={opt.answer}
                      />
                    ))}
                  </RadioGroup>
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Esta pregunta no tiene opciones cargadas aún.
                  </Alert>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            padding: 2,
            borderTop: '1px solid #e0e0e0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(groupedQuestions).map((key) => {
              const section = parseInt(key);
              const complete = isSectionComplete(section);
              const isCurrent = currentSection === section;

              return (
                <Button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: '50%',
                    color: complete ? '#fff' : isCurrent ? '#fff' : '#333',
                    backgroundColor: complete ? '#4caf50' : isCurrent ? '#1976d2' : '#f0f0f0',
                    '&:hover': {
                      backgroundColor: complete ? '#388e3c' : isCurrent ? '#1565c0' : '#e0e0e0',
                    }
                  }}
                >
                  {section}
                </Button>
              );
            })}

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={saving || !isAllComplete()}
              sx={{
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: isAllComplete() ? '#0288d1' : '#cfd8dc',
                color: isAllComplete() ? 'white' : '#757575',
                '&:hover': { backgroundColor: isAllComplete() ? '#0277bd' : '#cfd8dc' }
              }}
            >
              <CheckIcon fontSize="small" />
            </Button>
          </Box>
        </Box>

        {/* Dialog envío */}
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
              ¿Enviar respuestas?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f' }}>
                Una vez enviadas, no podrás modificarlas.
              </DialogContentText>
            </DialogContent>
          </Box>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} variant="outlined" color="warning">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit();
              }}
              variant="contained"
              color="warning"
              disabled={saving}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog salida */}
        <Dialog
          open={exitConfirmOpen}
          onClose={() => setExitConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              padding: 2,
              border: '2px solid #2196f3',
              backgroundColor: '#e3f2fd',
              maxWidth: 450
            }
          }}
        >
          <Box sx={{ textAlign: 'center', px: 2, py: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
            <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#1565c0', pb: 0 }}>
              ¿Seguro que quieres salir?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f', textAlign: 'center' }}>
                Tus respuestas serán guardadas automáticamente y podrás continuar desde donde lo dejaste cuando regreses.
              </DialogContentText>
            </DialogContent>
          </Box>
          <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
            <Button onClick={() => setExitConfirmOpen(false)} variant="outlined" color="primary" sx={{ minWidth: 100 }}>
              Continuar
            </Button>
            <Button onClick={confirmExit} variant="contained" color="primary" sx={{ minWidth: 100 }}>
              Salir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Vista previa imagen - Modal compacto */}
        <Dialog
          open={previewOpen}
          onClose={handleClosePreview}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.98)',
              boxShadow: 'none',
              margin: { xs: 2, sm: 4 },
              maxHeight: { xs: '85vh', sm: '90vh' },
              borderRadius: { xs: 2, sm: 3 }
            }
          }}
          sx={{
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(8px)'
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            {/* Botón cerrar arriba */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: { xs: 1.5, sm: 2 },
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <IconButton
                onClick={handleClosePreview}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 59, 48, 0.2)',
                  backdropFilter: 'blur(10px)',
                  width: { xs: 42, sm: 48 },
                  height: { xs: 42, sm: 48 },
                  border: '2px solid rgba(255, 59, 48, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 59, 48, 0.9)',
                    transform: 'scale(1.1) rotate(90deg)',
                    borderColor: 'rgba(255, 59, 48, 0.8)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: { xs: '1.5rem', sm: '1.8rem' },
                    fontWeight: 300,
                    lineHeight: 1
                  }}
                >
                  ✕
                </Box>
              </IconButton>
            </Box>

            {/* Contenedor de imagen con scroll */}
            <Box
              id="preview-scroll-container"
              sx={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start', // Cambiado de center a flex-start
                backgroundColor: '#000',
                padding: { xs: 1, sm: 2 },
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': {
                  height: '6px',
                  width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255, 255, 255, 0.05)'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '3px'
                }
              }}
            >
              {/* Imagen completa sin cortes */}
              {previewSrc && (
                <Box
                  component="img"
                  src={previewSrc}
                  alt="Vista previa"
                  onClick={handleClosePreview}
                  sx={{
                    display: 'block',
                    maxWidth: 'none', // Sin límite de ancho - permite mostrar imagen completa
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    cursor: 'zoom-out',
                    borderRadius: 1,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: 'zoomIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '@keyframes zoomIn': {
                      from: {
                        opacity: 0,
                        transform: 'scale(0.95)'
                      },
                      to: {
                        opacity: 1,
                        transform: 'scale(1)'
                      }
                    }
                  }}
                />
              )}
            </Box>

            {/* Footer con indicador */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                padding: { xs: 1.5, sm: 2 },
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  fontWeight: 500,
                  textAlign: 'center'
                }}
              >
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  👆 Toca para cerrar
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  💡 Clic o <Box component="span" sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    padding: '3px 8px', 
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    mx: 0.5
                  }}>ESC</Box> para cerrar
                </Box>
              </Typography>
            </Box>
          </Box>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default DatAbstracto;