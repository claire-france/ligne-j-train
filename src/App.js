import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, Link, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Box, Alert
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import axios from 'axios';
import { format, addDays, compareAsc } from 'date-fns';
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

// Function to convert the duration from "0:26:30" to "26min"
const formatDuration = (duration) => {
  const parts = duration.split(':');
  const minutes = parseInt(parts[1], 10); // Convert string to integer and remove any leading zeros
  return `${minutes}min`;
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
                    <TableRow key={index}>
                      <TableCell align="center" sx={{ fontWeight: isNextDeparture ? 'bold' : 'normal' }}>{formatTime(row.departure)}</TableCell>
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
        autoHideDuration={60000}
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
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          <Link target="_blank" href="https://www.transilien.com/fr/page-lignes/ligne-j#content-section-1160-part-2-tab" color="primary" underline="always">
            Ligne J Train Schedules
          </Link>
        </Typography>

        <Typography variant="h5" component="h3" gutterBottom>
          Paris = Gare de Paris Saint-Lazare<br />
          Vernon = Gare de Vernouillet - Verneuil
        </Typography>
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
