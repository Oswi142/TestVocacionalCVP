import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import ChatIcon from '@mui/icons-material/Chat'; // Ícono de chat estilo WhatsApp (gris)

const Header: React.FC = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggleDrawer = (open: boolean) => () => {
    setOpenDrawer(open);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ backgroundColor: '#ffffff', mb: 2 }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)}>
            <AccountCircleIcon fontSize="large" sx={{ color: '#2e7d32' }} />
          </IconButton>

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, textAlign: 'center' }}
          >
            Club Vida Plena
          </Typography>

          <Box width="48px" />
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={openDrawer} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 250,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
          }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          {/* Parte superior con datos del usuario */}
          <Box>
            <List>
              <Box px={2} pt={2}>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                  gutterBottom
                >
                  Nombre
                </Typography>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary={user.name || 'Nombre'} />
                </ListItem>

                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                  gutterBottom
                  sx={{ mt: 2 }}
                >
                  Usuario
                </Typography>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <BadgeIcon />
                  </ListItemIcon>
                  <ListItemText primary={user.username || 'Usuario'} />
                </ListItem>
              </Box>
            </List>

            <Divider />
          </Box>

          {/* Botón Contáctanos */}
          <List>
            <ListItem
              component="a"
              href="https://wa.me/59171234567?text=Hola%2C%20quisiera%20hacer%20una%20consulta%20sobre%20el%20test%20vocacional"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'black',
                fontWeight: 'medium',
                textDecoration: 'none',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'text.secondary' }}>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText primary="Contáctanos" />
            </ListItem>
          </List>

          {/* Botón cerrar sesión fijo al fondo */}
          <Box
            sx={{
              mt: 'auto',
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              p: 1.5,
            }}
          >
            <ListItem
              onClick={handleLogout}
              component="button"
              sx={{
                backgroundColor: '#fff',
                color: 'red',
                fontWeight: 'bold',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: '#fceaea',
                },
                '& .MuiListItemIcon-root': {
                  color: 'red',
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItem>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
