import React from 'react';
import { Box, BoxProps } from '@mui/material';
import logo from '../assets/logo-cvp.png';

interface LogoHeaderProps extends BoxProps {
    height?: number | string;
}

const LogoHeader: React.FC<LogoHeaderProps> = ({ height = 120, sx, ...props }) => {
    return (
        <Box
            component="img"
            src={logo}
            alt="Club Vida Plena"
            draggable={false}
            sx={{
                height: height,
                maxWidth: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none',
                caretColor: 'transparent',
                ...sx,
            }}
            {...props}
        />
    );
};

export default LogoHeader;
