import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  FormLabel,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  InputAdornment,
  Tabs,
  Tab,
  Radio,
  RadioGroup,
  FormControlLabel,
  LinearProgress,
  IconButton,
  Modal
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const ManagerialRating = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  const userInfo = useSelector((state) => state.user.userInfo);

  // Tab management
  const [currentTab, setCurrentTab] = useState(0);

  // General loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Managerial tab state
  const [managers, setManagers] = useState([]);
  const [managerialCriteria, setManagerialCriteria] = useState([]);
  const [managerialRatingMatrix, setManagerialRatingMatrix] = useState([]);

  // Non-managerial tab state
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [nonManagerialCriteria, setNonManagerialCriteria] = useState([]);
  const [nonManagerialRatingMatrix, setNonManagerialRatingMatrix] = useState([]);

  // Evaluation state (shared between both tabs)
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [currentCriteriaIndex, setCurrentCriteriaIndex] = useState(0);
  const [completedCriteria, setCompletedCriteria] = useState(new Set());
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [currentRatingCategory, setCurrentRatingCategory] = useState('managerial_staff');

  // Open re-rating approved by the Deputy Chief Human Capital, with who is still to be rated
  const [reRating, setReRating] = useState(null);
  // The current fiscal year's voting period; an approved re-rating lets directors rate after it
  const [votingWindow, setVotingWindow] = useState(null);
  const ratingClosed = Boolean(votingWindow && !votingWindow.open && !reRating);

  useEffect(() => {
    if (accessToken) {
      fetchInitialData();
      fetchReRatingStatus();
      fetchVotingWindow();
    }
  }, [accessToken]);

  const fetchVotingWindow = async () => {
    try {
      const response = await fetch(`${API_BASE}/fiscal-years/current`, {
        headers: { 'x-access-token': accessToken }
      });
      if (response.ok) {
        const data = await response.json();
        setVotingWindow(data.voting || null);
      }
    } catch (error) {
      console.error('Error loading voting period:', error);
    }
  };

  const fetchReRatingStatus = async () => {
    if (!userInfo?.roles?.includes('director')) return;

    try {
      const response = await fetch(`${API_BASE}/re-rating/director-status`, {
        headers: { 'x-access-token': accessToken }
      });

      if (response.ok) {
        const data = await response.json();
        setReRating(data.data);
      }
    } catch (error) {
      console.error('Error fetching re-rating status:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch all required data in parallel
      const [
        managersResponse,
        departmentsResponse,
        managerialCriteriaResponse,
        managerialRatingResponse,
        nonManagerialCriteriaResponse,
        nonManagerialRatingResponse
      ] = await Promise.all([
        fetch(`${API_BASE}/managerial-rating/managers-under-director`, {
          headers: { 'x-access-token': accessToken }
        }),
        fetch(`${API_BASE}/managerial-rating/departments-under-director`, {
          headers: { 'x-access-token': accessToken }
        }),
        fetch(`${API_BASE}/admin/template/criteria/managerial_staff`, {
          headers: { 'x-access-token': accessToken }
        }),
        fetch(`${API_BASE}/admin/template/rating-matrix/managerial_staff`, {
          headers: { 'x-access-token': accessToken }
        }),
        fetch(`${API_BASE}/admin/template/criteria/non_managerial_staff`, {
          headers: { 'x-access-token': accessToken }
        }),
        fetch(`${API_BASE}/admin/template/rating-matrix/non_managerial_staff`, {
          headers: { 'x-access-token': accessToken }
        })
      ]);

      // Process responses
      const [
        managersData,
        departmentsData,
        managerialCriteriaData,
        managerialRatingData,
        nonManagerialCriteriaData,
        nonManagerialRatingData
      ] = await Promise.all([
        managersResponse.json(),
        departmentsResponse.json(),
        managerialCriteriaResponse.json(),
        managerialRatingResponse.json(),
        nonManagerialCriteriaResponse.json(),
        nonManagerialRatingResponse.json()
      ]);

      console.log('Fetched data:', {
        managers: managersData,
        departments: departmentsData,
        managerialCriteria: managerialCriteriaData,
        nonManagerialCriteria: nonManagerialCriteriaData
      });

      // Set state
      if (managersData.error === false && managersData.data) {
        setManagers(managersData.data);
      }

      if (departmentsData.error === false && departmentsData.data) {
        setDepartments(departmentsData.data);
      }

      if (managerialCriteriaData.success && managerialCriteriaData.data) {
        setManagerialCriteria(managerialCriteriaData.data);
      }

      if (managerialRatingData.success && managerialRatingData.data) {
        setManagerialRatingMatrix(managerialRatingData.data.sort((a, b) => b.rating_number - a.rating_number));
      }

      if (nonManagerialCriteriaData.success && nonManagerialCriteriaData.data) {
        setNonManagerialCriteria(nonManagerialCriteriaData.data);
      }

      if (nonManagerialRatingData.success && nonManagerialRatingData.data) {
        setNonManagerialRatingMatrix(nonManagerialRatingData.data.sort((a, b) => b.rating_number - a.rating_number));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchDepartmentStaff = async (department) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/managerial-rating/staff-in-department/${encodeURIComponent(department)}`, {
        headers: { 'x-access-token': accessToken }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error === false && data.data) {
          setDepartmentStaff(data.data);
          setSelectedDepartment(department);
        } else {
          setDepartmentStaff([]);
        }
      } else {
        toast.error('Failed to fetch department staff');
        setDepartmentStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Error fetching department staff');
      setDepartmentStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // Update evaluations when criteria changes
  useEffect(() => {
    const currentCriteria = currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    console.log('useEffect triggered - currentRatingCategory:', currentRatingCategory);
    console.log('useEffect triggered - currentCriteria:', currentCriteria);
    console.log('useEffect triggered - selectedEmployee:', selectedEmployee);
    console.log('useEffect triggered - current evaluations length:', evaluations.length);

    // Only set evaluations if we have criteria, a selected employee, and either no evaluations or empty evaluations
    if (currentCriteria.length > 0 && selectedEmployee && (evaluations.length === 0 || evaluations.every(e => e.rating === null))) {
      console.log('Setting evaluations from useEffect');
      setEvaluations(
        currentCriteria.map(criteria => ({
          criteriaId: criteria._id,
          criteriaName: criteria.criteria_name,
          weight: criteria.weight,
          rating: null,
        }))
      );
    }
  }, [managerialCriteria, nonManagerialCriteria, currentRatingCategory, selectedEmployee]);

  const handleEmployeeSelect = (employee, ratingCategory) => {
    console.log('Employee selected:', employee, 'Rating category:', ratingCategory);
    const criteriaToUse = ratingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    console.log('Available criteria for category:', criteriaToUse);
    console.log('Criteria length:', criteriaToUse.length);

    setSelectedEmployee(employee);
    setCurrentRatingCategory(ratingCategory);
    setShowEvaluation(false);
    setCurrentCriteriaIndex(0);
    setCompletedCriteria(new Set());
    setShowIncompleteWarning(false);

    // Check if criteria are loaded, if not wait for them
    if (criteriaToUse.length === 0) {
      console.log('Criteria not loaded yet, waiting...');
      setEvaluations([]);
      // The useEffect will handle setting evaluations when criteria become available
    } else {
      console.log('Setting evaluations for criteria:', criteriaToUse);
      setEvaluations(
        criteriaToUse.map(criteria => ({
          criteriaId: criteria._id,
          criteriaName: criteria.criteria_name,
          weight: criteria.weight,
          rating: null,
        }))
      );
    }

    setTimeout(() => setShowEvaluation(true), 50);
  };

  const handleRatingChange = (criteriaId, value) => {
    console.log('Rating changed for criteria:', criteriaId, 'value:', value);
    console.log('Current evaluations before update:', evaluations);
    console.log('Current rating category:', currentRatingCategory);
    console.log('Available criteria:', currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria);

    setEvaluations(prev => {
      const updated = prev.map(evaluation =>
        evaluation.criteriaId === criteriaId ? { ...evaluation, rating: value } : evaluation
      );
      console.log('Updated evaluations:', updated);
      return updated;
    });

    // Mark current criteria as completed and auto-advance to next
    const newCompleted = new Set(completedCriteria);
    newCompleted.add(currentCriteriaIndex);
    setCompletedCriteria(newCompleted);
    setShowIncompleteWarning(false);

    // Auto-advance to next criteria after a short delay
    const currentCriteria = currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    setTimeout(() => {
      if (currentCriteriaIndex < currentCriteria.length - 1) {
        setCurrentCriteriaIndex(currentCriteriaIndex + 1);
      }
    }, 500);
  };

  const calculateWeightedScore = () => {
    const currentRatingMatrix = currentRatingCategory === 'managerial_staff' ? managerialRatingMatrix : nonManagerialRatingMatrix;
    const maxRating = currentRatingMatrix.length > 0 ? Math.max(...currentRatingMatrix.map(r => r.rating_number)) : 10;

    console.log('Calculating score - Category:', currentRatingCategory);
    console.log('Rating matrix:', currentRatingMatrix);
    console.log('Max rating:', maxRating);
    console.log('Evaluations:', evaluations);

    const totalScore = evaluations.reduce((total, evaluation) => {
      if (!evaluation.rating) return total;
      const contributionScore = (evaluation.rating / maxRating) * evaluation.weight;
      console.log(`Criteria ${evaluation.criteriaName}: (${evaluation.rating} / ${maxRating}) * ${evaluation.weight} = ${contributionScore}`);
      return total + contributionScore;
    }, 0);

    console.log('Total score:', totalScore);
    return totalScore;
  };

  const handleSubmit = async () => {
    if (ratingClosed) {
      toast.error(votingWindow.message);
      return;
    }

    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    const isFormComplete = evaluations.every(evaluation => evaluation.rating !== null);
    if (!isFormComplete) {
      setOpenModal(true);
      return;
    }

    const totalScore = calculateWeightedScore();

    const data = {
      employee: selectedEmployee,
      evaluations: evaluations,
      totalScore: totalScore,
      ratingCategory: currentRatingCategory
    };

    try {
      const response = await fetch(`${API_BASE}/managerial-rating/submit-managerial-rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success(`Rating submitted successfully for ${selectedEmployee.first_name} ${selectedEmployee.last_name}`);
        // Reset states
        setSelectedEmployee(null);
        setShowEvaluation(false);
        setEvaluations([]);
        setCompletedCriteria(new Set());
        setCurrentCriteriaIndex(0);
        // Refresh data
        fetchInitialData();
        fetchReRatingStatus();
      } else {
        toast.error(`Error: ${responseData.message}`);
      }
    } catch (error) {
      toast.error(`Network Error: ${error.message}`);
      console.error('Error submitting rating:', error);
    }
  };

  const goToNextCriteria = () => {
    const currentCriteria = currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    const currentEvaluation = evaluations.find(e => e.criteriaId === currentCriteria[currentCriteriaIndex]?._id);

    if (!currentEvaluation || currentEvaluation.rating === null) {
      setShowIncompleteWarning(true);
      return;
    }

    if (currentCriteriaIndex < currentCriteria.length - 1) {
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
    const currentCriteria = currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    // Check if all previous criteria are completed
    for (let i = 0; i < index; i++) {
      const evaluation = evaluations.find(e => e.criteriaId === currentCriteria[i]._id);
      if (!evaluation || evaluation.rating === null) {
        setShowIncompleteWarning(true);
        return;
      }
    }
    setCurrentCriteriaIndex(index);
    setShowIncompleteWarning(false);
  };

  // Table columns for managers
  const managerColumns = useMemo(
    () => [
      {
        accessorKey: 'select',
        header: 'Select',
        Cell: ({ row }) => (
          <Radio
            checked={selectedEmployee?.id === row.original.id}
            onChange={() => handleEmployeeSelect(row.original, 'managerial_staff')}
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
      {
        accessorKey: 'department',
        header: 'Department',
      },
      {
        accessorKey: 'position',
        header: 'Position',
      },
    ],
    [selectedEmployee]
  );

  // Table columns for staff
  const staffColumns = useMemo(
    () => [
      {
        accessorKey: 'select',
        header: 'Select',
        Cell: ({ row }) => (
          <Radio
            checked={selectedEmployee?.id === row.original.id}
            onChange={() => handleEmployeeSelect(row.original, 'non_managerial_staff')}
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
      {
        accessorKey: 'position',
        header: 'Position',
      },
    ],
    [selectedEmployee]
  );

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
        <Typography sx={{ ml: 2 }}>Loading managerial rating data...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="h6">Error Loading Data</Typography>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Check if user has director role
  if (!userInfo?.roles?.includes('director') && !userInfo?.roles?.includes('chief')) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Access Denied</Typography>
        <Typography>You do not have the necessary permissions to access managerial ratings.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Managerial Rating System
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        As a Director, you can rate both managers under your supervision and staff in departments managed by your managers.
      </Alert>

      {votingWindow && votingWindow.state !== 'not_set' && (
        <Alert severity={ratingClosed ? 'warning' : 'info'} sx={{ mb: 3 }}>
          {votingWindow.message}
          {!votingWindow.open && reRating && ' Re-rating is open for you, so you can still rate the people listed below.'}
        </Alert>
      )}

      {reRating && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Re-rating required.</strong> {reRating.chief_name}&apos;s selection was rejected and the
            Deputy Chief Human Capital ({reRating.reviewed_by_name}) approved re-rating on{' '}
            {new Date(reRating.reviewed_at).toLocaleDateString()}. Your earlier ratings were removed; please rate again.
          </Typography>
          {reRating.remaining.length > 0 ? (
            <Typography variant="body2" component="div">
              Still to rate:
              <ul style={{ margin: 0 }}>
                {reRating.remaining.map((r) => (
                  <li key={`${r.ratee_emp_id}-${r.rating_category}`}>
                    {r.ratee_name} ({r.rating_category === 'managerial_staff' ? 'Managerial Rating tab' : 'Non-Managerial Rating tab'})
                  </li>
                ))}
              </ul>
            </Typography>
          ) : (
            <Typography variant="body2">
              You have rated everyone again. Waiting for the other directors.
            </Typography>
          )}
        </Alert>
      )}

      {/* Tab Interface */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => {
            setCurrentTab(newValue);
            setSelectedEmployee(null);
            setShowEvaluation(false);
            setSelectedDepartment(null);
            setDepartmentStaff([]);
          }}
          aria-label="managerial rating tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Managerial Rating" />
          <Tab label="Non-Managerial Rating" />
        </Tabs>

        {/* Managerial Tab */}
        {currentTab === 0 && (
          <Box sx={{ p: 3 }}>
            {!showEvaluation ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Select a Manager to Rate
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Rate managers using managerial staff criteria
                </Typography>

                {managers.length === 0 ? (
                  <Alert severity="warning">
                    No managers found under your supervision.
                  </Alert>
                ) : (
                  <MaterialReactTable
                    columns={managerColumns}
                    data={managers}
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
                )}
              </>
            ) : (
              <Box>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setShowEvaluation(false);
                    setSelectedEmployee(null);
                  }}
                  sx={{ mb: 2 }}
                >
                  Back to Manager Selection
                </Button>
                {renderEvaluationForm()}
              </Box>
            )}
          </Box>
        )}

        {/* Non-Managerial Tab */}
        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            {!selectedDepartment ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Select a Department
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose a department to view and rate staff using non-managerial criteria
                </Typography>

                {departments.length === 0 ? (
                  <Alert severity="warning">
                    No departments found under your managers.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {departments.map((dept) => (
                      <Grid item xs={12} sm={6} md={4} key={dept.department}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 3
                            }
                          }}
                          onClick={() => fetchDepartmentStaff(dept.department)}
                        >
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {dept.department}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {dept.staffCount} staff members
                            </Typography>
                            {dept.manager_info && (
                              <Typography variant="body2" color="primary">
                                Manager: {dept.manager_info.first_name} {dept.manager_info.last_name}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            ) : !showEvaluation ? (
              <>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setSelectedDepartment(null);
                    setDepartmentStaff([]);
                  }}
                  sx={{ mb: 2 }}
                >
                  Back to Department Selection
                </Button>

                <Typography variant="h6" gutterBottom>
                  Staff in {selectedDepartment}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select a staff member to rate using non-managerial criteria
                </Typography>

                {departmentStaff.length === 0 ? (
                  <Alert severity="warning">
                    No staff found in this department.
                  </Alert>
                ) : (
                  <MaterialReactTable
                    columns={staffColumns}
                    data={departmentStaff}
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
                )}
              </>
            ) : (
              <Box>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setShowEvaluation(false);
                    setSelectedEmployee(null);
                  }}
                  sx={{ mb: 2 }}
                >
                  Back to Staff Selection
                </Button>
                {renderEvaluationForm()}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Modal for incomplete warning */}
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
            Please fill out all criteria in the evaluation form before submitting.
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

      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );

  // Render evaluation form function (similar to vote.js)
  function renderEvaluationForm() {
    const currentEvaluationCriteria = currentRatingCategory === 'managerial_staff' ? managerialCriteria : nonManagerialCriteria;
    const currentRatingMatrix = currentRatingCategory === 'managerial_staff' ? managerialRatingMatrix : nonManagerialRatingMatrix;

    console.log('Rendering evaluation form for category:', currentRatingCategory);
    console.log('Current criteria:', currentEvaluationCriteria);
    console.log('Current rating matrix:', currentRatingMatrix);
    console.log('Current criteria index:', currentCriteriaIndex);
    console.log('Current evaluations state:', evaluations);
    console.log('Selected employee:', selectedEmployee);

    if (currentEvaluationCriteria.length === 0) {
      return (
        <Alert severity="warning">
          No evaluation criteria available for this category. Please contact your administrator.
        </Alert>
      );
    }

    // Don't render the form until evaluations are properly initialized
    if (evaluations.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress sx={{ color: '#dc2626', mr: 2 }} />
          <Typography>Initializing evaluation form...</Typography>
        </Box>
      );
    }

    return (
      <AnimatePresence>
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
                    Progress: {completedCriteria.size} / {currentEvaluationCriteria.length}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(completedCriteria.size / currentEvaluationCriteria.length) * 100}
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
                  {currentEvaluationCriteria.map((criteria, index) => {
                    const evaluation = evaluations.find(e => e.criteriaId === criteria._id);
                    const isCompleted = evaluation && evaluation.rating !== null;
                    const isLocked = index > 0 && !evaluations.find(e => e.criteriaId === currentEvaluationCriteria[index - 1]._id)?.rating;

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
                {currentEvaluationCriteria[currentCriteriaIndex] && (
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
                          Criteria {currentCriteriaIndex + 1} of {currentEvaluationCriteria.length}
                        </Typography>
                        <Chip
                          label={`Weight: ${currentEvaluationCriteria[currentCriteriaIndex].weight}`}
                          sx={{
                            bgcolor: 'white',
                            color: '#000',
                            fontWeight: 'bold',
                            border: '1px solid #000'
                          }}
                        />
                      </Box>

                      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {currentEvaluationCriteria[currentCriteriaIndex].criteria_name}
                      </Typography>

                      {currentEvaluationCriteria[currentCriteriaIndex].description && (
                        <Typography variant="body2" sx={{ opacity: 0.95 }}>
                          {currentEvaluationCriteria[currentCriteriaIndex].description}
                        </Typography>
                      )}
                    </Paper>

                    {/* Rating Selection */}
                    <Paper elevation={0} sx={{ p: 2, mb: 3, border: '2px solid #000' }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#000' }}>
                        Select Rating:
                      </Typography>

                      <RadioGroup
                        value={evaluations.find(e => e.criteriaId === currentEvaluationCriteria[currentCriteriaIndex]._id)?.rating || ''}
                        onChange={(e) => {
                          console.log('RadioGroup onChange triggered:', e.target.value);
                          handleRatingChange(currentEvaluationCriteria[currentCriteriaIndex]._id, parseFloat(e.target.value));
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {currentRatingMatrix.map((rating, index) => {
                            const isSelected = evaluations.find(e => e.criteriaId === currentEvaluationCriteria[currentCriteriaIndex]._id)?.rating === rating.rating_number;
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
                                  onClick={() => {
                                    console.log('Paper clicked for rating:', rating.rating_number);
                                    handleRatingChange(currentEvaluationCriteria[currentCriteriaIndex]._id, rating.rating_number);
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

                      {currentRatingMatrix.length === 0 && (
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
                    disabled={currentCriteriaIndex === currentEvaluationCriteria.length - 1}
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
              {completedCriteria.size === currentEvaluationCriteria.length && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={ratingClosed}
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
                    Submit Complete Rating
                  </Button>
                </motion.div>
              )}
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
};

export default ManagerialRating;