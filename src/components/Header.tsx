import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Header: React.FC = () => {
  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ backgroundColor: '#ffffff', mb: 2 }}
    >
      <Toolbar sx={{ px: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ flex: 1 }} /> {/* Espacio izquierdo vacío */}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="div" fontWeight={500}>
            Club Vida Plena
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} /> {/* Espacio derecho vacío por ahora */}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
