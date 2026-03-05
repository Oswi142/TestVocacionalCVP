import React from 'react';
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Select,
    FormControl,
    Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';

import { Question } from '../../../types/test';

// No more School interface needed

interface PersonalDataFormProps {
    questions: Question[];
    answers: { [key: number]: string };
    onAnswerChange: (id: number, value: string) => void;
    schoolName: string;
    onSchoolChange: (name: string) => void;
    birthdayDate: any;
    onDateChange: (date: any) => void;
}

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

const PersonalDataForm: React.FC<PersonalDataFormProps> = ({
    questions,
    answers,
    onAnswerChange,
    schoolName,
    onSchoolChange,
    birthdayDate,
    onDateChange,
}) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box>
                {questions.map((q) => {
                    const qText = q.question || '';
                    const lowQ = qText.toLowerCase();

                    return (
                        <Box key={q.id} mb={3}>
                            <Typography variant="body1" fontWeight={700} color="#1e293b" gutterBottom>
                                {qText}
                            </Typography>

                            {lowQ.includes('sexo') ? (
                                <FormControl fullWidth variant="outlined">
                                    <Select
                                        displayEmpty
                                        value={answers[q.id] || ''}
                                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
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
                            ) : lowQ.includes('fecha') ? (
                                <DatePicker
                                    value={birthdayDate}
                                    onChange={onDateChange}
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
                            ) : (lowQ.includes('lugar') || lowQ.includes('nacimiento') || lowQ.includes('departamento')) ? (
                                <Box>
                                    <Autocomplete
                                        freeSolo
                                        options={Departamentos}
                                        value={answers[q.id] || ''}
                                        onInputChange={(_: any, newValue: string) => onAnswerChange(q.id, newValue)}
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
                                                    '& .MuiFormHelperText-root': {
                                                        color: '#64748b',
                                                        fontWeight: 500,
                                                        mt: 1
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Box>
                            ) : lowQ.includes('colegio') ? (
                                <Box>
                                    <Autocomplete
                                        freeSolo
                                        options={COLEGIOS_RECOMENDADOS}
                                        value={schoolName}
                                        onInputChange={(_: any, newValue: string) => onSchoolChange(newValue)}
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
                                                    '& .MuiFormHelperText-root': {
                                                        color: '#64748b',
                                                        fontWeight: 500,
                                                        mt: 1
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Box>
                            ) : (
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Tu respuesta..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
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
                            )}
                        </Box>
                    );
                })}
            </Box>
        </LocalizationProvider>
    );
};

export default PersonalDataForm;
