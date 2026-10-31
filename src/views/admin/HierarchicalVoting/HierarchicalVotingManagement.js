import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { MaterialReactTable } from 'material-react-table';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const HierarchicalVotingManagement = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState('1');

  // Voting Periods
  const [votingPeriods, setVotingPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Create Period Form
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    period_name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_departments: [],
    target_functions: [],
    quota_per_function: 1
  });

  // Voting Results
  const [votingResults, setVotingResults] = useState([]);

  const departments = [
    'Credit Appraisal',
    'Credit Portfolio Mgt.',
    'Human Resources',
    'IT Department',
    'Finance',
    'Operations'
  ];

  const functions = [
    'Chief Credit',
    'Chief Operations',
    'Chief Finance',
    'Chief HR',
    'Chief IT'
  ];

  useEffect(() => {
    fetchVotingPeriods();
  }, []);

  const fetchVotingPeriods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/hierarchical-voting/voting-periods`, {
        headers: {
          'x-access-token': accessToken
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVotingPeriods(data.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch voting periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchVotingResults = async (periodId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/hierarchical-voting/results/${periodId}`, {
        headers: {
          'x-access-token': accessToken
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVotingResults(data.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch voting results');
    } finally {
      setLoading(false);
    }
  };

  const createVotingPeriod = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/hierarchical-voting/voting-period`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify(newPeriod)
      });

      if (response.ok) {
        toast.success('Voting period created successfully');
        setCreatePeriodOpen(false);
        setNewPeriod({
          period_name: '',
          description: '',
          start_date: '',
          end_date: '',
          target_departments: [],
          target_functions: [],
          quota_per_function: 1
        });
        fetchVotingPeriods();
      } else {
        toast.error('Failed to create voting period');
      }
    } catch (error) {
      toast.error('Error creating voting period');
    } finally {
      setLoading(false);
    }
  };

  const initializeCandidates = async (periodId, candidateIds) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/hierarchical-voting/initialize-candidates/${periodId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({ candidate_ids: candidateIds })
      });

      if (response.ok) {
        toast.success('Candidates initialized successfully');
        if (selectedPeriod?.period_id === periodId) {
          fetchVotingResults(periodId);
        }
      } else {
        toast.error('Failed to initialize candidates');
      }
    } catch (error) {
      toast.error('Error initializing candidates');
    } finally {
      setLoading(false);
    }
  };

  const periodColumns = useMemo(() => [
    {
      accessorKey: 'period_name',
      header: 'Period Name',
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      Cell: ({ cell }) => (
        <Chip
          label={cell.getValue()}
          color={
            cell.getValue() === 'active' ? 'success' :
            cell.getValue() === 'completed' ? 'info' :
            cell.getValue() === 'draft' ? 'warning' : 'default'
          }
          size="small"
        />
      ),
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      size: 130,
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      size: 130,
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
    },
    {
      accessorKey: 'total_candidates',
      header: 'Candidates',
      size: 100,
    },
    {
      accessorKey: 'quota_per_function',
      header: 'Quota',
      size: 80,
    }
  ], []);

  const resultsColumns = useMemo(() => [
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
      accessorKey: 'is_managerial_position',
      header: 'Type',
      size: 100,
      Cell: ({ cell }) => (
        <Chip
          label={cell.getValue() ? 'Managerial' : 'Non-Managerial'}
          color={cell.getValue() ? 'primary' : 'secondary'}
          size="small"
        />
      ),
    },
    {
      accessorKey: 'performance_weighted_score',
      header: 'Performance (50%)',
      size: 130,
      Cell: ({ cell }) => cell.getValue()?.toFixed(2) || '0.00',
    },
    {
      accessorKey: 'total_peer_votes_received',
      header: 'Peer Votes',
      size: 100,
    },
    {
      accessorKey: 'peer_voting_percentage',
      header: 'Vote %',
      size: 80,
      Cell: ({ cell }) => `${cell.getValue()?.toFixed(1) || 0}%`,
    },
    {
      accessorKey: 'total_weighted_result',
      header: 'Final Score',
      size: 100,
      Cell: ({ cell }) => (
        <Typography
          variant="body2"
          fontWeight="bold"
          color={cell.getValue() >= 80 ? 'success.main' : cell.getValue() >= 60 ? 'warning.main' : 'error.main'}
        >
          {cell.getValue()?.toFixed(2) || '0.00'}
        </Typography>
      ),
    },
    {
      accessorKey: 'chief_approval_status',
      header: 'Chief Status',
      size: 120,
      Cell: ({ cell }) => (
        <Chip
          label={cell.getValue() || 'pending'}
          color={
            cell.getValue() === 'approved' ? 'success' :
            cell.getValue() === 'rejected' ? 'error' : 'warning'
          }
          size="small"
        />
      ),
    }
  ], []);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Hierarchical Voting Management
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Voting Periods" value="1" />
              <Tab label="Voting Results" value="2" />
              <Tab label="Chief Approvals" value="3" />
            </Tabs>
          </Box>

          {/* Voting Periods Tab */}
          {tabValue === '1' && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Voting Periods</Typography>
                <Button
                  variant="contained"
                  onClick={() => setCreatePeriodOpen(true)}
                  disabled={loading}
                >
                  Create New Period
                </Button>
              </Box>

              <MaterialReactTable
                columns={periodColumns}
                data={votingPeriods}
                enableRowActions
                renderRowActions={({ row }) => (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedPeriod(row.original);
                        fetchVotingResults(row.original.period_id);
                        setTabValue('2');
                      }}
                    >
                      View Results
                    </Button>
                  </Box>
                )}
                state={{ isLoading: loading }}
                muiTablePaginationProps={{
                  rowsPerPageOptions: [5, 10, 20],
                  showFirstButton: false,
                  showLastButton: false,
                }}
              />
            </Box>
          )}

          {/* Voting Results Tab */}
          {tabValue === '2' && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Voting Results {selectedPeriod && `- ${selectedPeriod.period_name}`}
                </Typography>
                {selectedPeriod && (
                  <Typography variant="body2" color="text.secondary">
                    Period: {new Date(selectedPeriod.start_date).toLocaleDateString()} - {new Date(selectedPeriod.end_date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              {selectedPeriod ? (
                <MaterialReactTable
                  columns={resultsColumns}
                  data={votingResults}
                  enableRowActions
                  renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Navigate to detailed view
                          console.log('View details for:', row.original);
                        }}
                      >
                        Details
                      </Button>
                    </Box>
                  )}
                  state={{ isLoading: loading }}
                  muiTablePaginationProps={{
                    rowsPerPageOptions: [10, 20, 50],
                    showFirstButton: false,
                    showLastButton: false,
                  }}
                />
              ) : (
                <Alert severity="info">
                  Please select a voting period from the Voting Periods tab to view results.
                </Alert>
              )}
            </Box>
          )}

          {/* Chief Approvals Tab */}
          {tabValue === '3' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Chief Level Approvals
              </Typography>

              {selectedPeriod ? (
                <MaterialReactTable
                  columns={resultsColumns.filter(col =>
                    ['candidate_first_name', 'candidate_last_name', 'candidate_position',
                     'total_weighted_result', 'chief_approval_status'].includes(col.accessorKey)
                  )}
                  data={votingResults.filter(result => result.chief_approval_status === 'pending')}
                  enableRowActions
                  renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => {
                          // Handle approval
                          console.log('Approve:', row.original);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => {
                          // Handle rejection
                          console.log('Reject:', row.original);
                        }}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                  state={{ isLoading: loading }}
                />
              ) : (
                <Alert severity="info">
                  Please select a voting period to view pending approvals.
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <Dialog open={createPeriodOpen} onClose={() => setCreatePeriodOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Voting Period</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Period Name"
                value={newPeriod.period_name}
                onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newPeriod.description}
                onChange={(e) => setNewPeriod({ ...newPeriod, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={newPeriod.start_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={newPeriod.end_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Target Departments</InputLabel>
                <Select
                  multiple
                  value={newPeriod.target_departments}
                  onChange={(e) => setNewPeriod({ ...newPeriod, target_departments: e.target.value })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Quota per Function"
                type="number"
                value={newPeriod.quota_per_function}
                onChange={(e) => setNewPeriod({ ...newPeriod, quota_per_function: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePeriodOpen(false)}>Cancel</Button>
          <Button onClick={createVotingPeriod} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default HierarchicalVotingManagement;