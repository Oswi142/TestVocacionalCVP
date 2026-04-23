import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTestLogic } from '@/application/useCases/useTestLogic';
import TestLayout from '@/presentation/features/tests/components/TestLayout';
import QuestionRenderer from '@/presentation/features/tests/components/QuestionRenderer';

import { Question as BaseQuestion } from '@/domain/entities/test';

interface Question extends BaseQuestion {
  cha_type: string;
}

const Chaside: React.FC = () => {
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
  } = useTestLogic<Question>(3, 'chaside');

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (question_id: number) =>
    answer_options.filter((opt) => opt.question_id === question_id);

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
      {['interest', 'aptitude'].map((type) => {
        const questionsOfType = questions.filter((q) => q.cha_type === type);
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
