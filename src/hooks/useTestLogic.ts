import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    conditionalVisibility?: Record<number, { parentId: number, expectedAnswer: string }>; // childId: { parentId, expectedAnswer }
  } = {}
) => {
  const {
    datType = null,
    minQuestionId = null,
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
  const [answerOptions, setAnswerOptions] = useState<BaseAnswerOption[]>([]);
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
  const [dialogs, setDialogs] = useState({ confirm: false, exit: false });


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

      if (testId !== 0 && !progress.hasCompletedIntro) {
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

      const isMainCompleted = progress.completedMainTestIds.includes(testId);
      const isDatCompleted = datType ? progress.completedDatTypes.includes(datType) : false;

      if (isMainCompleted && testId !== 5) {
        navigate('/client', { replace: true });
        return;
      }
      if (isDatCompleted) {
        navigate('/dat', { replace: true });
        return;
      }

      if (testId !== 0) {
        const currentIdx = mainOrder.indexOf(testId);
        if (currentIdx >= 0 && testId !== 1) {
          const prevTestId = mainOrder[currentIdx - 1];
          let prevCompleted = progress.completedMainTestIds.includes(prevTestId);

          if (testId === 5 && datType) {
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

      const qs = (await testService.getQuestions(testId, { datType, minQuestionId })) as T[];

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

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error al cargar los datos', 'error');
      setLoading(false);
    }
  }, [testId, datType, questionsPerSection, minQuestionId, loadFromLocal, showSnackbar, navigate]);

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
        clientid: user?.id as number,
        testid: testId,
        questionid: q.id,
        answerid: Number.isInteger(parsed) ? parsed : null,
      };
    });

    const visiblePayload = payload.filter(p =>
      (!conditionalVisibility || shouldDisplayQuestion(p.questionid)) &&
      p.answerid !== null
    );

    setDialogs((prev) => ({ ...prev, confirm: false }));
    setSaving(true);
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }

      await testService.submitAnswers(visiblePayload);

      localStorage.removeItem(STORAGE_KEY);
      setDialogs((prev) => ({ ...prev, confirm: false }));
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate(navigateOnSubmit, { replace: true, state: { showConfetti: true } }), 500);
    } catch (err: any) {

      if (!navigator.onLine || err.message === 'Offline' || err.message?.includes('fetch')) {
        const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        pending.push({
          id: Date.now(),
          payload,
          storageKey: STORAGE_KEY
        });
        localStorage.setItem('pending_submissions', JSON.stringify(pending));

        showSnackbar('Sin conexión. Las respuestas se enviarán automáticamente cuando vuelvas a estar online.', 'warning');
        localStorage.removeItem(STORAGE_KEY);
        setTimeout(() => navigate(navigateOnSubmit, { replace: true }), 3000);
      } else {
        showSnackbar('Hubo un problema al enviar tus respuestas. Por favor, intenta de nuevo o contacta con soporte.', 'error');
      }
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
    const condition = conditionalVisibility[questionId];
    if (!condition) return true;

    const selectedAnswerId = answers[condition.parentId];
    if (!selectedAnswerId) return false;

    const parentOptions = answerOptions.filter((opt) => opt.questionid === condition.parentId);
    const selectedAnswer = parentOptions.find((opt) => String(opt.id) === String(selectedAnswerId));
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
    answerOptions,
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
      navigate(testId === 5 ? '/dat' : '/client', { replace: true });
    },
    onConfirmSubmit: () => {
      setDialogs((prev) => ({ ...prev, confirm: false }));
      submitTest();
    },
    onSubmitClick: () => setDialogs((prev) => ({ ...prev, confirm: true })),
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

