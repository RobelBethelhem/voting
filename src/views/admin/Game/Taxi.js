import React from 'react';

const Taxi = ({ position, laneWidth, taxiWidth, taxiHeight }) => {
    return (
        <div 
            style={{ 
                position: 'absolute',
                width: `${taxiWidth}px`,
                height: `${taxiHeight}px`,
                backgroundColor: '#fbbf24',
                left: `${position * laneWidth + (laneWidth - taxiWidth) / 2}px`,
                bottom: '60px',
                transition: 'all 0.3s ease-out',
            }}
        >
            <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', height: '16px', backgroundColor: 'black' }}></div>
            <div style={{ position: 'absolute', bottom: '12px', left: '6px', right: '6px', height: '12px', backgroundColor: 'black' }}></div>
            <div style={{ position: 'absolute', top: '28px', left: '6px', right: '6px', height: '12px', backgroundColor: 'black' }}></div>
        </div>
    );
};

export default Taxi;