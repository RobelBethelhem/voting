import React, { useMemo, useState } from 'react'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

export const textColumn = (key) => ({
  accessorKey: key,
  header: key,
  enableClickToCopy: true,
  enableEditing: false,
  size: 80,
})

export const dateColumn = (key) => ({
  accessorKey: key,
  header: key,
  filterVariant: 'date',
  filterFn: 'between',
  sortingFn: 'datetime',
  Cell: ({ cell }) => {
    const value = cell.getValue()
    if (!value) return ''
    const date = new Date(value)
    return isNaN(date) ? '' : date.toLocaleDateString()
  },
  muiTableHeadCellProps: { sx: { fontStyle: 'italic' } },
  enableEditing: false,
  size: 80,
})

// Table of saved ratings whose KPI columns come from the criteria the backend
// returns in meta.criteria, so renamed or added criteria show up automatically
const RatingsTable = ({ title, url, infoColumns, summaryColumns, fileName }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const accessToken = useSelector((state) => state.user.accessToken)

  const {
    data: fetchData = { data: [], meta: {} },
    isError,
    isRefetching,
    isLoading,
  } = useQuery({
    queryKey: ['ratings-table', url],
    queryFn: async () => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
      })
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
      return response.json()
    },
    placeholderData: keepPreviousData,
  })

  const { data = [], meta = {} } = fetchData
  const criteria = meta.criteria ?? []

  const columns = useMemo(
    () => [
      ...infoColumns,
      {
        id: 'KPI',
        header: 'KPI_STAT',
        columns: criteria.map((c) => ({ ...textColumn(c.key), header: c.name })),
      },
      summaryColumns,
    ],
    [infoColumns, summaryColumns, criteria],
  )

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
    enableEditing: false,
    getRowId: (row) => row.id,
    muiToolbarAlertBannerProps: isError
      ? {
          color: 'error',
          children: 'Error loading data',
        }
      : undefined,
    muiTableContainerProps: {
      sx: { minHeight: '500px' },
    },
    renderTopToolbarCustomActions: () => (
      <Box>
        <Button
          color="primary"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          startIcon={<FileDownloadIcon />}
          variant="contained"
        >
          Export
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
          <MenuItem onClick={handleExportExcel}>Export as Excel</MenuItem>
        </Menu>
      </Box>
    ),
    state: {
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
    },
  })

  // Export the filtered rows of every visible column, using the on-screen headers
  const exportTable = () => {
    const leafColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.columnDef.accessorKey)
    const head = leafColumns.map((column) => column.columnDef.header)
    const body = table
      .getPrePaginationRowModel()
      .rows.map((row) => leafColumns.map((column) => row.getValue(column.id) ?? ''))
    return { head, body }
  }

  const handleExportPDF = () => {
    const { head, body } = exportTable()
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.autoTable({ head: [head], body, styles: { fontSize: 6 } })
    doc.save(`${fileName}.pdf`)
    setAnchorEl(null)
  }

  const handleExportExcel = () => {
    const { head, body } = exportTable()
    const worksheet = XLSX.utils.aoa_to_sheet([head, ...body])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
    setAnchorEl(null)
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <MaterialReactTable table={table} />
    </Box>
  )
}

RatingsTable.propTypes = {
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  infoColumns: PropTypes.array.isRequired,
  summaryColumns: PropTypes.object.isRequired,
  fileName: PropTypes.string.isRequired,
}

export default RatingsTable
