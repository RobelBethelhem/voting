import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { MaterialReactTable } from 'material-react-table'
import { useSelector } from 'react-redux'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { FiscalYearSelect, useFiscalYears, withFiscalYear } from '../FiscalYear/fiscalYearSelect'
import { API_BASE } from 'src/api/base'

const API = `${API_BASE}/re-rating`

const STATUS = {
  pending: { label: 'Waiting for review', color: 'warning' },
  re_rating: { label: 'Directors re-rating', color: 'info' },
  completed: { label: 'Completed', color: 'success' },
  declined: { label: 'Declined', color: 'error' },
}

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '')

const categoryLabel = (category) =>
  category === 'managerial_staff' ? 'Manager' : 'Non-managerial staff'

const ratingsSummary = (request) => {
  if (request.status === 'pending') return `${request.ratings_to_delete} to delete`
  if (request.progress) return `${request.progress.done} of ${request.progress.total} given again`
  return ''
}

const StatusCell = ({ cell }) => {
  const status = STATUS[cell.getValue()] || { label: cell.getValue(), color: 'default' }
  return <Chip label={status.label} color={status.color} size="small" />
}

StatusCell.propTypes = {
  cell: PropTypes.object.isRequired,
}

// Ratings directors still have to give again for a request in re-rating
const RemainingRatings = ({ row }) => {
  const request = row.original
  const remaining = request.progress?.remaining ?? []

  return (
    <Box sx={{ p: 1 }}>
      {request.comments && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Chief&apos;s comments:</strong> {request.comments}
        </Typography>
      )}
      {request.status === 're_rating' && remaining.length === 0 && (
        <Typography variant="body2">Every removed rating has been given again.</Typography>
      )}
      {remaining.length > 0 && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Still to be rated again ({remaining.length}):</strong>
          </Typography>
          {remaining.map((r) => (
            <Typography
              key={`${r.rater_emp_id}-${r.ratee_emp_id}-${r.rating_category}`}
              variant="body2"
            >
              {r.rater_name} → {r.ratee_name} ({categoryLabel(r.rating_category)})
            </Typography>
          ))}
        </>
      )}
    </Box>
  )
}

RemainingRatings.propTypes = {
  row: PropTypes.object.isRequired,
}

const RequestActions = ({ request, disabled, onAction }) => {
  if (request.status === 'pending') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          color="success"
          disabled={disabled}
          onClick={() => onAction(request, 'approved')}
        >
          Approve
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          disabled={disabled}
          onClick={() => onAction(request, 'declined')}
        >
          Decline
        </Button>
      </Box>
    )
  }

  if (request.status === 're_rating') {
    return (
      <Button
        size="small"
        variant="outlined"
        disabled={disabled}
        onClick={() => onAction(request, 'close')}
      >
        Close Re-rating
      </Button>
    )
  }

  return null
}

RequestActions.propTypes = {
  request: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  onAction: PropTypes.func.isRequired,
}

const columns = [
  { accessorFn: (r) => formatDate(r.created_at), id: 'created_at', header: 'Requested', size: 140 },
  { accessorKey: 'chief_name', header: 'Chief', size: 150 },
  { accessorKey: 'chief_position', header: 'Chief Position', size: 180 },
  { accessorKey: 'rejected_employee_name', header: 'Rejected Staff', size: 150 },
  { accessorKey: 'rejected_employee_department', header: 'Department', size: 160 },
  { accessorKey: 'rejection_reason', header: 'Rejection Reason', size: 180 },
  { accessorKey: 'status', header: 'Status', size: 140, Cell: StatusCell },
  { accessorFn: ratingsSummary, id: 'ratings', header: 'Director Ratings', size: 140 },
  { accessorKey: 'reviewed_by_name', header: 'Reviewed By', size: 150 },
  {
    accessorFn: (r) => formatDate(r.reviewed_at),
    id: 'reviewed_at',
    header: 'Reviewed On',
    size: 140,
  },
  { accessorKey: 'review_comments', header: 'Review Comments', size: 180 },
]

const DIALOG_TEXT = {
  approved: {
    title: 'Approve re-rating?',
    button: 'Approve and Delete Ratings',
    color: 'success',
  },
  declined: {
    title: 'Decline re-rating?',
    button: 'Decline',
    color: 'error',
  },
  close: {
    title: 'Close re-rating?',
    button: 'Close Re-rating',
    color: 'primary',
  },
}

// Deputy Chief Human Capital (and admins) approve or decline chiefs' re-rating requests
const ReRatingApproval = () => {
  const accessToken = useSelector((state) => state.user.accessToken)
  const {
    years,
    selected: fiscalYearId,
    setSelected: setFiscalYearId,
    selectedYear,
    loading: yearsLoading,
  } = useFiscalYears(accessToken)
  // Requests of a closed fiscal year are only kept for the record
  const readOnly = selectedYear?.status === 'closed'

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dialog, setDialog] = useState({ open: false, request: null, action: null, comments: '' })

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(withFiscalYear(`${API}/requests`, fiscalYearId), {
        headers: { 'x-access-token': accessToken },
      })
      const data = await response.json()
      if (response.ok) {
        setRequests(data.data)
        setError(null)
      } else {
        setError(data.message || 'Failed to load re-rating requests')
      }
    } catch (err) {
      console.error('Error loading re-rating requests:', err)
      setError('Error loading re-rating requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken && !yearsLoading) fetchRequests()
  }, [accessToken, fiscalYearId, yearsLoading])

  const openDialog = (request, action) => setDialog({ open: true, request, action, comments: '' })

  const closeDialog = () => setDialog({ open: false, request: null, action: null, comments: '' })

  const submitDialog = async () => {
    const { request, action, comments } = dialog
    const url =
      action === 'close'
        ? `${API}/requests/${request._id}/complete`
        : `${API}/requests/${request._id}/review`

    try {
      setSaving(true)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify(action === 'close' ? {} : { decision: action, comments }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        closeDialog()
        fetchRequests()
      } else {
        toast.error(data.message || 'Failed to update the request')
      }
    } catch (err) {
      console.error('Error updating re-rating request:', err)
      toast.error('Error updating the request')
    } finally {
      setSaving(false)
    }
  }

  const renderDialogBody = () => {
    const { request, action } = dialog
    if (!request) return null

    if (action === 'approved') {
      return (
        <>
          <Typography variant="body1" gutterBottom>
            <strong>{request.chief_name}</strong> rejected{' '}
            <strong>{request.rejected_employee_name}</strong>
            {request.rejection_reason ? ` ("${request.rejection_reason}")` : ''}.
          </Typography>
          <Typography variant="body2" component="div">
            Approving will:
            <ul>
              <li>
                Delete <strong>{request.ratings_to_delete}</strong> director ratings given under
                this chief, for managers and non-managerial staff. A copy is kept for audit.
              </li>
              <li>
                Clear <strong>{request.approvals_to_clear}</strong> of the chief&apos;s approval
                decisions.
              </li>
              <li>
                Let the chief&apos;s {request.director_count} director(s) rate again. The selection
                is recalculated with the new ratings and goes back to the chief for approval.
              </li>
              <li>Leave peer votes unchanged.</li>
            </ul>
          </Typography>
        </>
      )
    }

    if (action === 'declined') {
      return (
        <Typography variant="body1">
          The existing director ratings under <strong>{request.chief_name}</strong> stay, and the
          chief can continue with approvals.
        </Typography>
      )
    }

    const remaining = request.progress?.remaining?.length ?? 0
    return (
      <Typography variant="body1">
        {remaining} rating(s) have not been given again yet. If you close re-rating now, the
        chief&apos;s selection is calculated with the ratings that exist.
      </Typography>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{error}</Alert>
      </Box>
    )
  }

  const dialogText = DIALOG_TEXT[dialog.action] ?? DIALOG_TEXT.approved

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <ToastContainer position="top-right" autoClose={3000} />

      <Typography variant="h4" gutterBottom>
        Re-rating Approvals
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        When a chief rejects the system-selected best staff, the request comes here. Approving
        deletes the director ratings under that chief so directors rate again; peer votes are not
        changed.
      </Alert>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <FiscalYearSelect years={years} value={fiscalYearId} onChange={setFiscalYearId} />
        {readOnly && (
          <Typography variant="body2" color="text.secondary">
            {selectedYear.name} is closed: its requests are shown for the record and cannot be
            changed.
          </Typography>
        )}
      </Box>

      <Card>
        <CardContent>
          <MaterialReactTable
            columns={columns}
            data={requests}
            enableRowActions={!readOnly}
            positionActionsColumn="last"
            renderRowActions={({ row }) => (
              <RequestActions request={row.original} disabled={saving} onAction={openDialog} />
            )}
            renderDetailPanel={RemainingRatings}
            initialState={{ density: 'compact' }}
            state={{ isLoading: loading }}
          />
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogText.title}</DialogTitle>
        <DialogContent>
          {renderDialogBody()}
          {dialog.action !== 'close' && (
            <TextField
              label="Comments (optional)"
              value={dialog.comments}
              onChange={(e) => setDialog((prev) => ({ ...prev, comments: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submitDialog}
            color={dialogText.color}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {dialogText.button}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ReRatingApproval
