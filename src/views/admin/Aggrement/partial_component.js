import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import FileUploadComponent from './FileUploadComponent'; // We'll create this next

const AgreementForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState(initialData);
  const [files, setFiles] = useState([]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleFileChange = (uploadedFiles) => {
    setFiles(uploadedFiles);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ ...formData, attachments: files });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        margin="normal"
        name="amount"
        label="Amount to Pay"
        type="number"
        value={formData.amount || ''}
        onChange={handleInputChange}
      />
      <TextField
        fullWidth
        margin="normal"
        name="dueDate"
        label="Due Date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={formData.dueDate || ''}
        onChange={handleInputChange}
      />
      {/* Add other form fields as needed */}
      
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Attachments</Typography>
      <FileUploadComponent onChange={handleFileChange} />
      
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Save Agreement
      </Button>
    </Box>
  );
};

export default AgreementForm;