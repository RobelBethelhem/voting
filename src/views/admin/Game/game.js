import React, { useState, useEffect, useCallback } from 'react';
import Taxi from './Taxi';
import Obstacle from './Obstacle';
import GameControls from './GameControls';
import { useSelector } from 'react-redux';
import { API_BASE } from 'src/api/base';

const LANE_WIDTH = 100;
const TAXI_WIDTH = 40;  // Reduced from 60
const TAXI_HEIGHT = 50; // Reduced from 100
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 50;
const INITIAL_SPEED = 2;
const SPEED_INCREMENT = 0.01;
const GAME_HEIGHT = 500;
const SAFE_GAP = 150;   // Increased safe gap
const OBSTACLE_INTERVAL = 10;

const Game = () => {
    const accessToken = useSelector((state) => state.user.accessToken);
    const [taxiPosition, setTaxiPosition] = useState(1);
    const [obstacles, setObstacles] = useState([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [lastObstacleTime, setLastObstacleTime] = useState(0);

    const moveTaxi = useCallback((direction) => {
        if (direction === 'left' && taxiPosition > 0) {
            setTaxiPosition(prev => Math.max(prev - 1, 0));
        } else if (direction === 'right' && taxiPosition < 2) {
            setTaxiPosition(prev => Math.min(prev + 1, 2));
        }
    }, [taxiPosition]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowLeft') {
            moveTaxi('left');
        } else if (e.key === 'ArrowRight') {
            moveTaxi('right');
        }
    }, [moveTaxi]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (gameOver) return;

        const gameLoop = setInterval(() => {
            setObstacles(prevObstacles => {
                const newObstacles = prevObstacles
                    .map(obstacle => ({ ...obstacle, y: obstacle.y + speed }))
                    .filter(obstacle => obstacle.y < GAME_HEIGHT);

                const currentTime = Date.now();
                if (currentTime - lastObstacleTime > OBSTACLE_INTERVAL) {
                    const lastObstacleY = newObstacles.length > 0 ? 
                        Math.min(...newObstacles.map(obs => obs.y)) : GAME_HEIGHT;

                        if (lastObstacleY > SAFE_GAP) {
                            const availableLanes = [0, 1, 2].filter(lane => 
                                !newObstacles.some(obs => 
                                    obs.lane === lane && obs.y > -OBSTACLE_HEIGHT && obs.y < SAFE_GAP
                                )
                            );

                            if (availableLanes.length > 0) {
                                const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                                newObstacles.push({ lane: newLane, y: -OBSTACLE_HEIGHT });
                                setLastObstacleTime(currentTime);
                            }
                }
                }

                return newObstacles;
            });

            setScore(prevScore => prevScore + 1);
            setSpeed(prevSpeed => prevSpeed + SPEED_INCREMENT);
        }, 16);

        return () => clearInterval(gameLoop);
    }, [gameOver, speed, lastObstacleTime]);

    useEffect(() => {
        const checkCollision = () => {
            obstacles.forEach(obstacle => {
                if (
                    obstacle.lane === taxiPosition &&
                    obstacle.y + OBSTACLE_HEIGHT > GAME_HEIGHT - TAXI_HEIGHT - 60 &&
                    obstacle.y < GAME_HEIGHT - 60
                ) {
                    setGameOver(true);
                    sendScore(score);
                }
            });
        };

        checkCollision();
    }, [obstacles, taxiPosition, score]);

    const sendScore = async (finalScore) => {
        try {
            const response = await fetch(`${API_BASE}/candidates/game_score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': accessToken,
                },
                body: JSON.stringify({ score: finalScore }),
            });
            if (!response.ok) {
                throw new Error('Failed to send score');
            }
            console.log('Score sent successfully');
        } catch (error) {
            console.error('Error sending score:', error);
        }
    };

    const restartGame = () => {
        setTaxiPosition(1);
        setObstacles([]);
        setScore(0);
        setGameOver(false);
        setSpeed(INITIAL_SPEED);
        setLastObstacleTime(0);
    };

    return (
        <div className="game-container" style={{
            position: 'relative',
            width: '300px',
            height: '500px',
            backgroundColor: '#1a202c',
            overflow: 'hidden',
            border: '4px solid #4a5568',
            margin: '0 auto',
            zIndex: 1000,
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
            }}>
                <div style={{
                    width: '33.33%',
                    height: '100%',
                    borderRight: '2px dashed #fbbf24',
                }}></div>
                <div style={{
                    width: '33.33%',
                    height: '100%',
                    borderRight: '2px dashed #fbbf24',
                }}></div>
                <div style={{
                    width: '33.33%',
                    height: '100%',
                }}></div>
            </div>
            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '4px',
                backgroundColor: '#34d399',
            }}></div>
            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '4px',
                backgroundColor: '#34d399',
            }}></div>
            <Taxi position={taxiPosition} laneWidth={LANE_WIDTH} taxiWidth={TAXI_WIDTH} taxiHeight={TAXI_HEIGHT} />
            {obstacles.map((obstacle, index) => (
                <Obstacle
                    key={index}
                    lane={obstacle.lane}
                    y={obstacle.y}
                    laneWidth={LANE_WIDTH}
                    obstacleWidth={OBSTACLE_WIDTH}
                    obstacleHeight={OBSTACLE_HEIGHT}
                />
            ))}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
            }}>Score: {score}</div>
            {gameOver && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: 'white',
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Game Over</h2>
                    <p style={{ fontSize: '20px', marginBottom: '16px' }}>Your score: {score}</p>
                    <button 
                        onClick={restartGame}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Restart
                    </button>
                </div>
            )}
            <GameControls onMove={moveTaxi} />
        </div>
    );
};

export default Game;