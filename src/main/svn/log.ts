import logger from 'electron-log'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'
import { getWorkingCopyRoot } from './info'
const execPromise = promisify(exec)
export interface LogOptions {
  dateFrom?: string
  dateTo?: string
}

async function fetchAllLogData(
  filePath: string,
  startDate: string | undefined,
  endDate: string | undefined
): Promise<{
  status: 'success' | 'error'
  totalEntries?: number
  data?: string
  message?: string
  sourceFolderPrefix?: string
  workingCopyRootFolder?: string
}> {
  let baseCommand = `svn log "${filePath}"`
  let detailCommandBase = `svn log -v "${filePath}"`
  const effectiveStartDate = startDate
  const { sourceFolder } = configurationStore.store

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

  const revisionListCommand = `${baseCommand} -q`
  logger.info(`Executing revision list command (Range: ${effectiveStartDate || 'Beginning'} - ${endDate || 'HEAD'}):`, revisionListCommand)

  logger.info(revisionListCommand)
  let allRevisions: string[] = []
  try {
    const { stdout: revisionStdout, stderr: revisionStderr } = await execPromise(revisionListCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 20 })
    if (revisionStderr && !revisionStdout.trim()) {
      logger.warn(`Warning fetching revision list: ${revisionStderr}`)
      return { status: 'error', message: `Error fetching revision list: ${revisionStderr}` }
    }
    if (revisionStderr) {
      logger.warn(`Non-fatal warning fetching revision list: ${revisionStderr}`)
    }

    const parsedRevisions = revisionStdout
      .split('------------------------------------------------------------------------')
      .map(entry => entry.trim())
      .filter(entry => entry)
      .map(entry => entry.match(/^r(\d+)\s+\|/)?.[1])
      .filter((rev): rev is string => !!rev)

    allRevisions = [...new Set(parsedRevisions)]
    if (parsedRevisions.length !== allRevisions.length) {
      logger.warn(`Removed ${parsedRevisions.length - allRevisions.length} duplicate revision IDs.`)
    }
    logger.info(`Found ${allRevisions.length} unique revisions matching criteria in range.`)
  } catch (fetchError) {
    logger.error('Error executing revision list command:', fetchError)
    if (fetchError instanceof Error && fetchError.message.includes('non-existent')) {
      allRevisions = []
      logger.info('Path might not exist or has no history in the specified range.')
    } else {
      return { status: 'error', message: `Error fetching revision list: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` }
    }
  }
  const totalEntries = allRevisions.length
  if (totalEntries === 0) {
    logger.info(`No revisions found in range [${effectiveStartDate || 'Beginning'}, ${endDate || 'HEAD'}].`)
    return { status: 'success', totalEntries: 0, data: '' }
  }
  const detailCommand = detailCommandBase
  logger.info('Executing detail command for ALL revisions in range:', detailCommand)

  let allData = ''
  try {
    const { stdout: detailStdout, stderr: detailStderr } = await execPromise(detailCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 * 100 })
    if (detailStderr && !detailStdout.trim()) {
      logger.warn(`Warning fetching log details: ${detailStderr}`)
    }
    if (detailStderr) {
      logger.warn(`Non-fatal warning fetching log details: ${detailStderr}`)
    }
    allData = detailStdout.trim()
    logger.info(`Fetched detailed log data for ${totalEntries} revisions, data length: ${allData.length}`)
  } catch (detailError) {
    logger.error('Error executing detail command:', detailError)
    return { status: 'error', message: `Error fetching log details: ${detailError instanceof Error ? detailError.message : String(detailError)}` }
  }
  return { status: 'success', totalEntries: totalEntries, data: allData }
}

export async function log(filePath: string | string[] = '.', options?: LogOptions): Promise<SVNResponse> {
  try {
    logger.info('Initial Log options (fetching all data):', options)
    const { dateFrom, dateTo } = options || {}
    const { sourceFolder } = configurationStore.store
    let suggestedStartDate: string | null = null

    let sourceFolderPrefix = ''
    let workingCopyRootFolder = ''
    const rootFolder = await getWorkingCopyRoot()
    if (rootFolder && sourceFolder) {
      workingCopyRootFolder = rootFolder.replace(/\\/g, '/').replace(/\/$/, '')
      const normalizedSource = sourceFolder.replace(/\\/g, '/').replace(/\/$/, '')
      if (normalizedSource.length > workingCopyRootFolder.length && normalizedSource.startsWith(workingCopyRootFolder)) {
        sourceFolderPrefix = normalizedSource.substring(workingCopyRootFolder.length)
        if (sourceFolderPrefix.startsWith('/')) {
          sourceFolderPrefix = sourceFolderPrefix.substring(1)
        }
      }
    }


    if (Array.isArray(filePath)) {
      logger.info(`Multiple files provided (${filePath.length}), fetching logs for each file separately`)
      let combinedData = ''
      let totalEntries = 0
      let hasError = false
      let errorMessage = ''
      for (const path of filePath) {
        logger.info(`Fetching log for file: ${path}`)
        const singleResult = await fetchAllLogData(path, dateFrom, dateTo)
        if (singleResult.status === 'error') {
          hasError = true
          errorMessage += `Error fetching log for ${path}: ${singleResult.message}\n`
          continue
        }
        if (singleResult.data) {
          if (combinedData) {
            combinedData += '\n------------------------------------------------------------------------\n'
          }
          combinedData += singleResult.data
          totalEntries += singleResult.totalEntries || 0
        }
      }

      if (hasError && !combinedData) {
        return { status: 'error', message: errorMessage.trim() }
      }

      return {
        status: 'success',
        data: combinedData,
        totalEntries,
        sourceFolderPrefix,
        workingCopyRootFolder,
        message: hasError ? errorMessage.trim() : undefined,
      }
    }

    logger.info(`--- Attempt 1: Fetching ALL logs for [${dateFrom || 'Beginning'}, ${dateTo || 'HEAD'}] ---`)
    let result = await fetchAllLogData(filePath, dateFrom, dateTo)

    if (result.status === 'error') {
      return { status: 'error', message: result.message }
    }

    let totalEntries = result.totalEntries ?? 0
    let allData = result.data ?? ''

    if (totalEntries === 0 && dateFrom) {
      logger.info(`No revisions found in the initial range [${dateFrom}, ${dateTo || 'HEAD'}].`)
      logger.info(`Searching for the last revision of "${filePath}" at or before ${dateFrom}...`)
      try {
        const fromISO = new Date(dateFrom).toISOString()
        const findLastRevisionCommand = `svn log "${filePath}" -r 1:{"${fromISO}"} -l 1 --xml`
        logger.info('Executing command to find last revision before start date:', findLastRevisionCommand)

        const { stdout: lastRevisionStdout, stderr: lastRevisionStderr } = await execPromise(findLastRevisionCommand, { cwd: sourceFolder, maxBuffer: 1024 * 1024 })

        if (lastRevisionStderr && !lastRevisionStdout) {
          logger.warn(`Warning finding last revision before start date: ${lastRevisionStderr}`)
        }

        if (lastRevisionStdout) {
          const dateMatch = lastRevisionStdout.match(/<date>(.*?)<\/date>/)
          if (dateMatch?.[1]) {
            suggestedStartDate = dateMatch[1]
            logger.info(`Found last revision date before ${dateFrom}: ${suggestedStartDate}. Retrying fetch.`)
            logger.info(`--- Attempt 2: Retrying fetch ALL logs for [${suggestedStartDate}, ${dateTo || 'HEAD'}] ---`)
            if (Array.isArray(filePath)) {
              let combinedData = '';
              let totalEntries = 0;
              let hasError = false;
              let errorMessage = '';
              for (const path of filePath) {
                logger.info(`Retrying fetch log for file: ${path}`);
                const singleResult = await fetchAllLogData(path, suggestedStartDate, dateTo);
                if (singleResult.status === 'error') {
                  hasError = true;
                  errorMessage += `Error fetching log for ${path}: ${singleResult.message}\n`;
                  continue;
                }
                if (singleResult.data) {
                  if (combinedData) {
                    combinedData += '\n------------------------------------------------------------------------\n';
                  }
                  combinedData += singleResult.data;
                  totalEntries += singleResult.totalEntries || 0;
                }
              }

              if (hasError && !combinedData) {
                return { status: 'error', message: errorMessage.trim(), suggestedStartDate };
              }

              return {
                status: 'success',
                data: combinedData,
                totalEntries,
                suggestedStartDate,
                sourceFolderPrefix,
                workingCopyRootFolder,
                message: hasError ? errorMessage.trim() : undefined,
              }
            }

            result = await fetchAllLogData(filePath, suggestedStartDate, dateTo) // Gọi lại fetchAllLogData

            if (result.status === 'error') {
              return { status: 'error', message: result.message, suggestedStartDate }
            }
            totalEntries = result.totalEntries ?? 0
            allData = result.data ?? ''
            return {
              status: 'success', data: allData, totalEntries, suggestedStartDate,
              sourceFolderPrefix,
              workingCopyRootFolder,
            }
          }
          logger.info('Could not parse date from the last revision XML output. No retry possible.')
        } else {
          logger.info('No output received when searching for the last revision before start date. No retry possible.')
        }
      } catch (findLastError) {
        logger.warn(
          `Could not find any revision for "${filePath}" at or before ${dateFrom}. No retry possible. Error: ${findLastError instanceof Error ? findLastError.message : String(findLastError)}`
        )
      }
      return {
        status: 'success', data: '', totalEntries: 0, suggestedStartDate,
        sourceFolderPrefix,
        workingCopyRootFolder,
      }
    }

    logger.info('Returning result (all data fetched).')
    return {
      status: 'success', data: allData, totalEntries, suggestedStartDate,
      sourceFolderPrefix,
      workingCopyRootFolder,
    } // suggestedStartDate is likely null here
  } catch (error) {
    logger.error('Unexpected error in log function:', error)
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
