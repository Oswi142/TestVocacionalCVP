import React from 'react';
import { useTestLogic } from '../../../../hooks/useTestLogic';
import TestLayout from '../../components/TestLayout';
import QuestionRenderer from '../../components/QuestionRenderer';

import { Question as BaseQuestion } from '../../../../types/test';

interface Question extends BaseQuestion { }

const DatAbstracto: React.FC = () => {
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
    dialogs,
    setDialogs,
    groupedQuestions,
    isSectionComplete,
    onExitClick,
    onSaveClick,
    onConfirmExit,
    onConfirmSubmit,
    onSubmitClick,
    onSnackbarClose,
  } = useTestLogic<Question>(5, 'dat_abstracto', {
    datType: 'razonamiento_abstracto',
    minQuestionId: 618,
    navigateOnSubmit: '/client',
  });

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter((opt) => opt.questionid === questionId);

  return (
    <TestLayout
      title="Razonamiento Abstracto"
      currentSection={currentSection}
      loading={loading}
      saving={saving}
      lastSaved={lastSaved}
      groupedQuestions={groupedQuestions}
      isSectionComplete={isSectionComplete}
      onSectionChange={setCurrentSection}
      onExitClick={onExitClick}
      onSaveClick={onSaveClick}
      onSubmitClick={onSubmitClick}
      onSnackbarClose={onSnackbarClose}
      snackbar={snackbar}
      dialogs={dialogs}
      setDialogs={setDialogs}
      onConfirmExit={onConfirmExit}
      onConfirmSubmit={onConfirmSubmit}
    >
      {questions.map((q) => (
        <QuestionRenderer
          key={q.id}
          question={q}
          options={getOptionsForQuestion(q.id)}
          currentAnswer={answers[q.id]}
          onAnswerChange={(qid, aid) => setAnswers((prev) => ({ ...prev, [qid]: aid }))}
          rowOptions={true}
        />
      ))}
    </TestLayout>
  );
};

export default DatAbstracto;
