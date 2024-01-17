import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Card, Link, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Box
} from '@mui/material';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatDate = (date) => format(date, 'PP', { locale: fr });
const formatTime = (time) => time.slice(0, 5); // Corrected to slice the string

// Function to convert the duration from "0:26:30" to "26min"
const formatDuration = (duration) => {
  const parts = duration.split(':');
  const minutes = parseInt(parts[1], 10); // Convert string to integer and remove any leading zeros
  return `${minutes}min`;
};

const ScheduleCard = ({ direction, date, schedule }) => (
  <Card sx={{ mb: 4 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom component="div">
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
            {schedule.map((row, index) => (
              <TableRow key={index}>
                <TableCell align="center">{formatTime(row.departure)}</TableCell>
                <TableCell align="center">{formatTime(row.arrival)}</TableCell>
                <TableCell align="center">{formatDuration(row.duration)}</TableCell>
              </TableRow>

            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);


const App = () => {
  const [scheduleData, setScheduleData] = useState({
    vernonParisToday: [],
    parisVernonToday: [],
    vernonParisTomorrow: [],
    parisVernonTomorrow: [],
    dates: {
      today: new Date(),
      tomorrow: addDays(new Date(), 1),
    },
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
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
        }));
      } catch (error) {
        console.error('Error fetching train schedule data:', error);
      }
    };

    fetchSchedules();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box my={4} sx={{ textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          <Link target="_blank" href="https://www.transilien.com/fr/page-lignes/ligne-j#content-section-1160-part-2-tab" color="inherit" underline="always">
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
          />
          <ScheduleCard
            direction="Paris to Vernon"
            date={scheduleData.dates.today}
            schedule={scheduleData.parisVernonToday}
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
