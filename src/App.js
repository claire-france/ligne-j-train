import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  Grid,
  IconButton,
  Link,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Toolbar,
  Typography
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
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity="warning" sx={{ width: '100%' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Cause:</Typography>
        <Typography variant="body2">{disruption.cause}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>Effect:</Typography>
        <Typography variant="body2">{disruption.severity.effect}</Typography>
        {disruption.messages.map((message, index) => (
          <Typography key={index} variant="body2" sx={{ mt: 1 }}>{message.text}</Typography>
        ))}
      </Alert>
    </Snackbar>
  );
};

const ScheduleCard = ({ direction, date, schedule, isToday = false }) => {
  const currentTime = format(new Date(), 'HH:mm');

  return (
    <Card sx={{ mb: 4, boxShadow: 3 }}>
      <CardContent>
        <Typography
          align="center"
          variant="h6"
          gutterBottom
          component="div"
          sx={{ fontWeight: 'bold', mb: 2 }}
        >
          {`${direction} (${formatDate(date)})`}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="train schedule table">
            <TableBody>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Departure</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Arrival</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Duration</TableCell>
              </TableRow>
              {(() => {
                let nextDepartureFound = false;
                return schedule.map((row, index) => {
                  const isNextDeparture = isToday &&
                    !nextDepartureFound &&
                    compareAsc(new Date(`1970-01-01T${formatTime(row.departure)}`), new Date(`1970-01-01T${currentTime}`)) >= 0;

                  if (isNextDeparture) nextDepartureFound = true;

                  return (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: isNextDeparture ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                        '.MuiTableCell-root': {
                          fontWeight: isNextDeparture ? 'bold' : 'normal'
                        }
                      }}
                    >
                      <TableCell align="center">{formatTime(row.departure)}</TableCell>
                      <TableCell align="center">{formatTime(row.arrival)}</TableCell>
                      <TableCell align="center">{formatDuration(row.duration)}</TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const WeatherInfo = ({ area, weatherData, isSuwon = false }) => {
  if (!weatherData) return null;

  if (isSuwon) {
    // Suwon data from Kakao API
    return (
      <Card sx={{ mb: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Météo actuelle à{' '}
            <Link href="https://map.kakao.com/" target="_blank">
              {area}
            </Link>
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Température</TableCell>
                  <TableCell>{weatherData.temperature}°C</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Conditions</TableCell>
                  <TableCell>{weatherData.desc}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Humidité</TableCell>
                  <TableCell>{weatherData.humidity}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pluie (mm/h)</TableCell>
                  <TableCell>{weatherData.rainfall}</TableCell>
                </TableRow>
                {weatherData.snowfall && weatherData.snowfall.trim() !== '' && (
                  <TableRow>
                    <TableCell>Neige (mm/h)</TableCell>
                    <TableCell>{weatherData.snowfall}</TableCell>
                  </TableRow>
                )}
                {weatherData.iconImage && (
                  <TableRow>
                    <TableCell>Icône</TableCell>
                    <TableCell>
                      <img src={weatherData.iconImage} alt="Météo Suwon" style={{ height: 30 }} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  }

  // Default case for Vernon & Paris
  return (
    <Card sx={{ mb: 2, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Météo actuelle à{' '}
          <Link href="https://meteofrance.com/" target="_blank">
            {area}
          </Link>
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Mise à jour</TableCell>
                <TableCell>{weatherData.updated_at}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Température</TableCell>
                <TableCell>{weatherData.temperature_do}°C</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ressenti</TableCell>
                <TableCell>{weatherData.wind_chill_do}°C</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Humidité</TableCell>
                <TableCell>{weatherData.humidity_percentage}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Vitesse du vent</TableCell>
                <TableCell>{weatherData.wind_speed_ms} m/s</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Nuages</TableCell>
                <TableCell>{weatherData.cloudiness_percentage}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Condition météorologique</TableCell>
                <TableCell>{weatherData.weather_condition}</TableCell>
              </TableRow>
              {weatherData.next_hour_rain_date && (
                <TableRow>
                  <TableCell>Pluie prévue dans l'heure</TableCell>
                  <TableCell>{weatherData.next_hour_rain_date}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
    // Fetch Suwon weather from Kakao API
    const fetchSuwonWeather = async () => {
      try {
        const response = await axios.get(
          'https://map.kakao.com/api/dapi/point/weather?inputCoordSystem=WCONGNAMUL&outputCoordSystem=WCONGNAMUL&version=2&service=map.daum.net&x=518723&y=1046886',
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Referer': 'https://map.kakao.com/'
            }
          }
        );

        const current = response.data.weatherInfos.current;
        const iconImage = `https://t1.daumcdn.net/localimg/localimages/07/2018/pc/weather/ico_weather${current.iconId}.png`;

        setSuwonWeather({
          temperature: current.temperature,
          desc: current.desc,
          humidity: current.humidity,
          rainfall: current.rainfall,
          snowfall: current.snowfall,
          iconImage: iconImage
        });
      } catch (err) {
        // If error occurs, no Suwon data, but no crash either.
      }
    };
    fetchSuwonWeather();
  }, []);

  if (loading) return <Typography>Chargement des données météorologiques...</Typography>;
  if (error) return <Typography>Erreur de chargement des données météo : {error.message}</Typography>;

  return (
    <Box sx={{ mb: 4 }}>
      {franceImg && (
        <Card sx={{ mb: 2, boxShadow: 3 }}>
          <CardMedia
            component="img"
            image={franceImg}
            alt="Satellite de la France"
            sx={{ maxHeight: 400, objectFit: 'contain' }}
          />
        </Card>
      )}
      <Grid container spacing={2}>
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [nextDepartures, setNextDepartures] = useState({ paris: '', vernon: '' });
  const [disruption, setDisruption] = useState(null);
  const currentTime = format(new Date(), 'HH:mm');

  const handleCloseDisruption = (index) => {
    setDisruption((currentDisruptions) => (
      currentDisruptions.filter((_, i) => i !== index)
    ));
  };

  const findNextDeparture = (schedule, direction) => {
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
  };

  useEffect(() => {
    if (scheduleData.vernonParisToday.length && scheduleData.parisVernonToday.length) {
      findNextDeparture(scheduleData.vernonParisToday, 'paris');
      findNextDeparture(scheduleData.parisVernonToday, 'vernon');
      setSnackbarOpen(true);
    }
  }, [scheduleData]);

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
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
            🚄
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Votre Trajet: Vernon ↔ Paris
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Snackbar
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
            {nextDepartures.paris && `Prochain vers Paris Saint-Lazare: ${nextDepartures.paris}`}
            {nextDepartures.paris && nextDepartures.vernon && ' | '}
            {nextDepartures.vernon && `Prochain vers Vernon: ${nextDepartures.vernon}`}
            {!nextDepartures.paris && !nextDepartures.vernon && 'Aucun autre départ aujourd\'hui'}
          </Alert>
        </Snackbar>

        <Box my={4} sx={{ textAlign: 'center' }}>
          <WeatherDisplay />

          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            <Link
              target="_blank"
              href="https://www.transilien.com/fr/page-lignes/ligne-j#content-section-1160-part-2-tab"
              color="primary"
              underline="always"
            >
              Ligne J - Horaires
            </Link>
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            Paris = Gare de Paris Saint-Lazare<br />
            Vernon = Gare de Vernouillet - Verneuil
          </Typography>

          {disruption ? (
            disruption.map((disrupt, index) => (
              <DisruptionSnackbar
                key={disrupt.id}
                disruption={disrupt}
                onClose={() => handleCloseDisruption(index)}
              />
            ))
          ) : (
            <Typography variant="subtitle1" sx={{ color: 'green', fontWeight: 'bold', mt: 2 }}>
              Situation: Ligne J OK
            </Typography>
          )}

          {/* Ligne J Map Section */}
          <Box my={4}>
            <Card sx={{ boxShadow: 3 }}>
              <CardMedia
                component="img"
                image="https://www.transilien.com/sites/transilien/files/2024-09/Ligne_J_plan_schema_0924.png?itok=hB71PBN4"
                alt="Ligne J Map"
                sx={{ 
                  width: '100%',
                  maxWidth: '100%',
                  maxHeight: 300, 
                  objectFit: 'cover',
                  overflowX: 'auto',
                  borderBottom: '1px solid #ccc'
                }}
              />
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Plan de la Ligne J
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Parcourez la carte schématique pour visualiser les gares et le trajet complet de la ligne J.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  href="https://www.transilien.com/sites/transilien/files/2024-09/Ligne_J_plan_schema_0924.png?itok=hB71PBN4"
                  target="_blank"
                >
                  Voir en grand
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
              Aujourd'hui
            </Typography>
            <ScheduleCard
              direction="Vernon ➜ Paris"
              date={scheduleData.dates.today}
              schedule={scheduleData.vernonParisToday}
              isToday={true}
            />
            <ScheduleCard
              direction="Paris ➜ Vernon"
              date={scheduleData.dates.today}
              schedule={scheduleData.parisVernonToday}
              isToday={true}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
              Demain
            </Typography>
            <ScheduleCard
              direction="Vernon ➜ Paris"
              date={scheduleData.dates.tomorrow}
              schedule={scheduleData.vernonParisTomorrow}
            />
            <ScheduleCard
              direction="Paris ➜ Vernon"
              date={scheduleData.dates.tomorrow}
              schedule={scheduleData.parisVernonTomorrow}
            />
          </Grid>
        </Grid>

        <Box my={4} textAlign="center">
          <Card sx={{ boxShadow: 0 }}>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                © {new Date().getFullYear()} Votre Trajet Vernon Paris (SeokWon)
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
};

export default App;
