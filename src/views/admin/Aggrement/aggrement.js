import { useMemo, useState } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { paymentDuration, basePaymentPercent, paymentPeriod, paymentType}  from './lookup_aggrement';

import FileUploadCell from './file_upload';

import { useNavigate } from 'react-router-dom';
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
  Modal,
  Typography,
  Tooltip,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
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
import InfoIcon from '@mui/icons-material/Info';
import axios from 'axios';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
      const fetchURL = new URL(`${API_BASE}/rms/admin/landing/get_aggerement`, window.location.origin);

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

 

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Id',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'room_id',
        header: 'room_id',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.room_id,
          helperText: validationErrors?.room_id,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              room_id: undefined,
            }),
        },
      },
      {
        accessorKey: 'customer_id',
        header: 'customer_id',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.customer_id,
          helperText: validationErrors?.customer_id,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              customer_id: undefined,
            }),
        },
      },

    
      {
        accessorKey: 'payment_type',
        header: 'payment_type',  
        editVariant: 'select',
        editSelectOptions: paymentType,
        muiEditTextFieldProps: {
          select: true,
          error: !!validationErrors?.payment_type,
          helperText: validationErrors?.payment_type,
        },
      },
      {
        accessorKey: 'payment_period',
        header: 'payment_period',   
        
        editVariant: 'select',
        editSelectOptions: paymentPeriod,
        muiEditTextFieldProps: {
            select: true,
          error: !!validationErrors?.payment_period,
          helperText: validationErrors?.payment_period,
        },
      },
      {
        accessorKey: 'base_payment_percent',
        header: 'Down Payment Percnent%', 
        filterFn: 'between',
        editVariant: 'select',
        editSelectOptions: basePaymentPercent,
        muiEditTextFieldProps: {
            select: true,
          error: !!validationErrors?.base_payment_percent,
          helperText: validationErrors?.base_payment_percent,
         
        },
      },
      {
        accessorKey: 'payment_duration',
        header: 'payment_duration', 
        filterFn: 'between',
        editVariant: 'select',
        editSelectOptions: paymentDuration,
        muiEditTextFieldProps: {
            select: true,
          error: !!validationErrors?.payment_duration,
          helperText: validationErrors?.payment_duration,
         
        },
      },

      {
        accessorKey: 'discount_rate',
        header: 'Discount Rate',
        muiEditTextFieldProps: {
          required: true,
          error: !!validationErrors?.discount_rate,
          helperText: validationErrors?.discount_rate,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              discount_rate: undefined,
            }),
        },
      },

      {
        accessorKey: 'discount_rate_restructure',
        header: 'Discount Rate Res',
       enableEditing: false
      },

      

      {
        accessorKey: 'repayment_started',
        header: 'Repayment Started',
        editVariant: 'date',
        Cell: ({ cell }) => cell.getValue()?.toLocaleDateString() || '',
        muiEditTextFieldProps: {
          type: 'date',
          required: true,
          inputProps: {
            min: new Date().toISOString().split('T')[0], // Set minimum date to today
          },
          error: !!validationErrors?.repayment_started,
          helperText: validationErrors?.repayment_started,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              repayment_started: undefined,
            }),
          onChange: (event) => {
            const selectedDate = new Date(event.target.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
            
            if (selectedDate < today) {
              setValidationErrors({
                ...validationErrors,
                repayment_started: 'Date cannot be in the past',
              });
            } else {
              setValidationErrors({
                ...validationErrors,
                repayment_started: undefined,
              });
            }
          },
        },
      },
      {
        accessorKey: 'grace_period',
        header: 'Grace Period',
        muiEditTextFieldProps: {
          type: 'number',
          required: true,
          error: !!validationErrors?.grace_period,
          helperText: validationErrors?.grace_period,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              grace_period: undefined,
            }),
        },
      },

      {
        accessorKey: 'grace_period_restructure',
        header: 'Grace Period Restructure',
        enableEditing: false
      },

      
      {
        accessorKey: 'Percent_per_day_penality',
        header: 'Percent Per Day Penalty',
        muiEditTextFieldProps: {
          type: 'number',
          required: true,
          inputProps: { min: 1, max: 100 },
          error: !!validationErrors?.Percent_per_day_penality,
          helperText: validationErrors?.Percent_per_day_penality,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              Percent_per_day_penality: undefined,
            }),
        },
      },
      {
        accessorKey: 'Percent_per_day_penality_restructure',
        header: 'Percent_per_day_penality_restructure',
        enableEditing: false
      },

      {
        accessorKey: 'penality_to_pay',
        header: 'penality_to_pay',
        enableEditing: false
      },
      {
        accessorKey: 'percent_the_customer_to_live',
        header: 'Percent Customer to Live',
        muiEditTextFieldProps: {
          type: 'number',
          required: true,
          inputProps: { min: 1, max: 100 },
          error: !!validationErrors?.percent_the_customer_to_live,
          helperText: validationErrors?.percent_the_customer_to_live,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              percent_the_customer_to_live: undefined,
            }),
        },
      },
      {
        accessorKey: 'when_legal_case',
        header: 'When Legal Case',
        muiEditTextFieldProps: {
          type: 'number',
          required: true,
          inputProps: { min: 1, max: 100 },
          error: !!validationErrors?.when_legal_case,
          helperText: validationErrors?.when_legal_case,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              when_legal_case: undefined,
            }),
        },
      },
      {
        accessorKey: 'when_agreement_cancel',
        header: 'When Agreement Cancel',
        muiEditTextFieldProps: {
          type: 'number',
          required: true,
          inputProps: { min: 1, max: 100 },
          error: !!validationErrors?.when_agreement_cancel,
          helperText: validationErrors?.when_agreement_cancel,
          onFocus: () =>
            setValidationErrors({
              ...validationErrors,
              when_agreement_cancel: undefined,
            }),
        },
      },

    

      {
        accessorKey: 'customer_name',
        header: 'Customer name',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'base_payment',
        header: 'Base Payment',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },


      {
        accessorFn: (row) => new Date(row.repayment_started),
        header: 'repayment_started',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => cell.getValue()?.toLocaleDateString(),
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },
      {
        accessorFn: (row) => new Date(row.repayment_end),
        header: 'repayment_end',
        filterVariant: 'date',
       
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => cell.getValue()?.toLocaleDateString(),
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },


      
      {
        accessorKey: 'income',
        header: 'Income',
        filterFn: 'between',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'amount_receivable',
        header: 'Amount Receivable',
        filterFn: 'between',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'aggerement_status',
        header: 'Agreement Status',
        filterFn: 'between',
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
        accessorKey: 'registered_By',
        header: 'Register By',
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
          if ("Updated_At" in cell.row.original) {
            if (cell.row.original.Updated_At && cell.row.original.Updated_At.length > 0) {
              const date = new Date(cell.getValue());
              return isNaN(date) ? '' : date.toLocaleDateString();
            }
            return "";
          }
          return "";
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
  
    const formData = new FormData();
    for (const key in values) {
      formData.append(key, values[key]);
    }
    attachments.forEach((file, index) => {
      formData.append('attachments', file);
    });
  
    await createUser(formData);
    table.setCreatingRow(null);
    setAttachments([]);
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
      sx: { minHeight: '500px',
        
       },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Add Agreement</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents}
          <FileUploadCell
            value={attachments}
            onChange={(files) => setAttachments(files)}
            multiple={true} // Allow multiple file selection
          />
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents}
          <FileUploadCell
            value={attachments}
            onChange={(files) => setAttachments(files)}
            multiple={true} // Allow multiple file selection
          />
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: 'flex', gap: '0rem' }}>
      <Tooltip title="Detail">
  <IconButton onClick={() => {
    dispatch({ 
      type: 'setAggrement', 
      aggrementDetailId: row.id 
    });
    navigate('/admin/aggrement/detailAggrement');
  }}>
    <InfoIcon />
  </IconButton>
</Tooltip>
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
          Create New Aggrement
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
  const accessToken = useSelector((state) => state.user.accessToken);
  
  return useMutation({
    mutationFn: async (formData) => {
      const response = await fetch(`${API_BASE}/rms/admin/register_aggrement`, {
        method: "POST",
        headers: {
          'x-access-token': accessToken,
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Action Done Successfully`);
      } else {
        toast.error(`Error: ${data.message}`);
      }

      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });
}




// function useCreateUser(refetch) {
//   const queryClient = useQueryClient();
//   const accessToken = useSelector((state) => state.user.accessToken);
//   return useMutation({
//     mutationFn: async (user) => {

//       const response = await fetch(`${API_BASE}/rms/admin/register_aggrement`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           'x-access-token': accessToken,
//         },
//         body: JSON.stringify(user)
//       });

//       const data = await response.json()
//       if(response.ok){
//         toast.success(`Action Done Successfully`);
//       }else{
//         toast.error(`Error: ${data.message}`);
//       }


//       // const response = await axios.post(`${API_BASE}/signUp/`, user);
//       // return response.data;
//     },
//     onMutate: (newUserInfo) => {
//       queryClient.setQueryData(['users'], (prevUsers) =>
//         prevUsers?.map((prevUser) =>
//           prevUser.id === newUserInfo.id ? newUserInfo : prevUser,
//         ),
//       );
//     },
//     onSuccess: () => {
//       refetch(); // Trigger a refetch of the data
//     },
//   });
// }


function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch("https://l5bsv3fb-5000.uks1.devtunnels.ms/api/editUser/", {
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

      const response = await fetch("https://l5bsv3fb-5000.uks1.devtunnels.ms/api/deleteUser/", {
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
  <LocalizationProvider dateAdapter={AdapterDayjs}>
  <Example />
  </LocalizationProvider>

</QueryClientProvider>
);

export default ExampleWithProviders;

const validateRequired = (value) => !!value.length;

function validateUser(agreement) {
  return {
    room_id: !validateRequired(agreement.room_id) ? 'room_id is Required' : '',
    customer_id: !validateRequired(agreement.customer_id) ? 'customer_id is Required' : '',
    payment_type: agreement.payment_type.length === 0 ? 'payment_type is Required' : '',
    payment_period: agreement.payment_period.length === 0 ? 'payment_period is Required' : '',
    base_payment_percent: agreement.base_payment_percent.length === 0 ? 'base_payment_percent is Required' : '',
    payment_duration: agreement.payment_duration.length === 0 ? 'payment_duration is Required' : '',
    repayment_started: !agreement.repayment_started ? 'Repayment Started is Required' : '',
    grace_period: agreement.grace_period === undefined || agreement.grace_period === '' ? 'Grace Period is Required' : '',
 
    Percent_per_day_penality: agreement.Percent_per_day_penality === undefined || agreement.Percent_per_day_penality === '' || agreement.Percent_per_day_penality < 1 || agreement.Percent_per_day_penality > 100 ? 'Percent Customer to Live must be between 1 and 100' : '',
    percent_the_customer_to_live: agreement.percent_the_customer_to_live === undefined || agreement.percent_the_customer_to_live === '' || agreement.percent_the_customer_to_live < 1 || agreement.percent_the_customer_to_live > 100 ? 'Percent Customer to Live must be between 1 and 100' : '',
    when_legal_case: agreement.when_legal_case === undefined || agreement.when_legal_case === '' || agreement.when_legal_case < 1 || agreement.when_legal_case > 100 ? 'When Legal Case must be between 1 and 100' : '',
    when_agreement_cancel: agreement.when_agreement_cancel === undefined || agreement.when_agreement_cancel === '' || agreement.when_agreement_cancel < 1 || agreement.when_agreement_cancel > 100 ? 'When Agreement Cancel must be between 1 and 100' : '',
  };
}