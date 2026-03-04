import React from 'react';
import { useTestLogic } from '../../../../hooks/useTestLogic';
import TestLayout from '../../components/TestLayout';
import QuestionRenderer from '../../components/QuestionRenderer';

import { Question as BaseQuestion } from '../../../../types/test';

interface Question extends BaseQuestion {
  image_path?: string | null;
}

const DatNumerico: React.FC = () => {
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
  } = useTestLogic<Question>(5, 'dat_numerico', {
    datType: 'razonamiento_numerico',
    questionsPerSection: 10,
    navigateOnSubmit: '/dat',
  });

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter((opt) => opt.questionid === questionId);

  return (
    <TestLayout
      title="Razonamiento Numérico"
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
      onConfirmExit={() => navigate('/dat', { replace: true })}
      onConfirmSubmit={submitTest}
    >
      {questions.map((q) => (
        <QuestionRenderer
          key={q.id}
          question={q}
          options={getOptionsForQuestion(q.id)}
          currentAnswer={answers[q.id]}
          onAnswerChange={(qid, aid) => setAnswers((prev) => ({ ...prev, [qid]: aid }))}
        />
      ))}
    </TestLayout>
  );
};

export default DatNumerico;
