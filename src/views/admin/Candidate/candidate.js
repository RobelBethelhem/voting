import React,{ useMemo, useState ,useCallback  } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

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

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { API_BASE } from 'src/api/base';

const ExcelImportDialog = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
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
    const requiredHeaders = ['employee_id', 'first_name', 'last_name', 'department', 'position', 'performance_appraisal_score', 'department_name'];
    const headers = Object.keys(data[0]);
    
    if (!requiredHeaders.every(header => headers.includes(header))) {
      return { isValid: false, error: 'Invalid Excel format. Please ensure the file contains columns: employee_id, first_name, last_name, department, position, performance_appraisal_score, and department_name' };
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

      // Check for numbers and special characters
      const nameRegex = /^[a-zA-Z\s-]+$/;
      if (!nameRegex.test(row.first_name)) {
        errors.push(`Row ${i + 2}: first_name should not contain numbers or special characters`);
      }
      if (!nameRegex.test(row.last_name)) {
        errors.push(`Row ${i + 2}: last_name should not contain numbers or special characters`);
      }
      if (!nameRegex.test(row.department)) {
        errors.push(`Row ${i + 2}: department should not contain numbers or special characters`);
      }
      // if (!nameRegex.test(row.position)) {
      //   errors.push(`Row ${i + 2}: position should not contain numbers or special characters`);
      // }
      // Check for duplicates
    if (employeeIds.has(row.employee_id)) {
      errors.push(`Row ${i + 2}: Duplicate  found: ${row.employee_id}`);
    } else {
      employeeIds.add(row.employee_id);
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

      const validationResult = validateExcelFormat(jsonData);
      if (validationResult.isValid) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${API_BASE}/candidates/candidate_excel_upload`, {
            method: 'POST',
            headers: {
              'x-access-token': accessToken,
            },
            body: formData,
          });

          if (response.ok) {
            toast.success('Excel file imported successfully');
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
      <DialogTitle>Import Excel</DialogTitle>
      <DialogContent>
        <Box {...getRootProps()} sx={{ border: '2px dashed #cccccc', p: 2, mb: 2, textAlign: 'center' }}>
          <input {...getInputProps()} />
          <Typography>Drag and drop an Excel file here, or click to select a file</Typography>
        </Box>
        {file && <Typography>Selected file: {file.name}</Typography>}
        {error && <Typography color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} disabled={!file || !!error}>Import</Button>
      </DialogActions>
    </Dialog>
  );
};


const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const accessToken = useSelector((state) => state.user.accessToken);
  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['table-data', columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL(`${API_BASE}/rms/admin/landing/get_candidate`, window.location.origin);

      fetchURL.searchParams.set('filters', JSON.stringify(columnFilters ?? []));
      fetchURL.searchParams.set('globalFilter', globalFilter ?? '');
      fetchURL.searchParams.set('sorting', JSON.stringify(sorting ?? []));

      const response = await fetch(fetchURL.href, {
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
      });
      
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
    refetch(); // Refresh the data after successful import
  };

  const downloadTemplate = () => {
    const template = [
      {
        employee_id: "EMP001",
        first_name: "John",
        last_name: "Doe",
        department_name: "Information Technology",
        position: "Senior Developer",
        level: "professional",
        performance_appraisal_score: 85
      },
      {
        employee_id: "EMP002",
        first_name: "Alice",
        last_name: "Johnson",
        department_name: "Finance",
        position: "Financial Analyst",
        level: "professional",
        performance_appraisal_score: 88
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    XLSX.writeFile(wb, "candidate_template.xlsx");
  };



  const handleAddTab = () => {
    setIsDialogOpen(true);
  };


  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewTabData({
      name: '',
      discountRate: '',
      gracePeriod: '',
      percentPerDayPenalty: '',
      repaymentStartDate: null,
    });
  };

  const handleCreateTab = async () => {
    if (newTabDataSpecial.start_date) {
      try {
        const response = await registerAggrement(newTabData);
        if (response && response.error === false && Array.isArray(response.data)) {
          const newTab = {
            id: (tabs.length + 1).toString(),
            name: newTabData.name,
            data: response.data,
          };
          setTabs(prevTabs => [...prevTabs, newTab]);
          setActiveTab(tabs.length); // This will set the active tab to the newly created one
          handleCloseDialog();
        } else {
          console.error('Invalid response from server:', response);
        }
      } catch (error) {
        console.error('Error creating new tab:', error);
      }
    }
  };

 

  const columns = useMemo(
    () => [
      
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
        accessorKey: 'department',
        header: 'Department',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.department,
          helperText: validationErrors?.department,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              department: undefined,
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
        header: 'Performance Score (/100)',
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { min: 0, max: 100, step: 0.01 },
          required: true,
          error: !!validationErrors?.performance_appraisal_score,
          helperText: validationErrors?.performance_appraisal_score,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              performance_appraisal_score: undefined,
            }),
        },
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value ? `${parseFloat(value).toFixed(2)}/100` : 'N/A';
        },
      },
      
      {
        accessorKey: 'registered_By',
        header: 'registered_By',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'Created_At',
        header: 'Created At',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const date = new Date(cell.getValue());
          return isNaN(date) ? '' : date.toLocaleDateString();
        },
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },
      
      {
        accessorKey: 'Updated_At',
        header: 'Updated At',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value && value.length > 0) {
            const date = new Date(value);
            return isNaN(date) ? '' : date.toLocaleDateString();
          }
          return '';
        },
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },
    
      {
        accessorKey: 'Updated_By',
        header: 'Updated_By',
        enableEditing: false,
        size: 80,
      },
    ],
    [validationErrors],
  );

  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser(refetch);
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeletingUser } = useDeleteUser(refetch);

  const handleCreateUser = async ({ values, table }) => {
    const newValidationErrors = validateUser(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createUser(values);
    table.setCreatingRow(null); //exit creating mode
  };

  const handleSaveUser = async ({ values, table }) => {
    const newValidationErrors = validateUser(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await updateUser(values);
    table.setEditingRow(null); //exit editing mode
  };

  const handleDeleteConfirm = async () => {
    if (selectedRow) {
      await deleteUser(selectedRow.original.id);
      setOpenDeleteModal(false);
      setSelectedRow(null);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data, // Ensure data is passed here
    paginationDisplayMode: 'pages',
    enableColumnOrdering: true,
    enableGrouping: true,
    enableStickyHeader: true,
    enableRowPinning: true,
    enableFacetedValues: true,
    enableColumnPinning: true,
    
    rowPinningDisplayMode: 'top-and-bottom',
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
    enableEditing: true,
    getRowId: (row) => row.id,
    muiTableContainerProps: {
      sx: { minHeight: '500px' },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">New Candidate</DialogTitle>
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
        <DialogTitle variant="h3">Edit Site</DialogTitle>
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
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
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
          New Candidate
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
      <MaterialReactTable table={table} />

       <Button variant="contained" onClick={handleExcelImport}>
        Import Excel
      </Button>
      <Button variant="outlined" onClick={downloadTemplate} sx={{ ml: 2 }}>
        Download Template
      </Button>

      <ExcelImportDialog
        open={isExcelImportOpen}
        onClose={handleExcelImportClose}
        onImport={handleExcelImportSuccess}
      />


      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete Site</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this Site?
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

function useCreateUser(refetch) {
  const queryClient = useQueryClient();
  const accessToken = useSelector((state) => state.user.accessToken);
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch(`${API_BASE}/candidates/register_candidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(user)
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Action Done Successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }


      // const response = await axios.post(`${API_BASE}/signUp/`, user);
      // return response.data;
    },
    onMutate: (newUserInfo) => {
      queryClient.setQueryData(['users'], (prevUsers) =>
        prevUsers?.map((prevUser) =>
          prevUser.id === newUserInfo.id ? newUserInfo : prevUser,
        ),
      );
    },
    onSuccess: () => {
      refetch(); // Trigger a refetch of the data
    },
  });
}


function useUpdateUser() {
  const queryClient = useQueryClient();
  const accessToken = useSelector((state) => state.user.accessToken);
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch(`${API_BASE}/candidates/update_candidate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(user)
      });

      // const response = await axios.patch(`${API_BASE}/editUser/`, user);
     
      const data = await response.json()
      if(response.ok){
        toast.success(`Action Done Successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
     
     
    },
    onMutate: (newUserInfo) => {
      queryClient.setQueryData(['users'], (prevUsers) =>
        prevUsers?.map((prevUser) =>
          prevUser.id === newUserInfo.id ? newUserInfo : prevUser,
        ),
      );
    },
  });
}

function useDeleteUser(refetch) {
  const queryClient = useQueryClient();
  const accessToken = useSelector((state) => state.user.accessToken);
  return useMutation({
    mutationFn: async (userId) => {
      // const response = await axios.delete(`${API_BASE}/deleteUser/`, {
      //   data: { id: userId },
      // });

      const response = await fetch(`${API_BASE}/candidates/delete_candidate`, {
        method: "Delete",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify({id: userId})
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Action Done Successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onMutate: (userId) => {
      queryClient.setQueryData(['users'], (prevUsers) =>
        prevUsers?.filter((user) => user.id !== userId),
      );
    },
    onSuccess: () => {
      refetch(); // Trigger a refetch of the data
    },
  });
}

const queryClient = new QueryClient();

const ExampleWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Example />
    </LocalizationProvider>

  </QueryClientProvider>
);

export default ExampleWithProviders;

const validateRequired = (value) => !!value.length;

function validateUser(candidate) {
  const errors = {
    employee_id: !validateRequired(candidate.employee_id) ? 'Employee ID is Required' : '',
    first_name: !validateRequired(candidate.first_name) ? 'First Name is Required' : '',
    last_name: !validateRequired(candidate.last_name) ? 'Last Name is Required' : '',
    department: !validateRequired(candidate.department) ? 'Department is Required' : '',
    position: !validateRequired(candidate.position) ? 'Position is Required' : '',
  };

  // Validate performance appraisal score
  if (!candidate.performance_appraisal_score) {
    errors.performance_appraisal_score = 'Performance Appraisal Score is Required';
  } else {
    const score = parseFloat(candidate.performance_appraisal_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.performance_appraisal_score = 'Performance score must be between 0 and 100';
    }
  }

  return errors;
}