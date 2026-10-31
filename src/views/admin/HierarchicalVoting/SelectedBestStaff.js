import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Button,
  ButtonGroup
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { motion } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import { buildSelectionWorkbook } from './selectionWorkbook';
import { FiscalYearSelect, useFiscalYears, withFiscalYear } from '../FiscalYear/fiscalYearSelect';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const SelectedBestStaff = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  const [loading, setLoading] = useState(true);
  const [selectedChiefIndex, setSelectedChiefIndex] = useState(0);
  const [chiefsData, setChiefsData] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { years, selected: fiscalYearId, setSelected: setFiscalYearId, selectedYear, loading: yearsLoading } = useFiscalYears(accessToken);
  // Added to export file names so each year's workbook is told apart
  const yearSuffix = selectedYear ? `_${selectedYear.name.replace(/[^\w-]+/g, '_')}` : '';

  // Approved staff of the chosen fiscal year (the current one by default)
  useEffect(() => {
    if (!yearsLoading) {
      setSelectedChiefIndex(0);
      fetchBestStaffByChiefs();
    }
  }, [fiscalYearId, yearsLoading]);

  const fetchBestStaffByChiefs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(withFiscalYear(`${API_BASE}/staff-approval/best-staff-by-chiefs`, fiscalYearId), {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.chiefs) {
          setChiefsData(result.data.chiefs);
          if (result.data.chiefs.length === 0) {
            setError('No approved staff found.');
          }
        } else {
          setError('Failed to load data.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch data from server.');
        toast.error(errorData.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching best staff by chiefs:', error);
      setError('An error occurred while fetching data.');
      toast.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleChiefTabChange = (event, newValue) => {
    setSelectedChiefIndex(newValue);
  };

  // Every candidate under the chief (or under every chief with approved staff when no
  // chiefId), with the score details the chief ranked on
  const fetchSelectionDetails = async (chiefId) => {
    const query = chiefId ? `?chief_id=${encodeURIComponent(chiefId)}` : '';
    const response = await fetch(withFiscalYear(`${API_BASE}/staff-approval/selection-details${query}`, fiscalYearId), {
      headers: {
        'x-access-token': accessToken
      }
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load candidate details');
    }
    return result.data.chiefs;
  };

  // Export current chief's sheet: all candidates, the selected staff and who approved them
  const exportCurrentChiefToExcel = async () => {
    if (!currentChief || !currentChief.top_performers || currentChief.top_performers.length === 0) {
      toast.warning('No data to export for this chief');
      return;
    }

    try {
      setExporting(true);
      const chiefs = await fetchSelectionDetails(currentChief.chief_id);
      if (chiefs.length === 0) {
        toast.warning('No candidate details found for this chief');
        return;
      }

      const wb = buildSelectionWorkbook(chiefs, { includeSelectedBest: false });
      const fileName = `Best_Staff_${currentChief.chief_name?.replace(/\s+/g, '_')}${yearSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Error exporting chief to Excel:', error);
      toast.error(error.message || 'Error exporting Excel file');
    } finally {
      setExporting(false);
    }
  };

  // Export all chiefs: one sheet per chief plus a "Selected Best" sheet of everyone approved
  const exportAllChiefsToExcel = async () => {
    if (!chiefsData || chiefsData.length === 0) {
      toast.warning('No data to export');
      return;
    }

    try {
      setExporting(true);
      const chiefs = await fetchSelectionDetails();
      if (chiefs.length === 0) {
        toast.warning('No candidate details found');
        return;
      }

      // Same order as the chief tabs
      const tabOrder = chiefsData.map(chief => chief.chief_id);
      chiefs.sort((a, b) => tabOrder.indexOf(a.chief_id) - tabOrder.indexOf(b.chief_id));

      const wb = buildSelectionWorkbook(chiefs, { includeSelectedBest: true });
      const fileName = `All_Best_Staff${yearSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Excel file with all chiefs exported successfully!');
    } catch (error) {
      console.error('Error exporting all chiefs to Excel:', error);
      toast.error(error.message || 'Error exporting Excel file');
    } finally {
      setExporting(false);
    }
  };

  // Define columns for the table
  const columns = [
    {
      accessorKey: 'rank',
      header: 'Rank',
      size: 80,
      Cell: ({ cell }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {cell.getValue() <= 3 && (
            <EmojiEventsIcon
              sx={{
                color: cell.getValue() === 1 ? '#FFD700' : cell.getValue() === 2 ? '#C0C0C0' : '#CD7F32',
                fontSize: 20
              }}
            />
          )}
          <Typography variant="body2" fontWeight="bold">
            #{cell.getValue()}
          </Typography>
        </Box>
      )
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
    },
    {
      accessorKey: 'department',
      header: 'Department',
      size: 180,
    },
    {
      accessorKey: 'position',
      header: 'Position',
      size: 180,
      Cell: ({ cell }) => (
        <Typography variant="body2">
          {cell.getValue() || 'N/A'}
        </Typography>
      )
    },
    {
      accessorKey: 'final_score',
      header: 'Final Score',
      size: 120,
      Cell: ({ cell }) => (
        <Chip
          label={cell.getValue()?.toFixed(2) || '0.00'}
          color={cell.getValue() >= 80 ? 'success' : cell.getValue() >= 60 ? 'primary' : 'default'}
          size="small"
        />
      )
    }
  ];

  const yearPicker = (
    <FiscalYearSelect years={years} value={fiscalYearId} onChange={setFiscalYearId} />
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>{yearPicker}</Box>
        <Alert severity="warning">
          {error}{selectedYear ? ` (fiscal year ${selectedYear.name})` : ''}
        </Alert>
      </Box>
    );
  }

  if (chiefsData.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>{yearPicker}</Box>
        <Alert severity="info">No chiefs with approved staff found.</Alert>
      </Box>
    );
  }

  const currentChief = chiefsData[selectedChiefIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            <EmojiEventsIcon sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle', color: '#FFD700' }} />
            Selected Best Staff
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {yearPicker}
          <ButtonGroup variant="contained" sx={{ gap: 1 }}>
            <Button
              startIcon={<FileDownloadIcon />}
              onClick={exportCurrentChiefToExcel}
              color="primary"
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export Current Chief'}
            </Button>
            <Button
              startIcon={<FileDownloadIcon />}
              onClick={exportAllChiefsToExcel}
              color="secondary"
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export All Chiefs'}
            </Button>
          </ButtonGroup>
          </Box>
        </Box>

        <Card elevation={3}>
          <CardContent>
            {/* Chief Tabs */}
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={selectedChiefIndex}
                onChange={handleChiefTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    minHeight: 72,
                    py: 2
                  }
                }}
              >
                {chiefsData.map((chief, index) => (
                  <Tab
                    key={chief.chief_id || index}
                    label={
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {chief.chief_name || 'Unknown Chief'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chief.position || 'Position N/A'}
                        </Typography>
                        <Chip
                          label={`${chief.total_approved || 0} Approved`}
                          size="small"
                          color="primary"
                          sx={{ ml: 1, mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Paper>

            {/* Selected Chief Info */}
            {currentChief && (
              <Box sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="h6" gutterBottom>
                    Chief: {currentChief.chief_name || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Position: {currentChief.position || 'N/A'}
                  </Typography>
                  {currentChief.department && (
                    <Typography variant="body2" color="text.secondary">
                      Department: {currentChief.department}
                    </Typography>
                  )}
                  <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                    Total Top Performers: {currentChief.total_approved || 0}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Top Performers Table */}
            {currentChief && currentChief.top_performers && currentChief.top_performers.length > 0 ? (
              <MaterialReactTable
                columns={columns}
                data={currentChief.top_performers}
                enableColumnResizing
                enableStickyHeader
                enablePagination
                initialState={{
                  pagination: { pageSize: 10, pageIndex: 0 },
                  sorting: [{ id: 'rank', desc: false }]
                }}
                muiTableContainerProps={{ sx: { maxHeight: '600px' } }}
                muiTableHeadCellProps={{
                  sx: {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
                muiTableBodyRowProps={({ row }) => ({
                  sx: {
                    backgroundColor: row.original.rank <= 3 ? '#fff9e6' : 'inherit',
                    '&:hover': {
                      backgroundColor: '#f0f7ff'
                    }
                  }
                })}
              />
            ) : (
              <Alert severity="info">No top performers found for this chief.</Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
};

export default SelectedBestStaff;
