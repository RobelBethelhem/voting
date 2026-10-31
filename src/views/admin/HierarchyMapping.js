import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Button,
  Chip,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { API_BASE } from 'src/api/base';

const fullName = (person) => (person ? `${person.first_name} ${person.last_name}` : 'Not found');

// Change / Remove buttons for one existing mapping
const MappingActions = ({ onChange, onRemove, disabled }) => (
  <Box sx={{ display: 'flex', flexShrink: 0 }}>
    <Tooltip title="Change mapping">
      <span>
        <IconButton size="small" onClick={onChange} disabled={disabled} aria-label="Change mapping">
          <EditIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title="Remove mapping">
      <span>
        <IconButton size="small" color="error" onClick={onRemove} disabled={disabled} aria-label="Remove mapping">
          <LinkOffIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
);

// Shown while an existing mapping is being changed
const ChangingAlert = ({ source, current, targetLabel, onCancel }) => (
  <Alert
    severity="warning"
    action={
      <Button color="inherit" size="small" onClick={onCancel}>
        Cancel
      </Button>
    }
  >
    Changing <strong>{source}</strong> (currently {current}). Pick the new {targetLabel} from the middle list.
  </Alert>
);

// Isolated Search Component to prevent focus loss
const SearchField = React.memo(({ value, onChange, placeholder }) => {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
    />
  );
});

// Isolated components to prevent unnecessary re-renders
const DepartmentManagerMapping = React.memo(({
  filteredDepartmentData,
  filteredManagerData,
  selectedDepartment,
  setSelectedDepartment,
  departmentSearch,
  setDepartmentSearch,
  managerSearch,
  setManagerSearch,
  showConfirmationDialog,
  mapDepartmentToManager,
  managers
}) => {
  const { unassignedDepartments, assignedDepartments } = filteredDepartmentData;
  const changingManager = selectedDepartment?.manager_id
    ? managers.find(m => m.employee_id === selectedDepartment.manager_id)
    : null;

  const chooseManager = (manager) => {
    if (!selectedDepartment) return;
    if (selectedDepartment.manager_id === manager.employee_id) {
      toast.info(`${fullName(manager)} already manages ${selectedDepartment.department_name}`);
      return;
    }
    const changing = Boolean(selectedDepartment.manager_id);
    showConfirmationDialog(
      'Department to Manager',
      selectedDepartment,
      manager,
      () => mapDepartmentToManager.mutate({
        departmentId: selectedDepartment._id,
        managerId: manager.employee_id,
        action: changing ? 'change' : 'map'
      }),
      {
        mode: changing ? 'change' : 'map',
        current: changingManager,
        note: changing
          ? `Employees and candidates in ${selectedDepartment.department_name} who report to ${fullName(changingManager)} (or have no manager) will move to ${fullName(manager)}.`
          : `Employees and candidates in ${selectedDepartment.department_name} with no manager will be assigned to ${fullName(manager)}.`
      }
    );
  };

  const removeMapping = (dept) => {
    const manager = managers.find(m => m.employee_id === dept.manager_id);
    showConfirmationDialog(
      'Department to Manager',
      dept,
      null,
      () => mapDepartmentToManager.mutate({ departmentId: dept._id, managerId: null, action: 'remove' }),
      {
        mode: 'remove',
        current: manager,
        note: `Employees and candidates in ${dept.department_name} who report to ${fullName(manager)} will have no manager until you map the department again.`
      }
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Map each department to one manager. This establishes the foundation of your hierarchy - employees will be assigned to departments and automatically inherit the department's manager.
        </Alert>
      </Grid>

      {selectedDepartment?.manager_id && (
        <Grid item xs={12}>
          <ChangingAlert
            source={selectedDepartment.department_name}
            current={`managed by ${fullName(changingManager)}`}
            targetLabel="manager"
            onCancel={() => setSelectedDepartment(null)}
          />
        </Grid>
      )}

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Unassigned Departments" />
          <CardContent>
            <SearchField
              value={departmentSearch}
              onChange={(e) => setDepartmentSearch(e.target.value)}
              placeholder="Search departments..."
            />
            <List>
              {unassignedDepartments.map(dept => (
                <ListItemButton
                  key={dept._id}
                  selected={selectedDepartment?._id === dept._id}
                  onClick={() => setSelectedDepartment(dept)}
                  sx={{
                    backgroundColor: selectedDepartment?._id === dept._id ? 'error.light' : 'inherit',
                    '&:hover': {
                      backgroundColor: selectedDepartment?._id === dept._id ? 'error.main' : 'action.hover'
                    },
                    border: selectedDepartment?._id === dept._id ? '2px solid' : '1px solid transparent',
                    borderColor: selectedDepartment?._id === dept._id ? 'error.main' : 'transparent',
                    borderRadius: 1,
                    my: 0.5
                  }}
                >
                  <ListItemText
                    primary={dept.department_name}
                    secondary={dept.department_code}
                  />
                </ListItemButton>
              ))}
            </List>
            {unassignedDepartments.length === 0 && (
              <Typography color="textSecondary">All departments are assigned</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Available Managers" />
          <CardContent>
            <SearchField
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              placeholder="Search managers..."
            />
            <List>
              {filteredManagerData.map(manager => (
                <ListItemButton
                  key={manager._id}
                  onClick={() => chooseManager(manager)}
                  disabled={!selectedDepartment}
                  sx={{
                    backgroundColor: selectedDepartment ? 'success.light' : 'inherit',
                    '&:hover': {
                      backgroundColor: selectedDepartment ? 'success.main' : 'action.hover'
                    },
                    border: selectedDepartment ? '2px solid' : '1px solid transparent',
                    borderColor: selectedDepartment ? 'success.main' : 'transparent',
                    borderRadius: 1,
                    my: 0.5,
                    opacity: selectedDepartment ? 1 : 0.6
                  }}
                >
                  <ListItemText
                    primary={`${manager.first_name} ${manager.last_name}`}
                    secondary={`${manager.employee_id} - ${manager.department}`}
                  />
                  {selectedDepartment && <LinkIcon />}
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Current Mappings" />
          <CardContent>
            <List>
              {assignedDepartments.map(dept => {
                const manager = managers.find(m => m.employee_id === dept.manager_id);
                return (
                  <ListItem
                    key={dept._id}
                    selected={selectedDepartment?._id === dept._id}
                    secondaryAction={
                      <MappingActions
                        onChange={() => setSelectedDepartment(dept)}
                        onRemove={() => removeMapping(dept)}
                        disabled={mapDepartmentToManager.isPending}
                      />
                    }
                    sx={{ pr: 10, borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={dept.department_code} size="small" />
                          <ArrowForwardIcon fontSize="small" />
                          <Typography variant="body2">
                            {manager ? `${manager.first_name} ${manager.last_name}` : 'Manager not found'}
                          </Typography>
                        </Box>
                      }
                      secondary={dept.department_name}
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

// Manager to Director Mapping Component
const ManagerDirectorMapping = React.memo(({
  filteredManagerDirectorData,
  selectedManager,
  setSelectedManager,
  managerSearchForDirector,
  setManagerSearchForDirector,
  directorSearchForManager,
  setDirectorSearchForManager,
  showConfirmationDialog,
  mapManagerToDirector,
  directors
}) => {
  const { unassignedManagers, assignedManagers, filteredDirectors } = filteredManagerDirectorData;

  // Clear selection when component mounts to ensure clean state
  React.useEffect(() => {
    setSelectedManager(null);
  }, [setSelectedManager]);

  const changingDirector = selectedManager?.director_id
    ? directors.find(d => d.employee_id === selectedManager.director_id)
    : null;
  // Linked to a director that no longer exists, so listed under no director below
  const orphanedManagers = assignedManagers.filter(
    m => !directors.some(d => d.employee_id === m.director_id)
  );

  const chooseDirector = (director) => {
    if (!selectedManager) return;
    if (selectedManager.director_id === director.employee_id) {
      toast.info(`${fullName(selectedManager)} already reports to ${fullName(director)}`);
      return;
    }
    const changing = Boolean(selectedManager.director_id);
    showConfirmationDialog(
      'Manager to Director',
      selectedManager,
      director,
      () => mapManagerToDirector.mutate({
        managerId: selectedManager._id,
        directorId: director.employee_id,
        action: changing ? 'change' : 'map'
      }),
      {
        mode: changing ? 'change' : 'map',
        current: changingDirector,
        note: changing
          ? `${fullName(selectedManager)} and their staff move to ${fullName(director)}'s rating list. Ratings already given by ${fullName(changingDirector)} stay on record.`
          : ''
      }
    );
  };

  const removeMapping = (manager) => {
    const director = directors.find(d => d.employee_id === manager.director_id);
    showConfirmationDialog(
      'Manager to Director',
      manager,
      null,
      () => mapManagerToDirector.mutate({ managerId: manager._id, directorId: null, action: 'remove' }),
      {
        mode: 'remove',
        current: director,
        note: `${fullName(manager)} and their staff will not be on any director's rating list until you map them again.`
      }
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Map managers to directors. One director can oversee multiple managers.
        </Alert>
      </Grid>

      {selectedManager?.director_id && (
        <Grid item xs={12}>
          <ChangingAlert
            source={fullName(selectedManager)}
            current={`reports to ${fullName(changingDirector)}`}
            targetLabel="director"
            onCancel={() => setSelectedManager(null)}
          />
        </Grid>
      )}

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Unassigned Managers" />
          <CardContent>
            <SearchField
              value={managerSearchForDirector}
              onChange={(e) => setManagerSearchForDirector(e.target.value)}
              placeholder="Search managers..."
            />
            <List>
              {unassignedManagers.map(manager => (
                <ListItemButton
                  key={manager._id}
                  selected={selectedManager?._id === manager._id}
                  onClick={() => setSelectedManager(manager)}
                  sx={{
                    backgroundColor: selectedManager?._id === manager._id ? 'error.light' : 'inherit',
                    '&:hover': {
                      backgroundColor: selectedManager?._id === manager._id ? 'error.main' : 'action.hover'
                    },
                    border: selectedManager?._id === manager._id ? '2px solid' : '1px solid transparent',
                    borderColor: selectedManager?._id === manager._id ? 'error.main' : 'transparent',
                    borderRadius: 1,
                    my: 0.5
                  }}
                >
                  <ListItemText
                    primary={`${manager.first_name} ${manager.last_name}`}
                    secondary={`${manager.employee_id} - ${manager.department}`}
                  />
                </ListItemButton>
              ))}
            </List>
            {unassignedManagers.length === 0 && (
              <Typography color="textSecondary">All managers are assigned</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Available Directors" />
          <CardContent>
            <SearchField
              value={directorSearchForManager}
              onChange={(e) => setDirectorSearchForManager(e.target.value)}
              placeholder="Search directors..."
            />
            <List>
              {filteredDirectors.map(director => (
                <ListItemButton
                  key={director._id}
                  onClick={() => chooseDirector(director)}
                  disabled={!selectedManager}
                  sx={{
                    backgroundColor: 'inherit',
                    '&:hover': {
                      backgroundColor: selectedManager ? 'success.light' : 'action.hover'
                    },
                    border: '1px solid transparent',
                    borderRadius: 1,
                    my: 0.5,
                    opacity: selectedManager ? 1 : 0.6,
                    cursor: selectedManager ? 'pointer' : 'default'
                  }}
                >
                  <ListItemText
                    primary={`${director.first_name} ${director.last_name}`}
                    secondary={`${director.employee_id} - ${director.department}`}
                  />
                  {selectedManager && <LinkIcon />}
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Current Mappings" />
          <CardContent>
            <List>
              {directors.map(director => {
                const managersUnderDirector = assignedManagers.filter(m => m.director_id === director.employee_id);
                if (managersUnderDirector.length === 0) return null;

                return (
                  <Box key={director._id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">
                      {director.first_name} {director.last_name} ({director.employee_id})
                    </Typography>
                    {managersUnderDirector.map(manager => (
                      <Box
                        key={manager._id}
                        sx={{
                          ml: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderRadius: 1,
                          bgcolor: selectedManager?._id === manager._id ? 'action.selected' : 'transparent'
                        }}
                      >
                        <ArrowForwardIcon fontSize="small" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {manager.first_name} {manager.last_name}
                        </Typography>
                        <MappingActions
                          onChange={() => setSelectedManager(manager)}
                          onRemove={() => removeMapping(manager)}
                          disabled={mapManagerToDirector.isPending}
                        />
                      </Box>
                    ))}
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                );
              })}
              {orphanedManagers.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error">
                    Director not found
                  </Typography>
                  {orphanedManagers.map(manager => (
                    <Box key={manager._id} sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowForwardIcon fontSize="small" />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {manager.first_name} {manager.last_name} (director {manager.director_id})
                      </Typography>
                      <MappingActions
                        onChange={() => setSelectedManager(manager)}
                        onRemove={() => removeMapping(manager)}
                        disabled={mapManagerToDirector.isPending}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

// Director to Chief Mapping Component
const DirectorChiefMapping = React.memo(({
  filteredDirectorChiefData,
  selectedDirector,
  setSelectedDirector,
  directorSearchForChief,
  setDirectorSearchForChief,
  chiefSearch,
  setChiefSearch,
  showConfirmationDialog,
  mapDirectorToChief,
  chiefs
}) => {
  const { unassignedDirectors, assignedDirectors, filteredChiefs } = filteredDirectorChiefData;

  // Clear selection when component mounts to ensure clean state
  React.useEffect(() => {
    setSelectedDirector(null);
  }, [setSelectedDirector]);

  const changingChief = selectedDirector?.chief_id
    ? chiefs.find(c => c.employee_id === selectedDirector.chief_id)
    : null;
  // Linked to a chief that no longer exists, so listed under no chief below
  const orphanedDirectors = assignedDirectors.filter(
    d => !chiefs.some(c => c.employee_id === d.chief_id)
  );

  const chooseChief = (chief) => {
    if (!selectedDirector) return;
    if (selectedDirector.chief_id === chief.employee_id) {
      toast.info(`${fullName(selectedDirector)} already reports to ${fullName(chief)}`);
      return;
    }
    const changing = Boolean(selectedDirector.chief_id);
    showConfirmationDialog(
      'Director to Chief',
      selectedDirector,
      chief,
      () => mapDirectorToChief.mutate({
        directorId: selectedDirector._id,
        chiefId: chief.employee_id,
        action: changing ? 'change' : 'map'
      }),
      {
        mode: changing ? 'change' : 'map',
        current: changingChief,
        note: changing
          ? `${fullName(selectedDirector)}'s managers and staff move under ${fullName(chief)} for best-staff selection.`
          : ''
      }
    );
  };

  const removeMapping = (director) => {
    const chief = chiefs.find(c => c.employee_id === director.chief_id);
    showConfirmationDialog(
      'Director to Chief',
      director,
      null,
      () => mapDirectorToChief.mutate({ directorId: director._id, chiefId: null, action: 'remove' }),
      {
        mode: 'remove',
        current: chief,
        note: `${fullName(director)}'s managers and staff will not be under any chief until you map them again.`
      }
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Map directors to chiefs. One chief can oversee multiple directors.
        </Alert>
      </Grid>

      {selectedDirector?.chief_id && (
        <Grid item xs={12}>
          <ChangingAlert
            source={fullName(selectedDirector)}
            current={`reports to ${fullName(changingChief)}`}
            targetLabel="chief"
            onCancel={() => setSelectedDirector(null)}
          />
        </Grid>
      )}

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Unassigned Directors" />
          <CardContent>
            <SearchField
              value={directorSearchForChief}
              onChange={(e) => setDirectorSearchForChief(e.target.value)}
              placeholder="Search directors..."
            />
            <List>
              {unassignedDirectors.map(director => (
                <ListItemButton
                  key={director._id}
                  selected={selectedDirector?._id === director._id}
                  onClick={() => setSelectedDirector(director)}
                  sx={{
                    backgroundColor: selectedDirector?._id === director._id ? 'error.light' : 'inherit',
                    '&:hover': {
                      backgroundColor: selectedDirector?._id === director._id ? 'error.main' : 'action.hover'
                    },
                    border: selectedDirector?._id === director._id ? '2px solid' : '1px solid transparent',
                    borderColor: selectedDirector?._id === director._id ? 'error.main' : 'transparent',
                    borderRadius: 1,
                    my: 0.5
                  }}
                >
                  <ListItemText
                    primary={`${director.first_name} ${director.last_name}`}
                    secondary={`${director.employee_id} - ${director.department}`}
                  />
                </ListItemButton>
              ))}
            </List>
            {unassignedDirectors.length === 0 && (
              <Typography color="textSecondary">All directors are assigned</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Available Chiefs" />
          <CardContent>
            <SearchField
              value={chiefSearch}
              onChange={(e) => setChiefSearch(e.target.value)}
              placeholder="Search chiefs..."
            />
            <List>
              {filteredChiefs.map(chief => (
                <ListItemButton
                  key={chief._id}
                  onClick={() => chooseChief(chief)}
                  disabled={!selectedDirector}
                  sx={{
                    backgroundColor: 'inherit',
                    '&:hover': {
                      backgroundColor: selectedDirector ? 'success.light' : 'action.hover'
                    },
                    border: '1px solid transparent',
                    borderRadius: 1,
                    my: 0.5,
                    opacity: selectedDirector ? 1 : 0.6,
                    cursor: selectedDirector ? 'pointer' : 'default'
                  }}
                >
                  <ListItemText
                    primary={`${chief.first_name} ${chief.last_name}`}
                    secondary={`${chief.employee_id} - ${chief.department}`}
                  />
                  {selectedDirector && <LinkIcon />}
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={4}>
        <Card>
          <CardHeader title="Current Mappings" />
          <CardContent>
            <List>
              {chiefs.map(chief => {
                const directorsUnderChief = assignedDirectors.filter(d => d.chief_id === chief.employee_id);
                if (directorsUnderChief.length === 0) return null;

                return (
                  <Box key={chief._id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">
                      {chief.first_name} {chief.last_name} ({chief.employee_id})
                    </Typography>
                    {directorsUnderChief.map(director => (
                      <Box
                        key={director._id}
                        sx={{
                          ml: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderRadius: 1,
                          bgcolor: selectedDirector?._id === director._id ? 'action.selected' : 'transparent'
                        }}
                      >
                        <ArrowForwardIcon fontSize="small" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {director.first_name} {director.last_name}
                        </Typography>
                        <MappingActions
                          onChange={() => setSelectedDirector(director)}
                          onRemove={() => removeMapping(director)}
                          disabled={mapDirectorToChief.isPending}
                        />
                      </Box>
                    ))}
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                );
              })}
              {orphanedDirectors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error">
                    Chief not found
                  </Typography>
                  {orphanedDirectors.map(director => (
                    <Box key={director._id} sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowForwardIcon fontSize="small" />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {director.first_name} {director.last_name} (chief {director.chief_id})
                      </Typography>
                      <MappingActions
                        onChange={() => setSelectedDirector(director)}
                        onRemove={() => removeMapping(director)}
                        disabled={mapDirectorToChief.isPending}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`hierarchy-tabpanel-${index}`}
      aria-labelledby={`hierarchy-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const HierarchyMapping = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedDirector, setSelectedDirector] = useState(null);
  // mode: 'map' a new link, 'change' an existing one (current -> target), or 'remove' it
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    type: '',
    source: null,
    target: null,
    onConfirm: null,
    mode: 'map',
    current: null,
    note: ''
  });
  // Search states for each tab
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [directorSearchForManager, setDirectorSearchForManager] = useState('');
  const [managerSearchForDirector, setManagerSearchForDirector] = useState('');
  const [chiefSearch, setChiefSearch] = useState('');
  const [directorSearchForChief, setDirectorSearchForChief] = useState('');
  const queryClient = useQueryClient();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset selections when changing tabs
    setSelectedDepartment(null);
    setSelectedManager(null);
    setSelectedDirector(null);
    closeConfirmationDialog();
  };

  const showConfirmationDialog = (type, source, target, onConfirm, { mode = 'map', current = null, note = '' } = {}) => {
    setConfirmationDialog({
      open: true,
      type,
      source,
      target,
      onConfirm,
      mode,
      current,
      note
    });
  };

  const closeConfirmationDialog = () => {
    setConfirmationDialog({ open: false, type: '', source: null, target: null, onConfirm: null, mode: 'map', current: null, note: '' });
  };

  const handleConfirmMapping = () => {
    if (confirmationDialog.onConfirm) {
      confirmationDialog.onConfirm();
    }
    closeConfirmationDialog();
  };

  // Filter functions with useCallback to prevent re-renders
  const filterDepartments = useCallback((departments, searchTerm) => {
    if (!searchTerm) return departments;
    return departments.filter(dept =>
      dept.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.department_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.department_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, []);

  const filterUsers = useCallback((users, searchTerm) => {
    if (!searchTerm) return users;
    return users.filter(user =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, []);

  // Fetch all data
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

  // Mapping mutations. A null target removes the mapping; `action` only picks the message.
  const DEPARTMENT_DONE = { map: 'Department mapped to manager', change: 'Department manager changed', remove: 'Department manager removed' };
  const MANAGER_DONE = { map: 'Manager mapped to director', change: 'Manager moved to the new director', remove: 'Manager to director mapping removed' };
  const DIRECTOR_DONE = { map: 'Director mapped to chief', change: 'Director moved to the new chief', remove: 'Director to chief mapping removed' };

  const mapDepartmentToManager = useMutation({
    mutationFn: async ({ departmentId, managerId }) => {
      const response = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId }),
      });
      if (!response.ok) throw new Error('Failed to update department mapping');
      return response.json();
    },
    onSuccess: (data, { action = 'map' }) => {
      const moved = (data.employees_updated || 0) + (data.candidates_updated || 0);
      toast.success(
        `${DEPARTMENT_DONE[action]}${moved ? ` (${data.employees_updated || 0} employees, ${data.candidates_updated || 0} candidates updated)` : ''}`
      );
      queryClient.invalidateQueries(['departments']);
      queryClient.invalidateQueries(['managers']);
      setSelectedDepartment(null);
    },
    onError: () => {
      toast.error('Failed to update department mapping');
    },
  });

  const mapManagerToDirector = useMutation({
    mutationFn: async ({ managerId, directorId }) => {
      const response = await fetch(`${API_BASE}/admin/managers/${managerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director_id: directorId }),
      });
      if (!response.ok) throw new Error('Failed to update manager mapping');
      return response.json();
    },
    onSuccess: (data, { action = 'map' }) => {
      toast.success(MANAGER_DONE[action]);
      queryClient.invalidateQueries(['managers']);
      queryClient.invalidateQueries(['directors']);
      setSelectedManager(null);
    },
    onError: () => {
      toast.error('Failed to update manager mapping');
    },
  });

  const mapDirectorToChief = useMutation({
    mutationFn: async ({ directorId, chiefId }) => {
      const response = await fetch(`${API_BASE}/admin/directors/${directorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chief_id: chiefId }),
      });
      if (!response.ok) throw new Error('Failed to update director mapping');
      return response.json();
    },
    onSuccess: (data, { action = 'map' }) => {
      toast.success(DIRECTOR_DONE[action]);
      queryClient.invalidateQueries(['directors']);
      queryClient.invalidateQueries(['chiefs']);
      setSelectedDirector(null);
    },
    onError: () => {
      toast.error('Failed to update director mapping');
    },
  });

  // Memoized filtered data to prevent re-renders
  const filteredDepartmentData = useMemo(() => {
    const unassignedDepartments = filterDepartments(
      departments.filter(dept => !dept.manager_id),
      departmentSearch
    );
    const assignedDepartments = departments.filter(dept => dept.manager_id);
    return { unassignedDepartments, assignedDepartments };
  }, [departments, departmentSearch, filterDepartments]);

  const filteredManagerData = useMemo(() => {
    return filterUsers(managers, managerSearch);
  }, [managers, managerSearch, filterUsers]);

  const filteredManagerDirectorData = useMemo(() => {
    const unassignedManagers = filterUsers(
      managers.filter(mgr => !mgr.director_id),
      managerSearchForDirector
    );
    const assignedManagers = managers.filter(mgr => mgr.director_id);
    const filteredDirectors = filterUsers(directors, directorSearchForManager);
    return { unassignedManagers, assignedManagers, filteredDirectors };
  }, [managers, directors, managerSearchForDirector, directorSearchForManager, filterUsers]);

  const filteredDirectorChiefData = useMemo(() => {
    const unassignedDirectors = filterUsers(
      directors.filter(dir => !dir.chief_id),
      directorSearchForChief
    );
    const assignedDirectors = directors.filter(dir => dir.chief_id);
    const filteredChiefs = filterUsers(chiefs, chiefSearch);
    return { unassignedDirectors, assignedDirectors, filteredChiefs };
  }, [directors, chiefs, directorSearchForChief, chiefSearch, filterUsers]);



  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Hierarchy Mapping
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Create organizational hierarchy by mapping relationships between different levels
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Department → Manager" />
          <Tab label="Manager → Director" />
          <Tab label="Director → Chief" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DepartmentManagerMapping
          filteredDepartmentData={filteredDepartmentData}
          filteredManagerData={filteredManagerData}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          departmentSearch={departmentSearch}
          setDepartmentSearch={setDepartmentSearch}
          managerSearch={managerSearch}
          setManagerSearch={setManagerSearch}
          showConfirmationDialog={showConfirmationDialog}
          mapDepartmentToManager={mapDepartmentToManager}
          managers={managers}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ManagerDirectorMapping
          filteredManagerDirectorData={filteredManagerDirectorData}
          selectedManager={selectedManager}
          setSelectedManager={setSelectedManager}
          managerSearchForDirector={managerSearchForDirector}
          setManagerSearchForDirector={setManagerSearchForDirector}
          directorSearchForManager={directorSearchForManager}
          setDirectorSearchForManager={setDirectorSearchForManager}
          showConfirmationDialog={showConfirmationDialog}
          mapManagerToDirector={mapManagerToDirector}
          directors={directors}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <DirectorChiefMapping
          filteredDirectorChiefData={filteredDirectorChiefData}
          selectedDirector={selectedDirector}
          setSelectedDirector={setSelectedDirector}
          directorSearchForChief={directorSearchForChief}
          setDirectorSearchForChief={setDirectorSearchForChief}
          chiefSearch={chiefSearch}
          setChiefSearch={setChiefSearch}
          showConfirmationDialog={showConfirmationDialog}
          mapDirectorToChief={mapDirectorToChief}
          chiefs={chiefs}
        />
      </TabPanel>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={closeConfirmationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmationDialog.mode === 'remove' ? 'Remove' : confirmationDialog.mode === 'change' ? 'Change' : 'Confirm'} {confirmationDialog.type} Mapping
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              {confirmationDialog.mode === 'remove'
                ? 'Are you sure you want to remove this mapping?'
                : confirmationDialog.mode === 'change'
                  ? 'Are you sure you want to change this mapping?'
                  : 'Are you sure you want to map:'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, my: 2 }}>
              <Chip
                label={confirmationDialog.source ?
                  (confirmationDialog.source.department_name || confirmationDialog.source.department_code ||
                   fullName(confirmationDialog.source))
                  : ''
                }
                color="primary"
              />
              <ArrowForwardIcon />
              {confirmationDialog.mode !== 'map' && (
                <Chip
                  label={fullName(confirmationDialog.current)}
                  variant="outlined"
                  sx={confirmationDialog.mode === 'change' || confirmationDialog.mode === 'remove' ? { textDecoration: 'line-through' } : undefined}
                />
              )}
              {confirmationDialog.mode === 'change' && <ArrowForwardIcon />}
              {confirmationDialog.mode !== 'remove' && (
                <Chip
                  label={confirmationDialog.target ? fullName(confirmationDialog.target) : ''}
                  color="secondary"
                />
              )}
            </Box>
            <Typography variant="body2" color="textSecondary">
              {confirmationDialog.note ||
                'This will create a new hierarchical relationship in your organization structure.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmationDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmMapping}
            variant="contained"
            color={confirmationDialog.mode === 'remove' ? 'error' : 'primary'}
          >
            {confirmationDialog.mode === 'remove' ? 'Remove Mapping' : confirmationDialog.mode === 'change' ? 'Change Mapping' : 'Confirm Mapping'}
          </Button>
        </DialogActions>
      </Dialog>

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

const HierarchyMappingWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <HierarchyMapping />
  </QueryClientProvider>
);

export default HierarchyMappingWithProviders;