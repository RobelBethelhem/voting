import { useMemo, useState } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';

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
      const fetchURL = new URL(`${API_BASE}/rms/admin/landing/get_site_manager_kpi`, window.location.origin);

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
        accessorKey: 'site_manager_id',
        header: 'Site manager ID',
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
        accessorKey: 'site_manager_name',
        header: 'Site Manager Name',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'site_name',
        header: 'Site name',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },
      {
        accessorKey: 'description',
        header: 'Site Description',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },
      {
        accessorKey: 'country',
        header: 'Country',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },
      {
        accessorKey: 'region',
        header: 'Region',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },
      {
        accessorKey: 'city',
        header: 'City',
        enableEditing: false,
        filterFn: 'between',
        size: 80,
      },


      // {
      //   accessorKey: 'repayment_started',
      //   header: 'Repayment Started',
      //   enableEditing: false,
      //   size: 80,
      // },
      // {
      //   accessorKey: 'repayment_end',
      //   header: 'Repayment End',
      //   enableEditing: false,
      //   size: 80,
      // },
      {
        accessorKey: 'over_all_target_amount',
        header: 'Over All Target Amount',
        filterFn: 'between',
        enableEditing: false,
        size: 300,
      },
      {
        accessorKey: 'over_all_achieved_amount',
        header: 'Over All Achieved Amount',
        filterFn: 'between',
        enableEditing: false,
        size: 300,
      },
      {
        accessorKey: 'over_all_KPI_percentage',
        header: 'Over All KPI Percentage',
        filterFn: 'between',
        enableEditing: false,
        size: 300,
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
  // const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
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
      sx: { minHeight: '500px',
        
       },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Add KPI</DialogTitle>
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
        <DialogTitle variant="h3">Edit KPI</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {internalEditComponents}
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
      type: 'setSiteManagerID', 
      siteManagerID: row.id 
    });
    navigate('/admin/KPIForSiteManager/detailKPI');
  }}>
    <InfoIcon />
  </IconButton>
</Tooltip>
        {/* <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip> */}
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
          Add KPI
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
        <DialogTitle>Delete KPI</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this KPI of Site Manager?
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

      const response = await fetch(`${API_BASE}/rms/admin/register_KPI_for_site_manager`, {
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


// function useUpdateUser() {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (user) => {

//       const response = await fetch(`${API_BASE}/rms/admin/update_KPI_for_site_manager`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(user)
//       });

//       // const response = await axios.patch(`${API_BASE}/editUser/`, user);
     
//       const data = await response.json()
//       if(response.ok){
//         toast.success(`Action Done Successfully`);
//       }else{
//         toast.error(`Error: ${data.message}`);
//       }
     
     
//     },
//     onMutate: (newUserInfo) => {
//       queryClient.setQueryData(['users'], (prevUsers) =>
//         prevUsers?.map((prevUser) =>
//           prevUser.id === newUserInfo.id ? newUserInfo : prevUser,
//         ),
//       );
//     },
//   });
// }

function useDeleteUser(refetch) {
  const queryClient = useQueryClient();
  const accessToken = useSelector((state) => state.user.accessToken);
  return useMutation({
    mutationFn: async (userId) => {
      // const response = await axios.delete(`${API_BASE}/deleteUser/`, {
      //   data: { id: userId },
      // });

      const response = await fetch(`${API_BASE}/rms/admin/delete_KPI_for_site_manager`, {
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



function validateUser(KPI_for_site_manager) {
  return {
    site_manager_id: !validateRequired(KPI_for_site_manager.site_manager_id) ? 'site_manager_id is Required' : '',
  };
}