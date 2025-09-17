import { useMemo, useState } from 'react';
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

const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const accessToken = useSelector((state) => state.user.accessToken);

  const siteManagerID = useSelector((state) => state.siteManagerID);  

  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['table-data', columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL('http://localhost:5000/api/rms/admin/landing/get_site_manager_installements');

      fetchURL.searchParams.set('filters', JSON.stringify(columnFilters ?? []));
      fetchURL.searchParams.set('globalFilter', globalFilter ?? '');
      fetchURL.searchParams.set('sorting', JSON.stringify(sorting ?? []));

      const response = await fetch(fetchURL.href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({id: siteManagerID}),
      });
      
      const json = await response.json();
      
      
      return json;
    },
    placeholderData: keepPreviousData,
  });

  const { data = [], meta } = fetchData;

 

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Id',
        enableClickToCopy: true,
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'target_amount',
        header: 'Target Amount(In ETB)',
        size: 300,
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.target_amount,
          helperText: validationErrors?.target_amount,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              target_amount: undefined,
            }),
          type: 'number',
          inputProps: { 
            min: 0,
            step: 'any'
          },
          onChange: (event) => {
            const value = event.target.value;
            if (value === '' || /^[0-9]+(\.[0-9]*)?$/.test(value)) {
              // Valid input: empty or positive number (integer or decimal)
              setValidationErrors({
                ...validationErrors,
                target_amount: undefined,
              });
            } else {
              setValidationErrors({
                ...validationErrors,
                target_amount: 'Please enter a valid number',
              });
            }
          },
        },
      },
      {
        accessorKey: 'achieved_amount',
        header: 'Acheived Amount(In ETB)',
        size: 300,
        enableEditing: false,
        
      },
      {
        accessorKey: 'KPI_start_date',
        header: 'KPI Start Date',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value) {
            const date = new Date(value);
            return isNaN(date) ? '' : date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
          return '';
        },
        Header: ({ column }) => (
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <em>KPI Start Date</em>
          </div>
        ),
        size: 150,
        muiEditTextFieldProps: ({ row }) => {
          // Convert the ISO date to yyyy-MM-dd format for the input
          const convertToInputFormat = (isoDate) => {
            if (!isoDate) return '';
            const date = new Date(isoDate);
            return isNaN(date) ? '' : date.toISOString().split('T')[0];
          };
      
          return {
            type: 'date',
            required: true,
            error: !!validationErrors?.KPI_start_date,
            helperText: validationErrors?.KPI_start_date,
            InputLabelProps: { shrink: true },
            inputProps: { 
              min: new Date().toISOString().split('T')[0],
            },
            value: convertToInputFormat(row.original.KPI_start_date),
            onFocus: () =>
              setValidationErrors({
                ...validationErrors,
                KPI_start_date: undefined,
              }),
            onChange: (event) => {
              const value = event.target.value;
              if (value) {
                const date = new Date(value);
                if (isNaN(date) || date < new Date()) {
                  setValidationErrors({
                    ...validationErrors,
                    KPI_start_date: 'Please enter a valid date not earlier than today',
                  });
                } else {
                  setValidationErrors({
                    ...validationErrors,
                    KPI_start_date: undefined,
                  });
                  // Update the row data with the new start date (in ISO format)
                  row.original.KPI_start_date = date.toISOString();
                  // Clear the end date when start date changes
                  row.original.KPI_end_date = '';
                }
              } else {
                // Clear the start date and end date if the input is empty
                row.original.KPI_start_date = '';
                row.original.KPI_end_date = '';
              }
            },
          };
        },
      },
      {
        accessorKey: 'KPI_end_date',
        header: 'KPI End Date',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value) {
            const date = new Date(value);
            return isNaN(date) ? '' : date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
          return '';
        },
        Header: ({ column }) => (
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <em>KPI End Date</em>
          </div>
        ),
        size: 150,
        muiEditTextFieldProps: ({ row }) => {
          // Convert the ISO date to yyyy-MM-dd format for the input
          const convertToInputFormat = (isoDate) => {
            if (!isoDate) return '';
            const date = new Date(isoDate);
            return isNaN(date) ? '' : date.toISOString().split('T')[0];
          };
      
          return {
            type: 'date',
            required: true,
            disabled: !row.original.KPI_start_date,
            error: !!validationErrors?.KPI_end_date,
            helperText: validationErrors?.KPI_end_date || (!row.original.KPI_start_date ? 'Set KPI Start Date first' : ''),
            InputLabelProps: { shrink: true },
            inputProps: { 
              min: convertToInputFormat(row.original.KPI_start_date) || new Date().toISOString().split('T')[0],
            },
            value: convertToInputFormat(row.original.KPI_end_date),
            onFocus: () =>
              setValidationErrors({
                ...validationErrors,
                KPI_end_date: undefined,
              }),
            onChange: (event) => {
              const value = event.target.value;
              if (value) {
                const endDate = new Date(value);
                const startDate = new Date(row.original.KPI_start_date);
                if (isNaN(endDate) || endDate < startDate) {
                  setValidationErrors({
                    ...validationErrors,
                    KPI_end_date: 'Please enter a valid date not earlier than the start date',
                  });
                } else {
                  setValidationErrors({
                    ...validationErrors,
                    KPI_end_date: undefined,
                  });
                  // Update the row data with the new end date (in ISO format)
                  row.original.KPI_end_date = endDate.toISOString();
                }
              } else {
                // Clear the end date if the input is empty
                row.original.KPI_end_date = '';
              }
            },
          };
        },
      },



      {
        accessorKey: 'KPI_percentage',
        header: 'KPI percentage',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'registered_By',
        header: 'registered_By',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'createdAt',
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
        accessorKey: 'updatedAt',
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
        accessorKey: 'updated_By',
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
        <DialogTitle variant="h3">Create New Site</DialogTitle>
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
        <DialogTitle variant="h3">Edit KPI installement</DialogTitle>
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
          Create KPI
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
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete KPI installement</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this KPI installement?
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
  const siteManagerID = useSelector((state) => state.siteManagerID);  
  



  return useMutation({
    mutationFn: async (user) => {
        const dataToSend = {
            kpi_installemnt: user,
            siteManagerID: siteManagerID, 
          };
      const response = await fetch("/api/api/rms/admin/register_each_KPI_installment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json()
      if(response.ok){
        toast.success(`Action Done Successfully`);
      }else{
        toast.error(`Error: ${data.message}`);
      }


      // const response = await axios.post(`http://localhost:5000/api/signUp/`, user);
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
   const siteManagerID = useSelector((state) => state.siteManagerID);  
  return useMutation({
    mutationFn: async (user) => {
      const dataToSend = {
        kpi_installemnt: user,
        siteManagerID: siteManagerID, 
      };
      const response = await fetch("/api/api/rms/admin/update_each_KPI_installement", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(dataToSend),
      
      });

      // const response = await axios.patch(`http://localhost:5000/api/editUser/`, user);
     
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

  const siteManagerID = useSelector((state) => state.siteManagerID); 
  return useMutation({
    mutationFn: async (userId) => {
      
      // const response = await axios.delete(`http://localhost:5000/api/deleteUser/`, {
      //   data: { id: userId },
      // });
      const dataToSend = {
        kpi_installemnt_id: userId,
        siteManagerID: siteManagerID, 
      };

      const response = await fetch("/api/api/rms/admin/delete_each_KPI_installement", {
        method: "Delete",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(dataToSend),
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

const validateUser = (site) => {
  const errors = {
   
    target_amount: !validateRequired(site.target_amount) ? 'Target amount is required' : '',
    KPI_start_date: !validateRequired(site.KPI_start_date) ? 'KPI start date is required' : '',
    KPI_end_date: !validateRequired(site.KPI_end_date) ? 'KPI end date is required' : '',
  };

  // Additional logic for date validation
  if (site.KPI_start_date && site.KPI_end_date) {
    const startDate = new Date(site.KPI_start_date);
    const endDate = new Date(site.KPI_end_date);
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      errors.KPI_end_date = 'End date must be after start date';
    }
  }

  return errors;
};