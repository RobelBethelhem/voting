import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControlLabel,
  MenuItem,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { MaterialReactTable } from 'material-react-table'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useSelector } from 'react-redux'
import * as XLSX from 'xlsx'

import ParticipationChart, { COLORS } from './ParticipationChart'
import { FiscalYearSelect, useFiscalYears, withFiscalYear } from '../FiscalYear/fiscalYearSelect'
import { API_BASE } from 'src/api/base'

const API = `${API_BASE}/rms/admin/landing/participation-dashboard`
const NONE = '__none__'
const TOP_N = 10
const AUTO_REFRESH_MS = 60 * 1000

const CATEGORY_LABEL = {
  managerial_staff: 'Manager',
  non_managerial_staff: 'Non-managerial staff',
}

const TABS = {
  voters: 0,
  departments: 1,
  directors: 2,
  ratings: 3,
  notCovered: 4,
}

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '')

// Chief and director filters match on id; NONE picks rows with nobody assigned
const matchesFilters = (row, filters) =>
  (!filters.chief || (filters.chief === NONE ? !row.chief_id : row.chief_id === filters.chief)) &&
  (!filters.director ||
    (filters.director === NONE ? !row.director_id : row.director_id === filters.director)) &&
  (!filters.department || row.department === filters.department)

const optionsFrom = (rows, idKey, nameKey) => {
  const options = new Map()
  let unassigned = false
  rows.forEach((row) => {
    if (row[idKey]) options.set(row[idKey], row[nameKey])
    else unassigned = true
  })
  return {
    options: [...options].sort((a, b) => a[1].localeCompare(b[1])),
    unassigned,
  }
}

// Exports the rows the table currently shows (filters and search applied, every page)
const exportTable = (table, fileName, columns) => {
  const rows = table.getPrePaginationRowModel().rows.map((row) => row.original)
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((row) => Object.fromEntries(columns.map(([header, value]) => [header, value(row)]))),
  )
  sheet['!cols'] = columns.map(([header]) => ({ wch: Math.max(12, header.length + 2) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

const StatTile = ({ label, value, detail, progress, onClick }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2 }}>
      <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: 32, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.3 }}
      >
        {value}
      </Typography>
      {progress !== undefined && (
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: COLORS.accentTrack, my: 0.75 }}>
          <Box
            sx={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 3,
              bgcolor: COLORS.accent,
            }}
          />
        </Box>
      )}
      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
        {detail}
      </Typography>
    </CardActionArea>
  </Card>
)

StatTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  detail: PropTypes.string.isRequired,
  progress: PropTypes.number,
  onClick: PropTypes.func,
}

// Status always pairs its color with an icon and a word
const StatusChip = ({ done, doneLabel, pendingLabel }) => (
  <Chip
    size="small"
    icon={done ? <CheckCircleOutlineIcon /> : <HourglassEmptyIcon />}
    label={done ? doneLabel : pendingLabel}
    sx={{
      bgcolor: done ? COLORS.good : COLORS.warning,
      color: done ? '#ffffff' : COLORS.textPrimary,
      '& .MuiChip-icon': { color: 'inherit' },
    }}
  />
)

StatusChip.propTypes = {
  done: PropTypes.bool.isRequired,
  doneLabel: PropTypes.string.isRequired,
  pendingLabel: PropTypes.string.isRequired,
}

const VotedCell = ({ row }) => (
  <StatusChip done={row.original.voted} doneLabel="Voted" pendingLabel="Not voted" />
)
VotedCell.propTypes = { row: PropTypes.object.isRequired }

const RatedCell = ({ row }) => (
  <StatusChip done={row.original.rated} doneLabel="Rated" pendingLabel="Pending" />
)
RatedCell.propTypes = { row: PropTypes.object.isRequired }

const PercentCell = ({ cell }) => {
  const value = cell.getValue()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: COLORS.accentTrack }}>
        <Box sx={{ width: `${value}%`, height: '100%', borderRadius: 3, bgcolor: COLORS.accent }} />
      </Box>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
        {value}%
      </Typography>
    </Box>
  )
}
PercentCell.propTypes = { cell: PropTypes.object.isRequired }

const PendingRatings = ({ row }) => {
  const pending = row.original.items.filter((item) => !item.rated)
  if (pending.length === 0) {
    return <Typography variant="body2">Everyone on this director&apos;s list is rated.</Typography>
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Still to rate ({pending.length})
      </Typography>
      {pending.map((item) => (
        <Typography key={`${item.ratee_id}-${item.rating_category}`} variant="body2">
          {item.ratee_name} ({item.ratee_id}) · {CATEGORY_LABEL[item.rating_category]} ·{' '}
          {item.department}
        </Typography>
      ))}
    </Box>
  )
}
PendingRatings.propTypes = { row: PropTypes.object.isRequired }

const voterColumns = [
  { accessorKey: 'name', header: 'Name', size: 180 },
  { accessorKey: 'employee_id', header: 'Employee ID', size: 100 },
  { accessorKey: 'position', header: 'Position', size: 200 },
  { accessorKey: 'department', header: 'Department', size: 220 },
  { accessorKey: 'voted', header: 'Status', size: 120, Cell: VotedCell },
  { accessorFn: (r) => formatDateTime(r.voted_at), id: 'voted_at', header: 'Voted On', size: 150 },
  { accessorKey: 'manager_name', header: 'Manager', size: 160 },
  { accessorKey: 'director_name', header: 'Director', size: 160 },
  { accessorKey: 'chief_name', header: 'Chief', size: 160 },
  { accessorKey: 'email', header: 'Email', size: 220 },
]

const voterExport = [
  ['Employee ID', (r) => r.employee_id],
  ['Name', (r) => r.name],
  ['Position', (r) => r.position],
  ['Job Grade', (r) => r.job_grade],
  ['Department', (r) => r.department],
  ['Status', (r) => (r.voted ? 'Voted' : 'Not voted')],
  ['Voted On', (r) => formatDateTime(r.voted_at)],
  ['Manager', (r) => r.manager_name],
  ['Director', (r) => r.director_name],
  ['Chief', (r) => r.chief_name],
  ['Email', (r) => r.email],
]

const departmentColumns = [
  { accessorKey: 'department', header: 'Department', size: 260 },
  { accessorKey: 'eligible', header: 'Eligible Staff', size: 110 },
  { accessorKey: 'voted', header: 'Voted', size: 90 },
  { accessorKey: 'not_voted', header: 'Not Voted', size: 100 },
  { accessorKey: 'participation', header: 'Participation', size: 170, Cell: PercentCell },
  { accessorKey: 'candidates', header: 'Candidates', size: 100 },
  { accessorKey: 'director_name', header: 'Director', size: 160 },
  { accessorKey: 'chief_name', header: 'Chief', size: 160 },
]

const departmentExport = [
  ['Department', (r) => r.department],
  ['Eligible Staff', (r) => r.eligible],
  ['Voted', (r) => r.voted],
  ['Not Voted', (r) => r.not_voted],
  ['Participation %', (r) => r.participation],
  ['Candidates', (r) => r.candidates],
  ['Director', (r) => r.director_name],
  ['Chief', (r) => r.chief_name],
]

const directorColumns = [
  { accessorKey: 'director_name', header: 'Director', size: 180 },
  { accessorKey: 'director_position', header: 'Position', size: 220 },
  { accessorKey: 'chief_name', header: 'Chief', size: 160 },
  {
    accessorFn: (r) => `${r.managers_rated} / ${r.managers_total}`,
    id: 'managers',
    header: 'Managers Rated',
    size: 120,
  },
  {
    accessorFn: (r) => `${r.staff_rated} / ${r.staff_total}`,
    id: 'staff',
    header: 'Non-managerial Rated',
    size: 150,
  },
  { accessorKey: 'pending', header: 'Pending', size: 90 },
  { accessorKey: 'completion', header: 'Completion', size: 170, Cell: PercentCell },
]

const directorExport = [
  ['Director ID', (r) => r.director_id],
  ['Director', (r) => r.director_name],
  ['Position', (r) => r.director_position],
  ['Chief', (r) => r.chief_name],
  ['Managers To Rate', (r) => r.managers_total],
  ['Managers Rated', (r) => r.managers_rated],
  ['Non-managerial To Rate', (r) => r.staff_total],
  ['Non-managerial Rated', (r) => r.staff_rated],
  ['Pending', (r) => r.pending],
  ['Completion %', (r) => r.completion],
]

const ratingColumns = [
  { accessorKey: 'director_name', header: 'Director', size: 170 },
  { accessorKey: 'ratee_name', header: 'To Rate', size: 170 },
  { accessorKey: 'ratee_id', header: 'Employee ID', size: 100 },
  {
    accessorFn: (r) => CATEGORY_LABEL[r.rating_category],
    id: 'category',
    header: 'Category',
    size: 150,
  },
  { accessorKey: 'ratee_position', header: 'Position', size: 200 },
  { accessorKey: 'department', header: 'Department', size: 220 },
  { accessorKey: 'performance_appraisal_score', header: 'Appraisal', size: 90 },
  { accessorKey: 'rated', header: 'Status', size: 110, Cell: RatedCell },
  { accessorFn: (r) => formatDateTime(r.rated_at), id: 'rated_at', header: 'Rated On', size: 150 },
  { accessorKey: 'chief_name', header: 'Chief', size: 160 },
]

const ratingExport = [
  ['Director ID', (r) => r.director_id],
  ['Director', (r) => r.director_name],
  ['Employee ID', (r) => r.ratee_id],
  ['To Rate', (r) => r.ratee_name],
  ['Category', (r) => CATEGORY_LABEL[r.rating_category]],
  ['Position', (r) => r.ratee_position],
  ['Department', (r) => r.department],
  ['Appraisal', (r) => r.performance_appraisal_score],
  ['Status', (r) => (r.rated ? 'Rated' : 'Pending')],
  ['Rated On', (r) => formatDateTime(r.rated_at)],
  ['Chief', (r) => r.chief_name],
]

const notCoveredColumns = [
  { accessorKey: 'name', header: 'Name', size: 170 },
  { accessorKey: 'employee_id', header: 'Employee ID', size: 100 },
  {
    accessorFn: (r) => CATEGORY_LABEL[r.rating_category],
    id: 'category',
    header: 'Category',
    size: 150,
  },
  { accessorKey: 'position', header: 'Position', size: 200 },
  { accessorKey: 'department', header: 'Department', size: 220 },
  { accessorKey: 'reason', header: 'Why No Director Can Rate', size: 260 },
  { accessorKey: 'manager_name', header: 'Manager', size: 160 },
  { accessorKey: 'performance_appraisal_score', header: 'Appraisal', size: 90 },
]

const notCoveredExport = [
  ['Employee ID', (r) => r.employee_id],
  ['Name', (r) => r.name],
  ['Category', (r) => CATEGORY_LABEL[r.rating_category]],
  ['Position', (r) => r.position],
  ['Department', (r) => r.department],
  ['Why No Director Can Rate', (r) => r.reason],
  ['Manager', (r) => r.manager_name],
  ['Director', (r) => r.director_name],
  ['Chief', (r) => r.chief_name],
  ['Appraisal', (r) => r.performance_appraisal_score],
]

const tableDefaults = {
  enableStickyHeader: true,
  enableColumnResizing: true,
  initialState: { density: 'compact', pagination: { pageSize: 25, pageIndex: 0 } },
  muiTableContainerProps: { sx: { maxHeight: 560 } },
}

const ExportButton = ({ onClick }) => (
  <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={onClick}>
    Export to Excel
  </Button>
)
ExportButton.propTypes = { onClick: PropTypes.func.isRequired }

// Admin view of who has not taken part yet: eligible staff who have not peer-voted, and the
// managers and non-managerial staff each director has not rated
const ParticipationDashboard = () => {
  const accessToken = useSelector((state) => state.user.accessToken)
  const {
    years,
    selected: fiscalYearId,
    setSelected: setFiscalYearId,
    selectedYear,
    loading: yearsLoading,
  } = useFiscalYears(accessToken)
  // A closed year shows the figures frozen when it closed; nothing to refresh
  const closedYear = selectedYear?.status === 'closed'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filters, setFilters] = useState({ chief: '', director: '', department: '' })
  const [tab, setTab] = useState(TABS.voters)
  const [voteStatus, setVoteStatus] = useState('not_voted')
  const [ratingStatus, setRatingStatus] = useState('pending')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(withFiscalYear(API, fiscalYearId), {
        headers: { 'x-access-token': accessToken },
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.message || `Request failed with status ${response.status}`)
      }
      setData(result.data)
      setError(null)
    } catch (err) {
      console.error('Error loading participation dashboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, fiscalYearId])

  useEffect(() => {
    if (accessToken && !yearsLoading) load()
  }, [accessToken, load, yearsLoading])

  useEffect(() => {
    if (!autoRefresh || closedYear) return undefined
    const timer = setInterval(load, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [autoRefresh, closedYear, load])

  const changeFiscalYear = (id) => {
    setFiscalYearId(id)
    setFilters({ chief: '', director: '', department: '' })
  }

  const voters = useMemo(() => data?.voters ?? [], [data])
  const ratings = useMemo(
    () => (data?.director_ratings ?? []).map((r) => ({ ...r, department: r.ratee_department })),
    [data],
  )
  const notCovered = useMemo(() => data?.not_covered ?? [], [data])

  const filterOptions = useMemo(() => {
    const everyone = [...voters, ...ratings, ...notCovered]
    return {
      chiefs: optionsFrom(everyone, 'chief_id', 'chief_name'),
      directors: optionsFrom(everyone, 'director_id', 'director_name'),
      departments: [...new Set(everyone.map((r) => r.department).filter(Boolean))].sort(),
    }
  }, [voters, ratings, notCovered])

  const filtered = useMemo(
    () => ({
      voters: voters.filter((r) => matchesFilters(r, filters)),
      ratings: ratings.filter((r) => matchesFilters(r, filters)),
      notCovered: notCovered.filter((r) => matchesFilters(r, filters)),
      directorsWithoutManagers: (data?.directors_without_managers ?? []).filter(
        (d) =>
          (!filters.chief ||
            (filters.chief === NONE ? !d.chief_id : d.chief_id === filters.chief)) &&
          (!filters.director ||
            (filters.director === NONE ? false : d.director_id === filters.director)),
      ),
    }),
    [voters, ratings, notCovered, data, filters],
  )

  const departmentRows = useMemo(() => {
    const byDepartment = new Map()
    filtered.voters.forEach((v) => {
      const row = byDepartment.get(v.department) || {
        department: v.department,
        director_name: v.director_name,
        chief_name: v.chief_name,
        candidates: v.candidates_in_department,
        eligible: 0,
        voted: 0,
      }
      row.eligible += 1
      if (v.voted) row.voted += 1
      byDepartment.set(v.department, row)
    })
    return [...byDepartment.values()].map((row) => ({
      ...row,
      not_voted: row.eligible - row.voted,
      participation: percent(row.voted, row.eligible),
    }))
  }, [filtered.voters])

  const directorRows = useMemo(() => {
    const byDirector = new Map()
    filtered.ratings.forEach((r) => {
      const row = byDirector.get(r.director_id) || {
        director_id: r.director_id,
        director_name: r.director_name,
        director_position: r.director_position,
        chief_name: r.chief_name,
        items: [],
      }
      row.items.push(r)
      byDirector.set(r.director_id, row)
    })
    return [...byDirector.values()].map((row) => {
      const count = (category, rated) =>
        row.items.filter(
          (i) => i.rating_category === category && (rated === undefined || i.rated === rated),
        ).length
      const rated = row.items.filter((i) => i.rated).length
      return {
        ...row,
        managers_total: count('managerial_staff'),
        managers_rated: count('managerial_staff', true),
        staff_total: count('non_managerial_staff'),
        staff_rated: count('non_managerial_staff', true),
        pending: row.items.length - rated,
        completion: percent(rated, row.items.length),
      }
    })
  }, [filtered.ratings])

  const stats = useMemo(() => {
    const voted = filtered.voters.filter((v) => v.voted).length
    const rated = filtered.ratings.filter((r) => r.rated).length
    return {
      eligible: filtered.voters.length,
      voted,
      notVoted: filtered.voters.length - voted,
      departmentsWithNonVoters: departmentRows.filter((d) => d.not_voted > 0).length,
      expected: filtered.ratings.length,
      rated,
      pending: filtered.ratings.length - rated,
      directorsPending: directorRows.filter((d) => d.pending > 0).length,
    }
  }, [filtered, departmentRows, directorRows])

  const departmentChart = useMemo(
    () =>
      [...departmentRows]
        .sort((a, b) => b.not_voted - a.not_voted || a.department.localeCompare(b.department))
        .slice(0, TOP_N)
        .map((d) => ({
          id: d.department,
          label: d.department,
          outstanding: d.not_voted,
          completed: d.voted,
        })),
    [departmentRows],
  )

  const directorChart = useMemo(
    () =>
      [...directorRows]
        .sort((a, b) => b.pending - a.pending || a.director_name.localeCompare(b.director_name))
        .slice(0, TOP_N)
        .map((d) => ({
          id: d.director_id,
          label: d.director_name,
          outstanding: d.pending,
          completed: d.items.length - d.pending,
        })),
    [directorRows],
  )

  const shownVoters = filtered.voters.filter(
    (v) => voteStatus === 'all' || (voteStatus === 'voted' ? v.voted : !v.voted),
  )
  const shownRatings = filtered.ratings.filter(
    (r) => ratingStatus === 'all' || (ratingStatus === 'rated' ? r.rated : !r.rated),
  )

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const hasFilters = Boolean(filters.chief || filters.director || filters.department)

  const selectDepartment = (department) => {
    setFilter('department', department)
    setVoteStatus('not_voted')
    setTab(TABS.voters)
  }
  const selectDirector = (directorId) => {
    setFilter('director', directorId)
    setRatingStatus('pending')
    setTab(TABS.ratings)
  }

  const period = data?.voting_period
  const daysLeft = period
    ? Math.ceil((new Date(period.end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null

  if (error && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Participation Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            Who has not peer-voted yet, and which managers and staff each director has not rated
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FiscalYearSelect years={years} value={fiscalYearId} onChange={changeFiscalYear} />
          {closedYear && (
            <Chip
              color="default"
              label={`Closed year · figures as at ${formatDateTime(data?.snapshot_at || selectedYear.closed_at)}`}
            />
          )}
          {period && !closedYear && (
            <Chip
              variant="outlined"
              label={`${period.period_name || period.period_id} · ends ${formatDate(
                period.end_date,
              )} · ${daysLeft > 0 ? `${daysLeft} days left` : 'ended'}`}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefresh && !closedYear}
                disabled={closedYear}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Auto-refresh every minute</Typography>}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading || closedYear}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {error && data && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not refresh: {error}. Showing data from {formatDateTime(data.generated_at)}.
        </Alert>
      )}

      {/* Filters scope everything below */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <TextField
          select
          size="small"
          label="Chief"
          value={filters.chief}
          onChange={(e) => setFilter('chief', e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All chiefs</MenuItem>
          {filterOptions.chiefs.options.map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
          {filterOptions.chiefs.unassigned && <MenuItem value={NONE}>No chief assigned</MenuItem>}
        </TextField>
        <TextField
          select
          size="small"
          label="Director"
          value={filters.director}
          onChange={(e) => setFilter('director', e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All directors</MenuItem>
          {filterOptions.directors.options.map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
          {filterOptions.directors.unassigned && (
            <MenuItem value={NONE}>No director assigned</MenuItem>
          )}
        </TextField>
        <Autocomplete
          size="small"
          options={filterOptions.departments}
          value={filters.department || null}
          onChange={(e, value) => setFilter('department', value || '')}
          renderInput={(params) => <TextField {...params} label="Department" />}
          sx={{ minWidth: 300 }}
        />
        {hasFilters && (
          <Button
            size="small"
            onClick={() => setFilters({ chief: '', director: '', department: '' })}
          >
            Clear filters
          </Button>
        )}
        {data && (
          <Typography variant="caption" sx={{ color: COLORS.textMuted, ml: 'auto' }}>
            Updated {formatDateTime(data.generated_at)}
          </Typography>
        )}
      </Box>

      <Box sx={{ opacity: loading && data ? 0.6 : 1, transition: 'opacity 150ms' }}>
        {/* KPI row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 2,
            mb: 2,
          }}
        >
          <StatTile
            label="Peer voting participation"
            value={`${percent(stats.voted, stats.eligible)}%`}
            progress={percent(stats.voted, stats.eligible)}
            detail={`${stats.voted} of ${stats.eligible} eligible staff voted`}
            onClick={() => setTab(TABS.departments)}
          />
          <StatTile
            label="Staff not voted yet"
            value={stats.notVoted}
            detail={`In ${stats.departmentsWithNonVoters} departments`}
            onClick={() => {
              setVoteStatus('not_voted')
              setTab(TABS.voters)
            }}
          />
          <StatTile
            label="Director ratings completed"
            value={`${percent(stats.rated, stats.expected)}%`}
            progress={percent(stats.rated, stats.expected)}
            detail={`${stats.rated} of ${stats.expected} ratings given`}
            onClick={() => setTab(TABS.directors)}
          />
          <StatTile
            label="Director ratings pending"
            value={stats.pending}
            detail={`${stats.directorsPending} of ${directorRows.length} directors still rating`}
            onClick={() => {
              setRatingStatus('pending')
              setTab(TABS.ratings)
            }}
          />
          <StatTile
            label="Not on any director's list"
            value={filtered.notCovered.length}
            detail="Qualifying managers and staff no director can rate"
            onClick={() => setTab(TABS.notCovered)}
          />
        </Box>

        {data && data.staff_without_candidates > 0 && !hasFilters && (
          <Typography
            variant="caption"
            sx={{ color: COLORS.textSecondary, display: 'block', mb: 2 }}
          >
            {data.staff_without_candidates} staff work in departments with no candidates, so they
            have nobody to vote for and are not counted as eligible.
          </Typography>
        )}

        {/* Charts */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <ParticipationChart
            title="Staff not voted, by department"
            caption={`Top ${Math.min(TOP_N, departmentRows.length)} of ${
              departmentRows.length
            } departments by staff not voted. Click a bar to list that department.`}
            rows={departmentChart}
            outstanding="Not voted"
            completed="Voted"
            onSelect={selectDepartment}
            emptyText="No eligible staff for these filters"
            dimmed={loading}
          />
          <ParticipationChart
            title="Director ratings pending, by director"
            caption={`Top ${Math.min(TOP_N, directorRows.length)} of ${
              directorRows.length
            } directors by ratings pending. Click a bar to see who they still need to rate.`}
            rows={directorChart}
            outstanding="Pending"
            completed="Rated"
            onSelect={selectDirector}
            emptyText="No director has managers or staff to rate for these filters"
            dimmed={loading}
          />
        </Box>

        {/* Detail tables */}
        <Card variant="outlined">
          <Tabs
            value={tab}
            onChange={(e, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          >
            <Tab label={`Staff Voting (${stats.notVoted} not voted)`} />
            <Tab label={`Departments (${departmentRows.length})`} />
            <Tab label={`Directors (${directorRows.length})`} />
            <Tab label={`Director Ratings (${stats.pending} pending)`} />
            <Tab label={`Not Covered (${filtered.notCovered.length})`} />
          </Tabs>
          <CardContent>
            {tab === TABS.voters && (
              <MaterialReactTable
                {...tableDefaults}
                columns={voterColumns}
                data={shownVoters}
                state={{ isLoading: loading && !data }}
                renderTopToolbarCustomActions={({ table }) => (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={voteStatus}
                      onChange={(e, value) => value && setVoteStatus(value)}
                    >
                      <ToggleButton value="not_voted">Not voted</ToggleButton>
                      <ToggleButton value="voted">Voted</ToggleButton>
                      <ToggleButton value="all">All</ToggleButton>
                    </ToggleButtonGroup>
                    <ExportButton onClick={() => exportTable(table, 'Staff_Voting', voterExport)} />
                  </Box>
                )}
              />
            )}

            {tab === TABS.departments && (
              <MaterialReactTable
                {...tableDefaults}
                columns={departmentColumns}
                data={departmentRows}
                state={{ isLoading: loading && !data }}
                initialState={{
                  ...tableDefaults.initialState,
                  sorting: [{ id: 'not_voted', desc: true }],
                }}
                muiTableBodyRowProps={({ row }) => ({
                  onClick: () => selectDepartment(row.original.department),
                  sx: { cursor: 'pointer' },
                  title: 'Show this department’s staff',
                })}
                renderTopToolbarCustomActions={({ table }) => (
                  <ExportButton
                    onClick={() => exportTable(table, 'Department_Participation', departmentExport)}
                  />
                )}
              />
            )}

            {tab === TABS.directors && (
              <MaterialReactTable
                {...tableDefaults}
                columns={directorColumns}
                data={directorRows}
                state={{ isLoading: loading && !data }}
                initialState={{
                  ...tableDefaults.initialState,
                  sorting: [{ id: 'pending', desc: true }],
                }}
                renderDetailPanel={PendingRatings}
                renderTopToolbarCustomActions={({ table }) => (
                  <ExportButton
                    onClick={() => exportTable(table, 'Director_Rating_Progress', directorExport)}
                  />
                )}
              />
            )}

            {tab === TABS.ratings && (
              <MaterialReactTable
                {...tableDefaults}
                columns={ratingColumns}
                data={shownRatings}
                state={{ isLoading: loading && !data }}
                renderTopToolbarCustomActions={({ table }) => (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={ratingStatus}
                      onChange={(e, value) => value && setRatingStatus(value)}
                    >
                      <ToggleButton value="pending">Pending</ToggleButton>
                      <ToggleButton value="rated">Rated</ToggleButton>
                      <ToggleButton value="all">All</ToggleButton>
                    </ToggleButtonGroup>
                    <ExportButton
                      onClick={() => exportTable(table, 'Director_Ratings', ratingExport)}
                    />
                  </Box>
                )}
              />
            )}

            {tab === TABS.notCovered && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  These qualifying managers and staff are not on any director&apos;s rating list, so
                  they will get 0 for the director rating. Link them on the Hierarchy Mapping page
                  (manager → director, staff → manager).
                </Alert>
                <MaterialReactTable
                  {...tableDefaults}
                  columns={notCoveredColumns}
                  data={filtered.notCovered}
                  state={{ isLoading: loading && !data }}
                  renderTopToolbarCustomActions={({ table }) => (
                    <ExportButton
                      onClick={() => exportTable(table, 'Not_Covered', notCoveredExport)}
                    />
                  )}
                />
                {filtered.directorsWithoutManagers.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Directors with no managers linked ({filtered.directorsWithoutManagers.length})
                      — they have nobody to rate
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {filtered.directorsWithoutManagers.map((d) => (
                        <Chip
                          key={d.director_id}
                          size="small"
                          variant="outlined"
                          label={`${d.director_name} (${d.director_id})`}
                          title={d.director_position}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default ParticipationDashboard
