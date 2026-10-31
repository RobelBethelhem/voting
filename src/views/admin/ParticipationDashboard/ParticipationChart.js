import React from 'react'
import PropTypes from 'prop-types'
import { Box, Card, CardContent, Typography } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Chart colors (validated on the white card surface). The outstanding work is the story,
// so it takes the accent; completed work is context in a recessive gray.
export const COLORS = {
  surface: '#ffffff',
  accent: '#2a78d6',
  accentTrack: '#cde2fb',
  context: '#c3c2b7',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  good: '#0ca30c',
  warning: '#fab219',
}

const ROW_HEIGHT = 30
const AXIS_AND_LEGEND_HEIGHT = 64
// Long department names are cut to one line; the tooltip shows the full name
const LABEL_CHARS = 26

const shorten = (label) =>
  label.length > LABEL_CHARS ? `${label.slice(0, LABEL_CHARS - 1)}…` : label

const ChartTooltip = ({ active, payload, label, series }) => {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <Box
      sx={{
        bgcolor: COLORS.surface,
        border: '1px solid rgba(11,11,11,0.10)',
        borderRadius: 1,
        boxShadow: 2,
        px: 1.5,
        py: 1,
        minWidth: 180,
      }}
    >
      <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {series.map((s) => (
        <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 2, bgcolor: s.color, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
            {row[s.key]}
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            {s.name}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

ChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  series: PropTypes.array.isRequired,
}

// Horizontal stacked bars: outstanding first on the shared baseline, completed after it.
// Clicking a bar calls onSelect with the row's id.
const ParticipationChart = ({
  title,
  caption,
  rows,
  outstanding,
  completed,
  onSelect,
  emptyText,
  dimmed,
}) => {
  const series = [
    { key: 'outstanding', name: outstanding, color: COLORS.accent },
    { key: 'completed', name: completed, color: COLORS.context },
  ]
  const height = rows.length * ROW_HEIGHT + AXIS_AND_LEGEND_HEIGHT

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 1 }}>
          {caption}
        </Typography>

        {rows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
              {emptyText}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ opacity: dimmed ? 0.6 : 1, transition: 'opacity 150ms' }}>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                  axisLine={{ stroke: COLORS.baseline }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={230}
                  tickFormatter={shorten}
                  tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: COLORS.baseline }}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip
                  content={<ChartTooltip series={series} />}
                  cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                />
                <Legend
                  iconType="rect"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{value}</span>
                  )}
                />
                <Bar
                  dataKey="outstanding"
                  name={outstanding}
                  stackId="participation"
                  fill={COLORS.accent}
                  stroke={COLORS.surface}
                  strokeWidth={2}
                  barSize={16}
                  cursor="pointer"
                  onClick={(row) => onSelect(row.id)}
                />
                <Bar
                  dataKey="completed"
                  name={completed}
                  stackId="participation"
                  fill={COLORS.context}
                  stroke={COLORS.surface}
                  strokeWidth={2}
                  barSize={16}
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(row) => onSelect(row.id)}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

ParticipationChart.propTypes = {
  title: PropTypes.string.isRequired,
  caption: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      outstanding: PropTypes.number.isRequired,
      completed: PropTypes.number.isRequired,
    }),
  ).isRequired,
  outstanding: PropTypes.string.isRequired,
  completed: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  emptyText: PropTypes.string.isRequired,
  dimmed: PropTypes.bool,
}

export default ParticipationChart
