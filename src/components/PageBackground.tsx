import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface PageBackgroundProps extends BoxProps {
    children: React.ReactNode;
}

const PageBackground: React.FC<PageBackgroundProps> = ({ children, sx, ...props }) => {
    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                background: 'transparent',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                overflow: 'hidden',
                ...sx,
            }}
            {...props}
        >
            {children}
        </Box>
    );
};

export default PageBackground;
