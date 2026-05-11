import React from 'react';
import { Box, Typography, Fade } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface SectionInstructionsProps {
  instructions: string;
}

const SectionInstructions: React.FC<SectionInstructionsProps> = ({ instructions }) => {
  return (
    <Fade in={true} timeout={800}>
      <Box
        sx={{
          mb: 4,
          p: 2.5,
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 255, 0.8) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(14, 165, 233, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            background: 'linear-gradient(to bottom, #0ea5e9, #3b82f6)',
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '12px',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            color: '#0ea5e9',
            flexShrink: 0,
          }}
        >
          <InfoOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#0ea5e9',
              fontWeight: 800,
              letterSpacing: '1px',
              display: 'block',
              mb: 0.5,
              lineHeight: 1.2
            }}
          >
            Instrucciones de Sección
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#334155',
              fontWeight: 600,
              lineHeight: 1.6,
            }}
          >
            {instructions}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export default SectionInstructions;
