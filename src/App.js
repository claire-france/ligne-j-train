import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, Link, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Box, Alert
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import axios from 'axios';
import { format, addDays, compareAsc, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import LoadingAnimation from "./customLoading";
import { cardio } from 'ldrs'
import { pinwheel } from 'ldrs'
import { grid } from 'ldrs'

grid.register()
pinwheel.register()
cardio.register()

const formatDate = (date) => format(date, 'PP', { locale: fr });
const formatTime = (time) => time.slice(0, 5); // Corrected to slice the string

// Function to format ISO date strings
const formatIsoDate = (isoDate) => {
  return format(parseISO(isoDate), "PPpp", { locale: fr });
};

// Function to convert the duration from "0:26:30" to "26min"
const formatDuration = (duration) => {
  const parts = duration.split(':');
  const minutes = parseInt(parts[1], 10); // Convert string to integer and remove any leading zeros
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
        <Typography variant="body2">Cause: {disruption.cause}</Typography>
        <Typography variant="body2">Effect: {disruption.severity.effect}</Typography>
        {disruption.messages.map((message, index) => (
          <Typography key={index} variant="body2">{message.text}</Typography>
        ))}
        {/* Display the application period if needed */}
      </Alert>
    </Snackbar>
  );
};

const ScheduleCard = ({ direction, date, schedule, isToday = false }) => {
  // Get the current time formatted as HH:mm
  const currentTime = format(new Date(), 'HH:mm');
  // const currentTime = "22:17";

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography
          align="center"
          variant="h6"
          gutterBottom
          component="div"
          sx={{ fontWeight: 'bold' }}
        >
          {`${direction} (${formatDate(date)})`}
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small" aria-label="a dense table">
            <TableHead>
              <TableRow>
                <TableCell align="center">Departure</TableCell>
                <TableCell align="center">Arrival</TableCell>
                <TableCell align="center">Duration</TableCell>
              </TableRow>

            </TableHead>
            <TableBody>
              {(() => {
                let nextDepartureFound = false;
                return schedule.map((row, index) => {
                  // Check if the departure time is the next upcoming one and hasn't been found yet
                  const isNextDeparture = isToday && !nextDepartureFound && compareAsc(new Date(`1970-01-01T${formatTime(row.departure)}`), new Date(`1970-01-01T${currentTime}`)) >= 0;

                  if (isNextDeparture) {
                    nextDepartureFound = true;
                  }

                  return (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: isNextDeparture ? 'rgba(0, 0, 0, 0.04)' : '', // Light grey background for next departure
                        '.MuiTableCell-root': { // Apply bold style conditionally to all cells in the row
                          fontWeight: isNextDeparture ? 'bold' : 'normal',
                        },
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
  )
};


// A component to display weather for a given area
const WeatherInfo = ({ area, weatherData }) => {

  // Inline styles for compact table layout
  const tableContainerStyle = {
    width: 'auto', // Set the width to auto to prevent unnecessary stretching
    margin: 'auto', // Center the table container if it's smaller than the parent
  };

  // Inline styles for compact rows and cells
  const rowStyle = {
    padding: '6px 10px', // Smaller padding for compactness
  };

  const cellStyle = {
    whiteSpace: 'nowrap', // Prevent text wrapping
    paddingRight: '16px', // Adjust right padding to match your design
  };

  if (!weatherData) return null;

  return (
    <div>
      <h3>Météo actuelle à <a href="https://meteofrance.com/" target="_blank">Vernon</a></h3>
      <TableContainer component={Paper} style={tableContainerStyle}>
        <Table size="small">
          <TableBody>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Mise à jour</TableCell>
              <TableCell>{weatherData.updated_at}</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Température</TableCell>
              <TableCell>{weatherData.temperature_do}°C</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Ressenti</TableCell>
              <TableCell>{weatherData.wind_chill_do}°C</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Humidité</TableCell>
              <TableCell>{weatherData.humidity_percentage}%</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Vitesse du vent</TableCell>
              <TableCell>{weatherData.wind_speed_ms} m/s</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Nuages</TableCell>
              <TableCell>{weatherData.cloudiness_percentage}%</TableCell>
            </TableRow>
            <TableRow style={rowStyle}>
              <TableCell style={cellStyle}>Condition météorologique</TableCell>
              <TableCell>{weatherData.weather_condition}</TableCell>
            </TableRow>
            {weatherData.next_hour_rain_date && (
              <TableRow style={rowStyle}>
                <TableCell style={cellStyle}>Pluie prévue dans l'heure</TableCell>
                <TableCell>{weatherData.next_hour_rain_date}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};


// Main component to display weather side by side
const WeatherDisplay = () => {
  const [vernonWeather, setVernonWeather] = useState(null);
  const [parisWeather, setParisWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [franceImg, setFranceImg] = useState('');

  useEffect(() => {
    // Function to fetch weather data
    const fetchWeatherData = async (apiUrl, setter) => {
      try {
        const response = await axios.get(apiUrl);
        setter(response.data); // Set the weather data for the respective area
        if (!franceImg) setFranceImg(response.data.france_img); // Set the image if not already set
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch Vernon and Paris weather data
    fetchWeatherData('https://lignej-vv-ps.fly.dev/current-weather/vernon', setVernonWeather);
    fetchWeatherData('https://lignej-vv-ps.fly.dev/current-weather/paris', setParisWeather);
  }, []);

  if (loading) return <p>Chargement des données météorologiques...</p>;
  if (error) return <p>Erreur de chargement des données météo : {error.message}</p>;

  return (
    <div>
      {franceImg && <img src={franceImg} alt="Satellite de la France" style={{ marginTop: '10px', maxWidth: '100%', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <WeatherInfo area="Vernon" apiUrl="https://lignej-vv-ps.fly.dev/current-weather/vernon" weatherData={vernonWeather} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <WeatherInfo area="Paris" apiUrl="https://lignej-vv-ps.fly.dev/current-weather/paris" weatherData={parisWeather} />
        </Grid>
      </Grid>
    </div>
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

  // State for Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [nextDepartures, setNextDepartures] = useState({ paris: '', vernon: '' });

  // Alerts
  const [disruption, setDisruption] = useState(null);

  // Function to close individual disruption snackbar
  const handleCloseDisruption = (index) => {
    setDisruption((currentDisruptions) => (
      currentDisruptions.filter((_, i) => i !== index)
    ));
  };

  const currentTime = format(new Date(), 'HH:mm');

  // Function to find the next departure
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
        setLoading(true); // Start loading
        const [vernonParisResponse, parisVernonResponse] = await Promise.all([
          axios.get('https://lignej-vv-ps.fly.dev/train-schedule/vernon-to-paris'),
          axios.get('https://lignej-vv-ps.fly.dev/train-schedule/paris-to-vernon'),
        ]);

        // Handle disruptions
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
        setError('Failed to fetch schedule data.'); // Set error message
      } finally {
        setLoading(false); // Stop loading regardless of success or failure
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return (
      <LoadingAnimation />
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Snackbar
        open={snackbarOpen}
        // autoHideDuration={60000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {nextDepartures.paris && `Next to Paris Saint-Lazare: ${nextDepartures.paris}`}
          {nextDepartures.paris && nextDepartures.vernon && ' | '}
          {nextDepartures.vernon && `Next to Vernon: ${nextDepartures.vernon}`}
          {!nextDepartures.paris && !nextDepartures.vernon && 'No more departures for today'}
        </Alert>
      </Snackbar>

      <Box my={4} sx={{ textAlign: 'center' }}>
        <WeatherDisplay />

        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          <Link target="_blank" href="https://www.transilien.com/fr/page-lignes/ligne-j#content-section-1160-part-2-tab" color="primary" underline="always">
            Ligne J Train Schedules
          </Link>
        </Typography>

        <Typography variant="h5" component="h3" gutterBottom>
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
          <Typography variant="subtitle1">
            now: Ligne J OK
          </Typography>
        )}
      </Box>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={6}>
          <ScheduleCard
            direction="Vernon to Paris"
            date={scheduleData.dates.today}
            schedule={scheduleData.vernonParisToday}
            isToday={true}
          />
          <ScheduleCard
            direction="Paris to Vernon"
            date={scheduleData.dates.today}
            schedule={scheduleData.parisVernonToday}
            isToday={true}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ScheduleCard
            direction="Vernon to Paris"
            date={scheduleData.dates.tomorrow}
            schedule={scheduleData.vernonParisTomorrow}
          />
          <ScheduleCard
            direction="Paris to Vernon"
            date={scheduleData.dates.tomorrow}
            schedule={scheduleData.parisVernonTomorrow}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default App;
