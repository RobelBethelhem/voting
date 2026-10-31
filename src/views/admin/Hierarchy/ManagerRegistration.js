import React, { useMemo, useState, useCallback } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSelector } from 'react-redux';
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
  MenuItem,
  TextField,
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
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import { FiscalYearBar, useFiscalYears } from '../FiscalYear/fiscalYearSelect';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const ExcelImportDialog = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const accessToken = useSelector((state) => state.user.accessToken);

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
    const requiredHeaders = ['first_name', 'last_name', 'employee_id', 'user', 'email', 'position', 'performance_appraisal_score'];
    const headers = Object.keys(data[0]);

    if (!requiredHeaders.every(header => headers.includes(header))) {
      return { isValid: false, error: 'Invalid Excel format. Please ensure the file contains columns: first_name, last_name, employee_id, user, email, position, performance_appraisal_score' };
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

      // Check for duplicates
      if (employeeIds.has(row.employee_id)) {
        errors.push(`Row ${i + 2}: Duplicate employee_id found: ${row.employee_id}`);
      } else {
        employeeIds.add(row.employee_id);
      }

      // Validate performance score
      const score = parseFloat(row.performance_appraisal_score);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`Row ${i + 2}: performance_appraisal_score must be a number between 0 and 100`);
      }
    }

    return { isValid: errors.length === 0, error: errors.join('\n') };
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Add level: 'manager' to all rows
      const managerData = jsonData.map(row => ({ ...row, level: 'manager' }));

      const validationResult = validateExcelFormat(managerData);
      if (validationResult.isValid) {
        try {
          const response = await fetch(`${API_BASE}/admin/import-managers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': accessToken,
            },
            body: JSON.stringify({ managers: managerData, update_existing: updateExisting }),
          });

          if (response.ok) {
            const result = await response.json();
            toast.success(result.message || 'Manager Excel file imported successfully');
            onImport();
            onClose();
          } else {
            const errorData = await response.json();
            toast.error(`Error importing Excel file: ${errorData.message}`);
          }
        } catch (error) {
          console.error('Error importing Excel file:', error);
          toast.error('Error importing Excel file');
        }
      } else {
        setError(validationResult.error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Import Managers from Excel</DialogTitle>
      <DialogContent>
        <Box {...getRootProps()} sx={{ border: '2px dashed #cccccc', p: 2, mb: 2, textAlign: 'center' }}>
          <input {...getInputProps()} />
          <Typography>Drag and drop an Excel file here, or click to select a file</Typography>
          <Typography variant="caption" color="textSecondary">
            Required columns: first_name, last_name, employee_id, user, email, position, performance_appraisal_score
          </Typography>
        </Box>
        {file && <Typography>Selected file: {file.name}</Typography>}
        {error && <Typography color="error">{error}</Typography>}
        <FormControlLabel
          control={<Checkbox checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />}
          label="Update people who already exist (for a new fiscal year: new appraisal scores, positions and departments)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} disabled={!file || !!error}>Import</Button>
      </DialogActions>
    </Dialog>
  );
};

const ManagerRegistration = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  // People and departments are kept per fiscal year; a past year is shown read-only
  const fiscalYears = useFiscalYears(accessToken);
  const readOnly = Boolean(fiscalYears.selectedYear && !fiscalYears.selectedYear.is_current);
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['manager-data', fiscalYears.selected, columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL(`${API_BASE}/admin/managers`, window.location.origin);
      if (fiscalYears.selected) fetchURL.searchParams.set('fiscal_year', fiscalYears.selected);

      fetchURL.searchParams.set('filters', JSON.stringify(columnFilters ?? []));
      fetchURL.searchParams.set('globalFilter', globalFilter ?? '');
      fetchURL.searchParams.set('sorting', JSON.stringify(sorting ?? []));

      const response = await fetch(fetchURL.href);
      const json = await response.json();
      return json;
    },
    placeholderData: keepPreviousData,
  });

  const { data = [], meta } = fetchData;

  const handleExcelImport = () => {
    setIsExcelImportOpen(true);
  };

  const handleExcelImportClose = () => {
    setIsExcelImportOpen(false);
  };

  const handleExcelImportSuccess = () => {
    refetch();
  };

  const downloadTemplate = () => {
    const template = [
      {
        first_name: "John",
        last_name: "Doe",
        employee_id: "MGR001",
        user: "john.doe",
        email: "john.doe@company.com",
        position: "Department Manager",
        performance_appraisal_score: 85,
        level: "manager"
      },
      {
        first_name: "Jane",
        last_name: "Smith",
        employee_id: "MGR002",
        user: "jane.smith",
        email: "jane.smith@company.com",
        position: "HR Manager",
        performance_appraisal_score: 92,
        level: "manager"
      },
      {
        first_name: "Mike",
        last_name: "Johnson",
        employee_id: "MGR003",
        user: "mike.johnson",
        email: "mike.johnson@company.com",
        position: "Finance Manager",
        performance_appraisal_score: 78,
        level: "manager"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Managers");
    XLSX.writeFile(wb, "manager_template.xlsx");
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'first_name',
        header: 'First Name',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.first_name,
          helperText: validationErrors?.first_name,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              first_name: undefined,
            }),
        },
      },
      {
        accessorKey: 'last_name',
        header: 'Last Name',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.last_name,
          helperText: validationErrors?.last_name,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              last_name: undefined,
            }),
        },
      },
      {
        accessorKey: 'employee_id',
        header: 'Employee ID',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.employee_id,
          helperText: validationErrors?.employee_id,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              employee_id: undefined,
            }),
        },
      },
      {
        accessorKey: 'user',
        header: 'Username',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.user,
          helperText: validationErrors?.user,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              user: undefined,
            }),
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        muiEditTextFieldProps: {
          type: 'email',
          required: true,
          error: !!validationErrors?.email,
          helperText: validationErrors?.email,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              email: undefined,
            }),
        },
      },
      {
        accessorKey: 'position',
        header: 'Position',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.position,
          helperText: validationErrors?.position,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              position: undefined,
            }),
        },
      },
      {
        accessorKey: 'performance_appraisal_score',
        header: 'Performance Score',
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { min: 0, max: 100 },
          error: !!validationErrors?.performance_appraisal_score,
          helperText: validationErrors?.performance_appraisal_score,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              performance_appraisal_score: undefined,
            }),
        },
        Cell: ({ cell }) => cell.getValue() || 0,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        muiEditTextFieldProps: {
          disabled: true,
        },
        Cell: () => 'Manager',
      },
    ],
    [validationErrors],
  );

  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser(refetch);
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser(refetch);
  const { mutateAsync: deleteUser, isPending: isDeletingUser } = useDeleteUser(refetch);

  const handleCreateUser = async ({ values, table }) => {
    const newValidationErrors = validateUser({...values, level: 'manager'});
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createUser({...values, level: 'manager'});
    table.setCreatingRow(null);
  };

  const handleSaveUser = async ({ values, table, row }) => {
    const newValidationErrors = validateUser({...values, level: 'manager'});
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    // Include the row ID with the values for the update
    const userData = {
      ...values,
      level: 'manager',
      _id: row.id // row.id contains the _id from getRowId
    };
    await updateUser(userData);
    table.setEditingRow(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedRow) {
      await deleteUser(selectedRow.original._id);
      setOpenDeleteModal(false);
      setSelectedRow(null);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnOrdering: true,
    enableStickyHeader: true,
    enableRowPinning: true,
    enableFacetedValues: true,
    enableColumnPinning: true,
    muiToolbarAlertBannerProps: isError
      ? {
          color: 'error',
          children: 'Error loading data',
        }
      : undefined,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: !readOnly,
    getRowId: (row) => row._id,
    muiTableContainerProps: {
      sx: { minHeight: '500px' },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">New Manager</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Edit Manager</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {internalEditComponents}
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
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
            setOpenDeleteModal(true);
            setSelectedRow(row);
          }}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => readOnly ? null : (
      <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Tooltip arrow title="Refresh Data">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          onClick={() => {
            table.setCreatingRow(true);
          }}
        >
          New Manager
        </Button>
        <Button variant="outlined" onClick={handleExcelImport}>
          Import Excel
        </Button>
        <Button variant="outlined" onClick={downloadTemplate}>
          Download Template
        </Button>
      </Box>
    ),
    state: {
      columnFilters,
      globalFilter,
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
    },
  });

  return (
    <>
      <FiscalYearBar fiscalYears={fiscalYears} entity="managers" label="managers" onCopied={refetch} />
      <MaterialReactTable table={table} />

      <ExcelImportDialog
        open={isExcelImportOpen}
        onClose={handleExcelImportClose}
        onImport={handleExcelImportSuccess}
      />

      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete Manager</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this manager?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
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
    </>
  );
};

// Helper functions
function useCreateUser(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user) => {
      const response = await fetch(`${API_BASE}/admin/managers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user)
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Manager created successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });
}

function useUpdateUser(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user) => {
      const response = await fetch(`${API_BASE}/admin/managers/${user._id || user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user)
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Manager updated successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });
}

function useDeleteUser(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`${API_BASE}/admin/managers/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Manager deleted successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });
}

const validateRequired = (value) => !!value?.length;
const validateEmail = (email) =>
  !!email?.length &&
  email.toLowerCase().match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  );

function validateUser(user) {
  const errors = {
    first_name: !validateRequired(user.first_name) ? 'First Name is Required' : '',
    last_name: !validateRequired(user.last_name) ? 'Last Name is Required' : '',
    employee_id: !validateRequired(user.employee_id) ? 'Employee ID is Required' : '',
    user: !validateRequired(user.user) ? 'Username is Required' : '',
    email: !validateEmail(user.email) ? 'Incorrect Email Format' : '',
    position: !validateRequired(user.position) ? 'Position is Required' : '',
  };

  // Validate performance score (optional field, but if provided must be valid)
  if (user.performance_appraisal_score !== undefined && user.performance_appraisal_score !== null && user.performance_appraisal_score !== '') {
    const score = parseFloat(user.performance_appraisal_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.performance_appraisal_score = 'Performance Score must be a number between 0 and 100';
    }
  }

  return errors;
}

const queryClient = new QueryClient();

const ManagerRegistrationWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <ManagerRegistration />
  </QueryClientProvider>
);

export default ManagerRegistrationWithProviders;