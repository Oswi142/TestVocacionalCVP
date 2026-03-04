import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { testService } from '../services/testService';
import { Question as BaseQuestion, AnswerOption as BaseAnswerOption, TestAnswer } from '../types/test';

export const useTestLogic = <T extends BaseQuestion>(
  testId: number,
  storageKeyPrefix: string,
  options: {
    datType?: string | null;
    minQuestionId?: number;
    questionsPerSection?: number;
    navigateOnSubmit?: string;
    onSaveExtra?: (answers: { [key: number]: string }) => any;
    onLoadExtra?: (extraData: any) => void;
    customIsSectionComplete?: (section: number, answers: { [key: number]: string }, grouped: { [key: number]: T[] }, shouldDisplayFn: (id: number) => boolean) => boolean;
    conditionalVisibility?: Record<number, number>; // childId: parentId
  } = {}
) => {
  const {
    datType = null,
    minQuestionId = null,
    questionsPerSection = null,
    navigateOnSubmit = '/client',
    onSaveExtra,
    onLoadExtra,
    customIsSectionComplete,
    conditionalVisibility,
  } = options;

  const { user } = useAuth();
  const navigate = useNavigate();
  const STORAGE_KEY = `${storageKeyPrefix}_${user?.id || 'anonymous'}`;

  const [allQuestions, setAllQuestions] = useState<T[]>([]);
  const [answerOptions, setAnswerOptions] = useState<BaseAnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [dialogs, setDialogs] = useState({ confirm: false, exit: false });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const saveToLocal = useCallback(() => {
    try {
      const data: any = {
        answers,
        currentSection,
        lastSaved: new Date().toLocaleString(),
      };
      if (onSaveExtra) {
        data.extra = onSaveExtra(answers);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(data.lastSaved);
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      return false;
    }
  }, [answers, currentSection, STORAGE_KEY]);

  const loadFromLocal = useCallback(
    (sectionsSorted: number[]) => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const localData = JSON.parse(stored);
          setAnswers(localData.answers || {});
          setCurrentSection(localData.currentSection || (sectionsSorted[0] ?? 1));
          setLastSaved(localData.lastSaved || '');
          if (onLoadExtra && localData.extra) {
            onLoadExtra(localData.extra);
          }
          showSnackbar('Respuestas cargadas', 'success');
        } else if (sectionsSorted.length > 0) {
          setCurrentSection(sectionsSorted[0]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    },
    [STORAGE_KEY, showSnackbar]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const qs = (await testService.getQuestions(testId, { datType, minQuestionId })) as T[];

      // Limit questions per section if specified
      let finalQuestions = qs;
      if (questionsPerSection) {
        const acc: T[] = [];
        const sectionCounts: { [key: number]: number } = {};
        for (const q of qs) {
          if (!sectionCounts[q.section]) sectionCounts[q.section] = 0;
          if (sectionCounts[q.section] < questionsPerSection) {
            acc.push(q);
            sectionCounts[q.section]++;
          }
        }
        finalQuestions = acc;
      }

      setAllQuestions(finalQuestions);

      const questionIds = finalQuestions.map((q) => q.id);
      if (questionIds.length > 0) {
        const allOpts = await testService.getAnswerOptions(questionIds);
        setAnswerOptions(allOpts);
      }

      const sectionsSorted = Array.from(new Set(finalQuestions.map((q) => q.section))).sort(
        (a, b) => a - b
      );
      loadFromLocal(sectionsSorted);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, testId, datType]);

  const handleManualSave = () => {
    const success = saveToLocal();
    showSnackbar(
      success ? 'Respuestas guardadas correctamente' : 'Error al guardar',
      success ? 'success' : 'error'
    );
  };

  // Interceptar botón de atrás del navegador
  useEffect(() => {
    const handlePopState = () => {
      // Bloquear navegación y mostrar diálogo
      window.history.pushState(null, '', window.location.pathname);
      setDialogs((prev) => ({ ...prev, exit: true }));
    };

    // Añadir una entrada inicial al historial para que el primer "atrás" sea capturable
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setDialogs]);

  const submitTest = async () => {
    const unanswered = allQuestions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      showSnackbar('Debes responder todas las preguntas antes de finalizar.', 'error');
      return;
    }

    setSaving(true);
    try {
      const entries: TestAnswer[] = allQuestions.map((q) => ({
        clientid: user?.id as number,
        testid: testId,
        questionid: q.id,
        answerid: parseInt(answers[q.id]),
      }));

      await testService.submitAnswers(entries);

      localStorage.removeItem(STORAGE_KEY);
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate(navigateOnSubmit, { replace: true }), 2000);
    } catch (err: any) {
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const groupedQuestions = useMemo(() => {
    return allQuestions.reduce((acc: { [key: number]: T[] }, q) => {
      if (!acc[q.section]) acc[q.section] = [];
      acc[q.section].push(q);
      return acc;
    }, {});
  }, [allQuestions]);

  const shouldDisplayQuestion = (questionId: number): boolean => {
    if (!conditionalVisibility) return true;
    const parentId = conditionalVisibility[questionId];
    if (!parentId) return true;

    const selectedAnswerId = answers[parentId];
    if (!selectedAnswerId) return false;

    const parentOptions = answerOptions.filter((opt) => opt.questionid === parentId);
    const selectedAnswer = parentOptions.find((opt) => String(opt.id) === String(selectedAnswerId));
    return selectedAnswer?.answer?.toLowerCase() === 'sí';
  };

  const isSectionComplete = (section: number): boolean => {
    if (customIsSectionComplete) {
      return customIsSectionComplete(section, answers, groupedQuestions, shouldDisplayQuestion);
    }
    const sectionQuestions = groupedQuestions[section] || [];
    return sectionQuestions.length > 0 && sectionQuestions.every((q) => !!answers[q.id]);
  };

  return {
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
    handleManualSave,
    submitTest,
    saveToLocal,
    groupedQuestions,
    shouldDisplayQuestion,
    isSectionComplete,
    navigate,
    showSnackbar,
  };
};
