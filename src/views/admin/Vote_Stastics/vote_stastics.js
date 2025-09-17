import { useMemo, useState } from 'react';
import {
  MRT_EditActionButtons,
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import FileDownloadIcon from '@mui/icons-material/FileDownload';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
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

// Import libraries for PDF and Excel export
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Example = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
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
      const fetchURL = new URL('http://localhost:5000/api/rms/admin/landing/get_vote_stastics');

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
        id: 'voter',
        header: 'Voter_Info',
        columns: [
          {
            accessorKey: 'voter_first_name',
            header: 'voter_first_name',
            filterVariant: 'autocomplete',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'voter_last_name',
            header: 'voter_last_name',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'voter_emp_id',
            header: 'voter_emp_id',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'voter_position',
            header: 'voter_position',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'voter_department',
            header: 'voter_department',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
        ]
      },
      {
        id: 'Candidate',
        header: 'Candidate_Info',
        columns: [
          {
            accessorKey: 'candidate_first_name',
            header: 'candidate_first_name',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'candidate_last_name',
            header: 'candidate_last_name',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'candidate_emp_id',
            header: 'candidate_emp_id',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
    
          {
            accessorKey: 'candidate_position',
            header: 'candidate_position',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
          {
            accessorKey: 'candidate_department',
            header: 'candidate_department',
            enableClickToCopy: true,
            enableEditing: false,
            size: 80,
          },
    

        ]},
        {
          id: 'KPI',
          header: 'KPI_STAT',
          columns: [
            {
              accessorKey: 'Dedication',
              header: 'Dedication',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Quality_of_Work',
              header: 'Quality_of_Work',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Collaboration_Or_Team_Work',
              header: 'Collaboration_Or_Team_Work',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Independence',
              header: 'Independence',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Customer_Service',
              header: 'Customer_Service',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Time_Mgt',
              header: 'Time_Mgt',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Proper_Office_Attire_and_Dress_Code',
              header: 'Proper_Office_Attire_and_Dress_Code',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
            {
              accessorKey: 'Flexibility',
              header: 'Flexibility',
              enableClickToCopy: true,
              enableEditing: false,
              size: 80,
            },
          ]},
          {
            id: 'KPI_Weight',
            header: 'KPI_Weight',
            columns: [ 
              {
                accessorKey: 'Total_Weight',
                header: 'Total_Weight',
                enableClickToCopy: true,
                enableEditing: false,
                size: 80,
              },
              {
                accessorKey: 'Accrue_Weight',
                header: 'Accrue_Weight',
                enableClickToCopy: true,
                enableEditing: false,
                size: 80,
              },

              {
                accessorKey: 'TimeStamp',
                header: 'TimeStamp',
                filterVariant: 'date',
                filterFn: 'between',
                sortingFn: 'datetime',
                Cell: ({ cell }) => {
                  if ("TimeStamp" in cell.row.original) {
                    if (cell.row.original.TimeStamp && cell.row.original.TimeStamp.length > 0) {
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
              
            ]}

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

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  const handleExportData = () => {
    const csv = generateCsv(csvConfig)(data);
    download(csvConfig)(csv);
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

  const handleExportMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [columns.map((column) => column.header)],
      body: data.map((row) => columns.map((column) => row[column.accessorKey])),
    });
    doc.save('table_data.pdf');
    handleExportMenuClose();
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'table_data.xlsx');
    handleExportMenuClose();
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
    enableEditing: false,
    getRowId: (row) => row.id,
    muiTableContainerProps: {
      sx: { minHeight: '500px' },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateUser,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveUser,
    renderTopToolbarCustomActions: ({ table }) => (
      <Box>
        <Button
          color="primary"
          onClick={handleExportMenuClick}
          startIcon={<FileDownloadIcon />}
          variant="contained"
        >
          Export
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleExportMenuClose}
        >
          <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
          <MenuItem onClick={handleExportExcel}>Export as Excel</MenuItem>
        </Menu>
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

      const response = await fetch("/api/api/rms/admin/site/register_site", {
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
  return useMutation({
    mutationFn: async (user) => {

      const response = await fetch("/api/api/rms/admin/site/update_register_site", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'x-access-token': accessToken,
        },
        body: JSON.stringify(user)
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
  return useMutation({
    mutationFn: async (userId) => {
      // const response = await axios.delete(`http://localhost:5000/api/deleteUser/`, {
      //   data: { id: userId },
      // });

      const response = await fetch("/api/api/rms/admin/site/delete_register_site", {
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



function validateUser(site) {
  
}