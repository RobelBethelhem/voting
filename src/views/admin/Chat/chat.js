import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, keyframes } from '@mui/material';
import { styled } from '@mui/system';

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const FlipCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  margin: '0 10px',
  perspective: '1000px',
  animation: `${pulse} 2s infinite`,
}));

const FlipCardInner = styled(Box)(({ flipped }) => ({
  position: 'relative',
  width: '100px',
  height: '100px',
  textAlign: 'center',
  transition: 'transform 0.8s',
  transformStyle: 'preserve-3d',
  transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
}));

const FlipCardFace = styled(Box)({
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
});

const FlipCardFront = styled(FlipCardFace)({
  backgroundColor: 'white',
  color: 'black',
});

const FlipCardBack = styled(FlipCardFace)({
  backgroundColor: 'red',
  color: 'white',
  transform: 'rotateX(180deg)',
});

const CountdownContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#f0f0f0',
});

const TimeUnitContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: '20px',
});

const TimeUnit = ({ value, label }) => {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(true);
    const timer = setTimeout(() => setFlipped(false), 500);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <FlipCard>
      <FlipCardInner flipped={flipped}>
        <FlipCardFront>
          <Typography variant="h3">{value.toString().padStart(2, '0')}</Typography>
        </FlipCardFront>
        <FlipCardBack>
          <Typography variant="h3">{value.toString().padStart(2, '0')}</Typography>
        </FlipCardBack>
      </FlipCardInner>
      <Typography variant="subtitle1" color="black" mt={2}>
        {label}
      </Typography>
    </FlipCard>
  );
};

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <CountdownContainer>
      <Typography variant="h2" color="black" mb={4}>
        Countdown to Staff Day
      </Typography>
      <TimeUnitContainer>
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeUnit value={timeLeft.minutes} label="Minutes" />
        <TimeUnit value={timeLeft.seconds} label="Seconds" />
      </TimeUnitContainer>
    </CountdownContainer>
  );
};

export default function App() {
  // Set your target date here
  const targetDate = "2026-11-22T23:59:59";

  return <Countdown targetDate={targetDate} />;
}
















// import React, { useState, useEffect, useRef } from 'react';

// const OllamaChat = () => {
//   const [input, setInput] = useState('');
//   const [messages, setMessages] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [models, setModels] = useState([]);
//   const [selectedModel, setSelectedModel] = useState('llama3.1:latest');
//   const [streamingResponse, setStreamingResponse] = useState('');
//   const [file, setFile] = useState(null);
//   const [fileChunks, setFileChunks] = useState([]);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     fetchModels();
//   }, []);

//   const fetchModels = async () => {
//     try {
//       const response = await fetch('http://localhost:11434/api/tags');
//       if (!response.ok) {
//         throw new Error('Failed to fetch models');
//       }
//       const data = await response.json();
//       setModels(data.models);
//       if (data.models.length > 0) {
//         setSelectedModel('llama3.1:latest');
//       }
//     } catch (error) {
//       console.error('Error fetching models:', error);
//     }
//   };

//   const handleFileUpload = (event) => {
//     const uploadedFile = event.target.files[0];
//     setFile(uploadedFile);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const content = e.target.result;
//       const chunks = chunkText(content, 500);
//       setFileChunks(chunks);
//       console.log(`File processed into ${chunks.length} chunks`);
//     };
//     reader.readAsText(uploadedFile);
//   };

//   const chunkText = (text, wordsPerChunk) => {
//     const words = text.split(/\s+/);
//     const chunks = [];
//     for (let i = 0; i < words.length; i += wordsPerChunk) {
//       chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
//     }
//     return chunks;
//   };

//   const sendMessage = async () => {
//     if ((!input.trim() && fileChunks.length === 0) || !selectedModel) return;

//     setIsLoading(true);
//     setMessages(prev => [...prev, { role: 'user', content: input }]);
//     setStreamingResponse('');

//     let context = '';
//     if (fileChunks.length > 0) {
//       context = fileChunks.join('\n\n'); // Use all chunks as context
//     }

//     const prompt = context 
//       ? `Context: ${context}\n\nUser: ${input}\n\nAssistant: `
//       : input;

//     try {
//       const response = await fetch('http://localhost:11434/api/generate', {
//         method: 'POST',
      
//         body: JSON.stringify({
//           model: selectedModel,
//           prompt: prompt,
//           stream: true
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const reader = response.body.getReader();
//       let accumulatedResponse = '';

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;
//         const chunk = new TextDecoder().decode(value);
//         const lines = chunk.split('\n');
        
//         for (const line of lines) {
//           if (line.trim() !== '') {
//             try {
//               const jsonResponse = JSON.parse(line);
//               accumulatedResponse += jsonResponse.response;
//               setStreamingResponse(accumulatedResponse);
//             } catch (e) {
//               console.error('Error parsing JSON:', e);
//             }
//           }
//         }
//       }

//       setMessages(prev => [...prev, { role: 'assistant', content: accumulatedResponse }]);
//     } catch (error) {
//       console.error('Error:', error);
//       let errorMessage = 'Sorry, there was an error processing your request.';
//       setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
//     } finally {
//       setIsLoading(false);
//       setInput('');
//       setStreamingResponse('');
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md">
//       <h2 className="text-2xl font-bold mb-4">Chat with Zemen chatGPT</h2>
      
//       <select
//         value={selectedModel}
//         onChange={(e) => setSelectedModel(e.target.value)}
//         className="w-full p-2 mb-4 border rounded-md"
//       >
//         <option value="">Select a model</option>
//         {models.map((model) => (
//           <option key={model.name} value={model.name}>
//             {model.name}
//           </option>
//         ))}
//       </select>

//       <div className="mb-4">
//         <input
//           type="file"
//           onChange={handleFileUpload}
//           ref={fileInputRef}
//           className="hidden"
//         />
//         <button
//           onClick={() => fileInputRef.current.click()}
//           className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2"
//         >
//           Upload File
//         </button>
//         {file && <span className="text-sm text-gray-600">{file.name}</span>}
//       </div>
      
//       <div className="space-y-4 mb-4 h-96 overflow-y-auto">
//         {messages.map((message, index) => (
//           <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//             <div className={`p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
//               {message.content}
//             </div>
//           </div>
//         ))}
//         {streamingResponse && (
//           <div className="flex justify-start">
//             <div className="p-2 rounded-lg bg-gray-100">
//               {streamingResponse}
//             </div>
//           </div>
//         )}
//       </div>
      
//       <div className="flex space-x-2">
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
//           placeholder="Type your message..."
//           className="flex-grow p-2 border rounded-md"
//         />
//         <button
//           onClick={sendMessage}
//           disabled={isLoading}
//           className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
//         >
//           {isLoading ? 'Sending...' : 'Send'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default OllamaChat;