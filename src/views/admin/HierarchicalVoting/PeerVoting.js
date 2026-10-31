import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
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
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const PeerVoting = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  const userInfo = useSelector((state) => state.user.userInfo);

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Voting form state
  const [votes, setVotes] = useState({
    dedication: 1,
    quality_of_work: 1,
    collaboration_team_work: 1,
    independence: 1,
    customer_service: 1,
    time_management: 1,
    office_attire_dress_code: 1,
    flexibility: 1
  });

  const evaluationCriteria = [
    { key: 'dedication', label: 'Dedication', description: 'Commitment and dedication to work responsibilities' },
    { key: 'quality_of_work', label: 'Quality of Work', description: 'Excellence and accuracy in work output' },
    { key: 'collaboration_team_work', label: 'Collaboration/Team Work', description: 'Ability to work effectively with team members' },
    { key: 'independence', label: 'Independence', description: 'Ability to work autonomously and take initiative' },
    { key: 'customer_service', label: 'Customer Service', description: 'Quality of service provided to internal/external customers' },
    { key: 'time_management', label: 'Time Management', description: 'Efficiency in managing time and meeting deadlines' },
    { key: 'office_attire_dress_code', label: 'Office Attire & Dress Code', description: 'Professional appearance and adherence to dress code' },
    { key: 'flexibility', label: 'Flexibility', description: 'Adaptability to change and willingness to take on new challenges' }
  ];

  useEffect(() => {
    fetchEligibleCandidates();
  }, []);

  const fetchEligibleCandidates = async () => {
    try {
      setLoading(true);
      // Fetch candidates in the same department for peer voting
      const response = await fetch(`${API_BASE}/hierarchical-voting/eligible-candidates`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.data || []);
      } else {
        toast.error('Failed to fetch eligible candidates');
      }
    } catch (error) {
      toast.error('Error fetching candidates');
    } finally {
      setLoading(false);
    }
  };

  const submitPeerVote = async () => {
    try {
      setLoading(true);

      const voteData = {
        ...votes,
        period_id: selectedCandidate.voting_period_id
      };

      const response = await fetch(
        `${API_BASE}/hierarchical-voting/peer-vote/${selectedCandidate.voting_period_id}/${selectedCandidate.candidate_employee_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': accessToken
          },
          body: JSON.stringify(voteData)
        }
      );

      if (response.ok) {
        toast.success('Your vote has been submitted successfully!');
        setVotingOpen(false);
        setSelectedCandidate(null);
        setActiveStep(0);
        resetVotes();
        fetchEligibleCandidates(); // Refresh to update voting status
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to submit vote');
      }
    } catch (error) {
      toast.error('Error submitting vote');
    } finally {
      setLoading(false);
    }
  };

  const resetVotes = () => {
    setVotes({
      dedication: 1,
      quality_of_work: 1,
      collaboration_team_work: 1,
      independence: 1,
      customer_service: 1,
      time_management: 1,
      office_attire_dress_code: 1,
      flexibility: 1
    });
  };

  const calculateTotalScore = () => {
    return Object.values(votes).reduce((sum, score) => sum + score, 0);
  };

  const handleVoteChange = (criterion, value) => {
    setVotes(prev => ({
      ...prev,
      [criterion]: parseInt(value)
    }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const columns = [
    {
      accessorKey: 'candidate_first_name',
      header: 'First Name',
      size: 120,
    },
    {
      accessorKey: 'candidate_last_name',
      header: 'Last Name',
      size: 120,
    },
    {
      accessorKey: 'candidate_position',
      header: 'Position',
      size: 200,
    },
    {
      accessorKey: 'candidate_department',
      header: 'Department',
      size: 150,
    },
    {
      accessorKey: 'total_peer_votes_received',
      header: 'Votes Received',
      size: 100,
    },
    {
      accessorKey: 'total_eligible_peer_voters',
      header: 'Eligible Voters',
      size: 100,
    },
    {
      accessorKey: 'peer_voting_percentage',
      header: 'Voting %',
      size: 100,
      Cell: ({ cell }) => `${cell.getValue()?.toFixed(1) || 0}%`,
    },
    {
      accessorKey: 'has_voted',
      header: 'Your Vote Status',
      size: 120,
      Cell: ({ row }) => {
        const hasVoted = row.original.peer_votes?.some(
          vote => vote.voter_employee_id === userInfo?.employee_id
        );
        return (
          <Chip
            label={hasVoted ? 'Voted' : 'Not Voted'}
            color={hasVoted ? 'success' : 'warning'}
            size="small"
          />
        );
      },
    }
  ];

  const steps = [
    'Candidate Information',
    'Evaluation Criteria',
    'Review & Submit'
  ];

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Peer Voting
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        You can vote for colleagues in your department. Each criterion is rated from 1 (Poor) to 5 (Excellent).
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Eligible Candidates for Peer Voting
          </Typography>

          <MaterialReactTable
            columns={columns}
            data={candidates}
            enableRowActions
            renderRowActions={({ row }) => {
              const hasVoted = row.original.peer_votes?.some(
                vote => vote.voter_employee_id === userInfo?.employee_id
              );

              return (
                <Button
                  size="small"
                  variant="contained"
                  disabled={hasVoted || loading}
                  onClick={() => {
                    setSelectedCandidate(row.original);
                    setVotingOpen(true);
                    setActiveStep(0);
                  }}
                >
                  {hasVoted ? 'Already Voted' : 'Vote'}
                </Button>
              );
            }}
            state={{ isLoading: loading }}
            muiTablePaginationProps={{
              rowsPerPageOptions: [5, 10, 20],
              showFirstButton: false,
              showLastButton: false,
            }}
          />
        </CardContent>
      </Card>

      {/* Voting Dialog */}
      <Dialog
        open={votingOpen}
        onClose={() => setVotingOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Peer Evaluation - {selectedCandidate?.candidate_first_name} {selectedCandidate?.candidate_last_name}
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: Candidate Information */}
            <Step>
              <StepLabel>Candidate Information</StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {selectedCandidate?.candidate_first_name} {selectedCandidate?.candidate_last_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Position
                      </Typography>
                      <Typography variant="body1">
                        {selectedCandidate?.candidate_position}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Department
                      </Typography>
                      <Typography variant="body1">
                        {selectedCandidate?.candidate_department}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Employee ID
                      </Typography>
                      <Typography variant="body1">
                        {selectedCandidate?.candidate_employee_id}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                <Box>
                  <Button variant="contained" onClick={handleNext}>
                    Start Evaluation
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: Evaluation Criteria */}
            <Step>
              <StepLabel>Evaluation Criteria</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  {evaluationCriteria.map((criterion, index) => (
                    <Grid item xs={12} key={criterion.key}>
                      <Paper sx={{ p: 2 }}>
                        <FormControl component="fieldset" fullWidth>
                          <FormLabel component="legend">
                            <Typography variant="subtitle1" fontWeight="bold">
                              {criterion.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {criterion.description}
                            </Typography>
                          </FormLabel>
                          <RadioGroup
                            row
                            value={votes[criterion.key]}
                            onChange={(e) => handleVoteChange(criterion.key, e.target.value)}
                            sx={{ mt: 1 }}
                          >
                            {[1, 2, 3, 4, 5].map((score) => (
                              <FormControlLabel
                                key={score}
                                value={score}
                                control={<Radio />}
                                label={
                                  <Box textAlign="center">
                                    <Typography variant="body2">{score}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {score === 1 ? 'Poor' :
                                       score === 2 ? 'Fair' :
                                       score === 3 ? 'Good' :
                                       score === 4 ? 'Very Good' : 'Excellent'}
                                    </Typography>
                                  </Box>
                                }
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button variant="contained" onClick={handleNext}>
                    Review
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: Review & Submit */}
            <Step>
              <StepLabel>Review & Submit</StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Evaluation Summary
                  </Typography>
                  <Grid container spacing={2}>
                    {evaluationCriteria.map((criterion) => (
                      <Grid item xs={6} key={criterion.key}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            {criterion.label}:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {votes[criterion.key]}/5
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="h6">
                          Total Score:
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {calculateTotalScore()}/40
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
                <Box>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={submitPeerVote}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Submit Vote'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setVotingOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default PeerVoting;