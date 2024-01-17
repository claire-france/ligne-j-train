import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const LoadingAnimation = () => {
    const [selectedAnimation, setSelectedAnimation] = useState(null);

    useEffect(() => {
        const animations = ['cardio', 'pinwheel', 'grid'];
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        setSelectedAnimation(randomAnimation);
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            {selectedAnimation === 'cardio' && (
                <l-cardio class="loader" color="#14ff7a" size="150" stroke="12" speed="1.1" bg-opacity="0.1"></l-cardio>
            )}
            {selectedAnimation === 'pinwheel' && (
                <l-pinwheel size="150" stroke="12" speed="1.1" color="#14ff7a"></l-pinwheel>
            )}
            {selectedAnimation === 'grid' && (
                <l-grid size="150" speed="1.1" color="#14ff7a"></l-grid>
            )}
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Chargement de Ligne J Train de transilien.com (SNCF)...
            </Typography>

        </Box>
    );
};

export default LoadingAnimation;
