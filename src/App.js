import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import ErrorIcon from '@mui/icons-material/Error';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import TrainIcon from '@mui/icons-material/Train';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Chip,
  Container,
  Grid,
  Link,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import axios from 'axios';
import { addDays, compareAsc, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cardio, grid, pinwheel } from 'ldrs';
import React, { useEffect, useState } from 'react';
import LoadingAnimation from "./customLoading";

grid.register();
pinwheel.register();
cardio.register();

const version = React.version;
const formatDate = (date) => format(date, 'PP', { locale: fr });
const formatTime = (time) => time.slice(0, 5);
const formatIsoDate = (isoDate) => format(parseISO(isoDate), "PPpp", { locale: fr });
const formatDuration = (duration) => {
  const parts = duration.split(':');
  const minutes = parseInt(parts[1], 10);
  return `${minutes}min`;
};

const DisruptionSnackbar = ({ disruption, onClose }) => {
  return (
    <Snackbar
      open={true}
      autoHideDuration={12000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose} 
        severity="warning" 
        elevation={6}
        variant="filled"
        icon={<ErrorIcon />}
        sx={{ 
          width: '100%', 
          maxWidth: 500,
          '& .MuiAlert-icon': { 
            alignItems: 'center' 
          }
        }}
      >
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Perturbation sur la Ligne J
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Cause:</Typography>
        <Typography variant="body2">{disruption.cause}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>Effet:</Typography>
        <Typography variant="body2">{disruption.severity.effect}</Typography>
        {disruption.messages.map((message, index) => (
          <Typography key={index} variant="body2" sx={{ mt: 1 }}>{message.text}</Typography>
        ))}
      </Alert>
    </Snackbar>
  );
};

const ScheduleCard = ({ direction, date, schedule, isToday = false, icon }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentTime = format(new Date(), 'HH:mm');
  const isEmpty = !schedule || schedule.length === 0;
  const tableRef = React.useRef(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [expanded, setExpanded] = useState(false); // New state to track expansion

  // Track scroll position to show/hide sticky header
  useEffect(() => {
    if (isEmpty) return;
    
    const handleScroll = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      // Show sticky header when table top is above viewport top
      setShowStickyHeader(tableTop <= 0);
    };

    // Initial check in case the card is already scrolled
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isEmpty]);

  // New function to determine which rows to display in collapsed mode
  const getVisibleRows = () => {
    if (expanded || isEmpty) return schedule;
    
    if (!isToday) return schedule.slice(0, 3); // For tomorrow, just show first 3
    
    // For today, try to show next departure and one before/after
    let nextDepartureIndex = -1;
    
    // Find next departure
    for (let i = 0; i < schedule.length; i++) {
      const isUpcoming = compareAsc(
        new Date(`1970-01-01T${formatTime(schedule[i].departure)}`), 
        new Date(`1970-01-01T${currentTime}`)
      ) >= 0;
      
      if (isUpcoming) {
        nextDepartureIndex = i;
        break;
      }
    }
    
    // No upcoming departures today
    if (nextDepartureIndex === -1) return schedule.slice(0, 3);
    
    // Calculate range to show (next departure and one before/after if possible)
    const startIndex = Math.max(0, nextDepartureIndex - 1);
    const endIndex = Math.min(schedule.length, startIndex + 3);
    
    return schedule.slice(startIndex, endIndex);
  };

  // Handler to toggle expanded state
  const toggleExpanded = (e) => {
    // Check if click is on a button, link, or within the table content
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('table')) {
      return; // Don't toggle if clicking on interactive elements or table
    }
    
    // Otherwise toggle expanded state for any click on the card or its children
    setExpanded(prev => !prev);
  };

  const visibleRows = getVisibleRows();
  const hasMoreRows = !isEmpty && !expanded && schedule.length > visibleRows.length;

  return (
    <Card sx={{ 
      mb: 4, 
      borderRadius: 2,
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s ease-in-out',
      width: '100%', // Ensure card fills container width
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 6px 25px rgba(0,0,0,0.15)',
      },
      position: 'relative', // Required for absolute positioning of sticky header
      overflow: 'visible', // Allow sticky header to be visible outside card
      cursor: isEmpty ? 'default' : 'pointer',
    }}
      onClick={isEmpty ? undefined : toggleExpanded} // Only add click handler if not empty
    >
      <CardHeader
      className="card-clickable-area"
        avatar={
          <Avatar sx={{ bgcolor: direction.includes('Vernou') ? '#1976d2' : '#f44336' }}>
            {icon}
          </Avatar>
        }
        title={
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {direction}
          </Typography>
        }
        subheader={formatDate(date)}
        sx={{
          pb: 1,
          backgroundColor: 'rgba(0,0,0,0.02)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      
      {isEmpty ? (
        <Box sx={{ 
          py: 4, 
          px: 2, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.01)'
        }}>
          {/* Empty state content... */}
          <Box sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            backgroundColor: 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}>
            <EventBusyIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
          </Box>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun train disponible
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
            {isToday ? 
              "Il n'y a pas de trains programmés pour aujourd'hui sur ce trajet." : 
              "Il n'y a pas de trains programmés pour demain sur ce trajet."}
          </Typography>
          
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            borderRadius: 2, 
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            border: '1px dashed rgba(25, 118, 210, 0.3)',
            maxWidth: 300
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrainIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" color="primary.main">
                Information voyageur
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ce trajet peut être annulé en raison de travaux, jours fériés ou grèves. 
              Consultez le site SNCF pour plus d'informations.
            </Typography>
          </Box>
          
          <Button 
            variant="outlined" 
            color="primary" 
            size="small" 
            href="https://www.transilien.com/fr/page-lignes/ligne-j" 
            target="_blank"
            sx={{ mt: 2 }}
          >
            Vérifier sur le site officiel
          </Button>
        </Box>
      ) : (
        <CardContent sx={{ p: 0, width: '100%', position: 'relative' }} ref={tableRef} onClick={(e) => e.stopPropagation()}>
          {/* Sticky header that appears when scrolling */}
          {showStickyHeader && (
            <Box
              sx={{
                position: 'fixed',  // Changed from sticky to fixed
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,  // Increased z-index
                backgroundColor: direction.includes('Vernou') ? 'rgba(25, 118, 210, 0.98)' : 'rgba(244, 67, 54, 0.98)',
                color: 'white',
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center content
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                maxWidth: {xs: '100%', sm: '600px', md: '900px'},
                mx: 'auto',
              }}
            >
              {icon && (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  {React.cloneElement(icon, { 
                    sx: { color: 'white', fontSize: isMobile ? 18 : 24 }
                  })}
                </Box>
              )}
              <Typography 
                variant={isMobile ? "body1" : "h6"} 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {direction}
              </Typography>
            </Box>
          )}

          <TableContainer sx={{ width: '100%' }}>
            <Table size={isMobile ? "small" : "medium"} aria-label="train schedule table" sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <TableCell align="center" sx={{ fontWeight: 'bold', py: 1.5, width: '33%' }}>Départ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', py: 1.5, width: '33%' }}>Arrivée</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', py: 1.5, width: '33%' }}>Durée</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  let nextDepartureFound = false;
                  
                  return visibleRows.map((row, index) => {
                    const isNextDeparture = isToday &&
                      !nextDepartureFound &&
                      compareAsc(new Date(`1970-01-01T${formatTime(row.departure)}`), new Date(`1970-01-01T${currentTime}`)) >= 0;

                    if (isNextDeparture) nextDepartureFound = true;

                    return (
                      <TableRow
                        key={index}
                        sx={{
                          position: 'relative',
                          backgroundColor: isNextDeparture ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                          borderLeft: isNextDeparture ? '4px solid #1976d2' : 'none',
                          '&:nth-of-type(odd)': {
                            backgroundColor: isNextDeparture ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0,0,0,0.02)',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.04)',
                          },
                          '& > td:first-of-type': {
                            paddingLeft: isNextDeparture ? (isMobile ? '4px' : '8px') : 'inherit'
                          }
                        }}
                      >
                        <TableCell align="center" sx={{ 
                          position: 'relative',
                          fontWeight: isNextDeparture ? 700 : 400,
                          color: isNextDeparture ? '#1976d2' : 'inherit',
                          py: 1.5,
                          px: isMobile ? 1 : 2,
                          width: '33%',
                          ...(isNextDeparture && {
                            borderRadius: '4px',
                            boxShadow: 'inset 0 0 0 2px #1976d2'
                          })
                        }}>
                          {isNextDeparture && (
                            <Box sx={{
                              position: 'absolute',
                              top: -8,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              bgcolor: '#1976d2',
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              py: 0.3,
                              px: 0.8,
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              Prochain
                            </Box>
                          )}
                          {formatTime(row.departure)}
                        </TableCell>
                        <TableCell align="center" sx={{ 
                          fontWeight: isNextDeparture ? 700 : 400,
                          color: isNextDeparture ? '#1976d2' : 'inherit',
                          py: 1.5,
                          px: isMobile ? 1 : 2,
                          width: '33%'
                        }}>
                          {formatTime(row.arrival)}
                        </TableCell>
                        <TableCell align="center" sx={{ 
                          fontWeight: isNextDeparture ? 700 : 400,
                          color: isNextDeparture ? '#1976d2' : 'inherit',
                          py: 1.5,
                          px: isMobile ? 1 : 2,
                          width: '33%'
                        }}>
                          {formatDuration(row.duration)}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Show more/less button */}
          {hasMoreRows && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 1.5, 
                borderTop: '1px solid rgba(0,0,0,0.08)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.02) 100%)'
              }}
            >
              <Button
                variant="text"
                color={direction.includes('Vernou') ? "primary" : "error"}
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  setExpanded(true);
                }}
                endIcon={<KeyboardArrowDownIcon />}
                sx={{ 
                  fontWeight: 500,
                  px: 3,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.06)',
                  },
                }}
              >
                Voir tous les horaires ({schedule.length - visibleRows.length} de plus)
              </Button>
            </Box>
          )}
          
          {/* Show less button when expanded */}
          {expanded && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 1.5, 
                borderTop: '1px solid rgba(0,0,0,0.08)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.02) 100%)'
              }}
            >
              <Button
                variant="text"
                color={direction.includes('Vernou') ? "primary" : "error"}
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  setExpanded(false);
                }}
                endIcon={<KeyboardArrowUpIcon />}
                sx={{ 
                  fontWeight: 500,
                  px: 3,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.06)',
                  },
                }}
              >
                Réduire
              </Button>
            </Box>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const WeatherInfo = ({ area, weatherData, isSuwon = false }) => {
  if (!weatherData) return null;

  let iconComponent;
  if (area === "Vernon") {
    iconComponent = <WbSunnyIcon sx={{ color: "#FFB300" }} />;
  } else if (area === "Paris") {
    iconComponent = <WbSunnyIcon sx={{ color: "#1976d2" }} />;
  } else {
    iconComponent = <WbSunnyIcon sx={{ color: "#9c27b0" }} />;
  }

  // If it's Suwon, data structure differs
  if (isSuwon) {
    return (
      <Card sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        }
      }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: '#9c27b0' }}>
              {iconComponent}
            </Avatar>
          }
          title={
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              {area}
            </Typography>
          }
          subheader={
            <Link href="https://www.k-pullup.com/pullup/7263" target="_blank" sx={{ color: 'text.secondary' }}>
              Détails
            </Link>
          }
          sx={{
            pb: 1,
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        />
        <CardContent sx={{ px: 2, py: 1, flexGrow: 1 }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Température</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.temperature}°C</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Conditions</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.desc}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Humidité</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.humidity}%</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Pluie</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.rainfall} mm/h</Typography>
            </Grid>
            {weatherData.snowfall && weatherData.snowfall.trim() !== '' && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Neige</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.snowfall} mm/h</Typography>
              </Grid>
            )}
          </Grid>
          {weatherData.iconImage && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <img src={weatherData.iconImage} alt="Météo Suwon" style={{ height: 40 }} />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default case for Vernon & Paris
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }
    }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: area === "Vernon" ? '#FFB300' : '#1976d2' }}>
            {iconComponent}
          </Avatar>
        }
        title={
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {area}
          </Typography>
        }
        subheader={
          <Link href="https://meteofrance.com/" target="_blank" sx={{ color: 'text.secondary' }}>
            Météo France
          </Link>
        }
        sx={{
          pb: 1,
          backgroundColor: 'rgba(0,0,0,0.02)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      <CardContent sx={{ px: 2, py: 1, flexGrow: 1 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Température</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.temperature_do}°C</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Ressenti</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.wind_chill_do}°C</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Humidité</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.humidity_percentage}%</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Vent</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.wind_speed_ms} m/s</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Conditions</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.weather_condition}</Typography>
          </Grid>
          {weatherData.next_hour_rain_date && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Pluie prévue</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{weatherData.next_hour_rain_date}</Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Mis à jour: {weatherData.updated_at}
        </Typography>
      </CardContent>
    </Card>
  );
};

const WeatherDisplay = () => {
  const [vernonWeather, setVernonWeather] = useState(null);
  const [parisWeather, setParisWeather] = useState(null);
  const [suwonWeather, setSuwonWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [franceImg, setFranceImg] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchWeatherData = async (apiUrl, setter) => {
      try {
        const response = await axios.get(apiUrl);
        setter(response.data);
        if (!franceImg && response.data.france_img) {
          setFranceImg(response.data.france_img);
        }
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch Vernon & Paris from existing backend
    fetchWeatherData('https://lignej-vv-ps.fly.dev/current-weather/vernon', setVernonWeather);
    fetchWeatherData('https://lignej-vv-ps.fly.dev/current-weather/paris', setParisWeather);
  }, [franceImg]);

  useEffect(() => {
    // Fetch Suwon weather from given endpoint
    const fetchSuwonWeather = async () => {
      try {
        const response = await axios.get('https://www.k-pullup.com/api/v1/markers/weather?latitude=37.26796&longitude=127.08443500000001');
        setSuwonWeather(response.data);
      } catch (err) {
        // If error occurs, we won't block the entire UI, just no Suwon data
      }
    };
    fetchSuwonWeather();
  }, []);

  if (loading) return <Typography>Chargement des données météorologiques...</Typography>;
  if (error) return <Typography>Erreur de chargement des données météo : {error.message}</Typography>;

  return (
    <Box sx={{ mb: 4 }}>
      {franceImg && (
        <Card sx={{ 
          mb: 3, 
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <CardHeader
            title="Satellite France"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              py: 1
            }}
          />
          <CardMedia
            component="img"
            image={franceImg}
            alt="Satellite de la France"
            sx={{ 
              height: isMobile ? 200 : 300, 
              objectFit: 'cover'
            }}
          />
        </Card>
      )}
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2, pl: 1 }}>
        Météo actuelle
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <WeatherInfo area="Vernon" weatherData={vernonWeather} />
        </Grid>
        <Grid item xs={12} md={4}>
          <WeatherInfo area="Paris" weatherData={parisWeather} />
        </Grid>
        <Grid item xs={12} md={4}>
          <WeatherInfo area="Suwon" weatherData={suwonWeather} isSuwon={true} />
        </Grid>
      </Grid>
    </Box>
  );
};

const App = () => {
  const [scheduleData, setScheduleData] = useState({
    vernonParisToday: [],
    parisVernonToday: [],
    vernonParisTomorrow: [],
    parisVernonTomorrow: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextDepartures, setNextDepartures] = useState({ paris: '', vernon: '' });
  const [disruption, setDisruption] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentTime = format(new Date(), 'HH:mm');

  const handleCloseDisruption = (index) => {
    setDisruption((currentDisruptions) => (
      currentDisruptions.filter((_, i) => i !== index)
    ));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const findNextDeparture = React.useCallback((schedule, direction) => {
    let nextDepartureFound = false;
    let nextDepartureTime = '';

    schedule.forEach((row) => {
      if (!nextDepartureFound) {
        const departureDateTime = new Date(`1970-01-01T${formatTime(row.departure)}`);
        if (compareAsc(departureDateTime, new Date(`1970-01-01T${currentTime}`)) >= 0) {
          nextDepartureFound = true;
          nextDepartureTime = formatTime(row.departure);
        }
      }
    });

    setNextDepartures((prevDepartures) => ({
      ...prevDepartures,
      [direction]: nextDepartureTime,
    }));
  }, [currentTime]);

  useEffect(() => {
    if (scheduleData.vernonParisToday.length && scheduleData.parisVernonToday.length) {
      findNextDeparture(scheduleData.vernonParisToday, 'paris');
      findNextDeparture(scheduleData.parisVernonToday, 'vernon');
    }
  }, [scheduleData, findNextDeparture]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const [vernonParisResponse, parisVernonResponse] = await Promise.all([
          axios.get('https://lignej-vv-ps.fly.dev/train-schedule/vernon-to-paris'),
          axios.get('https://lignej-vv-ps.fly.dev/train-schedule/paris-to-vernon'),
        ]);

        if (vernonParisResponse.data.disruptions && vernonParisResponse.data.disruptions.length > 0) {
          setDisruption(vernonParisResponse.data.disruptions);
        } else {
          setDisruption(null);
        }

        setScheduleData((prevData) => ({
          ...prevData,
          vernonParisToday: vernonParisResponse.data.today.journeys,
          parisVernonToday: parisVernonResponse.data.today.journeys,
          vernonParisTomorrow: vernonParisResponse.data.tomorrow.journeys,
          parisVernonTomorrow: parisVernonResponse.data.tomorrow.journeys,
          dates: {
            today: new Date(),
            tomorrow: addDays(new Date(), 1),
          },
        }));
      } catch (err) {
        setError('Failed to fetch schedule data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ 
        backgroundColor: 'white', 
        color: 'text.primary',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ height: 70 }}>
            <DirectionsTransitIcon sx={{ mr: 2, color: '#1976d2' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
              <Box component="span" sx={{ color: '#1976d2' }}>Ligne J</Box> - Horaires
            </Typography>
            
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  icon={<AccessTimeIcon />} 
                  label={
                    <>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        Prochain Paris:
                      </Typography>{' '}
                      <Typography component="span" variant="body2">
                        {nextDepartures.paris || 'Aucun'}
                      </Typography>
                    </>
                  }
                  variant="outlined"
                  color="primary"
                  sx={{ mr: 1 }}
                />
                <Chip 
                  icon={<AccessTimeIcon />} 
                  label={
                    <>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        Prochain Vernon:
                      </Typography>{' '}
                      <Typography component="span" variant="body2">
                        {nextDepartures.vernon || 'Aucun'}
                      </Typography>
                    </>
                  }
                  variant="outlined"
                  color="error"
                />
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {isMobile && nextDepartures.paris && nextDepartures.vernon && (
        <Box sx={{ backgroundColor: '#f5f5f5', py: 1 }}>
          <Container maxWidth="lg">
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Chip 
                  icon={<AccessTimeIcon />} 
                  label={
                    <>
                      <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
                        Paris:
                      </Typography>{' '}
                      <Typography component="span" variant="caption">
                        {nextDepartures.paris}
                      </Typography>
                    </>
                  }
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={6}>
                <Chip 
                  icon={<AccessTimeIcon />} 
                  label={
                    <>
                      <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
                        Vernon:
                      </Typography>{' '}
                      <Typography component="span" variant="caption">
                        {nextDepartures.vernon}
                      </Typography>
                    </>
                  }
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ width: '100%' }}
                />
              </Grid>
            </Grid>
          </Container>
        </Box>
      )}

      {disruption && (
        <Box sx={{ backgroundColor: '#fff3e0', py: 1 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
              <ErrorIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2" color="warning.dark" sx={{ flexGrow: 1 }}>
                Perturbation en cours sur la Ligne J
              </Typography>
              <Button 
                color="warning" 
                size="small" 
                onClick={() => setDisruption(disruption)}
              >
                Détails
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ mt: 4, pb: 6 }}>
        {disruption ? (
          disruption.map((disrupt, index) => (
            <DisruptionSnackbar
              key={disrupt.id}
              disruption={disrupt}
              onClose={() => handleCloseDisruption(index)}
            />
          ))
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: '#e8f5e9', 
            p: 1.5, 
            mb: 3, 
            borderRadius: 2,
            border: '1px solid #c8e6c9'
          }}>
            <InfoIcon color="success" sx={{ mr: 2 }} />
            <Typography variant="body1" color="success.dark" sx={{ fontWeight: 500 }}>
              Trafic normal sur l'ensemble de la Ligne J
            </Typography>
          </Box>
        )}

        <WeatherDisplay />

        <Box sx={{ py: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1, pl: 1 }}>
            Ligne J - Paris Saint-Lazare ↔ Vernon-Giverny
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, pl: 1, color: 'text.secondary' }}>
            Horaires des trains entre Paris Saint-Lazare et Vernon-Giverny (Vernouillet - Verneuil)
          </Typography>

          {/* Ligne J Map Section */}
          <Card sx={{ 
            mb: 4, 
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <CardHeader
              avatar={<DirectionsTransitIcon color="primary" />}
              title="Plan de la Ligne J"
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              sx={{
                backgroundColor: 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                py: 1.5
              }}
            />
            <CardMedia
              component="img"
              image="https://www.transilien.com/sites/transilien/files/2024-09/Ligne_J_plan_schema_0924.png?itok=hB71PBN4"
              alt="Ligne J Map"
              sx={{ 
                width: '100%',
                maxWidth: '100%',
                height: isMobile ? 200 : 300,
                objectFit: 'cover',
                overflowX: 'auto',
                borderBottom: '1px solid rgba(0,0,0,0.1)'
              }}
            />
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2">
                Plan schématique de la Ligne J du Transilien reliant Paris Saint-Lazare à Vernon-Giverny 
                et autres destinations. Cliquez pour agrandir.
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                href="https://www.transilien.com/sites/transilien/files/2024-09/Ligne_J_plan_schema_0924.png?itok=hB71PBN4"
                target="_blank"
                disableElevation
              >
                Voir en grand
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                href="https://www.transilien.com/fr/page-lignes/ligne-j#content-section-1160-part-2-tab"
                target="_blank"
                sx={{ ml: 1 }}
              >
                Site officiel
              </Button>
            </CardActions>
          </Card>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              aria-label="schedule tabs"
            >
              <Tab 
                label="Aujourd'hui" 
                icon={<AccessTimeIcon />} 
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
              <Tab 
                label="Demain" 
                icon={<AccessTimeIcon />} 
                iconPosition="start" 
                sx={{ fontWeight: 600 }}
              />
            </Tabs>
          </Box>

          <Box sx={{ mt: 2 }}>
            {tabValue === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ScheduleCard
                    direction="Vernouillet - Verneuil → Paris"
                    date={scheduleData.dates.today}
                    schedule={scheduleData.vernonParisToday}
                    isToday={true}
                    icon={<NorthIcon />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ScheduleCard
                    direction="Paris → Vernouillet - Verneuil"
                    date={scheduleData.dates.today}
                    schedule={scheduleData.parisVernonToday}
                    isToday={true}
                    icon={<SouthIcon />}
                  />
                </Grid>
              </Grid>
            )}
            {tabValue === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ScheduleCard
                    direction="Vernouillet - Verneuil → Paris"
                    date={scheduleData.dates.tomorrow}
                    schedule={scheduleData.vernonParisTomorrow}
                    isToday={false}
                    icon={<NorthIcon />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ScheduleCard
                    direction="Paris → Vernouillet - Verneuil"
                    date={scheduleData.dates.tomorrow}
                    schedule={scheduleData.parisVernonTomorrow}
                    isToday={false}
                    icon={<SouthIcon />}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>
      </Container>

      <Box sx={{ bgcolor: '#f5f5f5', py: 3, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Horaires Ligne J - Vernon Paris (SeokWon)
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
            Les horaires sont fournis à titre indicatif et peuvent être modifiés par la SNCF.
            Consultez le site officiel pour les informations en temps réel.
          </Typography>
        </Container>
      </Box>
    </>
  );
};

export default App;