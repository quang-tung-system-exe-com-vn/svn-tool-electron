import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SVNResponse } from '../../shared/types'; // Sửa đường dẫn import
import configurationStore from '../store/ConfigurationStore';
const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store
export interface LogOptions {
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
}

// Helper function to fetch log data for a specific date range
async function fetchLogData(
  filePath: string,
  startDate: string | undefined,
  endDate: string | undefined,
  limit: number,
  offset: number
): Promise<{
  status: 'success' | 'error'
  revisions?: string[]
  totalEntries?: number
  data?: string
  message?: string
}> {
  let baseCommand = `svn log "${filePath}"`
  let detailCommandBase = `svn log -v "${filePath}"`
  const effectiveStartDate = startDate // Keep track of the date used for fetching

  // Apply date range if specified
  if (effectiveStartDate) {
    const fromISO = effectiveStartDate ? new Date(effectiveStartDate).toISOString() : null
    const toISO = endDate ? new Date(endDate).toISOString() : null

    if (fromISO) {
      const revisionRange = toISO ? `{${fromISO}}:{${toISO}}` : `{${fromISO}}:HEAD`
      const revisionArg = ` --revision "${revisionRange}"`
      baseCommand += revisionArg
      detailCommandBase += revisionArg
    }
  }

  // 1. Get all relevant revision IDs first (quiet mode)
  const revisionListCommand = `${baseCommand} -q`
  console.log(`Executing revision list command (Range: ${effectiveStartDate || 'Beginning'} - ${endDate || 'HEAD'}):`, revisionListCommand)

  let allRevisions: string[] = []
  try {
    const { stdout: revisionStdout, stderr: revisionStderr } = await execPromise(revisionListCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 20 })
    if (revisionStderr && !revisionStdout.trim()) {
      console.warn(`Warning fetching revision list: ${revisionStderr}`)
      // Consider it an error only if stdout is also empty
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
      .filter((rev): rev is string => !!rev);

    // Ensure uniqueness of revision IDs
    allRevisions = [...new Set(parsedRevisions)];

    if (parsedRevisions.length !== allRevisions.length) {
      console.warn(`Removed ${parsedRevisions.length - allRevisions.length} duplicate revision IDs.`);
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

  // Handle no entries or offset out of bounds for this specific fetch
  if (totalEntries === 0 || offset >= totalEntries) {
    console.log(`No data for this page (Total: ${totalEntries}, Offset: ${offset}) in range [${effectiveStartDate || 'Beginning'}, ${endDate || 'HEAD'}].`)
    return { status: 'success', revisions: [], totalEntries: totalEntries, data: '' }
  }

  // Paginate the revision IDs for this fetch
  const pageRevisionNumbers = allRevisions.slice(offset, offset + limit)
  console.log(`Revisions for current page (offset: ${offset}, limit: ${limit}):`, pageRevisionNumbers)

  // Get detailed log data for the paginated revisions
  let dataForPage = ''
  if (pageRevisionNumbers.length > 0) {
    const revisionArgs = pageRevisionNumbers.map(rev => `-r ${rev}`).join(' ')
    // IMPORTANT: Use the detailCommandBase which includes the correct date range for this fetch
    const detailCommand = `${detailCommandBase} ${revisionArgs}`
    console.log('Executing detail command for page revisions:', detailCommand)

    try {
      const { stdout: detailStdout, stderr: detailStderr } = await execPromise(detailCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 50 })
      if (detailStderr && !detailStdout.trim()) {
        console.warn(`Warning fetching log details: ${detailStderr}`)
        // Consider error only if stdout is empty
        return { status: 'error', message: `Error fetching log details: ${detailStderr}` }
      }
      if (detailStderr) {
        console.warn(`Non-fatal warning fetching log details: ${detailStderr}`)
      }
      dataForPage = detailStdout.trim()
    } catch (detailError) {
      console.error('Error executing detail command:', detailError)
      return { status: 'error', message: `Error fetching log details: ${detailError instanceof Error ? detailError.message : String(detailError)}` }
    }
  }

  return { status: 'success', revisions: allRevisions, totalEntries: totalEntries, data: dataForPage }
}

// Main log function
export async function log(filePath = '.', options?: LogOptions): Promise<SVNResponse> {
  try {
    console.log('Initial Log options:', options)
    const { limit = 50, offset = 0, dateFrom, dateTo } = options || {}
    let suggestedStartDate: string | null = null

    // --- First Attempt ---
    console.log(`--- Attempt 1: Fetching logs for [${dateFrom || 'Beginning'}, ${dateTo || 'HEAD'}] offset ${offset} ---`)
    let result = await fetchLogData(filePath, dateFrom, dateTo, limit, offset)

    // If first attempt failed hard, return error
    if (result.status === 'error') {
      return { status: 'error', message: result.message }
    }

    let totalEntries = result.totalEntries ?? 0
    let dataForPage = result.data ?? ''

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

            // --- Second Attempt (Retry) ---
            // Reset offset to 0 for the new date range
            const retryOffset = 0
            console.log(`--- Attempt 2: Retrying fetch for [${suggestedStartDate}, ${dateTo || 'HEAD'}] offset ${retryOffset} ---`)
            result = await fetchLogData(filePath, suggestedStartDate, dateTo, limit, retryOffset)

            if (result.status === 'error') {
              // If retry fails, return error but still include suggestedStartDate
              return { status: 'error', message: result.message, pagination: { limit, offset: retryOffset, totalEntries: 0, suggestedStartDate } }
            }

            // Update results from the successful retry
            totalEntries = result.totalEntries ?? 0
            dataForPage = result.data ?? ''
            // IMPORTANT: Return the offset used for the *successful* retry (which is 0)
            return { status: 'success', data: dataForPage, pagination: { limit, offset: retryOffset, totalEntries, suggestedStartDate } }
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
      return { status: 'success', data: '', pagination: { limit, offset, totalEntries: 0, suggestedStartDate } }
    } else if (offset >= totalEntries && totalEntries > 0) {
      // Handle offset out of bounds for the *first* attempt if it found entries
      console.log(`Offset (${offset}) is out of bounds (${totalEntries}) for the initial range. No data for this page.`)
      return { status: 'success', data: '', pagination: { limit, offset, totalEntries, suggestedStartDate } } // suggestedStartDate is null here
    }

    // --- Return result (either from successful first attempt or successful retry) ---
    // If we reached here, it means either the first attempt was successful and had data for the page,
    // or the first attempt had no data but no retry was needed/possible.
    // The retry case already returned above if it was successful.
    console.log('Returning result from initial fetch or after failed retry attempt.')
    return { status: 'success', data: dataForPage, pagination: { limit, offset, totalEntries, suggestedStartDate } } // suggestedStartDate is likely null here
  } catch (error) {
    // Catch any unexpected errors in the main function logic
    console.error('Unexpected error in log function:', error)
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
