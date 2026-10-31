import { useMemo, useState } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import renderPhoneInput from "./PhoneNumberInput";

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
import { useSelector } from 'react-redux';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { API_BASE } from 'src/api/base';



const Example = () => {
   
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [phone, setPhone] = useState('');
  const accessToken = useSelector((state) => state.user.accessToken);
 
  const Tabletheme = useSelector((state) => state.theme);

 

  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['table-data', columnFilters, globalFilter, sorting],
    queryFn: async () => {
      const fetchURL = new URL(`${API_BASE}/rms/admin/landing/get_customer`, window.location.origin);

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
      console.log("json", json)

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
        accessorKey: 'customer_name',
        header: 'Customer Name',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.customer_name,
          helperText: validationErrors?.customer_name,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              customer_name: undefined,
            }),
        },
      },
      {
        accessorKey: 'customer_email',
        header: 'Customer Email',
        muiEditTextFieldProps: {
          type: 'email',
          required: true,
          error: !!validationErrors?.customer_email,
          helperText: validationErrors?.customer_email,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              customer_email: undefined,
            }),
        },
      },
    
// Define the column for customer phone number
{
    accessorKey: 'customer_phone_number',
    header: 'customer_phone_number',
    size: 200,
    Cell: ({ cell }) => <span>{cell.getValue()}</span>,
  },
      {
        accessorKey: 'customer_address',
        header: 'Customer Address',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.customer_address,
          helperText: validationErrors?.customer_address,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              customer_address: undefined,
            }),
        },
      },
      {
        accessorKey: 'registered_By',
        header: 'Registered By',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'Created_At',
        header: 'Created At',
        filterVariant: 'date',
        Cell: ({ cell }) => {
          const date = new Date(cell.getValue());
          return date.toLocaleDateString();
        },
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },

      {
        accessorKey: 'Updated_At',
        header: 'Updated At',
        filterVariant: 'date',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value) {
            const date = new Date(value);
            return date.toLocaleDateString();
          }
          return '';
        },
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'Updated_By',
        header: 'Updated By',
        enableEditing: false,
        size: 80,
      },
    ],
    [validationErrors]
  );

  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser(refetch);
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeletingUser } = useDeleteUser(refetch);

  const handleCreateUser = async ({ values, table }) => {
    const newValidationErrors = validateUser({...values, customer_phone_number: phone});
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createUser({ ...values, customer_phone_number: phone });
    table.setCreatingRow(null); // exit creating mode
  };

  const handleSaveUser = async ({ values, table }) => {
    const newValidationErrors = validateUser({ ...values, customer_phone_number: phone });
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await updateUser({ ...values, customer_phone_number: phone });
    table.setEditingRow(null); // exit editing mode
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
      sx: {
        minHeight: '500px',
       
        fontSize: {
          xs: '10px',
          sm: '11px',
          md: '12px',
          lg: '13px',
          xl: '14px',
        },
      },
    },


    

    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,


    renderCreateRowDialogContent : ({ table, row, internalEditComponents }) => (
        <>
          <DialogTitle variant="h3">New Customer</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {internalEditComponents.map((component) =>
              component.key === 'mrt-row-create_customer_phone_number' ? (
                <div key={component.key}>
                  {renderPhoneInput('', setPhone)}
                </div>
              ) : (
                component
              )
            )}
          </DialogContent>
          <DialogActions>
            <MRT_EditActionButtons variant="text" table={table} row={row} />
          </DialogActions>
        </>
      ),

      
    
      renderEditRowDialogContent: ({ table, row, internalEditComponents }) => {
       
      
        return (
          <>
            <DialogTitle variant="h3">Edit Customer</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {internalEditComponents.map((component) =>
                component.key.includes('customer_phone_number') ? (
                  <div key={component.key}>
                    {renderPhoneInput(row.original.customer_phone_number, setPhone)}
                  </div>
                ) : (
                  component
                )
              )}
            </DialogContent>
            <DialogActions>
              <MRT_EditActionButtons variant="text" table={table} row={row} />
            </DialogActions>
          </>
        );
      },

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
          Add Customer
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
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this Customer?
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
      const response = await fetch(`${API_BASE}/rms/admin/register_customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(user),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Action Done Successfully');
      } else {
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
      const response = await fetch(`${API_BASE}/rms/admin/update_customer`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(user),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Action Done Successfully');
      } else {
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
      const response = await fetch(`${API_BASE}/rms/admin/delete_customer`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({ id: userId }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Action Done Successfully');
      } else {
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
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  );

function validateUser(customer) {
 
  return {
    customer_name: !validateRequired(customer.customer_name) ? 'Customer name is required' : '',
    customer_email: !validateEmail(customer.customer_email) ? 'Incorrect email format' : '',
    customer_phone_number: !validateRequired(customer.customer_phone_number) ? 'Phone number is required' : '',
    customer_address: !validateRequired(customer.customer_address) ? 'Address is required' : '',
  };
}