import React, { useState, useMemo } from 'react';
import { supabase } from '@/infrastructure/config/supabaseClient';
import { useTestLogic } from '@/application/useCases/useTestLogic';
import { useAuth } from '@/application/useCases/useAuth';
import { Question } from '@/domain/entities/test';
import TestLayout from '@/presentation/features/tests/components/TestLayout';
import SectionInstructions from '@/presentation/features/tests/components/SectionInstructions';
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
    } = useTestLogic<Question>(0, 'introduccion', testLogicOptions);
    const handleAnswerChange = (id: number, value: string) => {
        if (value.startsWith(' ')) return;
        setAnswers(prev => ({ ...prev, [id]: value }));
    };

    const handleSchoolChange = (value: string) => {
        if (value.startsWith(' ')) return;
        setSchoolName(value);
    };

    const handleSubmit = async () => {
        if (!isSectionComplete(1)) {
            showSnackbar('Por favor completa todos los campos requeridos.', 'error');
            return;
        }

        if (schoolName.trim().length === 0) {
            showSnackbar('El nombre del colegio no puede estar vacío o contener solo espacios.', 'error');
            return;
        }

        if (!user || !user.id) return;

        if (!navigator.onLine) {
            showSnackbar('Necesitas conexión para enviar porfa.', 'warning');
            return;
        }

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

            const { error: infoError } = await supabase.from('clients_info').upsert({
                user_id: user.id,
                gender: mapped.gender,
                birthday: mapped.birthday,
                birthplace: mapped.birthplace,
                address: mapped.address,
                school: schoolName.trim(),
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

        const currentVal = answers[q.id] || '';
        const isOnlySpaces = currentVal.length > 0 && currentVal.trim().length === 0;

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
                            error={isOnlySpaces}
                            helperText={isOnlySpaces ? "No puede contener solo espacios" : "Selecciona tu lugar de nacimiento"}
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
                                '& .MuiFormHelperText-root': { color: isOnlySpaces ? 'error.main' : 'text.secondary', fontWeight: 500, mt: 1 }
                            }}
                        />
                    )}
                />
            );
        }

        if (lowQ.includes('colegio')) {
            const isSchoolOnlySpaces = schoolName.length > 0 && schoolName.trim().length === 0;
            return (
                <Autocomplete
                    freeSolo
                    options={COLEGIOS_RECOMENDADOS}
                    value={schoolName}
                    onInputChange={(_: any, newValue: string) => handleSchoolChange(newValue)}
                    renderInput={(params: any) => (
                        <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            placeholder="Nombre de tu colegio..."
                            error={isSchoolOnlySpaces}
                            helperText={isSchoolOnlySpaces ? "No puede contener solo espacios" : "Busca tu colegio o registralo tú mism@"}
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
                                '& .MuiFormHelperText-root': { color: isSchoolOnlySpaces ? 'error.main' : 'text.secondary', fontWeight: 500, mt: 1 }
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
                            error={isOnlySpaces}
                            helperText={isOnlySpaces ? "No puede contener solo espacios" : "Selecciona o escribe tu curso actual"}
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
                                '& .MuiFormHelperText-root': { color: isOnlySpaces ? 'error.main' : 'text.secondary', fontWeight: 500, mt: 1 }
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
                error={isOnlySpaces}
                helperText={isOnlySpaces ? "No puede contener solo espacios" : ""}
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
                    <SectionInstructions instructions="Por favor completa tus datos personales antes de continuar con la evaluación para conocerte mejor." />

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
