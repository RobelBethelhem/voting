import * as XLSX from 'xlsx'

// Builds the Selected Best Staff workbook in the layout HR used for the manual selection:
// one sheet per chief listing every candidate (non-managerial and managerial, grouped by
// department, with the scoring formulas), and, for all chiefs, a closing "Selected Best"
// sheet with only the approved staff.

const SELECTED_BEST_SHEET = 'Selected Best'

const NON_MANAGERIAL_HEADERS = [
  'No.',
  'Employee Name',
  'Job Position',
  'Function',
  'Job Grade',
  'New Department',
  'Average Performance Appraisal Result',
  'Performance result out of 50%',
  'Managers Rating out of 50',
  'Managers Rating out of 30',
  'Total Eligible Voters',
  'Total No. Of Voters voted',
  'Voted By',
  'Vote out of 100%',
  'Average Peer Rating out of 50%',
  'Peer Rating converted to 20%',
  'Total Rating Result',
  'Weighted Rating',
  'Total Weighted Result',
  'Remark',
]

const MANAGERIAL_HEADERS = [
  'No.',
  'Employee Name',
  'New Job Position',
  'Function',
  'Job Grade',
  'New Department',
  'Average Performance Appraisal Result',
  'Performance result out of 50%',
  'Managers Rating out of 50',
  'Total out of 100',
  'Remark',
]

const COLUMN_WIDTHS = [5, 26, 36, 22, 7, 30, 13, 12, 12, 12, 10, 10, 8, 9, 11, 11, 11, 10, 11, 32]

const text = (value) => ({ t: 's', v: value == null ? '' : String(value) })
const count = (value) => ({ t: 'n', v: value ?? 0 })
const decimal = (value) => ({ t: 'n', v: value ?? 0, z: '0.00' })
// Formula cells carry the computed value too, so they show before Excel recalculates
const formula = (f, value) => ({ t: 'n', f, v: value ?? 0, z: '0.00' })

// Writes rows top to bottom and collects merges
const createSheetWriter = () => {
  const sheet = {}
  const merges = []
  let row = 0
  let maxCol = 0

  return {
    // 1-based Excel row number the next write lands on
    nextExcelRow: () => row + 1,
    write(cells) {
      cells.forEach((cell, col) => {
        if (cell == null) return
        sheet[XLSX.utils.encode_cell({ r: row, c: col })] = cell
        maxCol = Math.max(maxCol, col)
      })
      row += 1
      return row - 1
    },
    blank() {
      row += 1
    },
    merge(startRow, startCol, endRow, endCol) {
      merges.push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } })
    },
    finish() {
      sheet['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(row - 1, 0), c: maxCol },
      })
      sheet['!merges'] = merges
      sheet['!cols'] = COLUMN_WIDTHS.map((wch) => ({ wch }))
      return sheet
    },
  }
}

const candidateRemark = (row) => {
  const notes = []
  if (row.approval_status === 'approved') notes.push('Selected Best')
  if (row.approval_status === 'rejected') {
    notes.push(
      row.rejection_reason ? `Rejected by chief: ${row.rejection_reason}` : 'Rejected by chief',
    )
  }
  if (row.approval_status === 'pending') notes.push('Waiting for chief approval')
  const rating = row.is_managerial ? row.director_rating_out_of_50 : row.manager_rating_out_of_50
  if (!rating) notes.push('Not yet rated by director')
  return notes.join('; ')
}

const nonManagerialCells = (no, row, r, remark) => [
  count(no),
  text(row.name),
  text(row.position),
  text(row.function),
  text(row.job_grade),
  text(row.department),
  decimal(row.performance_appraisal_score),
  formula(`G${r}/100*50`, row.performance_out_of_50),
  decimal(row.manager_rating_out_of_50),
  formula(`I${r}/50*30`, row.manager_rating_out_of_30),
  count(row.total_eligible_voters),
  count(row.total_voters_voted),
  count(row.voted_by),
  formula(`IF(K${r}=0,0,M${r}/K${r}*100)`, row.vote_percentage),
  decimal(row.average_peer_rating),
  formula(`O${r}*20/50`, row.peer_rating_out_of_20),
  formula(`P${r}+J${r}+H${r}`, row.total_rating_result),
  formula(`P${r}*N${r}/100`, row.weighted_rating),
  formula(`R${r}+J${r}+H${r}`, row.total_weighted_result),
  text(remark),
]

const managerialCells = (no, row, r, remark) => [
  count(no),
  text(row.name),
  text(row.position),
  text(row.function),
  text(row.job_grade),
  text(row.department),
  decimal(row.performance_appraisal_score),
  formula(`G${r}/100*50`, row.performance_out_of_50),
  decimal(row.director_rating_out_of_50),
  formula(`H${r}+I${r}`, row.total_out_of_100),
  text(remark),
]

// A titled table. Grouped tables restart numbering per department with a blank row between
// departments; ungrouped ones number on from `startNo`. Returns the last number used.
const writeTable = (
  writer,
  { title, headers, rows, toCells, remark, grouped, startNo = 0, emptyText = 'No candidates' },
) => {
  const titleRow = writer.write([text(title)])
  writer.merge(titleRow, 0, titleRow, 2)
  writer.write(headers.map(text))

  if (rows.length === 0) {
    writer.write([null, text(emptyText)])
    return startNo
  }

  let department = null
  let no = startNo
  rows.forEach((row) => {
    if (grouped && row.department !== department) {
      if (department !== null) writer.blank()
      department = row.department
      no = 0
    }
    no += 1
    writer.write(toCells(no, row, writer.nextExcelRow(), remark(row)))
  })
  return no
}

const chiefSheet = (chief) => {
  const writer = createSheetWriter()

  const titleRow = writer.write([
    text(`Best Employee Selection Under ${chief.position || chief.chief_name}`),
  ])
  writer.merge(titleRow, 0, titleRow, NON_MANAGERIAL_HEADERS.length - 1)

  writeTable(writer, {
    title: 'Non-Managerial',
    headers: NON_MANAGERIAL_HEADERS,
    rows: chief.non_managerial,
    toCells: nonManagerialCells,
    remark: candidateRemark,
    grouped: true,
  })
  writer.blank()
  writeTable(writer, {
    title: 'Managerial',
    headers: MANAGERIAL_HEADERS,
    rows: chief.managerial,
    toCells: managerialCells,
    remark: candidateRemark,
    grouped: true,
  })
  writer.blank()

  writer.write([null, text('Quota Allotted for the Function'), count(chief.quota_limit)])
  const names =
    chief.approved.length > 0 ? chief.approved.map((a) => a.name) : ['None approved yet']
  const firstNameRow = writer.nextExcelRow() - 1
  names.forEach((name, index) => {
    writer.write([null, index === 0 ? text('Selected Best Employees:') : null, text(name)])
  })
  if (names.length > 1) writer.merge(firstNameRow, 1, firstNameRow + names.length - 1, 1)
  writer.write([null, text('Approved By:'), text(chief.chief_name)])
  writer.write([null, text('Signature')])

  return writer.finish()
}

const withHeader = (headers, last) => [...headers.slice(0, -1), last]

const selectedBestSheet = (chiefs) => {
  const writer = createSheetWriter()
  const approvedOf = (chief, rows) =>
    rows
      .filter((row) => row.approval_status === 'approved')
      .map((row) => ({ ...row, approved_by: chief.chief_name }))

  const titleRow = writer.write([text('Selected Best Employees')])
  writer.merge(titleRow, 0, titleRow, NON_MANAGERIAL_HEADERS.length - 1)

  const lastNo = writeTable(writer, {
    title: 'Non-Managerial',
    headers: withHeader(NON_MANAGERIAL_HEADERS, 'Approved By'),
    rows: chiefs.flatMap((chief) => approvedOf(chief, chief.non_managerial)),
    toCells: nonManagerialCells,
    remark: (row) => row.approved_by,
    grouped: false,
    emptyText: 'None selected',
  })
  writer.blank()
  writeTable(writer, {
    title: 'Managerial',
    headers: withHeader(MANAGERIAL_HEADERS, 'Approved By'),
    rows: chiefs.flatMap((chief) => approvedOf(chief, chief.managerial)),
    toCells: managerialCells,
    remark: (row) => row.approved_by,
    grouped: false,
    startNo: lastNo,
    emptyText: 'None selected',
  })

  // Approved staff who no longer qualify as candidates (e.g. their appraisal changed)
  const missing = chiefs.flatMap((chief) => {
    const listed = new Set([...chief.non_managerial, ...chief.managerial].map((r) => r.employee_id))
    return chief.approved
      .filter((a) => !listed.has(a.employee_id))
      .map((a) => ({ ...a, approved_by: chief.chief_name }))
  })
  if (missing.length > 0) {
    writer.blank()
    writer.write([text('Approved but not in the current candidate list')])
    writer.write(
      [
        'No.',
        'Employee Name',
        'Job Position',
        'Department',
        'Final Score at Approval',
        'Approved By',
      ].map(text),
    )
    missing.forEach((a, index) => {
      writer.write([
        count(index + 1),
        text(a.name),
        text(a.position),
        text(a.department),
        decimal(a.final_score),
        text(a.approved_by),
      ])
    })
  }

  return writer.finish()
}

// Excel sheet names: at most 31 characters, none of \ / ? * [ ] :, unique ignoring case
const uniqueSheetName = (label, used) => {
  const base =
    (label || 'Chief')
      .replace(/[\\/?*[\]:]/g, '')
      .trim()
      .slice(0, 31) || 'Chief'
  let name = base
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`
  }
  used.add(name.toLowerCase())
  return name
}

// chiefs: entries from GET /api/staff-approval/selection-details, in the order to export
export const buildSelectionWorkbook = (chiefs, { includeSelectedBest }) => {
  const workbook = XLSX.utils.book_new()
  const used = new Set(includeSelectedBest ? [SELECTED_BEST_SHEET.toLowerCase()] : [])

  chiefs.forEach((chief) => {
    const name = uniqueSheetName(chief.position || chief.chief_name, used)
    XLSX.utils.book_append_sheet(workbook, chiefSheet(chief), name)
  })
  if (includeSelectedBest) {
    XLSX.utils.book_append_sheet(workbook, selectedBestSheet(chiefs), SELECTED_BEST_SHEET)
  }
  return workbook
}
