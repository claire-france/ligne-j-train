import { keyframes } from '@emotion/react';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const moveHorizontal = keyframes`
  0% {
    transform: translateX(-30px);
  }
  100% {
    transform: translateX(30px);
  }
`;

const LoadingAnimation = () => {
    const animations = ['cardio', 'pinwheel', 'grid'];
    const messages = [
        'Chargement des données SNCF…',
        'Consultation des horaires en cours…',
        'Préparation des horaires de la Ligne J…',
        'Connexion aux serveurs Transilien…',
        'Récupération des informations…',
        // Fun French jokes related to trains
        'Un train peut en cacher un autre, mais un bug peut en cacher beaucoup plus !',
        'Pourquoi le train est-il toujours stressé ? Parce qu\'il est toujours sous pression !',
        'À la SNCF, même nos bugs ont du retard…',
        'Ne soyez pas en retard, le train des données arrive à l\'heure !',
        'Les trains sont comme les blagues, certains passent, d\'autres non…',
        'Pourquoi le wifi dans le train est-il si lent ? Parce qu\'il suit l\'horaire SNCF !',
        'Qu\'est-ce qui est plus rapide qu\'un TGV ? Notre algorithme de chargement !',
        'Le serveur est comme un contrôleur SNCF, il vérifie vos données avant de vous laisser passer !',
        'Calcul d\'itinéraire en cours... comme dirait la SNCF, prévoyez large !'
    ];
    const colors = ['#1976d2', '#2196f3', '#0d47a1', '#42a5f5', '#64b5f6'];

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

        // Random color - sticking to blue theme for premium feel
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setSelectedColor(randomColor);

        // Random speed and stroke
        const randomSpeed = (Math.random() * (1.3 - 0.9) + 0.9).toFixed(2);
        setSpeed(randomSpeed);
        const randomStroke = Math.floor(Math.random() * (14 - 8) + 8);
        setStroke(randomStroke);

    }, []);

    return (
        <Box 
            sx={{ 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center', 
                height: '100vh',
                px: 2,
                textAlign: 'center',
                backgroundColor: '#f8f9fa'
            }}
        >
            <Box 
                sx={{ 
                    p: 5, 
                    borderRadius: 3, 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    backgroundColor: 'white',
                    width: 'auto',
                    maxWidth: 400,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                <DirectionsTransitIcon 
                    sx={{ 
                        fontSize: 40, 
                        color: selectedColor,
                        mb: 2,
                        animation: `${pulse} 2s infinite ease-in-out`
                    }} 
                />
                
                <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    mb: 3,
                    color: '#1976d2'
                }}>
                    Ligne J - Horaires
                </Typography>

                {selectedAnimation === 'cardio' && (
                    <l-cardio 
                        class="loader" 
                        color={selectedColor} 
                        size="100" 
                        stroke={stroke.toString()} 
                        speed={speed.toString()} 
                        bg-opacity="0.1">
                    </l-cardio>
                )}
                {selectedAnimation === 'pinwheel' && (
                    <l-pinwheel 
                        size="100" 
                        stroke={stroke.toString()} 
                        speed={speed.toString()} 
                        color={selectedColor}>
                    </l-pinwheel>
                )}
                {selectedAnimation === 'grid' && (
                    <l-grid 
                        size="100" 
                        speed={speed.toString()} 
                        color={selectedColor}>
                    </l-grid>
                )}

                <Box sx={{ 
                    mt: 3, 
                    px: 4,
                    py: 1,
                    borderRadius: 4,
                    backgroundColor: '#f0f7ff',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        backgroundColor: 'rgba(25, 118, 210, 0.05)',
                        animation: `${moveHorizontal} 1.5s infinite alternate ease-in-out`,
                    }} />
                    
                    <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        position: 'relative',
                        zIndex: 2
                    }}>
                        {selectedMessage}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default LoadingAnimation;