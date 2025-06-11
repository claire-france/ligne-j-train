import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import ErrorIcon from '@mui/icons-material/Error';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import NorthIcon from '@mui/icons-material/North';
import ShareIcon from '@mui/icons-material/Share';
import SouthIcon from '@mui/icons-material/South';
import TrainIcon from '@mui/icons-material/Train';
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
  IconButton,
  Link,
  Menu,
  MenuItem,
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
import { addDays, compareAsc, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { cardio, grid, pinwheel } from 'ldrs';
import React, { useEffect, useState } from 'react';
import LoadingAnimation from "./customLoading";

grid.register();
pinwheel.register();
cardio.register();

const formatDate = (date) => format(date, 'PP', { locale: fr });
const formatTime = (time) => time.slice(0, 5);
const formatDuration = (duration) => {
  const parts = duration.split(':');
  const minutes = parseInt(parts[1], 10);
  return `${minutes}min`;
};

const DisruptionSnackbar = ({ disruption, onClose }) => {
  return (
    <Snackbar
      open={true}
      autoHideDuration={10000}
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
  const cardRef = React.useRef(null); // Reference for the entire card for image capture
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [expanded, setExpanded] = useState(false); // New state to track expansion
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState(''); // Message for success notification

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

  // Share functionality functions
  const getScheduleWithTimeWindow = () => {
    if (isEmpty || !isToday) return schedule; // For empty or tomorrow's schedule, return all
    
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Calculate time window: -5 to +5 minutes around current time
    const windowStart = currentTimeMinutes - 5;
    const windowEnd = currentTimeMinutes + 5;
    
    const filteredSchedule = schedule.filter(train => {
      const [hours, minutes] = formatTime(train.departure).split(':').map(Number);
      const trainTimeMinutes = hours * 60 + minutes;
      return trainTimeMinutes >= windowStart && trainTimeMinutes <= windowEnd;
    });
    
    // Handle edge case: if not enough trains in window, expand the range
    if (filteredSchedule.length < 3) {
      // Find closest train to current time
      let closestIndex = -1;
      let closestDiff = Infinity;
      
      schedule.forEach((train, index) => {
        const [hours, minutes] = formatTime(train.departure).split(':').map(Number);
        const trainTimeMinutes = hours * 60 + minutes;
        const diff = Math.abs(trainTimeMinutes - currentTimeMinutes);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== -1) {
        // Return 3 trains centered around the closest one
        const startIndex = Math.max(0, closestIndex - 1);
        const endIndex = Math.min(schedule.length, startIndex + 3);
        return schedule.slice(startIndex, endIndex);
      }
    }
    
    return filteredSchedule.length > 0 ? filteredSchedule : schedule.slice(0, 3);
  };

  const generateShareText = (scheduleToShare) => {
    const dateStr = formatDate(date);
    const timeWindow = isToday ? " (horaires proches)" : "";
    
    let text = `🚆 Horaires Ligne J - ${direction}\n`;
    text += `📅 ${dateStr}${timeWindow}\n\n`;
    
    if (scheduleToShare.length === 0) {
      text += "❌ Aucun train disponible\n";
    } else {
      text += "🕐 Départ | 🕑 Arrivée | ⏱️ Durée\n";
      text += "─".repeat(30) + "\n";
      
      scheduleToShare.forEach(train => {
        text += `${formatTime(train.departure)} | ${formatTime(train.arrival)} | ${formatDuration(train.duration)}\n`;
      });
    }
    
    text += `\n📱 Généré depuis Ligne J Train App`;
    return text;
  };

  const handleShareClick = (event) => {
    event.stopPropagation();
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
  };

  const handleTextShare = async () => {
    const scheduleToShare = getScheduleWithTimeWindow();
    const shareText = generateShareText(scheduleToShare);
    
    try {
      await navigator.clipboard.writeText(shareText);
      setShareSuccessMessage('Horaires copiés dans le presse-papiers !');
      setShowShareSuccess(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSuccessMessage('Horaires copiés dans le presse-papiers !');
      setShowShareSuccess(true);
    }
    
    handleShareClose();
  };

  const handleImageShare = async () => {
    try {
      const scheduleToShare = getScheduleWithTimeWindow();
      
      // Create a beautiful card element specifically for image generation
      const imageElement = document.createElement('div');
      imageElement.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 600px;
        box-sizing: border-box;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 20px;
        font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
        color: white;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      `;
      
      const dateStr = formatDate(date);
      const timeWindow = isToday ? " (horaires proches)" : "";
      const currentTimeStr = format(new Date(), 'HH:mm');
      
      imageElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
              🚆
            </div>
            <div style="flex: 1; min-width: 0;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Ligne J</h1>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Horaires de train</p>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; margin-bottom: 16px; box-sizing: border-box; width: 100%; overflow: hidden;">
            <h2 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; word-wrap: break-word; line-height: 1.2;">${direction}</h2>
            <p style="margin: 0; font-size: 13px; opacity: 0.9;">📅 ${dateStr}${timeWindow}</p>
            ${isToday ? `<p style="margin: 3px 0 0 0; font-size: 11px; opacity: 0.8;">🕐 Généré à ${currentTimeStr}</p>` : ''}
          </div>
        </div>
        
        <div style="background: rgba(255,255,255,0.95); border-radius: 10px; overflow: hidden; margin-bottom: 16px; box-sizing: border-box; width: 100%;">
          ${scheduleToShare.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: #666;">
              <div style="font-size: 40px; margin-bottom: 12px;">❌</div>
              <h3 style="margin: 0 0 6px 0; color: #333; font-size: 16px;">Aucun train disponible</h3>
              <p style="margin: 0; color: #666; font-size: 12px;">Aucun horaire disponible pour cette période</p>
            </div>
          ` : `
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px 8px; text-align: center; color: #333; font-weight: 600; font-size: 12px; border-bottom: 2px solid #dee2e6; width: 33.33%;">🕐 Départ</th>
                  <th style="padding: 12px 8px; text-align: center; color: #333; font-weight: 600; font-size: 12px; border-bottom: 2px solid #dee2e6; width: 33.33%;">🕑 Arrivée</th>
                  <th style="padding: 12px 8px; text-align: center; color: #333; font-weight: 600; font-size: 12px; border-bottom: 2px solid #dee2e6; width: 33.33%;">⏱️ Durée</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleToShare.map((train, index) => {
                  let isNextDeparture = false;
                  if (isToday) {
                    const trainTime = new Date(`1970-01-01T${formatTime(train.departure)}`);
                    const currentTime = new Date(`1970-01-01T${currentTimeStr}`);
                    isNextDeparture = compareAsc(trainTime, currentTime) >= 0;
                  }
                  
                  return `
                    <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'}; ${isNextDeparture ? 'border-left: 3px solid #1976d2;' : ''}">
                      <td style="padding: 10px 6px; text-align: center; color: ${isNextDeparture ? '#1976d2' : '#333'}; font-weight: ${isNextDeparture ? '700' : '500'}; font-size: 14px; position: relative; width: 33.33%; box-sizing: border-box;">
                        ${isNextDeparture ? '<div style="position: absolute; top: -6px; left: 50%; transform: translateX(-50%); background: #1976d2; color: white; font-size: 9px; padding: 1px 6px; border-radius: 3px; font-weight: bold; white-space: nowrap;">PROCHAIN</div>' : ''}
                        ${formatTime(train.departure)}
                      </td>
                      <td style="padding: 10px 6px; text-align: center; color: ${isNextDeparture ? '#1976d2' : '#333'}; font-weight: ${isNextDeparture ? '700' : '500'}; font-size: 14px; width: 33.33%; box-sizing: border-box;">${formatTime(train.arrival)}</td>
                      <td style="padding: 10px 6px; text-align: center; color: ${isNextDeparture ? '#1976d2' : '#666'}; font-weight: ${isNextDeparture ? '700' : '500'}; font-size: 12px; width: 33.33%; box-sizing: border-box;">${formatDuration(train.duration)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
        
        <div style="text-align: center; opacity: 0.8;">
          <p style="margin: 0; font-size: 11px;">📱 Généré depuis l'app Ligne J Train</p>
          <p style="margin: 3px 0 0 0; font-size: 10px;">ligne-j-train.vercel.app</p>
        </div>
      `;
      
      document.body.appendChild(imageElement);
      
      // Generate the image using html2canvas
      const canvas = await html2canvas(imageElement, {
        backgroundColor: null,
        scale: 2, // Higher quality
        width: 600,
        height: imageElement.scrollHeight,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 600,
        windowHeight: imageElement.scrollHeight
      });
      
      // Clean up the temporary element
      document.body.removeChild(imageElement);
      
      // Convert canvas to blob and share/download
      canvas.toBlob(async (blob) => {
        // Try to copy to clipboard first
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({
              'image/png': blob
            });
            await navigator.clipboard.write([clipboardItem]);
            setShareSuccessMessage('Image copiée dans le presse-papiers !');
            setShowShareSuccess(true);
          }
        } catch (clipboardError) {
          console.log('Clipboard copy failed, trying share or download:', clipboardError);
        }

        // Then try native share API if available
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'horaires-ligne-j.png', { type: 'image/png' })] })) {
          try {
            await navigator.share({
              title: `Horaires Ligne J - ${direction}`,
              text: `Horaires de train ${direction} pour ${dateStr}`,
              files: [new File([blob], `horaires-ligne-j-${dateStr}.png`, { type: 'image/png' })]
            });
            // Only show share success if clipboard copy didn't already succeed
            if (!showShareSuccess) {
              setShareSuccessMessage('Image partagée avec succès !');
              setShowShareSuccess(true);
            }
          } catch (err) {
            if (err.name !== 'AbortError') {
              // Fallback to download if both clipboard and share fail
              downloadImage(blob);
            }
          }
        } else {
          // If no clipboard success and no share API, fallback to download
          if (!showShareSuccess) {
            downloadImage(blob);
          }
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('Error generating image:', error);
      // Fallback to text sharing if image generation fails
      await handleTextShare();
    }
    
    handleShareClose();
  };

  const downloadImage = (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horaires-ligne-j-${direction.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${format(date, 'yyyy-MM-dd')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShareSuccessMessage('Image téléchargée avec succès !');
    setShowShareSuccess(true);
  };

  const visibleRows = getVisibleRows();
  const hasMoreRows = !isEmpty && !expanded && schedule.length > visibleRows.length;

  return (
    <Card ref={cardRef} sx={{ 
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
        action={
          !isEmpty && (
            <IconButton
              aria-label="share"
              onClick={handleShareClick}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                }
              }}
            >
              <ShareIcon />
            </IconButton>
          )
        }
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

          {/* Share menu */}
          <Menu
            anchorEl={shareAnchorEl}
            open={Boolean(shareAnchorEl)}
            onClose={handleShareClose}
            PaperProps={{
              elevation: 8,
              sx: { 
                borderRadius: 2,
                mt: 1,
                minWidth: 180,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              },
            }}
          >
            <MenuItem 
              onClick={handleTextShare} 
              sx={{ 
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <ContentCopyIcon sx={{ mr: 1, fontSize: 20 }} />
              Copier le texte
            </MenuItem>
            <MenuItem 
              onClick={handleImageShare} 
              sx={{ 
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <ShareIcon sx={{ mr: 1, fontSize: 20 }} />
              Partager l'image
            </MenuItem>
          </Menu>

          {/* Success message after sharing */}
          <Snackbar
            open={showShareSuccess}
            autoHideDuration={3000}
            onClose={() => setShowShareSuccess(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setShowShareSuccess(false)} 
              severity="success" 
              elevation={6}
              variant="filled"
              sx={{ 
                width: '100%', 
                maxWidth: 500,
                '& .MuiAlert-icon': { 
                  alignItems: 'center' 
                }
              }}
            >
              {shareSuccessMessage || 'Partage réussi !'}
            </Alert>
          </Snackbar>
        </CardContent>
      )}
    </Card>
  );
};

const WeatherInfo = ({ area, weatherData, isSuwon = false }) => {
  if (!weatherData) return null;

  const getWeatherIcon = (area, weatherData) => {
    // For Suwon, we use the provided iconImage, so we'll return a default emoji as fallback
    if (area === "Suwon") {
      return "☀️"; // This is just a fallback; the actual iconImage is used in the UI
    }
    
    // For French locations, map weather conditions to appropriate emojis
    const condition = weatherData?.weather_condition?.toLowerCase() || '';
    
    // Weather condition mapping for French weather data
    if (condition.includes('soleil') || condition.includes('ensoleillé')) return "☀️";
    if (condition.includes('éclaircies') || condition.includes('eclaircies')) return "🌤️";
    if (condition.includes('nuageux') || condition.includes('nuages')) return "☁️";
    if (condition.includes('couvert')) return "☁️";
    if (condition.includes('brouillard')) return "🌫️";
    if (condition.includes('pluie') || condition.includes('pluvieux')) {
      if (condition.includes('faible')) return "🌦️";
      if (condition.includes('forte') || condition.includes('intense')) return "🌧️";
      return "🌧️";
    }
    if (condition.includes('orage')) return "⛈️";
    if (condition.includes('neige')) return "🌨️";
    if (condition.includes('grêle') || condition.includes('grele')) return "🌨️";
    if (condition.includes('vent')) return "💨";
    
    // Temperature-based fallbacks if no specific condition matches
    if (weatherData?.temperature_do) {
      const temp = parseFloat(weatherData.temperature_do);
      if (temp >= 25) return "☀️";
      if (temp >= 15) return "🌤️";
      if (temp >= 5) return "☁️";
      return "🌨️";
    }
    
    // Default fallbacks by area if nothing else matches
    if (area === "Vernon") return "🌤️";
    if (area === "Paris") return "🌦️";
    return "☀️";
  };

  const getGradientColors = (area) => {
    if (area === "Vernon") return "linear-gradient(135deg, #FFB300 0%, #FF8F00 100%)";
    if (area === "Paris") return "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)";
    return "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)"; // Suwon
  };

  // If it's Suwon, data structure differs
  if (isSuwon) {
    return (
      <Card sx={{ 
        height: '100%', 
        borderRadius: 3,
        background: getGradientColors(area),
        color: 'white',
        boxShadow: '0 8px 24px rgba(156, 39, 176, 0.3)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 32px rgba(156, 39, 176, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
        }
      }}>
        <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
          {/* Header with location and icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {area}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Corée du Sud
              </Typography>
            </Box>
            {weatherData.iconImage ? (
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <img 
                  src={weatherData.iconImage} 
                  alt="Météo Suwon" 
                  style={{ width: 40, height: 40 }} 
                />
              </Box>
            ) : (
              <Typography sx={{ fontSize: '3rem' }}>
                {getWeatherIcon(area, weatherData)}
              </Typography>
            )}
          </Box>

          {/* Main temperature display */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" sx={{ fontWeight: 300, lineHeight: 1 }}>
              {Math.round(parseFloat(weatherData.temperature))}°
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
              {weatherData.desc}
            </Typography>
          </Box>

          {/* Weather details in a compact grid */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 2,
            '& > div': {
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              p: 1.5,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>💧 Humidité</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.humidity}%</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>🌧️ Pluie</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.rainfall} mm</Typography>
            </Box>
            {weatherData.snowfall && weatherData.snowfall.trim() !== '' && (
              <>
                <Box sx={{ textAlign: 'center', gridColumn: 'span 2' }}>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>❄️ Neige</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.snowfall} mm</Typography>
                </Box>
              </>
            )}
          </Box>

          {/* Source link */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link 
              href="https://www.k-pullup.com/pullup/7263" 
              target="_blank" 
              sx={{ 
                color: 'white', 
                opacity: 0.8,
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  textDecoration: 'underline'
                }
              }}
            >
              📍 Voir plus de détails
            </Link>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Default case for Vernon & Paris
  return (
    <Card sx={{ 
      height: '100%', 
      borderRadius: 3,
      background: getGradientColors(area),
      color: 'white',
      boxShadow: area === "Vernon" ? '0 8px 24px rgba(255, 179, 0, 0.3)' : '0 8px 24px rgba(25, 118, 210, 0.3)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: area === "Vernon" ? '0 12px 32px rgba(255, 179, 0, 0.4)' : '0 12px 32px rgba(25, 118, 210, 0.4)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
      }
    }}>
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        {/* Header with location and icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {area}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              France
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '3rem' }}>
            {getWeatherIcon(area, weatherData)}
          </Typography>
        </Box>

        {/* Main temperature display */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h2" sx={{ fontWeight: 300, lineHeight: 1 }}>
            {Math.round(weatherData.temperature_do)}°
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
            {weatherData.weather_condition}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Ressenti {Math.round(weatherData.wind_chill_do)}°
          </Typography>
        </Box>

        {/* Weather details in a compact grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 2,
          mb: 2,
          '& > div': {
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            p: 1.5,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>💧 Humidité</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.humidity_percentage}%</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>💨 Vent</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.wind_speed_ms} m/s</Typography>
          </Box>
          {weatherData.rain_last_hour_mm > 0 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>🌧️ Pluie (1h)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.rain_last_hour_mm} mm</Typography>
            </Box>
          )}
          {weatherData.snow_last_hour_mm > 0 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>❄️ Neige (1h)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{weatherData.snow_last_hour_mm} mm</Typography>
            </Box>
          )}
        </Box>

        {/* Next rain prediction */}
        {weatherData.next_hour_rain_date && (
          <Box sx={{ 
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            p: 1.5,
            mb: 2,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center'
          }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>🌦️ Pluie prévue</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{weatherData.next_hour_rain_date}</Typography>
          </Box>
        )}

        {/* Update time and source */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>
            Mis à jour: {weatherData.updated_at}
          </Typography>
          <Link 
            href="https://meteofrance.com/" 
            target="_blank" 
            sx={{ 
              color: 'white', 
              opacity: 0.8,
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': {
                opacity: 1,
                textDecoration: 'underline'
              }
            }}
          >
            📍 Météo France
          </Link>
        </Box>
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
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
                  🛰️ Satellite France
                </Typography>
              </Box>
            }
            sx={{
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              py: 1.5
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
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" sx={{ 
          fontWeight: 700, 
          mb: 1,
          background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🌤️ Météo en temps réel
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Conditions météorologiques actuelles à Vernon, Paris et Suwon
        </Typography>
      </Box>
      <Grid container spacing={3} justifyContent="center">
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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
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

        // Check for API disruptions first
        if (vernonParisResponse.data.disruptions && vernonParisResponse.data.disruptions.length > 0) {
          setDisruption(vernonParisResponse.data.disruptions);
          setShowSuccessMessage(false);
        } 
        // Check if both today's schedules are empty (no trains available)
        else if (vernonParisResponse.data.today.journeys.length === 0 && parisVernonResponse.data.today.journeys.length === 0) {
          // Create custom disruption message for empty schedule
          const emptyScheduleDisruption = [{
            id: 'empty-schedule-today',
            cause: 'Absence de circulation',
            severity: {
              effect: 'Aucun train disponible aujourd\'hui sur la Ligne J'
            },
            messages: [{
              text: 'Il semble qu\'aucun train ne soit programmé aujourd\'hui entre Vernon-Giverny et Paris Saint-Lazare. Cela peut être dû à des travaux, jours fériés, ou perturbations exceptionnelles. Nous vous recommandons de consulter le site officiel SNCF pour plus d\'informations.'
            }]
          }];
          setDisruption(emptyScheduleDisruption);
          setShowSuccessMessage(false);
        } 
        else {
          setDisruption(null);
          setShowSuccessMessage(true);
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
        ) : null}

        {showSuccessMessage && (
          <Snackbar
            open={true}
            autoHideDuration={3000}
            onClose={() => setShowSuccessMessage(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setShowSuccessMessage(false)} 
              severity="success" 
              elevation={6}
              variant="filled"
              icon={<InfoIcon />}
              sx={{ 
                width: '100%', 
                maxWidth: 500,
                '& .MuiAlert-icon': { 
                  alignItems: 'center' 
                }
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Trafic normal sur l'ensemble de la Ligne J
              </Typography>
            </Alert>
          </Snackbar>
        )}

        <WeatherDisplay />

        <Box sx={{ py: 2 }}>
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