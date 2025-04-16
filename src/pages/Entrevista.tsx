import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Question {
  id: number;
  question: string;
}

const Entrevista: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question')
        .eq('testid', 1)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al obtener preguntas:', error.message);
      } else {
        setQuestions(data || []);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, []);

  if (loading) return <p>Cargando preguntas...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Test: Entrevista</h2>
      <form>
        {questions.map((q) => (
          <div key={q.id} style={{ marginBottom: '1rem' }}>
            <label>{q.question}</label>
            <br />
            <textarea rows={3} style={{ width: '100%' }} />
          </div>
        ))}
      </form>
    </div>
  );
};

export default Entrevista;
