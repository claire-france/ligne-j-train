import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';

const LoadingAnimation = () => {
    const animations = ['cardio', 'pinwheel', 'grid'];
    const messages = [
        'Chargement des données SNCF…',
        'Attendez un instant, nous consultons les horaires…',
        'Préparation des horaires de la Ligne J…',
        'Connexion aux serveurs de transilien.com…',
        'Récupération des informations en cours…'
    ];
    const colors = ['#14ff7a', '#00bfff', '#ff4b5c', '#ffa500', '#8a2be2'];

    const [selectedAnimation, setSelectedAnimation] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [speed, setSpeed] = useState(1.0);
    const [stroke, setStroke] = useState(10);

    useEffect(() => {
        // Random animation
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        setSelectedAnimation(randomAnimation);

        // Random message
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setSelectedMessage(randomMessage);

        // Random color
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setSelectedColor(randomColor);

        // Random speed and stroke
        const randomSpeed = (Math.random() * (1.3 - 0.9) + 0.9).toFixed(2);  // e.g. between 0.9 and 1.3
        setSpeed(randomSpeed);
        const randomStroke = Math.floor(Math.random() * (14 - 8) + 8); // between 8 and 14
        setStroke(randomStroke);

    }, []); // Run once on mount

    return (
        <Box 
            sx={{ 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center', 
                height: '100vh',
                px: 2,
                textAlign: 'center'
            }}
        >
            {selectedAnimation === 'cardio' && (
                <l-cardio 
                    class="loader" 
                    color={selectedColor} 
                    size="150" 
                    stroke={stroke.toString()} 
                    speed={speed.toString()} 
                    bg-opacity="0.1">
                </l-cardio>
            )}
            {selectedAnimation === 'pinwheel' && (
                <l-pinwheel 
                    size="150" 
                    stroke={stroke.toString()} 
                    speed={speed.toString()} 
                    color={selectedColor}>
                </l-pinwheel>
            )}
            {selectedAnimation === 'grid' && (
                <l-grid 
                    size="150" 
                    speed={speed.toString()} 
                    color={selectedColor}>
                </l-grid>
            )}
            <Typography variant="subtitle1" sx={{ mt: 2, fontStyle: 'italic' }}>
                {selectedMessage}
            </Typography>
        </Box>
    );
};

export default LoadingAnimation;
