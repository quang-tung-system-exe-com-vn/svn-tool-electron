import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export interface LogOptions {
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function log(filePath = '.', options?: LogOptions): Promise<SVNResponse> {
  try {
    console.log(options);
    const { limit = 100, offset = 0, dateFrom, dateTo } = options || {};

    // Xây dựng lệnh cơ bản
    let baseCommand = `svn log -v "${filePath}"`;

    // Thêm tham số date range nếu có
    if (dateFrom) {
      if (dateTo) {
        // Nếu có cả dateFrom và dateTo, sử dụng phạm vi ngày
        baseCommand += ` --revision "{${dateFrom}}:{${dateTo}}"`;
      } else {
        // Nếu chỉ có dateFrom, lấy từ ngày đó đến HEAD
        baseCommand += ` --revision "{${dateFrom}}:HEAD"`;
      }
    }

    // Nếu không có offset, chỉ cần lấy limit entries từ HEAD
    if (offset === 0) {
      const command = `${baseCommand} -l ${limit}`;
      const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder });
      if (stderr) return { status: 'error', message: stderr };
      return { status: 'success', data: stdout.trim(), pagination: { limit, offset } };
    }

    // Nếu có offset, chúng ta cần thực hiện 2 bước:
    // 1. Lấy danh sách các revision (không verbose) để xác định revision cần bắt đầu
    // 2. Lấy log chi tiết từ revision đó

    // Bước 1: Lấy danh sách các revision
    const revisionCommand = `${baseCommand.replace('-v', '')} -l ${offset + limit}`;
    const { stdout: revisionStdout, stderr: revisionStderr } = await execPromise(revisionCommand, { cwd: sourceFolder });
    if (revisionStderr) return { status: 'error', message: revisionStderr };

    // Phân tích danh sách revision
    const revisions = revisionStdout
      .split('------------------------------------------------------------------------')
      .map(entry => entry.trim())
      .filter(entry => entry);

    // Nếu số lượng revisions nhỏ hơn offset, không có dữ liệu cho trang này
    if (revisions.length <= offset) {
      return { status: 'success', data: '', pagination: { limit, offset } };
    }

    // Lấy các revision cho trang hiện tại
    const pageRevisions = revisions.slice(offset, offset + limit);

    // Bước 2: Lấy log chi tiết cho các revision này
    const detailsPromises = pageRevisions.map(async (revisionEntry) => {
      // Trích xuất số revision từ entry
      const revMatch = revisionEntry.match(/^r(\d+)\s+\|/);
      if (!revMatch) return '';

      const revision = revMatch[1];
      // Sử dụng baseCommand nhưng thay thế tham số revision
      const detailCommand = `svn log -v "${filePath}" -r ${revision}`;
      const { stdout: detailStdout } = await execPromise(detailCommand, { cwd: sourceFolder });
      return detailStdout.trim();
    });

    const detailsResults = await Promise.all(detailsPromises);
    const combinedOutput = detailsResults.join('\n------------------------------------------------------------------------\n');
    console.log(combinedOutput);
    return { status: 'success', data: combinedOutput, pagination: { limit, offset } };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
