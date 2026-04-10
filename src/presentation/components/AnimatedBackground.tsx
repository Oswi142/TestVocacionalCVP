import React from 'react';
import { Box } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const moveGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const waveAnimation = keyframes`
  0% { transform: translate(-50%, -75%) rotate(0deg); }
  100% { transform: translate(-50%, -75%) rotate(360deg); }
`;

const BackgroundContainer = styled(Box)({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
    overflow: 'hidden',
    background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
    backgroundSize: '400% 400%',
    animation: `${moveGradient} 15s ease infinite`,
});

const Wave = styled('div')({
    position: 'absolute',
    width: '200vw',
    height: '200vw',
    top: '0',
    left: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '43%',
    animation: `${waveAnimation} 20s linear infinite`,
    zIndex: 1,
});

const WaveSecondary = styled('div')({
    position: 'absolute',
    width: '210vw',
    height: '210vw',
    top: '0',
    left: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '40%',
    animation: `${waveAnimation} 25s linear infinite`,
    zIndex: 1,
});

const AnimatedBackground: React.FC = () => {
    return (
        <BackgroundContainer>
            <Wave />
            <WaveSecondary />
        </BackgroundContainer>
    );
};

export default AnimatedBackground;
