import React from 'react';
import { useTestLogic } from '@/application/useCases/useTestLogic';
import TestLayout from '@/presentation/features/tests/components/TestLayout';
import QuestionRenderer from '@/presentation/features/tests/components/QuestionRenderer';
import SectionInstructions from '@/presentation/features/tests/components/SectionInstructions';

import { Question as BaseQuestion } from '@/domain/entities/test';

interface Question extends BaseQuestion { }

const DatAbstracto: React.FC = () => {
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
    timeLeftSeconds,
  } = useTestLogic<Question>(5, 'dat_abstracto', {
    datType: 'razonamiento_abstracto',
    minquestion_id: 618,
    navigateOnSubmit: '/client',
    timeLimitMinutes: 25,
  });

  const questions = groupedQuestions[currentSection] || [];
  const getOptionsForQuestion = (question_id: number) =>
    answer_options.filter((opt) => opt.question_id === question_id);

  return (
    <TestLayout
      title="Razonamiento Abstracto"
      currentSection={currentSection}
      timeLeftSeconds={timeLeftSeconds}
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
      <SectionInstructions instructions="Identifica el patrón lógico en la serie de figuras y selecciona la opción que continúa la secuencia correctamente." />
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
