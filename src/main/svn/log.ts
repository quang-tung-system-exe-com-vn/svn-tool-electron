import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { SVNResponse } from '../../shared/types' // Sửa đường dẫn import
import configurationStore from '../store/ConfigurationStore'
const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store
export interface LogOptions {
  // Bỏ limit và offset
  dateFrom?: string
  dateTo?: string
}

// Helper function to fetch ALL log data for a specific date range
async function fetchAllLogData(
  filePath: string,
  startDate: string | undefined,
  endDate: string | undefined
): Promise<{
  status: 'success' | 'error'
  totalEntries?: number
  data?: string
  message?: string
}> {
  let baseCommand = `svn log "${filePath}"`
  let detailCommandBase = `svn log -v "${filePath}"` // Lấy chi tiết log
  const effectiveStartDate = startDate // Keep track of the date used for fetching

  // Apply date range if specified
  if (effectiveStartDate) {
    const fromISO = effectiveStartDate ? new Date(effectiveStartDate).toISOString() : null
    const toISO = endDate ? new Date(endDate).toISOString() : null

    if (fromISO) {
      const revisionRange = toISO ? `{${fromISO}}:{${toISO}}` : `{${fromISO}}:HEAD`
      const revisionArg = ` --revision "${revisionRange}"`
      baseCommand += revisionArg
      detailCommandBase += revisionArg // Áp dụng date range cho cả lệnh lấy chi tiết
    }
  }

  // 1. Get all relevant revision IDs first (quiet mode) - Vẫn cần để lấy totalEntries chính xác
  const revisionListCommand = `${baseCommand} -q`
  console.log(`Executing revision list command (Range: ${effectiveStartDate || 'Beginning'} - ${endDate || 'HEAD'}):`, revisionListCommand)

  let allRevisions: string[] = []
  try {
    const { stdout: revisionStdout, stderr: revisionStderr } = await execPromise(revisionListCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 20 })
    if (revisionStderr && !revisionStdout.trim()) {
      console.warn(`Warning fetching revision list: ${revisionStderr}`)
      return { status: 'error', message: `Error fetching revision list: ${revisionStderr}` }
    }
    if (revisionStderr) {
      console.warn(`Non-fatal warning fetching revision list: ${revisionStderr}`)
    }

    const parsedRevisions = revisionStdout
      .split('------------------------------------------------------------------------')
      .map(entry => entry.trim())
      .filter(entry => entry)
      .map(entry => entry.match(/^r(\d+)\s+\|/)?.[1])
      .filter((rev): rev is string => !!rev)

    allRevisions = [...new Set(parsedRevisions)]

    if (parsedRevisions.length !== allRevisions.length) {
      console.warn(`Removed ${parsedRevisions.length - allRevisions.length} duplicate revision IDs.`)
    }

    console.log(`Found ${allRevisions.length} unique revisions matching criteria in range.`)
  } catch (fetchError) {
    console.error('Error executing revision list command:', fetchError)
    if (fetchError instanceof Error && fetchError.message.includes('non-existent')) {
      allRevisions = []
      console.log('Path might not exist or has no history in the specified range.')
    } else {
      return { status: 'error', message: `Error fetching revision list: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` }
    }
  }

  const totalEntries = allRevisions.length

  // Handle no entries
  if (totalEntries === 0) {
    console.log(`No revisions found in range [${effectiveStartDate || 'Beginning'}, ${endDate || 'HEAD'}].`)
    return { status: 'success', totalEntries: 0, data: '' }
  }

  // 2. Get detailed log data for ALL revisions in the range
  // Không cần phân trang revision IDs nữa
  // Sử dụng detailCommandBase đã có date range (nếu có)
  const detailCommand = detailCommandBase // Lệnh này đã bao gồm date range
  console.log('Executing detail command for ALL revisions in range:', detailCommand)

  let allData = ''
  try {
    // Tăng maxBuffer nếu cần thiết vì có thể lấy nhiều dữ liệu hơn
    const { stdout: detailStdout, stderr: detailStderr } = await execPromise(detailCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 100 }) // Tăng maxBuffer lên 100MB
    if (detailStderr && !detailStdout.trim()) {
      console.warn(`Warning fetching log details: ${detailStderr}`)
      // Vẫn trả về success nếu có stdout, lỗi stderr có thể không nghiêm trọng
    }
    if (detailStderr) {
      console.warn(`Non-fatal warning fetching log details: ${detailStderr}`)
    }
    allData = detailStdout.trim()
    console.log(`Fetched detailed log data for ${totalEntries} revisions, data length: ${allData.length}`)
  } catch (detailError) {
    console.error('Error executing detail command:', detailError)
    return { status: 'error', message: `Error fetching log details: ${detailError instanceof Error ? detailError.message : String(detailError)}` }
  }

  // Trả về toàn bộ dữ liệu và tổng số entries
  return { status: 'success', totalEntries: totalEntries, data: allData }
}

// Main log function - simplified
export async function log(filePath = '.', options?: LogOptions): Promise<SVNResponse> {
  try {
    console.log('Initial Log options (fetching all data):', options)
    const { dateFrom, dateTo } = options || {} // Bỏ limit, offset
    let suggestedStartDate: string | null = null

    // --- First Attempt: Fetch all data directly ---
    console.log(`--- Attempt 1: Fetching ALL logs for [${dateFrom || 'Beginning'}, ${dateTo || 'HEAD'}] ---`)
    let result = await fetchAllLogData(filePath, dateFrom, dateTo)

    // If first attempt failed hard, return error
    if (result.status === 'error') {
      return { status: 'error', message: result.message }
    }

    let totalEntries = result.totalEntries ?? 0
    let allData = result.data ?? ''

    // --- Handle No Results in First Attempt ---
    if (totalEntries === 0 && dateFrom) {
      console.log(`No revisions found in the initial range [${dateFrom}, ${dateTo || 'HEAD'}].`)
      console.log(`Searching for the last revision of "${filePath}" at or before ${dateFrom}...`)
      try {
        const fromISO = new Date(dateFrom).toISOString()
        const findLastRevisionCommand = `svn log "${filePath}" -r 1:{"${fromISO}"} -l 1 --xml`
        console.log('Executing command to find last revision before start date:', findLastRevisionCommand)

        const { stdout: lastRevisionStdout, stderr: lastRevisionStderr } = await execPromise(findLastRevisionCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 })

        if (lastRevisionStderr && !lastRevisionStdout) {
          console.warn(`Warning finding last revision before start date: ${lastRevisionStderr}`)
        }

        if (lastRevisionStdout) {
          const dateMatch = lastRevisionStdout.match(/<date>(.*?)<\/date>/)
          if (dateMatch?.[1]) {
            suggestedStartDate = dateMatch[1]
            console.log(`Found last revision date before ${dateFrom}: ${suggestedStartDate}. Retrying fetch.`)

            // --- Second Attempt (Retry): Fetch all data with suggested start date ---
            console.log(`--- Attempt 2: Retrying fetch ALL logs for [${suggestedStartDate}, ${dateTo || 'HEAD'}] ---`)
            result = await fetchAllLogData(filePath, suggestedStartDate, dateTo) // Gọi lại fetchAllLogData

            if (result.status === 'error') {
              // If retry fails, return error but still include suggestedStartDate
              // Không còn pagination object
              return { status: 'error', message: result.message, suggestedStartDate }
            }

            // Update results from the successful retry
            totalEntries = result.totalEntries ?? 0
            allData = result.data ?? ''
            // Trả về dữ liệu và suggestedStartDate, không cần pagination
            return { status: 'success', data: allData, totalEntries, suggestedStartDate }
          } else {
            console.log('Could not parse date from the last revision XML output. No retry possible.')
          }
        } else {
          console.log('No output received when searching for the last revision before start date. No retry possible.')
        }
      } catch (findLastError) {
        console.warn(
          `Could not find any revision for "${filePath}" at or before ${dateFrom}. No retry possible. Error: ${findLastError instanceof Error ? findLastError.message : String(findLastError)}`
        )
      }
      // If no suggestedStartDate found or retry wasn't possible/successful, return empty result from first attempt
      // Không còn pagination object
      return { status: 'success', data: '', totalEntries: 0, suggestedStartDate }
    }
    // Bỏ kiểm tra offset >= totalEntries vì không còn offset

    // --- Return result (either from successful first attempt or successful retry) ---
    console.log('Returning result (all data fetched).')
    // Trả về toàn bộ dữ liệu và totalEntries, không cần pagination
    return { status: 'success', data: allData, totalEntries, suggestedStartDate } // suggestedStartDate is likely null here
  } catch (error) {
    // Catch any unexpected errors in the main function logic
    console.error('Unexpected error in log function:', error)
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
