import React, { useState, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { useTestLogic } from '../../../hooks/useTestLogic';
import { useAuth } from '../../../hooks/useAuth';
import { Question } from '../../../types/test';
import TestLayout from '../components/TestLayout';
import { Box, Typography, TextField, MenuItem, Select, FormControl, Autocomplete } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

const Departamentos = [
    'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí',
    'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

const COLEGIOS_RECOMENDADOS = [
    'Colegio San Agustín', 'Colegio Tiquipaya', 'Colegio Don Bosco',
    'Colegio Cristo Rey', 'Colegio La Salle', 'Colegio Amerinst',
    'Colegio Saint Andrew\'s', 'Colegio Alemán Santa María', 'Colegio San Rafael',
    'Colegio San Antonio', 'Colegio Copacabana', 'Colegio San Francisco',
    'Colegio Pedro Poveda', 'Colegio Saint George', 'Colegio Marista',
    'Colegio España'
];

const CURSOS = [
    '1ro de secundaria',
    '2do de secundaria',
    '3ro de secundaria',
    '4to de secundaria',
    '5to de secundaria',
    '6to de secundaria'
];

const Introduccion: React.FC = () => {
    const { user } = useAuth();
    const [schoolName, setSchoolName] = useState<string>('');
    const [birthdayDate, setBirthdayDate] = useState<dayjs.Dayjs | null>(null);

    const testLogicOptions = useMemo(() => ({
        onSaveExtra: () => ({
            schoolName,
            birthdayDate: birthdayDate ? birthdayDate.toISOString() : null,
        }),
        onLoadExtra: (extra: any) => {
            if (extra.schoolName) setSchoolName(extra.schoolName);
            if (extra.birthdayDate) setBirthdayDate(dayjs(extra.birthdayDate));
        },
        customIsSectionComplete: (section: number, answers: { [key: number]: string }, grouped: { [key: number]: Question[] }, shouldDisplayFn: (id: number) => boolean) => {
            const questions = grouped[section] || [];
            if (questions.length === 0) return false;

            return questions.every((q) => {
                if (!shouldDisplayFn(q.id)) return true;
                const qText = q.question?.toLowerCase() || '';
                if (qText.includes('fecha')) return !!birthdayDate;
                if (qText.includes('colegio')) return !!schoolName && schoolName.trim() !== '';
                return !!answers[q.id] && answers[q.id].trim() !== '';
            });
        }
    }), [schoolName, birthdayDate]);

    const {
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
        setSaving,
        groupedQuestions,
        isSectionComplete,
        onExitClick,
        onSaveClick,
        onConfirmExit,
        onSubmitClick,
        onSnackbarClose,
        navigate,
        showSnackbar,
    } = useTestLogic<Question>(0, 'introduccion', testLogicOptions); // Recuperando preguntas del testid 0

    const handleAnswerChange = (id: number, value: string) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        if (!isSectionComplete(1)) {
            showSnackbar('Por favor completa todos los campos requeridos.', 'error');
            return;
        }

        if (!user || !user.id) return;

        try {
            setDialogs(prev => ({ ...prev, confirm: false }));
            setSaving(true);

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
                school: schoolName,
                grade: mapped.grade,
                hobbies: mapped.hobbies,
            });

            if (infoError) throw infoError;

            const STORAGE_KEY = `introduccion_${user.id || 'anonymous'}`;
            localStorage.removeItem(STORAGE_KEY);
            showSnackbar('Datos guardados correctamente', 'success');
            setTimeout(() => navigate('/client', { replace: true, state: { showConfetti: true } }), 500);


        } catch (err: any) {
            console.error('Error submitting intro:', err);
            showSnackbar('Error al guardar: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderCustomInput = (q: Question) => {
        const qText = q.question || '';
        const lowQ = qText.toLowerCase();

        if (lowQ.includes('sexo')) {
            return (
                <FormControl fullWidth variant="outlined">
                    <Select
                        displayEmpty
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        sx={{
                            borderRadius: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.65)',
                            transition: 'all 0.3s ease',
                            '&.Mui-focused': {
                                backgroundColor: '#ffffff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }
                        }}
                    >
                        <MenuItem value="" disabled>Selecciona tu género</MenuItem>
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Femenino">Femenino</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                    </Select>
                </FormControl>
            );
        }

        if (lowQ.includes('fecha')) {
            return (
                <DatePicker
                    value={birthdayDate}
                    onChange={setBirthdayDate}
                    format="DD/MM/YYYY"
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            sx: {
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }
                                }
                            }
                        }
                    }}
                />
            );
        }

        if (lowQ.includes('lugar') || lowQ.includes('nacimiento') || lowQ.includes('departamento')) {
            return (
                <Autocomplete
                    freeSolo
                    options={Departamentos}
                    value={answers[q.id] || ''}
                    onInputChange={(_: any, newValue: string) => handleAnswerChange(q.id, newValue)}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            placeholder="Tu departamento o ciudad..."
                            helperText="Selecciona tu lugar de nacimiento"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }
                                },
                                '& .MuiFormHelperText-root': { color: 'text.secondary', fontWeight: 500, mt: 1 }
                            }}
                        />
                    )}
                />
            );
        }

        if (lowQ.includes('colegio')) {
            return (
                <Autocomplete
                    freeSolo
                    options={COLEGIOS_RECOMENDADOS}
                    value={schoolName}
                    onInputChange={(_: any, newValue: string) => setSchoolName(newValue)}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            placeholder="Nombre de tu colegio..."
                            helperText="Busca tu colegio o registralo tú mism@"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }
                                },
                                '& .MuiFormHelperText-root': { color: 'text.secondary', fontWeight: 500, mt: 1 }
                            }}
                        />
                    )}
                />
            );
        }

        if (lowQ.includes('curso') || lowQ.includes('grado')) {
            return (
                <Autocomplete
                    freeSolo
                    options={CURSOS}
                    value={answers[q.id] || ''}
                    onInputChange={(_: any, newValue: string) => handleAnswerChange(q.id, newValue)}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            placeholder="Ej. 6to de secundaria"
                            helperText="Selecciona o escribe tu curso actual"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }
                                },
                                '& .MuiFormHelperText-root': { color: 'text.secondary', fontWeight: 500, mt: 1 }
                            }}
                        />
                    )}
                />
            );
        }

        return (
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Tu respuesta..."
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.65)',
                        transition: 'all 0.3s ease',
                        '&.Mui-focused': {
                            backgroundColor: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }
                    }
                }}
            />
        );
    };

    return (
        <TestLayout
            title="Introducción"
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
            onConfirmSubmit={handleSubmit}
        >
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, textAlign: 'center' }}>
                        Primero, para conocerte mejor...
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Por favor completa tus datos personales antes de continuar con la evaluación.
                    </Typography>

                    {(groupedQuestions[1] || [] as Question[]).map((q: Question) => (
                        <Box key={q.id} mb={3}>
                            <Typography variant="body1" fontWeight={700} color="#1e293b" gutterBottom>
                                {q.question}
                            </Typography>
                            {renderCustomInput(q)}
                        </Box>
                    ))}
                </Box>
            </LocalizationProvider>
        </TestLayout>
    );
};

export default Introduccion;
