import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { testService } from '@/infrastructure/services/testService';
import { Question as BaseQuestion, AnswerOption as BaseAnswerOption, TestAnswer } from '@/domain/entities/test';

export const useTestLogic = <T extends BaseQuestion>(
  test_id: number,
  storageKeyPrefix: string,
  options: {
    datType?: string | null;
    minquestion_id?: number;
    questionsPerSection?: number;
    navigateOnSubmit?: string;
    onSaveExtra?: (answers: { [key: number]: string }) => any;
    onLoadExtra?: (extraData: any) => void;
    customIsSectionComplete?: (section: number, answers: { [key: number]: string }, grouped: { [key: number]: T[] }, shouldDisplayFn: (id: number) => boolean) => boolean;
    conditionalVisibility?: Record<number, { parentId: number, expectedAnswer: string }>; // childId: { parentId, expectedAnswer }
  } = {}
) => {
  const {
    datType = null,
    minquestion_id = null,
    questionsPerSection = null,
    navigateOnSubmit = '/client',
    conditionalVisibility,
  } = options;

  const callbacksRef = useRef({
    onSaveExtra: options.onSaveExtra,
    onLoadExtra: options.onLoadExtra,
    customIsSectionComplete: options.customIsSectionComplete
  });

  useEffect(() => {
    callbacksRef.current = {
      onSaveExtra: options.onSaveExtra,
      onLoadExtra: options.onLoadExtra,
      customIsSectionComplete: options.customIsSectionComplete
    };
  }, [options.onSaveExtra, options.onLoadExtra, options.customIsSectionComplete]);

  const { user } = useAuth();
  const navigate = useNavigate();
  const STORAGE_KEY = `${storageKeyPrefix}_${user?.id || 'anonymous'}`;

  const [allQuestions, setAllQuestions] = useState<T[]>([]);
  const [answer_options, setanswer_options] = useState<BaseAnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [dialogs, setDialogs] = useState({ confirm: false, exit: false, offlineBlock: false });


  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
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
      if (callbacksRef.current.onSaveExtra) {
        data.extra = callbacksRef.current.onSaveExtra(answers);
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
          if (callbacksRef.current.onLoadExtra && localData.extra) {
            callbacksRef.current.onLoadExtra(localData.extra);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
        return;
      }

      const userObj = JSON.parse(storedUser);
      const progress = await testService.getDetailedProgress(userObj.id);

      if (test_id !== 0 && !progress.hasCompletedIntro) {
        navigate('/introduccion', { replace: true });
        return;
      }

      const mainOrder = [1, 2, 3, 4, 5];
      const datOrder = [
        'razonamiento_verbal',
        'razonamiento_numerico',
        'razonamiento_abstracto',
        'razonamiento_mecanico',
        'razonamiento_espacial',
        'ortografia'
      ];

      const isMainCompleted = progress.completedMaintest_ids.includes(test_id);
      const isDatCompleted = datType ? progress.completedDatTypes.includes(datType) : false;

      if (isMainCompleted && test_id !== 5) {
        navigate('/client', { replace: true });
        return;
      }
      if (isDatCompleted) {
        navigate('/dat', { replace: true });
        return;
      }

      if (test_id !== 0) {
        const currentIdx = mainOrder.indexOf(test_id);
        if (currentIdx >= 0 && test_id !== 1) {
          const prevtest_id = mainOrder[currentIdx - 1];
          let prevCompleted = progress.completedMaintest_ids.includes(prevtest_id);

          if (test_id === 5 && datType) {
            if (!prevCompleted) {
              navigate('/client', { replace: true });
              return;
            }
            const subIdx = datOrder.indexOf(datType);
            if (subIdx > 0) {
              const prevSub = datOrder[subIdx - 1];
              if (!progress.completedDatTypes.includes(prevSub)) {
                navigate('/dat', { replace: true });
                return;
              }
            }
          } else if (!prevCompleted) {
            navigate('/client', { replace: true });
            return;
          }
        }
      }

      const qs = (await testService.getQuestions(test_id, { datType, minquestion_id })) as T[];

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

      const question_ids = finalQuestions.map((q) => q.id);
      if (question_ids.length > 0) {
        const allOpts = await testService.getanswer_options(question_ids);
        // Ensure all numeric IDs are actually numbers to avoid comparison issues
        const normalizedOpts = allOpts.map(opt => ({
          ...opt,
          id: Number(opt.id),
          question_id: Number(opt.question_id)
        }));
        setanswer_options(normalizedOpts);
      }

      const sectionsSorted = Array.from(new Set(finalQuestions.map((q) => q.section))).sort(
        (a, b) => a - b
      );
      loadFromLocal(sectionsSorted);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error al cargar los datos', 'error');
      setLoading(false);
    }
  }, [test_id, datType, questionsPerSection, minquestion_id, loadFromLocal, showSnackbar, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleManualSave = () => {
    const success = saveToLocal();
    showSnackbar(
      success ? 'Respuestas guardadas correctamente' : 'Error al guardar',
      success ? 'success' : 'error'
    );
  };

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      setDialogs((prev) => ({ ...prev, exit: true }));
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setDialogs]);

  const submitTest = async () => {
    const unanswered = allQuestions.filter((q) => !answers[q.id] && shouldDisplayQuestion(q.id));
    if (unanswered.length > 0) {
      showSnackbar('Debes responder todas las preguntas visibles antes de finalizar.', 'error');
      return;
    }

    const payload: TestAnswer[] = allQuestions.map((q) => {
      const val = answers[q.id];
      const parsed = parseInt(val);
      return {
        client_id: user?.id as number,
        test_id: test_id,
        question_id: q.id,
        answer_id: Number.isInteger(parsed) ? parsed : null,
      };
    });

    const visiblePayload = payload.filter(p =>
      (!conditionalVisibility || shouldDisplayQuestion(p.question_id)) &&
      p.answer_id !== null
    );

    setDialogs((prev) => ({ ...prev, confirm: false }));

    setSaving(true);
    try {
      await testService.submitAnswers(visiblePayload);

      localStorage.removeItem(STORAGE_KEY);
      setDialogs((prev) => ({ ...prev, confirm: false }));
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate(navigateOnSubmit, { replace: true, state: { showConfetti: true } }), 500);
    } catch (err: any) {
      showSnackbar('Hubo un problema al enviar tus respuestas. Por favor, intenta de nuevo o contacta con soporte.', 'error');
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

  const shouldDisplayQuestion = (question_id: number): boolean => {
    if (!conditionalVisibility) return true;
    const condition = conditionalVisibility[question_id];
    if (!condition) return true;

    const selectedanswer_id = answers[condition.parentId];
    if (!selectedanswer_id) return false;

    const parentOptions = answer_options.filter((opt) => opt.question_id === condition.parentId);
    const selectedAnswer = parentOptions.find((opt) => String(opt.id) === String(selectedanswer_id));
    return selectedAnswer?.answer?.toLowerCase() === condition.expectedAnswer.toLowerCase();
  };

  const isSectionComplete = (section: number): boolean => {
    if (callbacksRef.current.customIsSectionComplete) {
      return callbacksRef.current.customIsSectionComplete(section, answers, groupedQuestions, shouldDisplayQuestion);
    }
    const sectionQuestions = groupedQuestions[section] || [];
    const visibleQuestions = sectionQuestions.filter(q => shouldDisplayQuestion(q.id));
    return visibleQuestions.length > 0 && visibleQuestions.every((q) => !!answers[q.id]);
  };

  return {
    allQuestions,
    answer_options,
    currentSection,
    setCurrentSection,
    answers,
    setAnswers,
    loading,
    saving,
    lastSaved,
    onExitClick: () => setDialogs((prev) => ({ ...prev, exit: true })),
    onSaveClick: handleManualSave,
    onConfirmExit: () => {
      saveToLocal();
      setDialogs((prev) => ({ ...prev, exit: false }));
      navigate(test_id === 5 ? '/dat' : '/client', { replace: true });
    },
    onConfirmSubmit: () => {
      setDialogs((prev) => ({ ...prev, confirm: false }));
      submitTest();
    },
    onSubmitClick: () => {
      if (!navigator.onLine) {
        saveToLocal();
        setDialogs((prev) => ({ ...prev, offlineBlock: true }));
      } else {
        setDialogs((prev) => ({ ...prev, confirm: true }));
      }
    },
    onSnackbarClose: handleSnackbarClose,
    snackbar,
    dialogs,
    setDialogs,
    setSaving,
    groupedQuestions,
    shouldDisplayQuestion,
    isSectionComplete,
    navigate,
    showSnackbar,
    saveToLocal,
  };
};

