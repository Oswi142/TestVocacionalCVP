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
                background: 'linear-gradient(to right, rgb(249, 201, 164), rgb(202, 250, 204))',
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
