import React, { useState, useMemo, useEffect } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  Tabs,
  Tab,
  Chip,
  Alert,
  IconButton,
  Paper,
  LinearProgress,
  Fade,
  Slide,
  Grow,
  Zoom,
  Skeleton,
  Avatar,
  Badge,
  Tooltip,
  alpha,
  useTheme,
  ThemeProvider,
  createTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  StarBorder as StarIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  AutoAwesome as AutoAwesomeIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

// Enhanced Modern Theme
const modernTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#EC4899',
      light: '#F472B6',
      dark: '#DB2777',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          padding: '8px',
        },
      },
    },
  },
});

// Animated Stats Card Component
const StatsCard = ({ title, value, subtitle, color, icon }) => (
  <Grow in timeout={800}>
    <Paper
      elevation={0}
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(color, 0.2)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: alpha(color, 0.15), color: color, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: color, mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  </Grow>
);

// Main Quota Selection Component
const QuotaSelection = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    chief_id: '',
    quota_limit: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch chiefs for dropdown
  const { data: chiefsResponse } = useQuery({
    queryKey: ['chiefs'],
    queryFn: async () => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/quota/chiefs`,
        {
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch chiefs');
      return response.json();
    },
  });

  const chiefs = chiefsResponse?.data || [];

  // Fetch quota allocations
  const { data: quotaResponse, isLoading, error } = useQuery({
    queryKey: ['quota-allocations', searchTerm],
    queryFn: async () => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/quota/allocations?search=${searchTerm}`,
        {
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch quota allocations');
      return response.json();
    },
  });

  const quotaAllocations = quotaResponse?.data || [];
  const summary = quotaResponse?.summary || {};
  // Quotas are set per fiscal year; this page edits the current year's
  const fiscalYear = quotaResponse?.fiscal_year;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const accessToken = localStorage.getItem('accessToken');
      const url = editingQuota
        ? `${API_BASE}/admin/quota/allocations/${editingQuota._id}`
        : `${API_BASE}/admin/quota/allocations`;

      const response = await fetch(url, {
        method: editingQuota ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save quota allocation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Quota ${editingQuota ? 'updated' : 'allocated'} successfully! 🎉`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setOpen(false);
      setEditingQuota(null);
      setFormData({ chief_id: '', quota_limit: '', description: '' });
      queryClient.invalidateQueries(['quota-allocations']);
    },
    onError: (error) => {
      toast.error(error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/quota/allocations/${id}`,
        {
          method: 'DELETE',
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to delete quota allocation');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Quota allocation deleted successfully! 🗑️', {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries(['quota-allocations']);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (quota) => {
    setEditingQuota(quota);
    setFormData({
      chief_id: quota.chief_id._id,
      quota_limit: quota.quota_limit.toString(),
      description: quota.description || ''
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!formData.chief_id || !formData.quota_limit) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseInt(formData.quota_limit) <= 0) {
      toast.error('Quota limit must be greater than 0');
      return;
    }

    saveMutation.mutate(formData);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'chief_id.name',
      header: 'Chief Name',
      size: 200,
      Cell: ({ cell, row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), color: theme.palette.primary.main, width: 40, height: 40 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight={600}>
              {cell.getValue()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {row.original.chief_id.employee_id}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      accessorKey: 'quota_limit',
      header: 'Quota Limit',
      size: 120,
      Cell: ({ cell }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            badgeContent={cell.getValue()}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: theme.palette.success.main,
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 700,
                minWidth: 32,
                height: 24,
                borderRadius: 2,
              }
            }}
          >
            <GroupsIcon sx={{ color: theme.palette.success.main, fontSize: 28 }} />
          </Badge>
        </Box>
      ),
    },
    {
      accessorKey: 'current_allocation',
      header: 'Current Staff',
      size: 120,
      Cell: ({ cell, row }) => {
        const current = cell.getValue() || 0;
        const limit = row.original.quota_limit;
        const percentage = (current / limit) * 100;
        const color = percentage >= 80 ? theme.palette.error.main :
                     percentage >= 60 ? theme.palette.warning.main :
                     theme.palette.success.main;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              sx={{
                width: 60,
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(color, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: color,
                }
              }}
            />
            <Typography variant="body2" fontWeight={600} color={color}>
              {current}/{limit}
            </Typography>
          </Box>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 250,
      Cell: ({ cell }) => (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {cell.getValue() || 'No description provided'}
        </Typography>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      Cell: ({ row }) => {
        const current = row.original.current_allocation || 0;
        const limit = row.original.quota_limit;
        const percentage = (current / limit) * 100;

        let status = 'Available';
        let color = theme.palette.success.main;

        if (percentage >= 100) {
          status = 'Full';
          color = theme.palette.error.main;
        } else if (percentage >= 80) {
          status = 'Near Full';
          color = theme.palette.warning.main;
        }

        return (
          <Chip
            label={status}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              border: `1px solid ${alpha(color, 0.3)}`,
              fontWeight: 600,
            }}
          />
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 120,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Quota" placement="top" arrow>
            <IconButton
              size="small"
              onClick={() => handleEdit(row.original)}
              sx={{
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s',
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Quota" placement="top" arrow>
            <IconButton
              size="small"
              onClick={() => deleteMutation.mutate(row.original._id)}
              disabled={deleteMutation.isPending}
              sx={{
                color: theme.palette.error.main,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.2),
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s',
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [deleteMutation, theme]);

  const table = useMaterialReactTable({
    columns,
    data: quotaAllocations,
    enableColumnFilterModes: true,
    enableGlobalFilter: false,
    enableRowSelection: false,
    enableRowActions: false,
    enableTopToolbar: false,
    enableBottomToolbar: true,
    muiTableContainerProps: {
      sx: {
        minHeight: '400px',
        '& .MuiTableRow-root:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        fontWeight: 700,
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
    },
    state: {
      isLoading,
      showAlertBanner: !!error,
    },
  });

  return (
    <Box sx={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
      p: { xs: 2, sm: 3, md: 4 },
    }}>
      {/* Enhanced Header */}
      <Fade in timeout={300}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Avatar sx={{
              width: 64,
              height: 64,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}>
              <PeopleIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 0.5,
                }}
              >
                Quota Selection & Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage staff allocation quotas for registered chiefs
                {fiscalYear ? ` in fiscal year ${fiscalYear.name}` : ''}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Enhanced Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <StatsCard
            title="Total Quotas"
            value={summary.total_quotas || 0}
            subtitle="Active allocations"
            color={theme.palette.primary.main}
            icon={<AssignmentIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatsCard
            title="Total Limit"
            value={summary.total_limit || 0}
            subtitle="Staff positions"
            color={theme.palette.success.main}
            icon={<GroupsIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatsCard
            title="Current Staff"
            value={summary.current_staff || 0}
            subtitle="Allocated positions"
            color={theme.palette.warning.main}
            icon={<PersonIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatsCard
            title="Available"
            value={(summary.total_limit || 0) - (summary.current_staff || 0)}
            subtitle="Open positions"
            color={theme.palette.secondary.main}
            icon={<TrophyIcon />}
          />
        </Grid>
      </Grid>

      {/* Control Section */}
      <Slide direction="up" in timeout={500}>
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            overflow: 'visible',
            background: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), color: theme.palette.primary.main }}>
                  <SearchIcon />
                </Avatar>
                <TextField
                  placeholder="Search by chief name, employee ID, or description..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Refresh Data" placement="top" arrow>
                  <IconButton
                    onClick={() => queryClient.invalidateQueries(['quota-allocations'])}
                    sx={{
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        transform: 'rotate(180deg)',
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpen(true)}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    color: 'white',
                    px: 3,
                    py: 1.5,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                    },
                  }}
                >
                  Allocate Quota
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Slide>

      {/* Error Alert */}
      {error && (
        <Slide direction="down" in mountOnEnter unmountOnExit>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: 28,
              }
            }}
          >
            {error.message}
          </Alert>
        </Slide>
      )}

      {/* Enhanced Table */}
      {isLoading ? (
        <Box sx={{ p: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={60}
              sx={{ mb: 2, borderRadius: 2 }}
              animation="wave"
            />
          ))}
        </Box>
      ) : (
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <MaterialReactTable table={table} />
          </Paper>
        </Fade>
      )}

      {/* Enhanced Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            overflow: 'visible',
          }
        }}
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          pb: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), color: theme.palette.primary.main }}>
              {editingQuota ? <EditIcon /> : <AddIcon />}
            </Avatar>
            <Typography variant="h6">
              {editingQuota ? 'Edit Quota Allocation' : 'Create New Quota Allocation'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Autocomplete
              options={chiefs}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={chiefs.find(chief => chief._id === formData.chief_id) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, chief_id: newValue?._id || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Chief"
                  required
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    sx: {
                      borderRadius: 2,
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar sx={{ mr: 2, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.employee_id}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
            <TextField
              label="Quota Limit"
              type="number"
              value={formData.quota_limit}
              onChange={(e) => setFormData({ ...formData, quota_limit: e.target.value })}
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              required
              helperText="Maximum number of staff members that can be allocated"
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                }
              }}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Provide additional details about this quota allocation..."
              InputProps={{
                sx: {
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{
          p: 3,
          background: alpha(theme.palette.action.hover, 0.03),
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Button
            onClick={() => setOpen(false)}
            startIcon={<CancelIcon />}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.action.hover, 0.1),
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saveMutation.isPending}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              }
            }}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Box>
  );
};

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

// Wrap component with Providers
const QuotaSelectionWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={modernTheme}>
      <QuotaSelection />
    </ThemeProvider>
  </QueryClientProvider>
);

export default QuotaSelectionWithProviders;