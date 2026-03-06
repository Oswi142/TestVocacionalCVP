import React, { useState } from 'react';
import {
    Box,
    Typography,
    RadioGroup,
    Radio,
    FormControlLabel,
    TextField,
    Dialog,
    IconButton,
} from '@mui/material';

interface Question {
    id: number;
    question: string | null;
    image_path?: string | null;
}

interface AnswerOption {
    id: number;
    questionid: number;
    answer: string;
}

interface QuestionRendererProps {
    question: Question;
    options: AnswerOption[];
    currentAnswer: string;
    onAnswerChange: (questionId: number, answerId: string) => void;
    rowOptions?: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
    question,
    options,
    currentAnswer,
    onAnswerChange,
    rowOptions = false,
}) => {
    const [previewOpen, setPreviewOpen] = useState(false);

    const STORAGE_BUCKET = 'question_images';
    const getPublicImageUrl = (imagePath?: string | null) => {
        if (!imagePath) return null;
        const base = import.meta.env.VITE_SUPABASE_URL;
        return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${imagePath}`;
    };

    const imgUrl = getPublicImageUrl(question.image_path);

    return (
        <Box mb={4}>
            {/* Image if exists */}
            {imgUrl && (
                <Box
                    sx={{
                        mt: 1,
                        mb: 1.5,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)',
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        position: 'relative',
                        '&:hover .zoom-hint': { opacity: 1 },
                    }}
                >
                    <Box
                        component="img"
                        src={imgUrl}
                        alt={`Pregunta ${question.id}`}
                        loading="lazy"
                        onClick={() => setPreviewOpen(true)}
                        sx={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: 520,
                            height: 'auto',
                            width: 'auto',
                            objectFit: 'contain',
                            margin: '0 auto',
                            cursor: 'zoom-in',
                            transition: 'transform 0.2s ease',
                            '&:hover': { transform: 'scale(1.02)' },
                        }}
                    />
                    <Box
                        className="zoom-hint"
                        sx={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}
                    >
                        🔍 Clic para ampliar
                    </Box>
                </Box>
            )}

            {/* Question text */}
            {question.question && (
                <Typography variant="body1" fontWeight={700} color="#1e293b" gutterBottom>
                    {question.question}
                </Typography>
            )}

            {/* Options or Text Input */}
            {options.length > 0 ? (
                <RadioGroup
                    value={currentAnswer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    row={rowOptions}
                    sx={
                        rowOptions
                            ? { flexWrap: 'nowrap', width: '100%', justifyContent: 'space-between' }
                            : {}
                    }
                >
                    {options.map((opt) => (
                        <FormControlLabel
                            key={opt.id}
                            value={String(opt.id)}
                            control={<Radio color="primary" />}
                            label={opt.answer}
                            sx={rowOptions ? {
                                mr: 0,
                                flex: 1,
                                justifyContent: 'center',
                                borderRadius: 3,
                                transition: 'background-color 0.2s ease',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                            } : {
                                borderRadius: 3,
                                pr: 2,
                                transition: 'background-color 0.2s ease',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                            }}
                        />
                    ))}
                </RadioGroup>
            ) : (
                <>
                    <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        minRows={1}
                        maxRows={10}
                        inputProps={{ maxLength: 250 }}
                        value={currentAnswer || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(question.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
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
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
                        {(currentAnswer || '').length}/250 caracteres
                    </Typography>
                </>
            )}

            {/* Preview Dialog */}
            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.98)',
                        boxShadow: 'none',
                        margin: { xs: 2, sm: 4 },
                        maxHeight: { xs: '85vh', sm: '90vh' },
                        borderRadius: { xs: 2, sm: 3 },
                    },
                }}
                sx={{
                    '& .MuiBackdrop-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.92)',
                        backdropFilter: 'blur(8px)',
                    },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            padding: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <IconButton
                            onClick={() => setPreviewOpen(false)}
                            sx={{
                                color: 'white',
                                backgroundColor: 'rgba(255, 59, 48, 0.2)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 59, 48, 0.9)',
                                    transform: 'scale(1.1) rotate(90deg)',
                                },
                                transition: 'all 0.3s ease',
                            }}
                        >
                            ✕
                        </IconButton>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#000',
                            padding: 2,
                        }}
                    >
                        {imgUrl && (
                            <Box
                                component="img"
                                src={imgUrl}
                                alt="Vista previa"
                                onClick={() => setPreviewOpen(false)}
                                sx={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    cursor: 'zoom-out',
                                    borderRadius: 1,
                                }}
                            />
                        )}
                    </Box>
                </Box>
            </Dialog>
        </Box>
    );
};

const propsAreEqual = (prevProps: QuestionRendererProps, nextProps: QuestionRendererProps) => {
    return (
        prevProps.currentAnswer === nextProps.currentAnswer &&
        prevProps.question.id === nextProps.question.id &&
        // Options are assumed static by question length to avoid deep compare
        prevProps.options.length === nextProps.options.length
    );
};

export default React.memo(QuestionRenderer, propsAreEqual);
