import React from 'react';
import { supabase } from '../../../supabaseClient';
import { useTestLogic } from '../../../hooks/useTestLogic';
import { useAuth } from '../../../hooks/useAuth';
import { Question } from '../../../types/test';
import TestLayout from '../components/TestLayout';
import QuestionRenderer from '../components/QuestionRenderer';
import { Alert, Box } from '@mui/material';

const Entrevista: React.FC = () => {
  const { user } = useAuth();

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
    dialogs,
    setDialogs,
    setSaving,
    groupedQuestions,
    shouldDisplayQuestion,
    isSectionComplete,
    onExitClick,
    onSaveClick,
    onConfirmExit,
    onSnackbarClose,
    showSnackbar,
    navigate,
  } = useTestLogic<Question>(1, 'entrevista', {
    conditionalVisibility: {
      17: 16,
      20: 19,
      27: 26,
    }
  });

  const handleAnswerChange = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const isAllComplete = () => {
    return Object.keys(groupedQuestions).every(sec => isSectionComplete(Number(sec)));
  };

  const handleSubmit = async () => {
    if (!isAllComplete()) {
      showSnackbar('Por favor completa todas las preguntas requeridas.', 'error');
      return;
    }

    if (!user || !user.id) return;

    try {
      setDialogs(prev => ({ ...prev, confirm: false }));
      setSaving(true);

      const allVisible = allQuestions.filter((q: Question) => shouldDisplayQuestion(q.id));
      const entries = allVisible.map((q: Question) => {
        const value = answers[q.id];
        const options = answerOptions.filter(opt => opt.questionid === q.id);
        const data: any = {
          clientid: user.id,
          testid: 1,
          questionid: q.id
        };
        if (options.length > 0) {
          data.answerid = parseInt(value);
        } else {
          data.details = value;
        }
        return data;
      }).filter(e => e.answerid || e.details);

      for (const entry of entries) {
        const { error } = await supabase.from('testsanswers').insert(entry);
        if (error) throw error;
      }

      const STORAGE_KEY = `entrevista_${user.id || 'anonymous'}`;
      localStorage.removeItem(STORAGE_KEY);
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate('/client', { replace: true, state: { showConfetti: true } }), 500);


    } catch (err: any) {
      console.error('Error submitting test:', err);
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const sectionAlerts: Record<number, string> = {
    2: "Profundizar en la relación y ocupación de cada uno de sus familiares y otras personas significativas.",
    3: "Responde con sinceridad a las siguientes preguntas relacionadas con tu etapa escolar.",
    4: "Indica cuánto piensas que ha influido cada factor en tu elección vocacional.",
    5: "Comparte tus reflexiones personales. Responde con sinceridad.",
    6: "Responde si las siguientes afirmaciones son verdaderas o falsas.",
    7: "Indica si necesitas la siguiente información relacionada con tus decisiones vocacionales.",
    8: "Indica si presentas alguna de las siguientes dificultades relacionadas con tu elección vocacional.",
  };

  return (
    <TestLayout
      title="Entrevista"
      currentSection={currentSection}
      loading={loading}
      saving={saving}
      lastSaved={lastSaved}
      groupedQuestions={groupedQuestions}
      isSectionComplete={isSectionComplete}
      onSectionChange={setCurrentSection}
      onExitClick={onExitClick}
      onSaveClick={onSaveClick}
      onSubmitClick={() => setDialogs(prev => ({ ...prev, confirm: true }))}
      onSnackbarClose={onSnackbarClose}
      snackbar={snackbar}
      dialogs={dialogs}
      setDialogs={setDialogs}
      onConfirmExit={onConfirmExit}
      onConfirmSubmit={handleSubmit}
    >
      {sectionAlerts[currentSection] && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {sectionAlerts[currentSection]}
        </Alert>
      )}

      <Box>
        {(groupedQuestions[currentSection] || []).map((q) => (
          shouldDisplayQuestion(q.id) && (
            <QuestionRenderer
              key={q.id}
              question={q}
              options={answerOptions.filter(opt => opt.questionid === q.id)}
              currentAnswer={answers[q.id]}
              onAnswerChange={(qid, val) => handleAnswerChange(qid, val)}
            />
          )
        ))}
      </Box>
    </TestLayout>
  );
};

export default Entrevista;
