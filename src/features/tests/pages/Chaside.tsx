import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTestLogic } from '../../../hooks/useTestLogic';
import TestLayout from '../components/TestLayout';
import QuestionRenderer from '../components/QuestionRenderer';

import { Question as BaseQuestion } from '../../../types/test';

interface Question extends BaseQuestion {
  chatype: string;
}

const Chaside: React.FC = () => {
  const {
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
    submitTest,
    saveToLocal,
    groupedQuestions,
    isSectionComplete,
    navigate,
    showSnackbar,
  } = useTestLogic<Question>(3, 'chaside');

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter((opt) => opt.questionid === questionId);

  return (
    <TestLayout
      title="Chaside"
      currentSection={currentSection}
      loading={loading}
      saving={saving}
      lastSaved={lastSaved}
      groupedQuestions={groupedQuestions}
      isSectionComplete={isSectionComplete}
      onSectionChange={setCurrentSection}
      onExitClick={() => setDialogs((prev) => ({ ...prev, exit: true }))}
      onSaveClick={() => {
        const success = saveToLocal();
        showSnackbar(success ? 'Respuestas guardadas' : 'Error al guardar', success ? 'success' : 'error');
      }}
      onSubmitClick={() => setDialogs((prev) => ({ ...prev, confirm: true }))}
      onSnackbarClose={handleSnackbarClose}
      snackbar={snackbar}
      dialogs={dialogs}
      setDialogs={setDialogs}
      onConfirmExit={() => navigate('/client', { replace: true })}
      onConfirmSubmit={submitTest}
    >
      {['interest', 'aptitude'].map((type) => {
        const questionsOfType = questions.filter((q) => q.chatype === type);
        if (questionsOfType.length === 0) return null;
        return (
          <Box key={type} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
              {type === 'interest' ? 'Interés' : 'Aptitud'}
            </Typography>
            {questionsOfType.map((q) => (
              <QuestionRenderer
                key={q.id}
                question={q}
                options={getOptionsForQuestion(q.id)}
                currentAnswer={answers[q.id]}
                onAnswerChange={(qid, aid) => setAnswers((prev) => ({ ...prev, [qid]: aid }))}
              />
            ))}
          </Box>
        );
      })}
    </TestLayout>
  );
};

export default Chaside;
