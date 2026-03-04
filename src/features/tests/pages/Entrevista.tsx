import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useTestLogic } from '../../../hooks/useTestLogic';
import { useAuth } from '../../../hooks/useAuth';
import { Question } from '../../../types/test';
import TestLayout from '../components/TestLayout';
import QuestionRenderer from '../components/QuestionRenderer';
import PersonalDataForm from '../components/PersonalDataForm';
import { Alert, Box } from '@mui/material';
import dayjs from 'dayjs';

interface School {
  id: number;
  schoolname: string;
}

const Entrevista: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [birthdayDate, setBirthdayDate] = useState<dayjs.Dayjs | null>(null);

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
    handleSnackbarClose,
    dialogs,
    setDialogs,
    groupedQuestions,
    shouldDisplayQuestion,
    isSectionComplete,
    saveToLocal,
    navigate,
    showSnackbar,
  } = useTestLogic<Question>(1, 'entrevista', {
    onSaveExtra: () => ({
      selectedSchoolId,
      birthdayDate: birthdayDate ? birthdayDate.toISOString() : null,
    }),
    onLoadExtra: (extra) => {
      if (extra.selectedSchoolId) setSelectedSchoolId(extra.selectedSchoolId);
      if (extra.birthdayDate) setBirthdayDate(dayjs(extra.birthdayDate));
    },
    conditionalVisibility: {
      17: 16,
      20: 19,
      27: 26,
    },
    customIsSectionComplete: (section, answers, grouped, shouldDisplayFn) => {
      const questions = grouped[section] || [];
      if (questions.length === 0) return false;

      return questions.every((q) => {
        // use the hook's display logic via callback argument
        if (!shouldDisplayFn(q.id)) return true;
        const qText = q.question?.toLowerCase() || '';
        if (qText.includes('fecha')) return !!birthdayDate;
        if (qText.includes('colegio')) return selectedSchoolId !== null;
        return !!answers[q.id] && answers[q.id].trim() !== '';
      });
    }
  });

  const { user } = useAuth();

  // Fetch only schools metadata
  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase.from('schools').select('id, schoolname').order('schoolname');
      if (data) setSchools(data);
    };
    fetchSchools();
  }, []);

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
      // 1. Submit clientsinfo
      const section1 = (groupedQuestions[1] || []) as Question[];
      const mapped = {
        gender: section1[0] ? answers[section1[0].id] || '' : '',
        birthday: birthdayDate ? birthdayDate.format('YYYY-MM-DD') : '',
        birthplace: section1[2] ? answers[section1[2].id] || '' : '',
        address: section1[3] ? answers[section1[3].id] || '' : '',
        grade: section1[5] ? answers[section1[5].id] || '' : '',
        hobbies: section1[6] ? answers[section1[6].id] || '' : '',
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

      // 2. Submit testanswers (Sections 2-8)
      const allVisible = allQuestions.filter((q: Question) => q.section > 1 && shouldDisplayQuestion(q.id));
      const entries = allVisible.map((q: Question) => {
        const value = answers[q.id];
        const options = answerOptions.filter(opt => opt.questionid === q.id);
        const data: Record<string, string | number> = {
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
      setTimeout(() => navigate('/client', { replace: true }), 2000);

    } catch (err: unknown) {
      console.error('Error submitting test:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      showSnackbar('Error al enviar: ' + errorMessage, 'error');
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
      onExitClick={() => setDialogs(prev => ({ ...prev, exit: true }))}
      onSaveClick={() => {
        const success = saveToLocal();
        showSnackbar(success ? 'Respuestas guardadas' : 'Error al guardar', success ? 'success' : 'error');
      }}
      onSubmitClick={() => setDialogs(prev => ({ ...prev, confirm: true }))}
      onSnackbarClose={handleSnackbarClose}
      snackbar={snackbar}
      dialogs={dialogs}
      setDialogs={setDialogs}
      onConfirmExit={() => {
        saveToLocal();
        setDialogs(prev => ({ ...prev, exit: false }));
        navigate('/client', { replace: true });
      }}
      onConfirmSubmit={() => { handleSubmit(); }}
    >
      {sectionAlerts[currentSection] && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {sectionAlerts[currentSection]}
        </Alert>
      )}

      {currentSection === 1 ? (
        <PersonalDataForm
          questions={(groupedQuestions[1] || []) as unknown as Question[]}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          schools={schools}
          selectedSchoolId={selectedSchoolId}
          onSchoolChange={setSelectedSchoolId}
          birthdayDate={birthdayDate}
          onDateChange={setBirthdayDate}
        />
      ) : (
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
      )}
    </TestLayout>
  );
};

export default Entrevista;
