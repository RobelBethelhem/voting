import React from 'react';

const Obstacle = ({ lane, y, laneWidth, obstacleWidth, obstacleHeight }) => {
    return (
        <div
            style={{
                position: 'absolute',
                width: `${obstacleWidth}px`,
                height: `${obstacleHeight}px`,
                backgroundColor: '#dc2626',
                left: `${lane * laneWidth + (laneWidth - obstacleWidth) / 2}px`,
                top: `${y}px`,
            }}
        ></div>
    );
};

export default Obstacle;