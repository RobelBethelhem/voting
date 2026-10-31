import React,{ useMemo, useState ,useCallback  } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { roles } from './fetchedRole';
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
import 'react-toastify/dist/ReactToastify.css';
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
    const requiredHeaders = ['first_name', 'last_name', 'employee_id', 'user', 'email', 'position', 'department_name'];
    const headers = Object.keys(data[0]);
    
    if (!requiredHeaders.every(header => headers.includes(header))) {
      return { isValid: false, error: 'Invalid Excel format. Please ensure the file contains columns: first_name, last_name, employee_id, user, email, position, department_name' };
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
      if (!nameRegex.test(row.first_name)) { ['first_name', 'last_name', 'employee_id', 'user', 'email', 'position','department','roles' ]
        errors.push(`Row ${i + 2}: first_name should not contain numbers or special characters`);
      }
      if (!nameRegex.test(row.position)) {
        errors.push(`Row ${i + 2}: position should not contain numbers or special characters`);
      }
      if (row.level && !nameRegex.test(row.level)) {
        errors.push(`Row ${i + 2}: level should not contain numbers or special characters`);
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

          const response = await fetch('/api/admin/import-employees', {
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
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['table-data', columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL(`${API_BASE}/getUsers`, window.location.origin);

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
    refetch(); // Refresh the data after successful import
  };

  const downloadTemplate = () => {
    const template = [
      {
        first_name: "John",
        last_name: "Doe",
        employee_id: "EMP001",
        user: "johndoe",
        email: "john.doe@company.com",
        position: "Senior Developer",
        department_name: "Information Technology",
        level: "professional",
        job_grade: "P3",
        function: "Software Development",
        performance_appraisal_score: 85,
        is_managerial: false
      },
      {
        first_name: "Jane",
        last_name: "Smith",
        employee_id: "MGR001",
        user: "janesmith",
        email: "jane.smith@company.com",
        position: "Development Manager",
        department_name: "Information Technology",
        level: "manager",
        job_grade: "M2",
        function: "Team Management",
        performance_appraisal_score: 90,
        is_managerial: true
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_template.xlsx");
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
        header: 'User',
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
        accessorKey: 'department_name',
        header: 'Department',
        muiEditTextFieldProps: {
          error: !!validationErrors?.department_name,
          helperText: validationErrors?.department_name,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              department_name: undefined,
            }),
        },
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
        <DialogTitle variant="h3">New Employee</DialogTitle>
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
        <DialogTitle variant="h3">Edit User</DialogTitle>
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
          New Employee
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
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this user?
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
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch(`${API_BASE}/signUp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch(`${API_BASE}/editUser/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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
  return useMutation({
    mutationFn: async (userId) => {
      // const response = await axios.delete(`${API_BASE}/deleteUser/`, {
      //   data: { id: userId },
      // });

      const response = await fetch(`${API_BASE}/deleteUser/`, {
        method: "Delete",
        headers: {
          "Content-Type": "application/json",
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
    <Example />
  </QueryClientProvider>
);

export default ExampleWithProviders;

const validateRequired = (value) => !!value.length;
const validateEmail = (email) =>
  !!email.length &&
  email.toLowerCase().match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  );

function validateUser(user) {
  return {
    first_name: !validateRequired(user.first_name) ? 'First Name is Required' : '',
    last_name: !validateRequired(user.last_name) ? 'Last Name is Required' : '',
    employee_id: !validateRequired(user.employee_id) ? 'Employee ID is Required' : '',
    user: !validateRequired(user.user) ? 'Username is Required' : '',
    email: !validateEmail(user.email) ? 'Incorrect Email Format' : '',
    position: !validateRequired(user.position) ? 'Position is Required' : '',
    department: !validateRequired(user.department) ? 'Department is Required' : '',
    department_name: !validateRequired(user.department_name) ? 'Department is Required' : '',
  };
}