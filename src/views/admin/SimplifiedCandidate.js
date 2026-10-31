import React, { useMemo, useState, useEffect } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Slider,
  Paper,
  Chip,
  Grid,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { API_BASE } from 'src/api/base';

const SimplifiedCandidate = () => {
  const [qualificationSettings, setQualificationSettings] = useState({
    min_performance_score: 70
  });
  const queryClient = useQueryClient();

  // Fetch qualification settings and statistics
  const { data: qualificationData, refetch: refetchQualification, isError: isQualificationError } = useQuery({
    queryKey: ['qualificationSettings'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/qualification-settings`);
      if (!response.ok) throw new Error('Failed to fetch qualification settings');
      return response.json();
    },
    retry: 1, // Only retry once
    retryOnMount: false, // Don't retry on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch candidates
  const { data: candidatesData = [], refetch, isFetching, isError, error } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/getCandidate`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const result = await response.json();
      return result.data || [];
    },
  });

  // Populate candidates mutation
  const populateCandidatesMutation = useMutation({
    mutationFn: async (qualificationCriteria) => {
      const response = await fetch(`${API_BASE}/admin/populate-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualificationCriteria),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to populate candidates');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      refetch(); // Refresh candidates table
      refetchQualification(); // Refresh statistics
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    },
  });

  // Update qualification settings when data is fetched
  useEffect(() => {
    if (qualificationData?.current_criteria) {
      setQualificationSettings({
        min_performance_score: qualificationData.current_criteria.min_performance_score || 70
      });
    }
  }, [qualificationData]);

  const handlePopulateCandidates = () => {
    populateCandidatesMutation.mutate({
      min_performance_score: qualificationSettings.min_performance_score
    });
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'employee_id',
      header: 'Employee ID',
      size: 120,
    },
    {
      accessorKey: 'first_name',
      header: 'First Name',
      size: 150,
    },
    {
      accessorKey: 'last_name',
      header: 'Last Name',
      size: 150,
    },
    {
      accessorKey: 'department',
      header: 'Department',
      size: 200,
    },
    {
      accessorKey: 'position',
      header: 'Position',
      size: 180,
    },
    {
      accessorKey: 'performance_appraisal_score',
      header: 'Performance Score',
      size: 150,
      Cell: ({ cell }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ minWidth: 35 }}>
            {cell.getValue()}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={cell.getValue()}
            sx={{
              flexGrow: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#f0f0f0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: cell.getValue() >= 80 ? '#4caf50' :
                               cell.getValue() >= 70 ? '#ff9800' : '#f44336'
              }
            }}
          />
        </Box>
      ),
    },
    {
      accessorKey: 'manager_id',
      header: 'Manager ID',
      size: 120,
    },
  ], []);

  const table = useMaterialReactTable({
    columns,
    data: candidatesData,
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableGrouping: true,
    enableColumnPinning: true,
    enableFacetedValues: true,
    enableRowSelection: false,
    enableRowActions: false,
    enableTopToolbar: true,
    enableBottomToolbar: true,
    muiSearchTextFieldProps: {
      size: 'small',
      variant: 'outlined',
    },
    muiPaginationProps: {
      color: 'primary',
      rowsPerPageOptions: [10, 20, 50, 100],
      shape: 'rounded',
      variant: 'outlined',
    },
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    muiTableContainerProps: {
      sx: {
        minHeight: '500px',
      },
    },
    muiTableProps: {
      sx: {
        caption: {
          captionSide: 'top',
        },
      },
    },
    state: {
      isLoading: isFetching,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
  });

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Typography variant="h4" component="h1" gutterBottom>
            Candidate Management
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Candidates are automatically populated from employees based on qualification criteria.
            Use the Qualification panel to set criteria and populate candidates.
          </Typography>

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading candidates: {error?.message}
            </Alert>
          )}

          <MaterialReactTable table={table} />
        </Grid>

        {/* Qualification Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                📋 Qualification Criteria
              </Typography>

              {/* Server Restart Notice */}
              {isQualificationError && (
                <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  ⚠️ Qualification settings unavailable. Restart backend server to load new endpoints.
                </Alert>
              )}

              {/* Current Statistics */}
              {qualificationData && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Current Status
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Total Employees:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {qualificationData.statistics?.total_employees || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Current Candidates:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {qualificationData.statistics?.current_candidates || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Performance Score Slider */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Minimum Performance Score: {qualificationSettings.min_performance_score.toFixed(1)}
                </Typography>
                <Slider
                  value={qualificationSettings.min_performance_score}
                  onChange={(e, newValue) => setQualificationSettings({
                    ...qualificationSettings,
                    min_performance_score: newValue
                  })}
                  min={0}
                  max={100}
                  step={0.5}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 50, label: '50' },
                    { value: 70, label: '70' },
                    { value: 80, label: '80' },
                    { value: 90, label: '90' },
                    { value: 100, label: '100' },
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
              </Box>

              {/* Performance Score Input */}
              <TextField
                label="Exact Score"
                type="number"
                value={qualificationSettings.min_performance_score}
                onChange={(e) => setQualificationSettings({
                  ...qualificationSettings,
                  min_performance_score: parseFloat(e.target.value) || 0
                })}
                inputProps={{
                  min: 0,
                  max: 100,
                  step: 0.1
                }}
                fullWidth
                size="small"
                sx={{ mb: 3 }}
                helperText="Accepts decimal values (e.g., 90.5)"
              />

              {/* Potential Candidates Preview */}
              {qualificationData && (
                <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 Potential Candidates Preview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Score ≥ 60:</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {qualificationData.statistics?.potential_candidates?.count_score_60 || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Score ≥ 70:</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {qualificationData.statistics?.potential_candidates?.count_score_70 || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Score ≥ 80:</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {qualificationData.statistics?.potential_candidates?.count_score_80 || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Score ≥ 90:</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {qualificationData.statistics?.potential_candidates?.count_score_90 || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </CardContent>

            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handlePopulateCandidates}
                disabled={populateCandidatesMutation.isPending}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                {populateCandidatesMutation.isPending ? '⏳ Populating...' : '🚀 Populate Candidates'}
              </Button>
            </CardActions>
          </Card>

          {/* Help Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="info.main">
                💡 How it Works
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Set the minimum performance score requirement
                <br />
                • Click "Populate Candidates" to automatically create candidates from qualified employees
                <br />
                • All active employees are eligible based on performance score
                <br />
                • Previous candidates will be replaced with new ones based on current criteria
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Create QueryClient instance
const queryClient = new QueryClient();

// Wrap component with QueryClientProvider
const SimplifiedCandidateWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <SimplifiedCandidate />
  </QueryClientProvider>
);

export default SimplifiedCandidateWithProviders;