import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  Typography, 
  Button,
  Paper,
  Modal,
  CircularProgress
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EmployeeEvaluation = () => {
    const accessToken = useSelector((state) => state.user.accessToken);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/rms/admin/landing/get_candidate_by_department", {
                    headers: {
                        'x-access-token': accessToken
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch employees');
                }
                const data = await response.json();
                setEmployees(data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [accessToken]);

    const criteriaData = [
        { id: 1, name: 'Dedication', weight: 10 },
        { id: 2, name: 'Quality of Work', weight: 5 },
        { id: 3, name: 'Collaboration/Team Work', weight: 5 },
        { id: 4, name: 'Independence', weight: 5 },
        { id: 5, name: 'Customer Service', weight: 10 },
        { id: 6, name: 'Time Mgt.', weight: 5 },
        { id: 7, name: 'Proper Office Attire & Dress Code', weight: 5 },
        { id: 8, name: 'Flexibility', weight: 5 },
    ];

    const [evaluations, setEvaluations] = useState(
        criteriaData.map(criteria => ({
            criteriaId: criteria.id,
            rating: null,
        }))
    );

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setShowEvaluation(false);
        setTimeout(() => setShowEvaluation(true), 50);
    };

    const handleRatingChange = (criteriaId, value) => {
        setEvaluations(prev =>
            prev.map(evaluation =>
                evaluation.criteriaId === criteriaId ? { ...evaluation, rating: value } : evaluation
            )
        );
    };

    const calculateWeightedScore = () => {
        return evaluations.reduce((total, evaluation) => {
            const criteria = criteriaData.find(c => c.id === evaluation.criteriaId);
            return total + (evaluation.rating ? (evaluation.rating * criteria.weight) / 10 : 0);
        }, 0);
    };

    const handleSubmit = async () => {
        if (!selectedEmployee) {
            alert('Please select an employee');
            return;
        }

        const isFormComplete = evaluations.every(evaluation => evaluation.rating !== null);

        if (!isFormComplete) {
            setOpenModal(true);
            return;
        }

        const data = {
            employee: selectedEmployee,
            evaluations: evaluations,
            totalScore: calculateWeightedScore(),
        };

        try {
            const response = await fetch("/api/api/zemen_vote_candidate/vote_candidate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'x-access-token': accessToken,
                },
                body: JSON.stringify(data),
            });

            const responseData = await response.json();

            if (response.ok) {
                toast.success(`Action Done Successfully`);
            } else {
                toast.error(`Error: ${responseData.message}`);
            }

            console.log('Submitting data:', data);
        } catch (error) {
            toast.error(`Network Error: ${error.message}`);
            console.error('Error submitting data:', error);
        }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'select',
                header: 'Select',
                Cell: ({ row }) => (
                    <Radio
                        checked={selectedEmployee?.id === row.original.id}
                        onChange={() => handleEmployeeSelect(row.original)}
                    />
                ),
            },
            {
                accessorKey: 'first_name',
                header: 'First Name',
            },
            {
                accessorKey: 'last_name',
                header: 'Last Name',
            },
            {
                accessorKey: 'employee_id',
                header: 'Employee ID',
            },
        ],
        [selectedEmployee]
    );

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Box sx={{ display: 'flex', p: 2 }}>
            <Box sx={{ width: '50%', pr: 2 }}>
                <MaterialReactTable
                    columns={columns}
                    data={employees}
                    enableColumnActions={true}
                    enableColumnFilters={false}
                    enablePagination={false}
                    enableSorting={true}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                />
            </Box>
            <Box sx={{ width: '60%', pl: 2 }}>
                <AnimatePresence>
                    {showEvaluation && selectedEmployee && (
                        <motion.div
                            key={selectedEmployee.id}
                            initial={{ opacity: 0, y: -100, rotate: 180 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, y: -100, rotate: 180 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Paper elevation={3} sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Evaluation for {selectedEmployee.first_name} {selectedEmployee.last_name}
                                </Typography>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Criteria</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Weight</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {criteriaData.map(criteria => (
                                            <tr key={criteria.id}>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{criteria.name}</td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{criteria.weight}</td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    <RadioGroup
                                                        row
                                                        value={evaluations.find(e => e.criteriaId === criteria.id)?.rating || ''}
                                                        onChange={(e) => handleRatingChange(criteria.id, parseFloat(e.target.value))}
                                                    >
                                                        {[
                                                            { label: 'Exceptional', value: 10 },
                                                            { label: 'Exceeds Requirements', value: 7.5 },
                                                            { label: 'Meets Requirements', value: 5 },
                                                            { label: 'Unsatisfactory', value: 2.5 }
                                                        ].map(option => (
                                                            <FormControlLabel
                                                                key={option.value}
                                                                value={option.value}
                                                                control={<Radio />}
                                                                label={`${option.label} (${option.value})`}
                                                            />
                                                        ))}
                                                    </RadioGroup>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Typography variant="body1" sx={{ mt: 2 }}>
                                    <strong>Total Weighted Score: </strong>
                                    {calculateWeightedScore().toFixed(2)}
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSubmit}
                                    sx={{ mt: 2 }}
                                >
                                    Submit Evaluation
                                </Button>
                            </Paper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
            <Modal
                open={openModal}
                onClose={() => setOpenModal(false)}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    border: '2px solid #000',
                    boxShadow: 24,
                    p: 4,
                }}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Incomplete Evaluation
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                        Please fill out all fields in the evaluation form before submitting.
                    </Typography>
                    <Button onClick={() => setOpenModal(false)} sx={{ mt: 2 }}>
                        Close
                    </Button>
                </Box>
            </Modal>
            <ToastContainer />
        </Box>
    );
};

export default EmployeeEvaluation;