import React from 'react'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Box } from '@mui/material'
import { useSelector } from 'react-redux'

import RatingsTable, { dateColumn, textColumn } from './RatingsTable'
import { FiscalYearSelect, useFiscalYears, withFiscalYear } from '../FiscalYear/fiscalYearSelect'
import { API_BASE } from 'src/api/base'

const API = `${API_BASE}/rms/admin/landing`

const peerInfoColumns = [
  {
    id: 'voter',
    header: 'Voter_Info',
    columns: [
      { ...textColumn('voter_first_name'), filterVariant: 'autocomplete' },
      textColumn('voter_last_name'),
      textColumn('voter_emp_id'),
      textColumn('voter_position'),
      textColumn('voter_department'),
    ],
  },
  {
    id: 'Candidate',
    header: 'Candidate_Info',
    columns: [
      textColumn('candidate_first_name'),
      textColumn('candidate_last_name'),
      textColumn('candidate_emp_id'),
      textColumn('candidate_position'),
      textColumn('candidate_department'),
    ],
  },
]

const peerSummaryColumns = {
  id: 'KPI_Weight',
  header: 'KPI_Weight',
  columns: [textColumn('Total_Weight'), textColumn('Accrue_Weight'), dateColumn('TimeStamp')],
}

const directorInfoColumns = (rateeHeader) => [
  {
    id: 'rater',
    header: 'Director_Info',
    columns: [
      { ...textColumn('rater_first_name'), filterVariant: 'autocomplete' },
      textColumn('rater_last_name'),
      textColumn('rater_emp_id'),
      textColumn('rater_position'),
      textColumn('rater_department'),
      textColumn('rater_role'),
    ],
  },
  {
    id: 'ratee',
    header: rateeHeader,
    columns: [
      textColumn('ratee_first_name'),
      textColumn('ratee_last_name'),
      textColumn('ratee_emp_id'),
      textColumn('ratee_position'),
      textColumn('ratee_department'),
    ],
  },
]

const staffInfoColumns = directorInfoColumns('Staff_Info')
const managerInfoColumns = directorInfoColumns('Manager_Info')

const directorSummaryColumns = {
  id: 'Score',
  header: 'Score',
  columns: [
    textColumn('total_weighted_score'),
    textColumn('max_possible_score'),
    textColumn('percentage_score'),
    textColumn('evaluation_period'),
    dateColumn('timestamp'),
  ],
}

const queryClient = new QueryClient()

// The three tables for the chosen fiscal year (the current one by default)
const VoteStatisticsTables = () => {
  const accessToken = useSelector((state) => state.user.accessToken)
  const { years, selected, setSelected, selectedYear, loading } = useFiscalYears(accessToken)
  const suffix = selectedYear ? `_${selectedYear.name.replace(/[^\w-]+/g, '_')}` : ''

  if (loading) return null

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <FiscalYearSelect years={years} value={selected} onChange={setSelected} />
      </Box>
      <RatingsTable
        title="Peer Ratings"
        url={withFiscalYear(`${API}/get_vote_stastics`, selected)}
        infoColumns={peerInfoColumns}
        summaryColumns={peerSummaryColumns}
        fileName={`peer_ratings${suffix}`}
      />
      <RatingsTable
        title="Director Ratings for Non-Managerial Staff"
        url={withFiscalYear(`${API}/get_director_ratings?category=non_managerial_staff`, selected)}
        infoColumns={staffInfoColumns}
        summaryColumns={directorSummaryColumns}
        fileName={`director_ratings_staff${suffix}`}
      />
      <RatingsTable
        title="Director Ratings for Managers"
        url={withFiscalYear(`${API}/get_director_ratings?category=managerial_staff`, selected)}
        infoColumns={managerInfoColumns}
        summaryColumns={directorSummaryColumns}
        fileName={`director_ratings_managers${suffix}`}
      />
    </>
  )
}

const VoteStatistics = () => (
  <QueryClientProvider client={queryClient}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <VoteStatisticsTables />
    </LocalizationProvider>
  </QueryClientProvider>
)

export default VoteStatistics
