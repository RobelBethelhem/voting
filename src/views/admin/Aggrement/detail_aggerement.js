import React, { useMemo, useState, useEffect } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { API_BASE } from 'src/api/base';

// Custom Table component
const CustomTable = ({ data, columns }) => {
  const table = useMaterialReactTable({ columns, data });
  return <MaterialReactTable table={table} />;
};

const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isSpecialDialogOpen, setIsSpecialDialogOpen] = useState(false);
  const [isDialogOpenSpecial, setIsDialogOpenSpecial] = useState(false);


  const [isDataChanged, setIsDataChanged] = useState(false);
  const [newTabData, setNewTabData] = useState({
    name: '',
    discountRate: '',
    gracePeriod: '',
    percentPerDayPenalty: '',
    repaymentStartDate: null,
  });
  const [newTabDataSpecial, setNewTabDataSpecial] = useState({
    start_date: null,
    end_date: null,
  });

  

  

  const accessToken = useSelector((state) => state.user.accessToken);
  const aggrementDetailId = useSelector((state) => state.aggrementDetailId);
  const [editedUsers, setEditedUsers] = useState({});

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Id',
        enableEditing: false,
        size: 80,
      },
      
      {
        accessorKey: 'name',
        header: 'Tag Name',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'amount',
        header: 'Amount to Pay',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'principalPayment',
        header: 'Principal Payment',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'interestPayment',
        header: 'Interest Payment',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'remainingBalance',
        header: 'Remaining Balance',
        enableEditing: false,
        size: 80,
      },
      {
        accessorFn: (row) => new Date(row.dueDate),
        header: 'Due date',
        filterVariant: 'date',
        Cell: ({ cell }) => cell.getValue()?.toLocaleDateString(),
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },

      {
        accessorKey: 'unpaid_date_difference',
        header: 'Unpaid Date Difference',
        size: 200,
        enableEditing: false,
      },  
      {
        accessorKey: 'left_amount',
        header: 'Left Amount',
        size: 200,
        enableEditing: false,
      },  
      {
        accessorKey: 'accrue_left_amount',
        header: 'Accrue Left Amount',
        size: 200,
        enableEditing: false,
      },  
      
      
      {
        accessorKey: 'payment',
        header: 'Paid Amount',
        filterFn: 'between',
        muiEditTextFieldProps: ({ row }) => ({
          type: 'number',
          required: true,
          error: !!validationErrors[row.id]?.paid_amount,
          helperText: validationErrors[row.id]?.paid_amount,
          onChange: (event) => {
            const newValue = event.target.value;
            setEditedUsers(prev => ({
              ...prev,
              [row.id]: { ...prev[row.id], paid_amount: newValue },
            }));
          },
        }),
      },

      {
        accessorFn: (row) => new Date(row.paidDate),
        header: 'Paid Date',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value && !isNaN(new Date(value)) ? new Date(value).toLocaleDateString() : '';
        },
        Header: ({ column }) => <em>{column.columnDef.header}</em>,
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'status',
        header: 'Paid',
        editVariant: 'select',
        editSelectOptions: ["Paid", "Partially Paid","Paid Late", "Unpaid"],
        muiEditTextFieldProps: ({ row }) => ({
          select: true,
          error: !!validationErrors[row.id]?.status,
          helperText: validationErrors[row.id]?.status,
          onChange: (event) => {
            const newValue = event.target.value;
            setEditedUsers(prev => ({
              ...prev,
              [row.id]: { ...prev[row.id], status: newValue },
            }));
          },
        }),
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
        accessorKey: 'Updated_At',
        header: 'Updated At',
        filterVariant: 'date',
        filterFn: 'between',
        sortingFn: 'datetime',
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value && !isNaN(new Date(value)) ? new Date(value).toLocaleDateString() : '';
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
    [editedUsers, validationErrors],
  );

  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser();
  const {
    data: fetchedData = [],
    isError: isLoadingUsersError,
    isFetching: isFetchingUsers,
    isLoading: isLoadingUsers,
    refetch,
  } = useGetUsers(accessToken, aggrementDetailId);
  const { mutateAsync: updateUsers, isPending: isUpdatingUsers } = useUpdateUsers();
  const { mutateAsync: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const { mutateAsync: registerAggrement } = useRegisterAggrement();
  const { mutateAsync: RegisterSpecial_No_Penality } = useRegisterSpecial_No_Penality();

  useEffect(() => {
    if (Array.isArray(fetchedData) && fetchedData.length > 0) {
      const groupedData = fetchedData.reduce((acc, item) => {
        const tabName = item.name || 'Main';
        if (!acc[tabName]) {
          acc[tabName] = [];
        }
        acc[tabName].push(item);
        return acc;
      }, {});

      const newTabs = Object.entries(groupedData).map(([name, data], index) => ({
        id: index.toString(),
        name: name,
        data: data,
      }));

      setTabs(newTabs);
    }
  }, [fetchedData]);

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

  const handleSaveUsers = async () => {
    const currentTab = tabs[activeTab];
    const updatedRows = currentTab.data.map(row => {
      const editedUser = editedUsers[row.id];
      if (editedUser) {
        const validationErrors = validateUser(editedUser);
        if (Object.keys(validationErrors).length > 0) {
          setValidationErrors(prev => ({
            ...prev,
            [row.id]: validationErrors,
          }));
          return null; // Skip this row if there are validation errors
        }
        return { ...row, ...editedUser };
      }
      return row;
    }).filter(Boolean); // Remove null entries (rows with validation errors)
  
    if (updatedRows.length !== currentTab.data.length) {
      // There were validation errors
      return;
    }
  
    const dataToSend = {
      paid_aggrements: updatedRows.filter(row => editedUsers[row.id]),
      agreement_id: aggrementDetailId,
      tab_name: currentTab.name,
    };
  
    try {
      await updateUsers(dataToSend);
      setEditedUsers({});
      setTabs(prevTabs => {
        const newTabs = [...prevTabs];
        newTabs[activeTab] = { ...newTabs[activeTab], data: updatedRows };
        return newTabs;
      });
      refetch();
      setIsDataChanged(false);
      setValidationErrors({}); // Clear validation errors after successful save
    } catch (error) {
      console.error('Error updating users:', error);
    }
  };

  const handleRefresh = () => {
    const currentTab = tabs[activeTab];
    refetch({ queryKey: ['users', aggrementDetailId, currentTab.id] });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleAddSpecialTab = () => {
    setIsDialogOpenSpecial(true);
  };

  const handleAddTab = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialogSpecial = () => {
    setIsDialogOpenSpecial(false);
    setNewTabDataSpecial({
      start_date: null,
      end_date: null,
    });
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


  const handleCreateTabSpecial = async () => {
    if (newTabDataSpecial.start_date && newTabDataSpecial.end_date) {
      try {
        const response = await RegisterSpecial_No_Penality({
          start_date: newTabDataSpecial.start_date.format('YYYY-MM-DD'),
          end_date: newTabDataSpecial.end_date.format('YYYY-MM-DD'),
          agreement_id: aggrementDetailId,
        });
        if (response && response.error === false && Array.isArray(response.data)) {
          const newTab = {
            id: (tabs.length + 1).toString(),
            name: `Special No Penalty (${newTabDataSpecial.start_date.format('YYYY-MM-DD')} - ${newTabDataSpecial.end_date.format('YYYY-MM-DD')})`,
            data: response.data,
          };
          setTabs(prevTabs => [...prevTabs, newTab]);
          setActiveTab(tabs.length);
          handleCloseDialogSpecial();
        } else {
          console.error('Invalid response from server:', response);
        }
      } catch (error) {
        console.error('Error creating new special no penalty tab:', error);
      }
    }
  };


  const table = useMaterialReactTable({
    columns,
    data: tabs[activeTab]?.data || [],
    createDisplayMode: 'row',
    editDisplayMode: 'cell',
    enableCellActions: true,
    enableClickToCopy: 'context-menu',
    enableColumnPinning: true,
    enableEditing: true,
    enableRowActions: true,
    paginationDisplayMode: 'pages',
    enableColumnOrdering: true,
    enableGrouping: true,
    enableStickyHeader: true,
    enableRowPinning: true,
    enableFacetedValues: true,
    rowPinningDisplayMode: 'top-and-bottom',
    getRowId: (row) => row.id,
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
    onEditingRowSave: ({ row, values }) => {
      setEditedUsers(prev => ({
        ...prev,
        [row.id]: { ...row.original, ...values },
      }));
      setIsDataChanged(true);  // Set the change flag when data is edited
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    renderBottomToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Button
          color="success"
          variant="contained"
          onClick={handleSaveUsers}
          disabled={
            Object.keys(editedUsers).length === 0 ||
            Object.values(validationErrors).some((error) => !!error)
          }
        >
          {isUpdatingUsers ? <CircularProgress size={25} /> : 'Save'}
        </Button>
        {Object.values(validationErrors).some((error) => !!error) && (
          <Typography color="error">Fix errors before submitting</Typography>
        )}
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <Tooltip arrow title="Refresh Data">
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    state: {
      isLoading: isLoadingUsers,
      isSaving: isCreatingUser || isUpdatingUsers || isDeletingUser,
      showAlertBanner: isLoadingUsersError,
      showProgressBars: isFetchingUsers,
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} sx={{ flexGrow: 1 }}>
          {tabs.map((tab, index) => (
            <Tab key={`tab-${index}`} label={tab.name} />
          ))}
        </Tabs>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddTab}
          variant="contained"
          sx={{ ml: 2 }}
        >
          Add Restructure
        </Button>
        <Button
        startIcon={<AddIcon />}
        onClick={handleAddSpecialTab}
        variant="contained"
        sx={{ ml: 2 }}
      >
        Special No Penalty
      </Button>
     
      
      </Box>
      <MaterialReactTable table={table}  columns={columns} data={tabs[activeTab]?.data || []} />
     
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Create New Restructure</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tab Name"
            fullWidth
            value={newTabData.name}
            onChange={(e) => setNewTabData({ ...newTabData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Discount Rate"
            fullWidth
            value={newTabData.discountRate}
            onChange={(e) => setNewTabData({ ...newTabData, discountRate: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Grace Period"
            fullWidth
            value={newTabData.gracePeriod}
            onChange={(e) => setNewTabData({ ...newTabData, gracePeriod: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Percent Per Day Penalty"
            fullWidth
            value={newTabData.percentPerDayPenalty}
            onChange={(e) => setNewTabData({ ...newTabData, percentPerDayPenalty: e.target.value })}
          />
          <DatePicker
            label="Repayment Start Date"
            value={newTabData.repaymentStartDate}
            onChange={(newValue) => setNewTabData({ ...newTabData, repaymentStartDate: newValue })}
            renderInput={(params) => <TextField {...params} fullWidth margin="dense" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateTab}>Create</Button>
        </DialogActions>
      </Dialog>

    


      <Dialog open={isDialogOpenSpecial} onClose={handleCloseDialogSpecial}>
        <DialogTitle>Create New No Penalty Period</DialogTitle>
        <DialogContent>
          <DatePicker
            label="Start Date"
            value={newTabDataSpecial.start_date}
            onChange={(newValue) => setNewTabDataSpecial(prev => ({ ...prev, start_date: newValue }))}
            renderInput={(params) => <TextField {...params} fullWidth margin="dense" />}
            minDate={dayjs()}
          />
          <DatePicker
            label="End Date"
            value={newTabDataSpecial.end_date}
            onChange={(newValue) => setNewTabDataSpecial(prev => ({ ...prev, end_date: newValue }))}
            renderInput={(params) => <TextField {...params} fullWidth margin="dense" />}
            minDate={newTabDataSpecial.start_date ? newTabDataSpecial.start_date.add(1, 'day') : dayjs().add(1, 'day')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogSpecial}>Cancel</Button>
          <Button 
            onClick={handleCreateTabSpecial}
            disabled={!newTabDataSpecial.start_date || !newTabDataSpecial.end_date}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return Promise.resolve();
    },
    onMutate: (newUserInfo) => {
      queryClient.setQueryData(['users'], (prevUsers) => [
        ...prevUsers,
        {
          ...newUserInfo,
          id: (Math.random() + 1).toString(36).substring(7),
        },
      ]);
    },
  });
}

function useGetUsers(accessToken, aggrementDetailId) {
  return useQuery({
    queryKey: ['users', aggrementDetailId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/rms/admin/landing/get_detail_aggerement`, {
        method: 'POST',
        headers: {
          'x-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({id: aggrementDetailId}),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.data || [];
    },
    refetchOnWindowFocus: false,
  });
}

function useUpdateUsers() {
  const queryClient = useQueryClient();
  const accessToken = useSelector((state) => state.user.accessToken);

  return useMutation({
    mutationFn: async (dataToSend) => {
      const response = await fetch(`${API_BASE}/rms/admin/paid_installment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    },
    onMutate: (newUsers) => {
      queryClient.setQueryData(['users'], (prevUsers) =>
        prevUsers?.map((user) => {
          const newUser = newUsers.find((u) => u.id === user.id);
          return newUser ? newUser : user;
        }),
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.agreement_id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return Promise.resolve();
    },
    onMutate: (userId) => {
      queryClient.setQueryData(['users'], (prevUsers) =>
        prevUsers?.filter((user) => user.id !== userId),
      );
    },
  });
}


// function useRegisterSpecial_No_Penality() {
//   const accessToken = useSelector((state) => state.user.accessToken);
//   const aggrementDetailId = useSelector((state) => state.aggrementDetailId);

//   return useMutation({
//     mutationFn: async (data) => {

      
//       const response = await fetch(`${API_BASE}/rms/admin/special_no_penality`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'x-access-token': accessToken,
//         },
//         body: JSON.stringify({
//           ...data,
//           agreement_id: aggrementDetailId,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error('Network response was not ok');
//       }

//       return await response.json();
//     },
//   });
// }


function useRegisterSpecial_No_Penality() {
  const accessToken = useSelector((state) => state.user.accessToken);

  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE}/rms/admin/special_no_penality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    },
  });
}



function useRegisterAggrement() {
  const accessToken = useSelector((state) => state.user.accessToken);
  const aggrementDetailId = useSelector((state) => state.aggrementDetailId);

  return useMutation({
    mutationFn: async (data) => {

      
      const response = await fetch(`${API_BASE}/rms/admin/restructure_agreement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({
          ...data,
          agreement_id: aggrementDetailId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
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

const validateRequired = (value) => value !== undefined && value !== null && value !== '';


function validateUser(user) {
  const errors = {};
  if (!validateRequired(user.status)) {
    errors.status = 'Status is required';
  }
  if (!validateRequired(user.paid_amount)) {
    errors.paid_amount = 'Paid amount is required';
  }
  return errors;
}