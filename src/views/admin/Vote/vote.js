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
  CircularProgress,
  Chip,
  LinearProgress,
  IconButton,
  Alert
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockIcon from '@mui/icons-material/Lock';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const EmployeeEvaluation = () => {
    const accessToken = useSelector((state) => state.user.accessToken);
    const [employees, setEmployees] = useState([]);
    const [evaluationCriteria, setEvaluationCriteria] = useState([]);
    const [ratingMatrix, setRatingMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [currentCriteriaIndex, setCurrentCriteriaIndex] = useState(0);
    const [completedCriteria, setCompletedCriteria] = useState(new Set());
    const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
    // The current fiscal year's voting period: votes are accepted only while it is open
    const [votingWindow, setVotingWindow] = useState(null);
    const votingClosed = votingWindow ? !votingWindow.open : false;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch employees, evaluation criteria, and rating matrix in parallel
                const [employeesResponse, criteriaResponse, ratingResponse] = await Promise.all([
                    fetch(`${API_BASE}/rms/admin/landing/get_candidate_by_department`, {
                        headers: {
                            'x-access-token': accessToken
                        }
                    }),
                    fetch(`${API_BASE}/admin/template/criteria/peer`, {
                        headers: {
                            'x-access-token': accessToken
                        }
                    }),
                    fetch(`${API_BASE}/admin/template/rating-matrix/peer`, {
                        headers: {
                            'x-access-token': accessToken
                        }
                    })
                ]);

                // Check if all requests were successful
                if (!employeesResponse.ok || !criteriaResponse.ok || !ratingResponse.ok) {
                    throw new Error('Failed to fetch data from server');
                }

                const [employeesData, criteriaData, ratingData] = await Promise.all([
                    employeesResponse.json(),
                    criteriaResponse.json(),
                    ratingResponse.json()
                ]);

                console.log('Employees:', employeesData);
                console.log('Criteria:', criteriaData);
                console.log('Rating Matrix:', ratingData);

                // Set employees
                if (employeesData.error === false && employeesData.data) {
                    setEmployees(employeesData.data);
                } else {
                    setEmployees([]);
                }

                // Set evaluation criteria
                if (criteriaData.success && criteriaData.data) {
                    setEvaluationCriteria(criteriaData.data);
                } else {
                    setEvaluationCriteria([]);
                }

                // Set rating matrix
                if (ratingData.success && ratingData.data) {
                    setRatingMatrix(ratingData.data.sort((a, b) => b.rating_number - a.rating_number)); // Sort by rating descending
                } else {
                    setRatingMatrix([]);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        if (accessToken) {
            fetchData();
            fetch(`${API_BASE}/fiscal-years/current`, {
                headers: { 'x-access-token': accessToken }
            })
                .then(response => (response.ok ? response.json() : null))
                .then(data => setVotingWindow(data?.voting || null))
                .catch(err => console.error('Error loading voting period:', err));
        }
    }, [accessToken]);

    const [evaluations, setEvaluations] = useState([]);

    // Update evaluations when criteria changes
    useEffect(() => {
        if (evaluationCriteria.length > 0) {
            setEvaluations(
                evaluationCriteria.map(criteria => ({
                    criteriaId: criteria._id,
                    criteriaName: criteria.criteria_name,
                    weight: criteria.weight,
                    rating: null,
                }))
            );
        }
    }, [evaluationCriteria]);

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setShowEvaluation(false);
        setCurrentCriteriaIndex(0);
        setCompletedCriteria(new Set());
        setShowIncompleteWarning(false);
        // Reset all ratings when selecting a new employee
        setEvaluations(prev => prev.map(e => ({ ...e, rating: null })));
        setTimeout(() => setShowEvaluation(true), 50);
    };

    const handleRatingChange = (criteriaId, value) => {
        setEvaluations(prev =>
            prev.map(evaluation =>
                evaluation.criteriaId === criteriaId ? { ...evaluation, rating: value } : evaluation
            )
        );
        
        // Mark current criteria as completed and auto-advance to next
        const newCompleted = new Set(completedCriteria);
        newCompleted.add(currentCriteriaIndex);
        setCompletedCriteria(newCompleted);
        setShowIncompleteWarning(false);
        
        // Auto-advance to next criteria after a short delay
        setTimeout(() => {
            if (currentCriteriaIndex < evaluationCriteria.length - 1) {
                setCurrentCriteriaIndex(currentCriteriaIndex + 1);
            }
        }, 500);
    };

    const calculateWeightedScore = () => {
        // Find the maximum rating number from the rating matrix
        const maxRating = ratingMatrix.length > 0 ? Math.max(...ratingMatrix.map(r => r.rating_number)) : 10;

        return evaluations.reduce((total, evaluation) => {
            if (!evaluation.rating) return total;

            // Calculate weighted score: (rating / maxRating) * weight
            // This gives the actual contribution of this criterion to the total score
            const contributionScore = (evaluation.rating / maxRating) * evaluation.weight;
            return total + contributionScore;
        }, 0);
    };

    const handleSubmit = async () => {
        if (votingClosed) {
            toast.error(votingWindow.message);
            return;
        }

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
            const response = await fetch(`${API_BASE}/zemen_vote_candidate/vote_candidate`, {
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
                        sx={{ color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }}
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

    const goToNextCriteria = () => {
        const currentEvaluation = evaluations.find(e => e.criteriaId === evaluationCriteria[currentCriteriaIndex]?._id);
        
        if (!currentEvaluation || currentEvaluation.rating === null) {
            setShowIncompleteWarning(true);
            return;
        }
        
        if (currentCriteriaIndex < evaluationCriteria.length - 1) {
            setCurrentCriteriaIndex(currentCriteriaIndex + 1);
            setShowIncompleteWarning(false);
        }
    };

    const goToPreviousCriteria = () => {
        if (currentCriteriaIndex > 0) {
            setCurrentCriteriaIndex(currentCriteriaIndex - 1);
            setShowIncompleteWarning(false);
        }
    };

    const handleCriteriaJump = (index) => {
        // Check if all previous criteria are completed
        for (let i = 0; i < index; i++) {
            const evaluation = evaluations.find(e => e.criteriaId === evaluationCriteria[i]._id);
            if (!evaluation || evaluation.rating === null) {
                setShowIncompleteWarning(true);
                return;
            }
        }
        setCurrentCriteriaIndex(index);
        setShowIncompleteWarning(false);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress sx={{ color: '#dc2626' }} />
                <Typography sx={{ ml: 2 }}>Loading evaluation data...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error" variant="h6">Error Loading Data</Typography>
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    if (employees.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6">No Candidates Available</Typography>
                <Typography>No candidates found in your department for evaluation.</Typography>
            </Box>
        );
    }

    if (evaluationCriteria.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6">No Evaluation Criteria Available</Typography>
                <Typography>Please contact your administrator to set up peer evaluation criteria.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', p: 2 }}>
            <Box sx={{ width: '45%', pr: 2 }}>
                {votingWindow && votingWindow.state !== 'not_set' && (
                    <Alert severity={votingClosed ? 'warning' : 'info'} sx={{ mb: 2 }}>
                        {votingWindow.message}
                    </Alert>
                )}
                <MaterialReactTable
                    columns={columns}
                    data={employees}
                    enableColumnActions={true}
                    enableColumnFilters={false}
                    enablePagination={false}
                    enableSorting={true}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                    muiTablePaperProps={{
                        sx: {
                            border: '2px solid #000',
                            boxShadow: 'none'
                        }
                    }}
                />
            </Box>
            <Box sx={{ width: '55%', pl: 2 }}>
                <AnimatePresence mode="wait">
                    {showEvaluation && selectedEmployee && (
                        <motion.div
                            key={selectedEmployee.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Paper elevation={0} sx={{ p: 3, border: '2px solid #000', borderRadius: 0 }}>
                                <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#000', fontWeight: 'bold' }}>
                                    Evaluating: {selectedEmployee.first_name} {selectedEmployee.last_name}
                                </Typography>
                                
                                {/* Progress Indicator */}
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="body2" sx={{ mr: 2, color: '#000', fontWeight: 'bold' }}>
                                            Progress: {completedCriteria.size} / {evaluationCriteria.length}
                                        </Typography>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={(completedCriteria.size / evaluationCriteria.length) * 100}
                                                sx={{ 
                                                    height: 8, 
                                                    backgroundColor: '#f5f5f5',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: '#dc2626'
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                    
                                    {/* Criteria indicators */}
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {evaluationCriteria.map((criteria, index) => {
                                            const evaluation = evaluations.find(e => e.criteriaId === criteria._id);
                                            const isCompleted = evaluation && evaluation.rating !== null;
                                            const isLocked = index > 0 && !evaluations.find(e => e.criteriaId === evaluationCriteria[index - 1]._id)?.rating;
                                            
                                            return (
                                                <Chip
                                                    key={criteria._id}
                                                    icon={isLocked ? <LockIcon /> : isCompleted ? 
                                                        <CheckCircleIcon /> : 
                                                        <RadioButtonUncheckedIcon />
                                                    }
                                                    label={`${index + 1}`}
                                                    sx={{
                                                        backgroundColor: index === currentCriteriaIndex ? '#dc2626' : 
                                                                       isCompleted ? '#000' : '#fff',
                                                        color: index === currentCriteriaIndex || isCompleted ? '#fff' : '#000',
                                                        border: '1px solid #000',
                                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                                        opacity: isLocked ? 0.5 : 1,
                                                        '&:hover': {
                                                            backgroundColor: isLocked ? '' : index === currentCriteriaIndex ? '#dc2626' : 
                                                                           isCompleted ? '#000' : '#f5f5f5',
                                                        }
                                                    }}
                                                    onClick={() => !isLocked && handleCriteriaJump(index)}
                                                />
                                            );
                                        })}
                                    </Box>
                                </Box>

                                {/* Warning Message */}
                                {showIncompleteWarning && (
                                    <Alert 
                                        severity="warning" 
                                        sx={{ mb: 2, border: '1px solid #000' }}
                                        onClose={() => setShowIncompleteWarning(false)}
                                    >
                                        Please complete the current criteria before moving forward!
                                    </Alert>
                                )}

                                {/* Current Criteria Card */}
                                <AnimatePresence mode="wait">
                                    {evaluationCriteria[currentCriteriaIndex] && (
                                        <motion.div
                                            key={currentCriteriaIndex}
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Paper 
                                                elevation={0} 
                                                sx={{ 
                                                    p: 3, 
                                                    mb: 3,
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: '2px solid #000'
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Typography variant="h6">
                                                        Criteria {currentCriteriaIndex + 1} of {evaluationCriteria.length}
                                                    </Typography>
                                                    <Chip 
                                                        label={`Weight: ${evaluationCriteria[currentCriteriaIndex].weight}`}
                                                        sx={{ 
                                                            bgcolor: 'white', 
                                                            color: '#000',
                                                            fontWeight: 'bold',
                                                            border: '1px solid #000'
                                                        }}
                                                    />
                                                </Box>
                                                
                                                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                    {evaluationCriteria[currentCriteriaIndex].criteria_name}
                                                </Typography>
                                                
                                                {evaluationCriteria[currentCriteriaIndex].description && (
                                                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                                                        {evaluationCriteria[currentCriteriaIndex].description}
                                                    </Typography>
                                                )}
                                            </Paper>

                                            {/* Rating Selection - Column Layout */}
                                            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '2px solid #000' }}>
                                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#000' }}>
                                                    Select Rating:
                                                </Typography>
                                                
                                                <RadioGroup
                                                    value={evaluations.find(e => e.criteriaId === evaluationCriteria[currentCriteriaIndex]._id)?.rating || ''}
                                                    onChange={(e) => handleRatingChange(evaluationCriteria[currentCriteriaIndex]._id, parseFloat(e.target.value))}
                                                >
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                        {ratingMatrix.map((rating, index) => {
                                                            const isSelected = evaluations.find(e => e.criteriaId === evaluationCriteria[currentCriteriaIndex]._id)?.rating === rating.rating_number;
                                                            return (
                                                                <motion.div
                                                                    key={rating.rating_number}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                    style={{ width: '100%' }}
                                                                >
                                                                    <Paper 
                                                                        elevation={0}
                                                                        sx={{ 
                                                                            p: 2,
                                                                            width: '100%',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s',
                                                                            border: isSelected ? '2px solid #dc2626' : '1px solid #000',
                                                                            backgroundColor: isSelected ? '#fef2f2' : '#fff',
                                                                            '&:hover': {
                                                                                backgroundColor: isSelected ? '#fef2f2' : '#f5f5f5',
                                                                                borderColor: '#dc2626'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <FormControlLabel
                                                                            value={rating.rating_number}
                                                                            control={
                                                                                <Radio 
                                                                                    sx={{ 
                                                                                        color: '#000',
                                                                                        '&.Mui-checked': { color: '#dc2626' }
                                                                                    }}
                                                                                />
                                                                            }
                                                                            label={
                                                                                <Box sx={{ 
                                                                                    display: 'flex', 
                                                                                    justifyContent: 'space-between', 
                                                                                    alignItems: 'center',
                                                                                    width: '100%',
                                                                                    minWidth: '300px'
                                                                                }}>
                                                                                    <Typography 
                                                                                        variant="subtitle1" 
                                                                                        sx={{ 
                                                                                            fontWeight: isSelected ? 'bold' : 'normal',
                                                                                            color: '#000',
                                                                                            flex: 1
                                                                                        }}
                                                                                    >
                                                                                        {rating.matrix_name}
                                                                                    </Typography>
                                                                                    <Chip 
                                                                                        label={rating.rating_number}
                                                                                        size="small"
                                                                                        sx={{ 
                                                                                            ml: 2,
                                                                                            backgroundColor: isSelected ? '#dc2626' : '#000',
                                                                                            color: '#fff',
                                                                                            fontWeight: 'bold',
                                                                                            minWidth: '40px'
                                                                                        }}
                                                                                    />
                                                                                </Box>
                                                                            }
                                                                            sx={{ 
                                                                                margin: 0, 
                                                                                width: '100%',
                                                                                '& .MuiFormControlLabel-label': {
                                                                                    width: '100%'
                                                                                }
                                                                            }}
                                                                        />
                                                                    </Paper>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </Box>
                                                </RadioGroup>
                                                
                                                {ratingMatrix.length === 0 && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        No rating matrix available. Please contact admin.
                                                    </Typography>
                                                )}
                                            </Paper>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Navigation and Score */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <IconButton 
                                            onClick={goToPreviousCriteria}
                                            disabled={currentCriteriaIndex === 0}
                                            sx={{ 
                                                mr: 1,
                                                border: '1px solid #000',
                                                '&:hover': { backgroundColor: '#f5f5f5' }
                                            }}
                                        >
                                            <NavigateBeforeIcon />
                                        </IconButton>
                                        <IconButton 
                                            onClick={goToNextCriteria}
                                            disabled={currentCriteriaIndex === evaluationCriteria.length - 1}
                                            sx={{ 
                                                border: '1px solid #000',
                                                '&:hover': { backgroundColor: '#f5f5f5' }
                                            }}
                                        >
                                            <NavigateNextIcon />
                                        </IconButton>
                                    </Box>
                                    
                                    <Typography variant="h6" sx={{ color: '#000', fontWeight: 'bold' }}>
                                        Total Score: {calculateWeightedScore().toFixed(2)}
                                    </Typography>
                                </Box>

                                {/* Submit Button */}
                                {completedCriteria.size === evaluationCriteria.length && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Button
                                            variant="contained"
                                            onClick={handleSubmit}
                                            disabled={votingClosed}
                                            fullWidth
                                            sx={{ 
                                                mt: 3,
                                                py: 1.5,
                                                backgroundColor: '#dc2626',
                                                color: '#fff',
                                                border: '2px solid #000',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold',
                                                '&:hover': {
                                                    backgroundColor: '#b91c1c',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 0 #000'
                                                }
                                            }}
                                        >
                                            Submit Complete Evaluation
                                        </Button>
                                    </motion.div>
                                )}
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
                    <Button 
                        onClick={() => setOpenModal(false)} 
                        sx={{ 
                            mt: 2,
                            color: '#dc2626',
                            borderColor: '#dc2626',
                            '&:hover': {
                                borderColor: '#b91c1c',
                                backgroundColor: '#fef2f2'
                            }
                        }}
                        variant="outlined"
                    >
                        Close
                    </Button>
                </Box>
            </Modal>
            <ToastContainer />
        </Box>
    );
};

export default EmployeeEvaluation;