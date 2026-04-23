import React from 'react';
import { useTestLogic } from '@/application/useCases/useTestLogic';
import TestLayout from '@/presentation/features/tests/components/TestLayout';
import QuestionRenderer from '@/presentation/features/tests/components/QuestionRenderer';

import { Question as BaseQuestion } from '@/domain/entities/test';

interface Question extends BaseQuestion { }

const MACI: React.FC = () => {
  const {
    answer_options,
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
  } = useTestLogic<Question>(4, 'maci');

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (question_id: number) =>
    answer_options.filter((opt) => opt.question_id === question_id);

  return (
    <TestLayout
      title="MACI"
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
        />
      ))}
    </TestLayout>
  );
};

export default MACI;
