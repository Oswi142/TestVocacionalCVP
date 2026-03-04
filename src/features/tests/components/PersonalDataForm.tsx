import React from 'react';
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Select,
    FormControl,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { Question } from '../../../types/test';

interface School {
    id: number;
    schoolname: string;
}

interface PersonalDataFormProps {
    questions: Question[];
    answers: { [key: number]: string };
    onAnswerChange: (id: number, value: string) => void;
    schools: School[];
    selectedSchoolId: number | null;
    onSchoolChange: (id: number) => void;
    birthdayDate: any;
    onDateChange: (date: any) => void;
}

const Departamentos = [
    'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí',
    'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

const PersonalDataForm: React.FC<PersonalDataFormProps> = ({
    questions,
    answers,
    onAnswerChange,
    schools,
    selectedSchoolId,
    onSchoolChange,
    birthdayDate,
    onDateChange,
}) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                            ) : lowQ.includes('departamento') ? (
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
                                        <MenuItem value="" disabled>Departamento</MenuItem>
                                        {Departamentos.map((dep) => (
                                            <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : lowQ.includes('colegio') ? (
                                <FormControl fullWidth variant="outlined">
                                    <Select
                                        displayEmpty
                                        value={selectedSchoolId !== null ? String(selectedSchoolId) : ''}
                                        onChange={(e) => onSchoolChange(Number(e.target.value))}
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
                                        <MenuItem value="" disabled>Selecciona tu colegio</MenuItem>
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
