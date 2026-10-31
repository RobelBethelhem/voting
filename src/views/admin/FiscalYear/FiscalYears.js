import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { MaterialReactTable } from 'material-react-table'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import AddIcon from '@mui/icons-material/Add'
import { useSelector } from 'react-redux'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { FISCAL_YEARS_API, formatDate, useFiscalYears } from './fiscalYearSelect'

// Each fiscal year's own copy of the organisation, in the order it is copied
const ORG_LABELS = {
  departments: 'Departments',
  chiefs: 'Chiefs',
  directors: 'Directors',
  managers: 'Managers',
  employees: 'Employees',
  candidates: 'Candidates',
}

const PROCESS_LABELS = {
  votes: 'Peer votes',
  director_ratings: 'Director ratings',
  approvals: 'Approvals',
  quotas: 'Quotas',
  re_rating_requests: 'Re-rating requests',
}

const COUNT_LABELS = { ...ORG_LABELS, ...PROCESS_LABELS }

// Candidates are usually re-populated from the new year's appraisal scores, so they are not
// copied unless asked
const DEFAULT_COPY = ['departments', 'chiefs', 'directors', 'managers', 'employees']

// Fiscal year dates are calendar days stored as UTC midnight, so all date arithmetic here is
// in UTC (local time would shift them by a day east or west of UTC)
const toInputDate = (value) => (value ? new Date(value).toISOString().split('T')[0] : '')

// Voting opens and closes at a moment in local time (datetime-local inputs)
const pad = (n) => String(n).padStart(2, '0')
const toInputDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromInputDateTime = (value) => (value ? new Date(value).toISOString() : undefined)
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : ''

const addDays = (value, days) => {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

// Suggests the year after `current`: "2025/26" -> "2026/27", starting the day after it ends
const suggestNextYear = (current) => {
  if (!current) return { name: '', start_date: '', end_date: '' }
  const start = addDays(current.end_date, 1)
  const end = addDays(
    Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()),
    -1,
  )
  const match = current.name.match(/^(.*?)(\d{4})\/(\d{2})$/)
  const name = match
    ? `${match[1]}${Number(match[2]) + 1}/${String((Number(match[3]) + 1) % 100).padStart(2, '0')}`
    : ''
  return { name, start_date: toInputDate(start), end_date: toInputDate(end) }
}

const hasData = (year) => Object.values(year.counts).some((n) => n > 0)

const StatusCell = ({ row }) => {
  const year = row.original
  if (year.is_current) return <Chip size="small" color="success" label="Current" />
  if (year.status === 'closed') return <Chip size="small" variant="outlined" label="Closed" />
  return <Chip size="small" label="Open" />
}
StatusCell.propTypes = { row: PropTypes.object.isRequired }

const VOTING_CHIP = {
  open: { label: 'Open', color: 'success', variant: 'filled' },
  not_started: { label: 'Not started', color: 'info', variant: 'outlined' },
  closed: { label: 'Closed', color: 'default', variant: 'outlined' },
  not_set: { label: 'Not set', color: 'warning', variant: 'outlined' },
}

const votingPeriodText = (voting) =>
  voting?.period
    ? `${formatDateTime(voting.period.start_date)} – ${formatDateTime(voting.period.end_date)}`
    : ''

const VotingCell = ({ row }) => {
  const voting = row.original.voting
  const chip = VOTING_CHIP[voting?.state] || VOTING_CHIP.not_set
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip size="small" label={chip.label} color={chip.color} variant={chip.variant} />
      <Typography variant="body2">{votingPeriodText(voting)}</Typography>
    </Box>
  )
}
VotingCell.propTypes = { row: PropTypes.object.isRequired }

const columns = [
  { accessorKey: 'name', header: 'Fiscal Year', size: 120 },
  { accessorFn: (y) => formatDate(y.start_date), id: 'start', header: 'Start', size: 110 },
  { accessorFn: (y) => formatDate(y.end_date), id: 'end', header: 'End', size: 110 },
  { accessorKey: 'status', header: 'Status', size: 100, Cell: StatusCell },
  ...Object.entries(COUNT_LABELS).map(([key, label]) => ({
    accessorFn: (y) => y.counts[key],
    id: key,
    header: label,
    size: 110,
  })),
  {
    accessorFn: (y) => votingPeriodText(y.voting),
    id: 'voting',
    header: 'Voting Period',
    size: 340,
    Cell: VotingCell,
  },
  { accessorFn: (y) => formatDate(y.closed_at), id: 'closed_at', header: 'Closed On', size: 110 },
  { accessorKey: 'notes', header: 'Notes', size: 180 },
]

// Ticks which parts of the organisation to copy
const OrgChecklist = ({ value, onChange }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2 }}>
    {Object.entries(ORG_LABELS).map(([key, label]) => (
      <FormControlLabel
        key={key}
        control={
          <Checkbox
            checked={value.includes(key)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, key] : value.filter((k) => k !== key))
            }
          />
        }
        label={label}
      />
    ))}
  </Box>
)

OrgChecklist.propTypes = {
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
}

const copiedTotal = (copied) =>
  copied ? Object.values(copied).reduce((sum, c) => sum + c.copied, 0) : 0

const EMPTY_FORM = {
  name: '',
  start_date: '',
  end_date: '',
  notes: '',
  copy_quotas: true,
  copy_org: DEFAULT_COPY,
  from_fiscal_year: '',
  voting_start: '',
  voting_end: '',
}

// Admin set-up of fiscal years: each year's votes, ratings, approvals and quotas are kept
// apart, and a closed year's reports stay as they were when it closed
const FiscalYears = () => {
  const accessToken = useSelector((state) => state.user.accessToken)
  const { years, current, unassigned, loading, error, reload } = useFiscalYears(accessToken)

  const [saving, setSaving] = useState(false)
  // mode: 'create' | 'edit' | 'copy' | 'reopen' | 'delete'
  const [dialog, setDialog] = useState({ open: false, mode: 'create', year: null })
  const [form, setForm] = useState(EMPTY_FORM)

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, ...suggestNextYear(current) })
    setDialog({ open: true, mode: 'create', year: null })
  }
  const openEdit = (year) => {
    setForm({
      name: year.name,
      start_date: toInputDate(year.start_date),
      end_date: toInputDate(year.end_date),
      notes: year.notes || '',
      copy_quotas: false,
      voting_start: toInputDateTime(year.voting?.period?.start_date),
      voting_end: toInputDateTime(year.voting?.period?.end_date),
    })
    setDialog({ open: true, mode: 'edit', year })
  }
  const otherYears = years.filter((y) => !y.is_current)
  const openCopy = () => {
    setForm({ ...EMPTY_FORM, from_fiscal_year: otherYears[0]?._id || '' })
    setDialog({ open: true, mode: 'copy', year: null })
  }
  const openConfirm = (mode, year) => setDialog({ open: true, mode, year })
  const closeDialog = () => setDialog({ open: false, mode: 'create', year: null })

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async () => {
    const { mode, year } = dialog
    const request = {
      create: {
        method: 'POST',
        url: FISCAL_YEARS_API,
        body: {
          ...form,
          copy_org: current ? form.copy_org : [],
          voting_start: fromInputDateTime(form.voting_start),
          voting_end: fromInputDateTime(form.voting_end),
        },
      },
      copy: {
        method: 'POST',
        url: `${FISCAL_YEARS_API}/copy`,
        body: { from_fiscal_year: form.from_fiscal_year, entities: form.copy_org },
      },
      edit: {
        method: 'PATCH',
        url: `${FISCAL_YEARS_API}/${year?._id}`,
        body: {
          ...form,
          voting_start: fromInputDateTime(form.voting_start),
          voting_end: fromInputDateTime(form.voting_end),
        },
      },
      reopen: { method: 'POST', url: `${FISCAL_YEARS_API}/${year?._id}/reopen` },
      delete: { method: 'DELETE', url: `${FISCAL_YEARS_API}/${year?._id}` },
    }[mode]

    try {
      setSaving(true)
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json', 'x-access-token': accessToken },
        body: request.body ? JSON.stringify(request.body) : undefined,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Request failed')

      const orgCopied = copiedTotal(data.result?.org_copied)
      const copied = [
        orgCopied ? `${orgCopied} people and departments copied.` : '',
        data.result?.quotas_copied ? `${data.result.quotas_copied} quotas copied.` : '',
      ].join(' ')
      toast.success(`${data.message} ${copied}`.trim())
      closeDialog()
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formValid =
    dialog.mode === 'copy'
      ? form.from_fiscal_year && form.copy_org.length > 0
      : form.name.trim() &&
        form.start_date &&
        form.end_date &&
        // A new year needs its voting period; when editing, give both or neither
        (dialog.mode === 'create'
          ? form.voting_start && form.voting_end
          : Boolean(form.voting_start) === Boolean(form.voting_end))

  const renderDialog = () => {
    const { mode, year } = dialog

    if (mode === 'create' || mode === 'edit') {
      const starting = mode === 'create' && current
      return (
        <>
          <DialogTitle>
            {mode === 'edit'
              ? `Edit ${year.name}`
              : starting
                ? 'Start New Fiscal Year'
                : 'Create Fiscal Year'}
          </DialogTitle>
          <DialogContent>
            {starting && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{current.name}</strong> will be closed now. Its reports are frozen as they
                stand, and voting, director rating and chief approvals start fresh in the new year.
                Do this once {current.name}&apos;s approvals are final, and before importing next
                year&apos;s appraisal scores.
              </Alert>
            )}
            {mode === 'create' && !current && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Everything recorded so far will belong to this fiscal year.
              </Alert>
            )}
            <TextField
              label="Name"
              placeholder="e.g. 2026/27"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start date"
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="End date"
                type="date"
                value={form.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Voting period
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Peer votes and director ratings are accepted only between these times. You can change
              them later, and future dates are fine.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Voting opens"
                type="datetime-local"
                value={form.voting_start}
                onChange={(e) => setField('voting_start', e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required={dialog.mode === 'create'}
              />
              <TextField
                label="Voting closes"
                type="datetime-local"
                value={form.voting_end}
                onChange={(e) => setField('voting_end', e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required={dialog.mode === 'create'}
              />
            </Box>
            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
              margin="normal"
            />
            {starting && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.copy_quotas}
                    onChange={(e) => setField('copy_quotas', e.target.checked)}
                  />
                }
                label={`Copy each chief's quota from ${current.name} (you can change them on Quota Selection)`}
              />
            )}
            {starting && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Copy from {current.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Anything you leave unticked starts empty in the new year, ready for a fresh
                  import.
                </Typography>
                <OrgChecklist value={form.copy_org} onChange={(v) => setField('copy_org', v)} />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              variant="contained"
              color={starting ? 'warning' : 'primary'}
              disabled={saving || !formValid}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {mode === 'edit' ? 'Save' : starting ? `Close ${current.name} and Start` : 'Create'}
            </Button>
          </DialogActions>
        </>
      )
    }

    if (mode === 'copy') {
      return (
        <>
          <DialogTitle>Copy into {current.name}</DialogTitle>
          <DialogContent>
            <TextField
              select
              label="Copy from"
              value={form.from_fiscal_year}
              onChange={(e) => setField('from_fiscal_year', e.target.value)}
              fullWidth
              margin="normal"
              SelectProps={{ native: true }}
            >
              {otherYears.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </TextField>
            <OrgChecklist value={form.copy_org} onChange={(v) => setField('copy_org', v)} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Records {current.name} already has (same employee ID or department code) are kept as
              they are.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              variant="contained"
              disabled={saving || !formValid}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              Copy
            </Button>
          </DialogActions>
        </>
      )
    }

    if (mode === 'reopen') {
      return (
        <>
          <DialogTitle>Reopen {year.name}?</DialogTitle>
          <DialogContent>
            <Typography>
              {year.name} becomes the current fiscal year again, so new votes, ratings and approvals
              go to it.
              {current && ` ${current.name} will be closed and its reports frozen as they stand.`}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} variant="contained" color="warning" disabled={saving}>
              Reopen {year.name}
            </Button>
          </DialogActions>
        </>
      )
    }

    return (
      <>
        <DialogTitle>Delete {year.name}?</DialogTitle>
        <DialogContent>
          <Typography>This fiscal year holds no data. It will be removed.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} variant="contained" color="error" disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </>
    )
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 1, md: 3 } }}>
      <ToastContainer position="top-right" autoClose={4000} />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Fiscal Years
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {current && otherYears.length > 0 && (
            <Button variant="outlined" onClick={openCopy} disabled={loading}>
              Copy from Another Year
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={loading}
          >
            {current ? 'Start New Fiscal Year' : 'Create Fiscal Year'}
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Each fiscal year has its own departments, chiefs, directors, managers, employees and
        candidates: import them fresh for a new year, or copy them from an earlier one. Peer votes,
        director ratings, chief approvals, quotas and re-rating requests belong to the year that is
        current when they are made. Voting, rating and approving always happen in the current year;
        the registration pages, Vote Statistics, Selected Best Staff, the Participation Dashboard
        and Re-rating Approvals let you look at any year. Starting a new year closes the current one
        and freezes its reports.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !current && years.length === 0 && unassigned && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No fiscal year is set up yet. Everything recorded so far (
          {Object.entries(COUNT_LABELS)
            .map(([key, label]) => `${unassigned[key]} ${label.toLowerCase()}`)
            .join(', ')}
          ) will belong to the first fiscal year you create.
        </Alert>
      )}

      {current && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Current fiscal year
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {current.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {formatDate(current.start_date)} – {formatDate(current.end_date)}
            </Typography>
            {(() => {
              const voting = years.find((y) => y._id === current._id)?.voting
              const chip = VOTING_CHIP[voting?.state] || VOTING_CHIP.not_set
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip size="small" label={`Voting: ${chip.label}`} color={chip.color} />
                  <Typography variant="body2" color="text.secondary">
                    {voting?.state === 'not_set'
                      ? 'No voting period set: edit this year to add one'
                      : voting?.message}
                  </Typography>
                </Box>
              )
            })()}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(COUNT_LABELS).map(([key, label]) => (
                <Chip
                  key={key}
                  size="small"
                  variant="outlined"
                  label={`${label}: ${years.find((y) => y._id === current._id)?.counts[key] ?? 0}`}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <MaterialReactTable
            columns={columns}
            data={years}
            enableRowActions
            positionActionsColumn="last"
            initialState={{ density: 'compact' }}
            state={{ isLoading: loading }}
            renderRowActions={({ row }) => (
              <Box sx={{ display: 'flex' }}>
                <Tooltip title="Edit name, dates or notes">
                  <IconButton size="small" onClick={() => openEdit(row.original)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {row.original.status === 'closed' && (
                  <Tooltip title="Make this the current year again">
                    <IconButton size="small" onClick={() => openConfirm('reopen', row.original)}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {!row.original.is_current && !hasData(row.original) && (
                  <Tooltip title="Delete (holds no data)">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openConfirm('delete', row.original)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        {dialog.open && renderDialog()}
      </Dialog>
    </Box>
  )
}

export default FiscalYears
