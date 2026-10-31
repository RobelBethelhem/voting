import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  ListItemButton,
} from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  keepPreviousData,
} from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { API_BASE } from 'src/api/base';

const HierarchyManagement = () => {
  const [selectedChief, setSelectedChief] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({});

  // Fetch all data from role-specific endpoints
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/departments`);
      const json = await response.json();
      return json.data || [];
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/managers`);
      const json = await response.json();
      return json.data || [];
    },
  });

  const { data: directors = [] } = useQuery({
    queryKey: ['directors'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/directors`);
      const json = await response.json();
      return json.data || [];
    },
  });

  const { data: chiefs = [] } = useQuery({
    queryKey: ['chiefs'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/chiefs`);
      const json = await response.json();
      return json.data || [];
    },
  });

  const isLoading = false;
  const refetch = () => {
    // Will be handled by React Query's automatic refetch
  };

  // Combine all users by level
  const usersByLevel = useMemo(() => {
    return {
      chiefs: chiefs || [],
      directors: directors || [],
      managers: managers || [],
      professionals: [], // We don't have professionals in this system yet
    };
  }, [chiefs, directors, managers]);

  // Build hierarchy tree for selected chief
  const selectedChiefHierarchy = useMemo(() => {
    if (!selectedChief) return null;

    const chief = usersByLevel.chiefs.find(c => c.employee_id === selectedChief);
    if (!chief) return null;

    const chiefNode = {
      ...chief,
      directors: [],
    };

    // Find directors under this chief
    usersByLevel.directors.forEach(director => {
      if (director.chief_id === chief.employee_id) {
        const directorNode = {
          ...director,
          managers: [],
        };

        // Find managers under this director
        usersByLevel.managers.forEach(manager => {
          if (manager.director_id === director.employee_id) {
            const managerNode = {
              ...manager,
              departments: [],
            };

            // Find departments under this manager
            departments.forEach(department => {
              if (department.manager_id === manager.employee_id) {
                managerNode.departments.push(department);
              }
            });

            directorNode.managers.push(managerNode);
          }
        });

        chiefNode.directors.push(directorNode);
      }
    });

    // Auto-expand the chief node
    setExpandedNodes(prev => ({ ...prev, 'chief-root': true }));

    return chiefNode;
  }, [selectedChief, usersByLevel, departments]);

  // Find unassigned users
  const unassignedUsers = useMemo(() => {
    const unassigned = {
      directors: usersByLevel.directors.filter(d => !d.chief_id || d.chief_id === ''),
      managers: usersByLevel.managers.filter(m => !m.director_id || m.director_id === ''),
      departments: departments.filter(d => !d.manager_id || d.manager_id === ''),
    };

    return unassigned;
  }, [usersByLevel, departments]);

  const handleNodeToggle = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const getIcon = (nodeType) => {
    switch (nodeType) {
      case 'chief': return <PersonIcon color="primary" />;
      case 'director': return <GroupIcon color="secondary" />;
      case 'manager': return <PersonIcon color="info" />;
      case 'department': return <BusinessIcon color="success" />;
      default: return <AccountTreeIcon />;
    }
  };

  const renderTreeNode = (node, type, nodeId, level = 0) => {
    const hasChildren = (
      (type === 'chief' && node.directors?.length > 0) ||
      (type === 'director' && node.managers?.length > 0) ||
      (type === 'manager' && node.departments?.length > 0)
    );

    const isExpanded = expandedNodes[nodeId];

    const renderNodeContent = (node, nodeType) => {
      if (nodeType === 'department') {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            {getIcon(nodeType)}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {node.department_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Code: {node.department_code}
              </Typography>
            </Box>
          </Box>
        );
      }

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          {getIcon(nodeType)}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {node.first_name} {node.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {node.employee_id} - {node.position}
            </Typography>
          </Box>
          <Chip
            label={nodeType.toUpperCase()}
            size="small"
            color={
              nodeType === 'chief' ? 'primary' :
              nodeType === 'director' ? 'secondary' :
              nodeType === 'manager' ? 'info' : 'default'
            }
          />
        </Box>
      );
    };

    return (
      <Box key={nodeId} sx={{ ml: level * 3 }}>
        <ListItemButton
          onClick={() => hasChildren && handleNodeToggle(nodeId)}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {hasChildren ? (
            isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />
          ) : (
            <Box sx={{ width: 24 }} />
          )}
          {renderNodeContent(node, type)}
        </ListItemButton>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box>
              {/* Render directors under chief */}
              {type === 'chief' && node.directors?.map((director, idx) =>
                renderTreeNode(director, 'director', `${nodeId}-dir-${idx}`, level + 1)
              )}

              {/* Render managers under director */}
              {type === 'director' && node.managers?.map((manager, idx) =>
                renderTreeNode(manager, 'manager', `${nodeId}-mgr-${idx}`, level + 1)
              )}

              {/* Render departments under manager */}
              {type === 'manager' && node.departments?.map((department, idx) =>
                renderTreeNode(department, 'department', `${nodeId}-dept-${idx}`, level + 1)
              )}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  const renderUnassignedUsers = () => {
    const hasUnassigned = unassignedUsers.directors.length > 0 ||
                         unassignedUsers.managers.length > 0 ||
                         unassignedUsers.departments.length > 0;

    if (!hasUnassigned) {
      return (
        <Alert severity="success">
          All users and departments are properly assigned in the hierarchy!
        </Alert>
      );
    }

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Unassigned Items
        </Typography>

        {unassignedUsers.directors.length > 0 && (
          <>
            <Typography variant="subtitle2" color="error">Directors without Chief:</Typography>
            <List dense>
              {unassignedUsers.directors.map(director => (
                <ListItem key={director.employee_id}>
                  <ListItemText
                    primary={`${director.first_name} ${director.last_name} (${director.employee_id})`}
                    secondary={director.position}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {unassignedUsers.managers.length > 0 && (
          <>
            <Typography variant="subtitle2" color="error">Managers without Director:</Typography>
            <List dense>
              {unassignedUsers.managers.map(manager => (
                <ListItem key={manager.employee_id}>
                  <ListItemText
                    primary={`${manager.first_name} ${manager.last_name} (${manager.employee_id})`}
                    secondary={manager.position}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {unassignedUsers.departments.length > 0 && (
          <>
            <Typography variant="subtitle2" color="error">Departments without Manager:</Typography>
            <List dense>
              {unassignedUsers.departments.map(department => (
                <ListItem key={department._id}>
                  <ListItemText
                    primary={`${department.department_name} (${department.department_code})`}
                    secondary={department.description}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Hierarchy Management
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Chief Selection and Hierarchy Tree */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Organizational Hierarchy"
              subheader="Select a Chief to view their complete hierarchy structure"
            />
            <CardContent>
              {/* Chief Selection Dropdown */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Chief</InputLabel>
                <Select
                  value={selectedChief}
                  label="Select Chief"
                  onChange={(e) => setSelectedChief(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Choose a Chief to view hierarchy</em>
                  </MenuItem>
                  {usersByLevel.chiefs.map(chief => (
                    <MenuItem key={chief.employee_id} value={chief.employee_id}>
                      {chief.first_name} {chief.last_name} ({chief.employee_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Hierarchy Tree */}
              {selectedChief && selectedChiefHierarchy ? (
                <Paper sx={{ mt: 2, p: 2, maxHeight: '600px', overflowY: 'auto' }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Organizational Structure
                  </Typography>
                  {renderTreeNode(selectedChiefHierarchy, 'chief', 'chief-root', 0)}
                </Paper>
              ) : selectedChief ? (
                <Alert severity="info">
                  No hierarchy data found for the selected Chief.
                </Alert>
              ) : (
                <Alert severity="info">
                  Please select a Chief to view the organizational hierarchy.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary and Unassigned Items */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title="Hierarchy Summary" />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Chiefs"
                    secondary={usersByLevel.chiefs.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Directors"
                    secondary={usersByLevel.directors.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Managers"
                    secondary={usersByLevel.managers.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Departments"
                    secondary={departments.length}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Assignment Status" />
            <CardContent>
              {renderUnassignedUsers()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
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

const queryClient = new QueryClient();

const HierarchyManagementWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <HierarchyManagement />
  </QueryClientProvider>
);

export default HierarchyManagementWithProviders;