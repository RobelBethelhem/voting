import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { API_BASE } from 'src/api/base'

export const FISCAL_YEARS_API = `${API_BASE}/fiscal-years`

// Fiscal year dates are calendar days stored as UTC midnight
export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC' }) : ''

export const fiscalYearLabel = (year) =>
  year
    ? `${year.name}${year.is_current ? ' (current)' : year.status === 'closed' ? ' (closed)' : ''}`
    : ''

// Appends ?fiscal_year=<id> (or &fiscal_year=) when a year is chosen
export const withFiscalYear = (url, fiscalYearId) =>
  fiscalYearId
    ? `${url}${url.includes('?') ? '&' : '?'}fiscal_year=${encodeURIComponent(fiscalYearId)}`
    : url

// All fiscal years (newest first) and the current one. `selected` starts at the current
// year; before any fiscal year exists it stays '' and pages show all data as before.
export const useFiscalYears = (accessToken) => {
  const [years, setYears] = useState([])
  const [current, setCurrent] = useState(null)
  const [unassigned, setUnassigned] = useState(null)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(FISCAL_YEARS_API, { headers: { 'x-access-token': accessToken } })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load fiscal years')
      }
      setYears(result.data)
      setCurrent(result.meta.current)
      setUnassigned(result.meta.unassigned)
      setSelected((prev) =>
        prev && result.data.some((y) => y._id === prev) ? prev : result.meta.current?._id || '',
      )
      setError(null)
    } catch (err) {
      console.error('Error loading fiscal years:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken) reload()
  }, [accessToken, reload])

  return {
    years,
    current,
    unassigned,
    selected,
    setSelected,
    selectedYear: years.find((y) => y._id === selected) || null,
    loading,
    error,
    reload,
  }
}

// Fiscal year picker for report pages. Renders nothing until fiscal years are set up.
export const FiscalYearSelect = ({ years, value, onChange, sx }) => {
  if (years.length === 0) return null
  return (
    <TextField
      select
      size="small"
      label="Fiscal year"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 200, ...sx }}
    >
      {years.map((year) => (
        <MenuItem key={year._id} value={year._id}>
          {fiscalYearLabel(year)}
        </MenuItem>
      ))}
    </TextField>
  )
}

FiscalYearSelect.propTypes = {
  years: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  sx: PropTypes.object,
}

// Year picker for the people and department registration pages. In the current year it
// offers to copy this kind of record from another year; a past year is read-only.
// entity: departments | chiefs | directors | managers | employees | candidates
export const FiscalYearBar = ({ fiscalYears, entity, label, onCopied }) => {
  const accessToken = useSelector((state) => state.user.accessToken)
  const { years, selected, setSelected, selectedYear, current } = fiscalYears
  const [copyOpen, setCopyOpen] = useState(false)
  const [source, setSource] = useState('')
  const [copying, setCopying] = useState(false)

  if (years.length === 0) return null

  const otherYears = years.filter((year) => !year.is_current)
  const viewingCurrent = !selectedYear || selectedYear.is_current

  const copy = async () => {
    try {
      setCopying(true)
      const response = await fetch(`${FISCAL_YEARS_API}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': accessToken },
        body: JSON.stringify({ from_fiscal_year: source, entities: [entity] }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Copy failed')
      const counts = result.data.copied[entity]
      toast.success(
        `Copied ${counts.copied} ${label}; ${counts.skipped} already in ${current?.name} were kept`,
      )
      setCopyOpen(false)
      onCopied()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCopying(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <FiscalYearSelect years={years} value={selected} onChange={setSelected} />
      {viewingCurrent && otherYears.length > 0 && (
        <Button
          variant="outlined"
          onClick={() => {
            setSource(otherYears[0]._id)
            setCopyOpen(true)
          }}
        >
          Copy {label} from another year
        </Button>
      )}
      {!viewingCurrent && (
        <Typography variant="body2" color="text.secondary">
          {selectedYear.name} is shown read-only. Switch to {current?.name} to add, import or edit{' '}
          {label}.
        </Typography>
      )}

      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Copy {label} into {current?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Copy from"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            fullWidth
            margin="normal"
          >
            {otherYears.map((year) => (
              <MenuItem key={year._id} value={year._id}>
                {fiscalYearLabel(year)}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            {label.charAt(0).toUpperCase() + label.slice(1)} that {current?.name} already has (same
            employee ID or code) are kept as they are. Or import a new list instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyOpen(false)} color="inherit" disabled={copying}>
            Cancel
          </Button>
          <Button onClick={copy} variant="contained" disabled={copying || !source}>
            Copy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

FiscalYearBar.propTypes = {
  fiscalYears: PropTypes.object.isRequired,
  entity: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onCopied: PropTypes.func.isRequired,
}
