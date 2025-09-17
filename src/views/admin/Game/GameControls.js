import React from 'react';

const GameControls = ({ onMove }) => {
    const buttonStyle = {
        backgroundColor: '#3b82f6',
        color: 'white',
        fontWeight: 'bold',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        margin: '0 8px',
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '16px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
        }}>
            <button 
                style={buttonStyle}
                onClick={() => onMove('left')}
            >
                ←
            </button>
            <button 
                style={buttonStyle}
                onClick={() => onMove('right')}
            >
                →
            </button>
        </div>
    );
};

export default GameControls;