import React, { useState, useMemo } from 'react';
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

// Category Icons Mapping
const CATEGORY_ICONS = {
  managerial_staff: <GroupsIcon />,
  non_managerial_staff: <PersonIcon />,
  peer: <GroupIcon />,
};

const CATEGORIES = [
  { value: 'managerial_staff', label: 'Managerial Staff', color: '#6366F1' },
  { value: 'non_managerial_staff', label: 'Non-Managerial Staff', color: '#EC4899' },
  { value: 'peer', label: 'Peer', color: '#10B981' }
];

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

// Enhanced Criteria Management Component
const CriteriaManagement = ({ category }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    criteria_name: '',
    weight: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch criteria
  const { data: criteriaResponse, isLoading, error } = useQuery({
    queryKey: ['criteria', category, searchTerm],
    queryFn: async () => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/template/criteria/${category}?search=${searchTerm}`,
        {
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch criteria');
      return response.json();
    },
    enabled: !!category,
  });

  const criteria = criteriaResponse?.data || [];
  const summary = criteriaResponse?.summary || {};

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const accessToken = localStorage.getItem('accessToken');
      const url = editingCriteria
        ? `${API_BASE}/admin/template/criteria/${editingCriteria._id}`
        : `${API_BASE}/admin/template/criteria`;

      const response = await fetch(url, {
        method: editingCriteria ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({ ...data, category }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save criteria');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Criteria ${editingCriteria ? 'updated' : 'created'} successfully! 🎉`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setOpen(false);
      setEditingCriteria(null);
      setFormData({ criteria_name: '', weight: '', description: '' });
      queryClient.invalidateQueries(['criteria', category]);
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
        `${API_BASE}/admin/template/criteria/${id}`,
        {
          method: 'DELETE',
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to delete criteria');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Criteria deleted successfully! 🗑️', {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries(['criteria', category]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (criteria) => {
    setEditingCriteria(criteria);
    setFormData({
      criteria_name: criteria.criteria_name,
      weight: criteria.weight.toString(),
      description: criteria.description || ''
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!formData.criteria_name || !formData.weight) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 50) {
      toast.error('Weight must be between 1 and 50');
      return;
    }

    saveMutation.mutate(formData);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'criteria_name',
      header: 'Criteria Name',
      size: 200,
      Cell: ({ cell }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
          <Typography variant="body1" fontWeight={600}>
            {cell.getValue()}
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'weight',
      header: 'Weight',
      size: 120,
      Cell: ({ cell }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={(cell.getValue() / 50) * 100}
            sx={{
              width: 60,
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }
            }}
          />
          <Chip
            label={cell.getValue()}
            size="small"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          />
        </Box>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 300,
      Cell: ({ cell }) => (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {cell.getValue() || 'No description provided'}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 120,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Criteria" placement="top" arrow>
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
          <Tooltip title="Delete Criteria" placement="top" arrow>
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
    data: criteria,
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

  const categoryColor = CATEGORIES.find(c => c.value === category)?.color || theme.palette.primary.main;

  return (
    <Box>
      {/* Enhanced Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: alpha(categoryColor, 0.15), color: categoryColor, width: 48, height: 48 }}>
                  <AssessmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Evaluation Criteria
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {CATEGORIES.find(c => c.value === category)?.label} • Manage performance metrics
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Zoom in timeout={700}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
                disabled={summary.remaining_weight <= 0}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: 'white',
                  px: 3,
                  py: 1.5,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                  '&:disabled': {
                    background: theme.palette.action.disabledBackground,
                  },
                }}
              >
                Add Criteria
              </Button>
            </Zoom>
          </Box>

          {/* Animated Stats Grid */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <StatsCard
                title="Total Weight Used"
                value={`${summary.total_weight || 0}/50`}
                subtitle="Points allocated"
                color={theme.palette.primary.main}
                icon={<TrophyIcon />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatsCard
                title="Remaining Weight"
                value={summary.remaining_weight || 50}
                subtitle={summary.remaining_weight > 0 ? "Points available" : "No points left"}
                color={summary.remaining_weight > 0 ? theme.palette.success.main : theme.palette.error.main}
                icon={<StarIcon />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatsCard
                title="Total Criteria"
                value={summary.criteria_count || 0}
                subtitle="Active criteria"
                color={theme.palette.secondary.main}
                icon={<DashboardIcon />}
              />
            </Grid>
          </Grid>

          {/* Enhanced Progress Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Weight Distribution
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {Math.round((summary.total_weight || 0) * 2)}% Used
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(summary.total_weight || 0) * 2}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
          </Paper>

          {/* Enhanced Search Bar */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              gap: 2,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              transition: 'all 0.3s',
              '&:focus-within': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              }
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
            <TextField
              placeholder="Search criteria..."
              variant="standard"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: '1rem' }
              }}
            />
            <Tooltip title="Refresh Data" placement="top" arrow>
              <IconButton
                onClick={() => queryClient.invalidateQueries(['criteria', category])}
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'rotate(180deg)',
                  },
                  transition: 'all 0.3s',
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      </Fade>

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
          {[1, 2, 3].map((i) => (
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
              {editingCriteria ? <EditIcon /> : <AddIcon />}
            </Avatar>
            <Typography variant="h6">
              {editingCriteria ? 'Edit Criteria' : 'Add New Criteria'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Criteria Name"
              value={formData.criteria_name}
              onChange={(e) => setFormData({ ...formData, criteria_name: e.target.value })}
              fullWidth
              required
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
            <TextField
              label="Weight"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              inputProps={{ min: 1, max: 50, step: 1 }}
              fullWidth
              required
              helperText={`Available weight: ${summary.remaining_weight || 50} points ${editingCriteria ? '(excluding current)' : ''}`}
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
              placeholder="Provide a detailed description of this criteria..."
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
    </Box>
  );
};

// Enhanced Rating Matrix Management Component
const RatingMatrixManagement = ({ category }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    rating_number: '',
    matrix_name: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch rating matrices
  const { data: matricesResponse, isLoading, error } = useQuery({
    queryKey: ['rating-matrix', category, searchTerm],
    queryFn: async () => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/template/rating-matrix/${category}?search=${searchTerm}`,
        {
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch rating matrices');
      return response.json();
    },
    enabled: !!category,
  });

  const matrices = matricesResponse?.data || [];

  // Initialize default matrices
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/template/rating-matrix/initialize/${category}`,
        {
          method: 'POST',
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize matrices');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Default rating matrices initialized successfully! 🚀', {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries(['rating-matrix', category]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const accessToken = localStorage.getItem('accessToken');
      const url = editingMatrix
        ? `${API_BASE}/admin/template/rating-matrix/${editingMatrix._id}`
        : `${API_BASE}/admin/template/rating-matrix`;

      const response = await fetch(url, {
        method: editingMatrix ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({ ...data, category }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save rating matrix');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Rating matrix ${editingMatrix ? 'updated' : 'created'} successfully! ⭐`, {
        position: "top-right",
        autoClose: 3000,
      });
      setOpen(false);
      setEditingMatrix(null);
      setFormData({ rating_number: '', matrix_name: '', description: '' });
      queryClient.invalidateQueries(['rating-matrix', category]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/admin/template/rating-matrix/${id}`,
        {
          method: 'DELETE',
          headers: {
            'x-access-token': accessToken,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to delete rating matrix');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Rating matrix deleted successfully! 🗑️', {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries(['rating-matrix', category]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (matrix) => {
    setEditingMatrix(matrix);
    setFormData({
      rating_number: matrix.rating_number.toString(),
      matrix_name: matrix.matrix_name,
      description: matrix.description
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!formData.rating_number || !formData.matrix_name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveMutation.mutate(formData);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'rating_number',
      header: 'Rating',
      size: 100,
      Cell: ({ cell }) => {
        const rating = cell.getValue();
        const colors = ['#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#10B981'];
        const color = colors[Math.min(Math.floor((rating - 1) / 2), 4)];
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge
              badgeContent={rating}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: color,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 700,
                  minWidth: 32,
                  height: 32,
                  borderRadius: '50%',
                }
              }}
            >
              <StarIcon sx={{ color: color, fontSize: 28 }} />
            </Badge>
          </Box>
        );
      },
    },
    {
      accessorKey: 'matrix_name',
      header: 'Rating Name',
      size: 200,
      Cell: ({ cell }) => (
        <Typography variant="body1" fontWeight={600}>
          {cell.getValue()}
        </Typography>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 350,
      Cell: ({ cell }) => (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {cell.getValue()}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 120,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Rating" placement="top" arrow>
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
          <Tooltip title="Delete Rating" placement="top" arrow>
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
    data: matrices,
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
          backgroundColor: alpha(theme.palette.secondary.main, 0.04),
        },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: alpha(theme.palette.secondary.main, 0.05),
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

  const categoryColor = CATEGORIES.find(c => c.value === category)?.color || theme.palette.secondary.main;

  return (
    <Box>
      {/* Enhanced Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: alpha(categoryColor, 0.15), color: categoryColor, width: 48, height: 48 }}>
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Rating Matrices
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {CATEGORIES.find(c => c.value === category)?.label} • Define performance scales
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {matrices.length === 0 && (
                <Zoom in timeout={600}>
                  <Button
                    variant="outlined"
                    onClick={() => initializeMutation.mutate()}
                    disabled={initializeMutation.isPending}
                    sx={{
                      borderColor: theme.palette.secondary.main,
                      color: theme.palette.secondary.main,
                      '&:hover': {
                        borderColor: theme.palette.secondary.dark,
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      }
                    }}
                  >
                    {initializeMutation.isPending ? 'Initializing...' : 'Initialize Defaults'}
                  </Button>
                </Zoom>
              )}
              <Zoom in timeout={700}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpen(true)}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                    color: 'white',
                    px: 3,
                    py: 1.5,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.primary.dark})`,
                    },
                  }}
                >
                  Add Rating
                </Button>
              </Zoom>
            </Box>
          </Box>

          {/* Rating Scale Visual */}
          {matrices.length > 0 && (
            <Grow in timeout={800}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                  borderRadius: 3,
                  mb: 3,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Performance Scale Overview
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  {matrices.sort((a, b) => a.rating_number - b.rating_number).map((matrix) => {
                    const colors = ['#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#10B981'];
                    const color = colors[Math.min(Math.floor((matrix.rating_number - 1) / 2), 4)];
                    
                    return (
                      <Chip
                        key={matrix._id}
                        label={`${matrix.rating_number} - ${matrix.matrix_name}`}
                        sx={{
                          bgcolor: alpha(color, 0.1),
                          borderColor: color,
                          color: color,
                          border: `1px solid`,
                          fontWeight: 600,
                          py: 2,
                        }}
                      />
                    );
                  })}
                </Box>
              </Paper>
            </Grow>
          )}

          {/* Enhanced Search Bar */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              gap: 2,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              transition: 'all 0.3s',
              '&:focus-within': {
                borderColor: theme.palette.secondary.main,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.1)}`,
              }
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
            <TextField
              placeholder="Search rating matrices..."
              variant="standard"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: '1rem' }
              }}
            />
            <Tooltip title="Refresh Data" placement="top" arrow>
              <IconButton
                onClick={() => queryClient.invalidateQueries(['rating-matrix', category])}
                sx={{
                  color: theme.palette.secondary.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    transform: 'rotate(180deg)',
                  },
                  transition: 'all 0.3s',
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      </Fade>

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
          background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          pb: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.15), color: theme.palette.secondary.main }}>
              {editingMatrix ? <EditIcon /> : <StarIcon />}
            </Avatar>
            <Typography variant="h6">
              {editingMatrix ? 'Edit Rating Matrix' : 'Add New Rating Matrix'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Rating Number"
              type="number"
              value={formData.rating_number}
              onChange={(e) => setFormData({ ...formData, rating_number: e.target.value })}
              inputProps={{ min: 1, max: 10, step: 1 }}
              fullWidth
              required
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                }
              }}
            />
            <TextField
              label="Rating Name"
              value={formData.matrix_name}
              onChange={(e) => setFormData({ ...formData, matrix_name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Excellent, Good, Average..."
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
              required
              placeholder="Describe what this rating level represents..."
              variant="outlined"
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
              background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.primary.dark})`,
              }
            }}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Main Enhanced Template Component
const Template = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);

  const currentCategory = CATEGORIES[activeTab].value;
  const currentCategoryColor = CATEGORIES[activeTab].color;

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
              <DashboardIcon sx={{ fontSize: 32 }} />
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
                Template Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configure evaluation criteria and rating matrices for comprehensive performance assessment
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Enhanced Category Tabs */}
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
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => {
              setActiveTab(newValue);
              setActiveSubTab(0);
            }}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: '4px 4px 0 0',
                background: `linear-gradient(90deg, ${CATEGORIES[activeTab].color}, ${alpha(CATEGORIES[activeTab].color, 0.6)})`,
              },
              '& .MuiTab-root': {
                py: 3,
                fontWeight: 600,
                fontSize: '1rem',
                transition: 'all 0.3s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              },
              '& .Mui-selected': {
                color: CATEGORIES[activeTab].color,
              },
            }}
          >
            {CATEGORIES.map((category, index) => (
              <Tab
                key={category.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {CATEGORY_ICONS[category.value]}
                    <span>{category.label}</span>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Card>
      </Slide>

      {/* Enhanced Sub Navigation */}
      <Slide direction="up" in timeout={600}>
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            background: alpha(currentCategoryColor, 0.04),
            border: `1px solid ${alpha(currentCategoryColor, 0.15)}`,
            boxShadow: 'none',
          }}
        >
          <Tabs
            value={activeSubTab}
            onChange={(_, newValue) => setActiveSubTab(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: currentCategoryColor,
              },
              '& .MuiTab-root': {
                py: 2.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                color: alpha(currentCategoryColor, 0.7),
                transition: 'all 0.3s',
                '&:hover': {
                  color: currentCategoryColor,
                  backgroundColor: alpha(currentCategoryColor, 0.08),
                },
              },
              '& .Mui-selected': {
                color: currentCategoryColor,
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon />
                  <span>Evaluation Criteria</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon />
                  <span>Rating Matrices</span>
                </Box>
              }
            />
          </Tabs>
        </Card>
      </Slide>

      {/* Enhanced Content Area */}
      <Zoom in timeout={700}>
        <Card
          sx={{
            borderRadius: 3,
            overflow: 'visible',
            minHeight: '60vh',
            background: 'white',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {activeSubTab === 0 ? (
              <CriteriaManagement category={currentCategory} />
            ) : (
              <RatingMatrixManagement category={currentCategory} />
            )}
          </CardContent>
        </Card>
      </Zoom>

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
const TemplateWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={modernTheme}>
      <Template />
    </ThemeProvider>
  </QueryClientProvider>
);

export default TemplateWithProviders;