import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

interface BaseQuestion {
  id: number;
  question: string;
  section: number;
}

interface BaseAnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

export const useTestLogic = <T extends BaseQuestion>(testId: number, storageKeyPrefix: string) => {
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
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [dialogs, setDialogs] = useState({ confirm: false, exit: false });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  const saveToLocal = useCallback(() => {
    try {
      const data = {
        answers,
        currentSection,
        lastSaved: new Date().toLocaleString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(data.lastSaved);
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      return false;
    }
  }, [answers, currentSection, STORAGE_KEY]);

  const loadFromLocal = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const localData = JSON.parse(stored);
        setAnswers(localData.answers || {});
        setCurrentSection(localData.currentSection || 1);
        setLastSaved(localData.lastSaved || '');
        showSnackbar('Respuestas cargadas', 'success');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [STORAGE_KEY]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('testid', testId)
        .order('id');

      if (qError) throw qError;

      const questionIds = questions.map(q => q.id);
      const { data: options, error: oError } = await supabase
        .from('answeroptions')
        .select('*')
        .in('questionid', questionIds)
        .order('id');

      if (oError) throw oError;

      setAllQuestions(questions as T[]);
      setAnswerOptions(options as BaseAnswerOption[]);
      loadFromLocal();
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleManualSave = () => {
    const success = saveToLocal();
    showSnackbar(success ? 'Respuestas guardadas correctamente' : 'Error al guardar', success ? 'success' : 'error');
  };

  const submitTest = async () => {
    setSaving(true);
    try {
      const entries = allQuestions.map(q => ({
        clientid: user?.id,
        testid: testId,
        questionid: q.id,
        answerid: parseInt(answers[q.id])
      }));

      const { error } = await supabase.from('testsanswers').insert(entries);
      if (error) throw error;

      localStorage.removeItem(STORAGE_KEY);
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate('/client'), 2000);
    } catch (err: any) {
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const groupedQuestions = allQuestions.reduce((acc: { [key: number]: T[] }, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const isSectionComplete = (section: number): boolean => {
    const sectionQuestions = groupedQuestions[section] || [];
    return sectionQuestions.length > 0 && sectionQuestions.every(q => !!answers[q.id]);
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
    isSectionComplete,
    navigate,
  };
};
