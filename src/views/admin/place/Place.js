import { useMemo, useState, useEffect } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { maped_data } from './listvalue';
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
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector } from 'react-redux';
import { API_BASE } from 'src/api/base';

const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [currentCountry, setCurrentCountry] = useState('');
  const [currentRegion, setCurrentRegion] = useState('');
  const [currentCity, setCurrentCity] = useState('');

  const handleCountryChange = (event) => {
    const country = event.target.value;
    setCurrentCountry(country);
    setCurrentRegion('');
    setCurrentCity('');
  };

  const handleRegionChange = (event) => {
    const region = event.target.value;
    setCurrentRegion(region);
    setCurrentCity('');
  };

  const handleCityChange = (event) => {
    setCurrentCity(event.target.value);
  };

  const getRegions = () => {
    const country = maped_data.find((c) => c.name === currentCountry);
    return country ? country.regions : [];
  };

  const getCities = () => {
    const regions = getRegions();
    const region = regions.find((r) => r.name === currentRegion);
    return region ? region.cities : [];
  };

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
      const fetchURL = new URL(`${API_BASE}/rms/admin/landing/get_place`, window.location.origin);

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
        enableClickToCopy: true,
        size: 80,
      },
      {
        accessorKey: 'country',
        header: 'Country',
        filterVariant: 'autocomplete',
        editVariant: 'select',
        editSelectOptions: maped_data.map((c) => c.name),
        muiEditTextFieldProps: {
          select: true,
          error: !!validationErrors?.country,
          helperText: validationErrors?.country,
          onChange: handleCountryChange,
          value: currentCountry,
        },
      },
      {
        accessorKey: 'region',
        header: 'Region',
        editVariant: 'select',
        editSelectOptions: getRegions().map((r) => r.name),
        muiEditTextFieldProps: {
          select: true,
          error: !!validationErrors?.region,
          helperText: validationErrors?.region,
          onChange: handleRegionChange,
          value: currentRegion,
        },
      },
      {
        accessorKey: 'city',
        header: 'City',
        editVariant: 'select',
        editSelectOptions: getCities(),
        muiEditTextFieldProps: {
          select: true,
          error: !!validationErrors?.city,
          helperText: validationErrors?.city,
          onChange: handleCityChange,
          value: currentCity,
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
    [validationErrors, currentCountry, currentRegion, currentCity]
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
    table.setCreatingRow(null);
  };

  const handleSaveUser = async ({ values, table }) => {
    const updatedValues = {
      ...values,
      country: currentCountry,
      region: currentRegion,
      city: currentCity,
    };
    const newValidationErrors = validateUser(updatedValues);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await updateUser(updatedValues);
    table.setEditingRow(null);
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
    data,
    
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
    onCreatingRowCancel: () => {
      setValidationErrors({});
      setCurrentCountry('');
      setCurrentRegion('');
      setCurrentCity('');
    },
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">New Place</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {internalEditComponents.map((component, index) => (
            <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {component}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </DialogActions>
      </>
    ),
    renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
      <>
        <DialogTitle variant="h3">Edit Place</DialogTitle>
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
          <IconButton
            color="error"
            onClick={() => {
              setOpenDeleteModal(true);
              setSelectedRow(row);
            }}
          >
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
            setValidationErrors({});
            setCurrentCountry('');
            setCurrentRegion('');
            setCurrentCity('');
            table.setCreatingRow(true);
          }}
        >
          Add Place
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

  useEffect(() => {
    if (table.getState().editingRow) {
      const { country, region, city } = table.getState().editingRow.original;
      setCurrentCountry(country);
      setCurrentRegion(region);
      setCurrentCity(city);
    }
  }, [table.getState().editingRow]);

  return (
    <>
      <MaterialReactTable table={table} />
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete Place</DialogTitle>
        <DialogContent>Are you sure you want to delete this Place?</DialogContent>
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
      const response = await fetch(`${API_BASE}/rms/admin/place/register_place`, {
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
          prevUser.id === newUserInfo.id ? newUserInfo : prevUser
        )
      );
    },
    onSuccess: () => {
      refetch();
    },
  });
}

function useUpdateUser() {
  const accessToken = useSelector((state) => state.user.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user) => {
      const response = await fetch(`${API_BASE}/rms/admin/place/update_register_place`, {
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
          prevUser.id === newUserInfo.id ? newUserInfo : prevUser
        )
      );
    },
  });
}

function useDeleteUser(refetch) {
  const accessToken = useSelector((state) => state.user.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`${API_BASE}/rms/admin/place/delete_register_place`, {
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
        prevUsers?.filter((user) => user.id !== userId)
      );
    },
    onSuccess: () => {
      refetch();
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

function validateUser(user) {
  return {
    country: user.country.length === 0 ? 'Country is required' : '',
    region: user.region.length === 0 ? 'Region is required' : '',
    city: user.city.length === 0 ? 'City is required' : '',
  };
}