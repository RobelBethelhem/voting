import React, { useMemo } from 'react';
import {
  Box,
  Stack,
  Button,
  ListItemIcon,
  MenuItem,
  Typography,
  lighten,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AccountCircle, Send, CheckCircleOutline, HighlightOff } from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  MaterialReactTable,
  createMRTColumnHelper,
  useMaterialReactTable,
  MRT_GlobalFilterTextField,
  MRT_ToggleFiltersButton,
  MRT_ToggleDensePaddingButton,
  MRT_ShowHideColumnsButton,
  MRT_ToggleFullScreenButton,
} from 'material-react-table';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { data } from './makeData';
// import ThumbUpIcon from '@mui/icons-material/ThumbUp';
//import DoneIcon from '@mui/icons-material/Done';
import VerifiedIcon from '@mui/icons-material/Verified';


const columnHelper = createMRTColumnHelper();

const csvConfig = mkConfig({
  fieldSeparator: ',',
  decimalSeparator: '.',
  useKeysAsHeaders: true,
});

const AdvancedTables = () => {

  const maxSalary = useMemo(
    () => data.reduce((acc, curr) => Math.max(acc, curr.salary), 0),
    [],
  );

  const minSalary = useMemo(
    () => {
      if (data.length === 0) {
        return 0;
      }
      return data.reduce((acc, curr) => Math.min(acc, curr.salary), data[0].salary);
    },
    [data]
  );

  const averageSalary = useMemo(
    () => data.reduce((acc, curr) => acc + curr.salary, 0) / data.length,
    [],
  );

  const totalSalary = useMemo(
    () => data.reduce((acc, curr) => acc + curr.salary, 0),
    [],
  );


  const columns = useMemo(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        columns: [
          {
            accessorFn: (row) => `${row.firstName} ${row.lastName}`,
            id: 'name',
            header: 'Name',
            enableClickToCopy: true,
            filterVariant: 'autocomplete',
            size: 250,
            Cell: ({ renderedCellValue, row }) => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <img
                  alt="avatar"
                  height={30}
                  src={row.original.avatar}
                  loading="lazy"
                  style={{ borderRadius: '50%' }}
                />
                <span>{renderedCellValue}</span>
              </Box>
            ),
          },
          {
            accessorKey: 'email',
            enableClickToCopy: true,
            filterVariant: 'autocomplete',
            header: 'Email',
            size: 250,
          },
        ],
      },
      {
        id: 'id',
        header: 'Job Info',
        columns: [
          {
            accessorKey: 'salary',
            filterFn: 'between',
            enableClickToCopy: true,
            header: 'Salary',
            aggregationFn: ['max','mean','sum','min'],
            size: 200,
            Cell: ({ cell }) => (
              <Box
                component="span"
                sx={(theme) => ({
                  backgroundColor:
                    cell.getValue() < 50000
                      ? theme.palette.error.dark
                      : cell.getValue() >= 50000 && cell.getValue() < 75000
                      ? theme.palette.warning.dark
                      : theme.palette.success.dark,
                  borderRadius: '0.25rem',
                  color: '#fff',
                  maxWidth: '9ch',
                  p: '0.25rem',
                })}
              >
                {cell.getValue()?.toLocaleString?.('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </Box>
            ),
            AggregatedCell: ({ cell, table }) => (
              <>
                Oldest by{' '}
                {table.getColumn(cell.row.groupingColumnId ?? '').columnDef.header}:{' '}
                <Box
                  sx={{ color: 'info.main', display: 'inline', fontWeight: 'bold' }}
                >
                  {cell.getValue()}
                </Box>


                Average by{' '}
            {table.getColumn(cell.row.groupingColumnId ?? '').columnDef.header}:{' '}
            <Box sx={{ color: 'success.main', fontWeight: 'bold' }}>
              {cell.getValue()?.toLocaleString?.('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              
            </Box>

            Sum by{' '}
            {table.getColumn(cell.row.groupingColumnId ?? '').columnDef.header}:{' '}
            <Box sx={{ color: 'success.main', fontWeight: 'bold' }}>
              {cell.getValue()?.toLocaleString?.('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              
            </Box>

            Min by{' '}
            {table.getColumn(cell.row.groupingColumnId ?? '').columnDef.header}:{' '}
            <Box sx={{ color: 'success.main', fontWeight: 'bold' }}>
              {cell.getValue()?.toLocaleString?.('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              
            </Box>
            
              </>
            ),
            Footer: () => (
              <Stack direction="column" spacing={2}>

                <Stack>
                  Min Salary:
                  <Box color="warning.main">
                    {minSalary?.toLocaleString?.('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Box>
                </Stack>


                <Stack>
                  Max Salary:
                  <Box color="warning.main">
                    {maxSalary?.toLocaleString?.('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Box>
                </Stack>
            
                <Stack>
                  Average Salary:
                  <Box color="warning.main">
                    {averageSalary?.toLocaleString?.('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Box>
                </Stack>

                <Stack>
                  Total Salary:
                  <Box color="warning.main">
                    {totalSalary?.toLocaleString?.('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Box>
                </Stack>

                


              </Stack>
            ),
          },
          {
            accessorKey: 'jobTitle',
            enableClickToCopy: true,
            filterVariant: 'autocomplete',
            header: 'Job Title',
            size: 250,
          },
          {
            accessorFn: (row) => new Date(row.startDate),
            id: 'startDate',
            header: 'Start Date',
            filterVariant: 'date',
            filterFn: 'lessThan',
            sortingFn: 'datetime',
            Cell: ({ cell }) => cell.getValue()?.toLocaleDateString(),
            Header: ({ column }) => <em>{column.columnDef.header}</em>,
            muiFilterTextFieldProps: {
              sx: {
                minWidth: '250px',
              },
            },
          },
        ],
      },
    ],
    []
  );

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  const handleExportData = () => {
    const csv = generateCsv(csvConfig)(data);
    download(csvConfig)(csv);
  };

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnFilterModes: true,
    enableColumnResizing: true,
    enableColumnOrdering: true,
   
    enableGrouping: true,
    enableColumnPinning: true,
    enableFacetedValues: true,
    enableRowActions: true,
    enableRowSelection: true,
    enableBottomToolbar: true,
    enableStickyHeader: true,
    enableRowPinning: true,
   
    rowPinningDisplayMode: 'top-and-bottom',
    initialState: {
      showColumnFilters: true,
      showGlobalFilter: true,
      columnPinning: {
        left: ['mrt-row-expand', 'mrt-row-select'],
        right: ['mrt-row-actions'],
      },
    },
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    muiSearchTextFieldProps: {
      size: 'small',
      variant: 'outlined',
    },
    muiPaginationProps: {
      color: 'secondary',
      rowsPerPageOptions: [10, 20, 30, 50, 100, 500, 1000, 2000, 5000, 10000, 100000, 1000000],
      shape: 'rounded',
      variant: 'outlined',
    },
    renderDetailPanel: ({ row }) => (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-around',
          left: '30px',
          maxWidth: '1000px',
          position: 'sticky',
          width: '100%',
        }}
      >
        <img
          alt="avatar"
          height={200}
          src={row.original.avatar}
          loading="lazy"
          style={{ borderRadius: '50%' }}
        />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4">Signature Catch Phrase:</Typography>
          <Typography variant="h1">
            &quot;{row.original.signatureCatchPhrase}&quot;
          </Typography>
        </Box>
      </Box>
    ),
    renderRowActionMenuItems: ({row, closeMenu }) => {
      const isSalaryGreaterThan70000 = row.original.salary > 70000;
      return [
      
      <MenuItem
        key={0}
        onClick={() => {
          // View profile logic...
          closeMenu();
        }}
        sx={{ m: 0 }}
      >
        <ListItemIcon>
          <AccountCircle />
        </ListItemIcon>
        View Profile
      </MenuItem>,
      <MenuItem
        key={1}
        onClick={() => {
          // Send email logic...
          closeMenu();
        }}
        sx={{ m: 0 }}
      >
        <ListItemIcon>
          <Send />
        </ListItemIcon>
        Send Email
      </MenuItem>,

isSalaryGreaterThan70000 && (
  <>
    <MenuItem
      key={2}
      onClick={() => {
        // Authorize logic...
        closeMenu();
      }}
      sx={{ m: 0 }}
    >
      <ListItemIcon>
        <VerifiedIcon />
      </ListItemIcon>
      Authorize
    </MenuItem>
    <MenuItem
      key={3}
      onClick={() => {
        // Reject logic...
        closeMenu();
      }}
      sx={{ m: 0 }}
    >
      <ListItemIcon>
        <HighlightOff />
      </ListItemIcon>
      Reject
    </MenuItem>
  </>
),
      
    ]},



    renderTopToolbar: ({ table }) => {
      const handleDeactivate = () => {
        table.getSelectedRowModel().flatRows.map((row) => {
          alert('deactivating ' + row.getValue('name'));
        });
      };

      const handleActivate = () => {
        table.getSelectedRowModel().flatRows.map((row) => {
          alert('activating ' + row.getValue('name'));
        });
      };

      const handleContact = () => {
        table.getSelectedRowModel().flatRows.map((row) => {
          alert('contact ' + row.getValue('name'));
        });
      };

      return (
        <Box
          sx={(theme) => ({
            backgroundColor: lighten(theme.palette.background.default, 0.05),
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            p: '8px',
            justifyContent: 'space-between',
          })}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}
          >
            <Box sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MRT_GlobalFilterTextField table={table} />
              <MRT_ToggleFiltersButton table={table} />
              <MRT_ToggleDensePaddingButton table={table} />
              <MRT_ShowHideColumnsButton table={table} />
              <MRT_ToggleFullScreenButton table={table} />
            </Box>
            <Box sx={{ display: 'flex', gap: '0.5rem' }}>

            <Button
      color="success"
      disabled={!table.getIsSomeRowsSelected()}
      onClick={handleActivate}
      variant="contained"
      startIcon={<VerifiedIcon />} // Use ThumbUpIcon for "Authorize"
    >
      Authorize
    </Button>

              <Button
                color="error"
                disabled={!table.getIsSomeRowsSelected()}
                onClick={handleDeactivate}
                variant="contained"
                startIcon={<HighlightOff />}
              >
                Reject
              </Button>
             
              {/* <Button
                color="info"
                disabled={!table.getIsSomeRowsSelected()}
                onClick={handleContact}
                variant="contained"
              >
                Contact
              </Button> */}
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: '16px',
              padding: '8px',
              flexWrap: 'wrap',
            }}
          >
            <Button
              onClick={handleExportData}
              startIcon={<FileDownloadIcon />}
            >
              Export All Data
            </Button>
            <Button
              disabled={table.getPrePaginationRowModel().rows.length === 0}
              onClick={() =>
                handleExportRows(table.getPrePaginationRowModel().rows)
              }
              startIcon={<FileDownloadIcon />}
            >
              Export All Rows
            </Button>
            <Button
              disabled={table.getRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getRowModel().rows)}
              startIcon={<FileDownloadIcon />}
            >
              Export Page Rows
            </Button>
            <Button
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
              startIcon={<FileDownloadIcon />}
            >
              Export Selected Rows
            </Button>
          </Box>
        </Box>
      );
    },
  });

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'auto',
        width: '100%',
      }}
      className="fixed-header-table"
    >
      <MaterialReactTable table={table} />
    </Box>
  );
};

const ExampleWithLocalizationProvider = () => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <AdvancedTables />
  </LocalizationProvider>
);

export default ExampleWithLocalizationProvider;