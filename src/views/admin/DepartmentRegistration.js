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
import { FiscalYearBar, useFiscalYears } from './FiscalYear/fiscalYearSelect';
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
    const requiredHeaders = ['department_code', 'department_name'];
    const headers = Object.keys(data[0]);

    if (!requiredHeaders.every(header => headers.includes(header))) {
      return { isValid: false, error: 'Invalid Excel format. Please ensure the file contains columns: department_code, department_name' };
    }

    const errors = [];
    const departmentCodes = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Check for null or empty values
      for (const header of requiredHeaders) {
        if (!row[header] || row[header].toString().trim() === '') {
          errors.push(`Row ${i + 2}: ${header} cannot be empty`);
        }
      }

      // Check for duplicates
      if (departmentCodes.has(row.department_code)) {
        errors.push(`Row ${i + 2}: Duplicate department_code found: ${row.department_code}`);
      } else {
        departmentCodes.add(row.department_code);
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
          const response = await fetch(`${API_BASE}/admin/import-departments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': accessToken,
            },
            body: JSON.stringify({ departments: jsonData }),
          });

          if (response.ok) {
            toast.success('Department Excel file imported successfully');
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
      <DialogTitle>Import Departments from Excel</DialogTitle>
      <DialogContent>
        <Box {...getRootProps()} sx={{ border: '2px dashed #cccccc', p: 2, mb: 2, textAlign: 'center' }}>
          <input {...getInputProps()} />
          <Typography>Drag and drop an Excel file here, or click to select a file</Typography>
          <Typography variant="caption" color="textSecondary">
            Required columns: department_code, department_name
          </Typography>
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

const DepartmentRegistration = () => {
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
    queryKey: ['department-data', fiscalYears.selected, columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL(`${API_BASE}/admin/departments`, window.location.origin);
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
        department_code: "IT",
        department_name: "Information Technology"
      },
      {
        department_code: "HR",
        department_name: "Human Resources"
      },
      {
        department_code: "FIN",
        department_name: "Finance"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    XLSX.writeFile(wb, "department_template.xlsx");
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'department_code',
        header: 'Department Code',
        Cell: ({ row }) => {
          // Show department_code if available, otherwise show department_id as fallback
          return row.original.department_code || row.original.department_id || '-';
        },
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.department_code,
          helperText: validationErrors?.department_code,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              department_code: undefined,
            }),
        },
      },
      {
        accessorKey: 'department_name',
        header: 'Department Name',
        muiEditTextFieldProps: {
          required: true,
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

  const { mutateAsync: createDepartment, isPending: isCreatingDepartment } = useCreateDepartment(refetch);
  const { mutateAsync: updateDepartment, isPending: isUpdatingDepartment } = useUpdateDepartment(refetch);
  const { mutateAsync: deleteDepartment, isPending: isDeletingDepartment } = useDeleteDepartment(refetch);

  const handleCreateDepartment = async ({ values, table }) => {
    const newValidationErrors = validateDepartment(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createDepartment(values);
    table.setCreatingRow(null);
  };

  const handleSaveDepartment = async ({ values, table, row }) => {
    const newValidationErrors = validateDepartment(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    // Include the row ID with the values for the update
    const departmentData = {
      ...values,
      _id: row.id // row.id contains the _id from getRowId
    };
    await updateDepartment(departmentData);
    table.setEditingRow(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedRow) {
      await deleteDepartment(selectedRow.original._id);
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
    onCreatingRowSave: handleCreateDepartment,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveDepartment,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">New Department</DialogTitle>
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
        <DialogTitle variant="h3">Edit Department</DialogTitle>
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
          New Department
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
      <FiscalYearBar fiscalYears={fiscalYears} entity="departments" label="departments" onCopied={refetch} />
      <MaterialReactTable table={table} />

      <ExcelImportDialog
        open={isExcelImportOpen}
        onClose={handleExcelImportClose}
        onImport={handleExcelImportSuccess}
      />

      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this department?
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
function useCreateDepartment(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (department) => {
      const response = await fetch(`${API_BASE}/admin/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(department)
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Department created successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });
}

function useUpdateDepartment(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (department) => {
      const response = await fetch(`${API_BASE}/admin/departments/${department._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(department)
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Department updated successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });
}

function useDeleteDepartment(refetch) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (departmentId) => {
      const response = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Department deleted successfully`);
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

function validateDepartment(department) {
  return {
    department_code: !validateRequired(department.department_code) ? 'Department Code is Required' : '',
    department_name: !validateRequired(department.department_name) ? 'Department Name is Required' : '',
  };
}

const queryClient = new QueryClient();

const DepartmentRegistrationWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <DepartmentRegistration />
  </QueryClientProvider>
);

export default DepartmentRegistrationWithProviders;