import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Container,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface Question {
  id: number;
  question: string;
}

interface School {
  id: number;
  schoolname: string;
}

const departamentos = [
  'La Paz',
  'Cochabamba',
  'Santa Cruz',
  'Oruro',
  'Potosí',
  'Chuquisaca',
  'Tarija',
  'Beni',
  'Pando'
];

const Entrevista: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [birthdayDate, setBirthdayDate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [questionsRes, schoolsRes] = await Promise.all([
        supabase.from('questions').select('id, question').eq('testid', 1).order('id', { ascending: true }),
        supabase.from('schools').select('id, schoolname').order('schoolname', { ascending: true }),
      ]);

      if (questionsRes.error) {
        console.error('Error al obtener preguntas:', questionsRes.error.message);
      } else {
        setQuestions(questionsRes.data || []);
      }

      if (schoolsRes.error) {
        console.error('Error al obtener colegios:', schoolsRes.error.message);
      } else {
        setSchools(schoolsRes.data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const mapped = {
        gender: answers[questions[0]?.id] || '',
        birthday: birthdayDate ? birthdayDate.format('YYYY-MM-DD') : '',
        birthplace: answers[questions[2]?.id] || '',
        address: answers[questions[3]?.id] || '',
        grade: answers[questions[5]?.id] || '',
        hobbies: answers[questions[6]?.id] || '',
      };

      const { error } = await supabase.from('clientsinfo').upsert({
        userid: user.id,
        gender: mapped.gender,
        birthday: mapped.birthday,
        birthplace: mapped.birthplace,
        address: mapped.address,
        schoolid: selectedSchoolId,
        grade: mapped.grade,
        hobbies: mapped.hobbies,
      });

      if (error) throw error;

      setMessage('Datos guardados correctamente.');
    } catch (err: any) {
      setMessage('Error al guardar datos: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom color="primary">
        Test: Entrevista
      </Typography>
      <form onSubmit={handleSubmit}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {questions.map((q, index) => (
            <Box key={q.id} mb={3}>
              <Typography variant="body1" fontWeight={500} gutterBottom>
                {q.question}
              </Typography>

              {index === 0 ? (
                <FormControl fullWidth variant="outlined">
                  <Select
                    displayEmpty
                    value={answers[q.id] || ''}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    inputProps={{ 'aria-label': 'Selecciona tu género' }}
                  >
                    <MenuItem value="" disabled>
                      Selecciona tu género
                    </MenuItem>
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Femenino">Femenino</MenuItem>
                  </Select>
                </FormControl>
              ) : index === 1 ? (
                <DatePicker
                  value={birthdayDate}
                  onChange={(newValue) => setBirthdayDate(newValue)}
                  format="DD/MM/YYYY"
                />
              ) : index === 2 ? (
                <FormControl fullWidth variant="outlined">
                  <Select
                    displayEmpty
                    value={answers[q.id] || ''}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    inputProps={{ 'aria-label': 'Departamento' }}
                  >
                    <MenuItem value="" disabled>
                      Departamento
                    </MenuItem>
                    {departamentos.map((dep) => (
                      <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : index === 4 ? (
                <FormControl fullWidth variant="outlined">
                  <Select
                    displayEmpty
                    value={selectedSchoolId !== null ? String(selectedSchoolId) : ''}
                    onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                    inputProps={{ 'aria-label': 'Selecciona tu colegio' }}
                  >
                    <MenuItem value="" disabled>
                      Selecciona tu colegio
                    </MenuItem>
                    {schools.map((school) => (
                      <MenuItem key={school.id} value={school.id}>
                        {school.schoolname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  variant="outlined"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                />
              )}
            </Box>
          ))}
        </LocalizationProvider>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        {message && (
          <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </form>
    </Container>
  );
};

export default Entrevista;
