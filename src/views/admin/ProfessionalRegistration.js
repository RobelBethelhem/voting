import React, { useMemo, useState, useCallback } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  keepPreviousData,
  useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { FiscalYearBar, useFiscalYears, withFiscalYear } from './FiscalYear/fiscalYearSelect';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const ExcelImportDialog = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setFile(file);
        setError('');
      } else {
        setError('Please upload only Excel files (.xlsx)');
      }
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const validateExcelFormat = (data) => {
    const requiredHeaders = ['first_name', 'last_name', 'employee_id', 'user', 'email', 'position', 'department', 'job_grade', 'performance_appraisal_score'];
    const headers = Object.keys(data[0]);

    // Debug: log the actual headers found
    console.log('Found Excel headers:', headers);
    console.log('Required headers:', requiredHeaders);

    // Normalize headers for comparison (remove spaces, lowercase)
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const normalizedRequired = requiredHeaders.map(h => h.toLowerCase());

    const missingHeaders = normalizedRequired.filter(required =>
      !normalizedHeaders.includes(required)
    );

    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        error: `Invalid Excel format. Missing columns: ${missingHeaders.join(', ')}. Found columns: ${headers.join(', ')}. Please ensure the file contains columns: first_name, last_name, employee_id, user, email, position, department, job_grade, performance_appraisal_score`
      };
    }

    const errors = [];
    const employeeIds = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Check for null or empty values
      for (const header of requiredHeaders) {
        if (!row[header] || row[header].toString().trim() === '') {
          errors.push(`Row ${i + 2}: ${header} cannot be empty`);
        }
      }

      // Check for duplicate employee IDs
      if (employeeIds.has(row.employee_id)) {
        errors.push(`Row ${i + 2}: Duplicate employee_id ${row.employee_id}`);
      }
      employeeIds.add(row.employee_id);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push(`Row ${i + 2}: Invalid email format`);
      }

      // Validate performance score
      const score = parseFloat(row.performance_appraisal_score);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`Row ${i + 2}: performance_appraisal_score must be a number between 0 and 100`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, error: errors.join('\n') };
    }

    return { isValid: true };
  };

  // Normalize column names in the data
  const normalizeExcelData = (data) => {
    return data.map(row => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = row[key];
      });
      return normalizedRow;
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setError('Excel file is empty');
          return;
        }

        // Normalize column names
        const normalizedData = normalizeExcelData(jsonData);

        const validation = validateExcelFormat(normalizedData);
        if (!validation.isValid) {
          setError(validation.error);
          return;
        }

        // Format data for professional users
        const formattedData = normalizedData.map(row => ({
          ...row,
          level: 'professional',
          performance_appraisal_score: parseFloat(row.performance_appraisal_score) || 0,
          is_managerial: false,
          roles: ['user']
        }));

        await onImport(formattedData, updateExisting);
        onClose();
        setFile(null);
        setError('');
        setUpdateExisting(false);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        setError('Error processing Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Professional Employees from Excel</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload an Excel file with columns: first_name, last_name, employee_id, user, email, position, department, job_grade, performance_appraisal_score
          </Alert>
          <div {...getRootProps()} style={{
            border: '2px dashed #ccc',
            borderRadius: '4px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: file ? '#f0f8ff' : '#fafafa'
          }}>
            <input {...getInputProps()} />
            {file ? (
              <Typography>{file.name}</Typography>
            ) : (
              <Typography>Drag & drop an Excel file here, or click to select</Typography>
            )}
          </div>
          {error && (
            <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />}
            label="Update people who already exist (for a new fiscal year: new appraisal scores, positions and departments)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} variant="contained" disabled={!file}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ProfessionalRegistration = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  // People and departments are kept per fiscal year; a past year is shown read-only
  const fiscalYears = useFiscalYears(accessToken);
  const readOnly = Boolean(fiscalYears.selectedYear && !fiscalYears.selectedYear.is_current);
  const [validationErrors, setValidationErrors] = useState({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/admin/departments`);
      const json = await response.json();
      return json.data || [];
    },
  });

  // Fetch professional employees
  const { data: fetchedUsers = [], isError: isLoadingUsersError, isFetching: isFetchingUsers, isLoading: isLoadingUsers, refetch } = useQuery({
    queryKey: ['users', fiscalYears.selected],
    queryFn: async () => {
      const response = await fetch(withFiscalYear(`${API_BASE}/getUsers`, fiscalYears.selected));
      const json = await response.json();
      const users = json.data || [];
      // Filter only professional level users
      return users.filter(user => user.level === 'professional');
    },
    placeholderData: keepPreviousData,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (user) => {
      console.log('Creating user with values:', user);

      // Use signUp endpoint which now handles hierarchy automatically
      const response = await fetch(`${API_BASE}/signUp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: user.first_name,
          last_name: user.last_name,
          employee_id: user.employee_id,
          username: user.user, // Custom username
          user: user.user,     // Also send as 'user' field
          email: user.email,
          position: user.position,
          department: user.department, // Department name - backend will get hierarchy automatically
          job_grade: user.job_grade,
          performance_appraisal_score: user.performance_appraisal_score || 0,
          level: 'professional',
          is_managerial: false,
          roles: ['user']
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create failed:', errorData);
        throw new Error(errorData.message || 'Failed to create user');
      }

      const result = await response.json();
      console.log('Create successful:', result);
      return result;
    },
    onSuccess: () => {
      toast.success('Professional employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ values, table, row }) => {
      console.log('=== UPDATE USER DEBUG ===');
      console.log('Full values object:', values);
      console.log('Row parameter:', row);
      console.log('Row original:', row?.original);
      console.log('Row ID:', row?.id);

      // Get the editing row to access the original row data
      const editingRow = table.getState().editingRow;
      console.log('Editing row from table state:', editingRow);

      // Try multiple ways to get the ID - prioritize row parameter
      const userId = row?.id || row?.original?.id || editingRow?.id || editingRow?.original?.id || values.id || values._id;
      console.log('Using ID for update:', userId);

      if (!userId) {
        console.error('All ID attempts failed:', {
          'row?.id': row?.id,
          'row?.original?.id': row?.original?.id,
          'editingRow?.id': editingRow?.id,
          'editingRow?.original?.id': editingRow?.original?.id,
          'values.id': values.id,
          'values._id': values._id
        });
        throw new Error('No user ID found for update');
      }

      const requestData = {
        id: userId,
        first_name: values.first_name,
        last_name: values.last_name,
        employee_id: values.employee_id,
        username: values.user, // Map 'user' field to 'username'
        user: values.user,
        email: values.email,
        position: values.position,
        department: values.department,
        job_grade: values.job_grade,
        performance_appraisal_score: values.performance_appraisal_score,
        level: 'professional',
        is_managerial: false
      };

      console.log('Sending request data:', requestData);

      const response = await fetch(`${API_BASE}/editUser`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update user');
      }

      const result = await response.json();
      console.log('Update successful:', result);
      return result;
    },
    onSuccess: () => {
      toast.success('Professional employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`${API_BASE}/deleteUser`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Professional employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Excel import mutation
  const importUsersMutation = useMutation({
    mutationFn: async ({ users, updateExisting }) => {
      const response = await fetch(`${API_BASE}/admin/import-employees-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: users, update_existing: updateExisting }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import users');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} professional employees${data.updated ? ` and updated ${data.updated}` : ''}`);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} rows had errors`);
      }
      // Force aggressive cache refresh
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['users'] });
      // Force immediate refetch
      refetch();
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const downloadTemplate = () => {
    const template = [
      {
        first_name: 'John',
        last_name: 'Doe',
        employee_id: 'EMP001',
        user: 'john.doe',
        email: 'john.doe@company.com',
        position: 'Software Developer',
        department: 'Innovation and IT Projects',
        job_grade: 'Grade 5',
        performance_appraisal_score: 85
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Professional Employees');
    XLSX.writeFile(wb, 'professional_employees_template.xlsx');
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'first_name',
      header: 'First Name',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.first_name,
        helperText: validationErrors?.first_name,
        onFocus: () => setValidationErrors({ ...validationErrors, first_name: undefined }),
      },
    },
    {
      accessorKey: 'last_name',
      header: 'Last Name',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.last_name,
        helperText: validationErrors?.last_name,
        onFocus: () => setValidationErrors({ ...validationErrors, last_name: undefined }),
      },
    },
    {
      accessorKey: 'employee_id',
      header: 'Employee ID',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.employee_id,
        helperText: validationErrors?.employee_id,
        onFocus: () => setValidationErrors({ ...validationErrors, employee_id: undefined }),
      },
    },
    {
      accessorKey: 'user',
      header: 'Username',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.user,
        helperText: validationErrors?.user,
        onFocus: () => setValidationErrors({ ...validationErrors, user: undefined }),
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      muiEditTextFieldProps: {
        required: true,
        type: 'email',
        error: !!validationErrors?.email,
        helperText: validationErrors?.email,
        onFocus: () => setValidationErrors({ ...validationErrors, email: undefined }),
      },
    },
    {
      accessorKey: 'position',
      header: 'Position',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.position,
        helperText: validationErrors?.position,
        onFocus: () => setValidationErrors({ ...validationErrors, position: undefined }),
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      editVariant: 'select',
      editSelectOptions: departments.map(dept => ({
        value: dept.department_name,
        label: dept.department_name
      })),
      muiEditTextFieldProps: {
        required: true,
        select: true,
        error: !!validationErrors?.department,
        helperText: validationErrors?.department,
        onFocus: () => setValidationErrors({ ...validationErrors, department: undefined }),
      },
    },
    {
      accessorKey: 'job_grade',
      header: 'Job Grade',
      muiEditTextFieldProps: {
        required: true,
        error: !!validationErrors?.job_grade,
        helperText: validationErrors?.job_grade,
        onFocus: () => setValidationErrors({ ...validationErrors, job_grade: undefined }),
      },
    },
    {
      accessorKey: 'performance_appraisal_score',
      header: 'Performance Score',
      muiEditTextFieldProps: {
        type: 'number',
        inputProps: { min: 0, max: 100 },
      },
    },
  ], [validationErrors, departments]);

  const validateRequired = (value) => !!value?.length;
  const validateEmail = (email) => !!email?.length && email.includes('@') && email.includes('.');

  function validateUser(user) {
    const errors = {};
    if (!validateRequired(user.first_name)) {
      errors.first_name = 'First Name is Required';
    }
    if (!validateRequired(user.last_name)) {
      errors.last_name = 'Last Name is Required';
    }
    if (!validateRequired(user.employee_id)) {
      errors.employee_id = 'Employee ID is Required';
    }
    if (!validateRequired(user.user)) {
      errors.user = 'Username is Required';
    }
    if (!validateEmail(user.email)) {
      errors.email = 'Incorrect Email Format';
    }
    if (!validateRequired(user.position)) {
      errors.position = 'Position is Required';
    }
    if (!validateRequired(user.department)) {
      errors.department = 'Department is Required';
    }
    if (!validateRequired(user.job_grade)) {
      errors.job_grade = 'Job Grade is Required';
    }

    return errors;
  }

  const table = useMaterialReactTable({
    columns,
    data: fetchedUsers,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: !readOnly,
    getRowId: (row) => row.id || row._id,
    muiToolbarAlertBannerProps: isLoadingUsersError
      ? {
          color: 'error',
          children: 'Error loading data',
        }
      : undefined,
    muiTableContainerProps: {
      sx: {
        minHeight: '500px',
      },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: async ({ values, table }) => {
      const newValidationErrors = validateUser(values);
      if (Object.values(newValidationErrors).some((error) => error)) {
        setValidationErrors(newValidationErrors);
        return;
      }
      setValidationErrors({});
      await createUserMutation.mutateAsync(values);
      table.setCreatingRow(null);
    },
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: async ({ values, table, row }) => {
      console.log('onEditingRowSave called with:', { values, table, row });

      const newValidationErrors = validateUser(values);
      if (Object.values(newValidationErrors).some((error) => error)) {
        setValidationErrors(newValidationErrors);
        return;
      }
      setValidationErrors({});
      await updateUserMutation.mutateAsync({ values, table, row });
      table.setEditingRow(null);
    },
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Create New Professional Employee</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => table.setCreatingRow(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const creatingRow = table.getState().creatingRow;
              if (creatingRow) {
                await table.options.onCreatingRowSave({ values: creatingRow._valuesCache, table });
              }
            }}
          >
            Create Professional Employee
          </Button>
        </DialogActions>
      </>
    ),
    renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Edit Professional Employee</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => table.setEditingRow(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const editingRow = table.getState().editingRow;
              if (editingRow) {
                await table.options.onEditingRowSave({ values: editingRow._valuesCache, table });
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </>
    ),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: 'flex', gap: '1rem' }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => {
            if (window.confirm('Are you sure you want to delete this professional employee?')) {
              deleteUserMutation.mutate(row.original.id);
            }
          }}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => readOnly ? null : (
      <Box sx={{ display: 'flex', gap: '1rem', p: '0.5rem', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => {
            table.setCreatingRow(true);
          }}
        >
          Add Professional Employee
        </Button>
        <Button variant="outlined" onClick={() => setImportDialogOpen(true)}>
          Import from Excel
        </Button>
        <Button variant="outlined" onClick={downloadTemplate}>
          Download Template
        </Button>
        <Tooltip title="Refresh Data">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    state: {
      isLoading: isLoadingUsers,
      isSaving: createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending,
      showAlertBanner: isLoadingUsersError,
      showProgressBars: isFetchingUsers,
    },
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Professional Employee Registration
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Manage professional-level employees. All employees will be automatically assigned to their department's hierarchy.
      </Typography>

      <FiscalYearBar fiscalYears={fiscalYears} entity="employees" label="employees" onCopied={refetch} />
      <MaterialReactTable table={table} />

      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={(users, updateExisting) => importUsersMutation.mutate({ users, updateExisting })}
      />

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

const ProfessionalRegistrationWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <ProfessionalRegistration />
  </QueryClientProvider>
);

export default ProfessionalRegistrationWithProviders;