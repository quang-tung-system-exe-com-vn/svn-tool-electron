import { format, subDays, subMonths, subWeeks, subYears } from 'date-fns'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import configurationStore from '../store/ConfigurationStore'

const execPromise = promisify(exec)
const { sourceFolder } = configurationStore.store

export interface StatisticsOptions {
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

interface CommitByDate {
  date: string;
  count: number;
}

interface CommitByAuthor {
  author: string;
  count: number;
}

interface AuthorshipData {
  author: string;
  percentage: number;
  count: number;
}

interface SummaryData {
  author: string;
  count: number;
  percentage: number;
}

export interface StatisticsResponse {
  commitsByDate: CommitByDate[];
  commitsByAuthor: CommitByAuthor[];
  authorship: AuthorshipData[];
  summary: SummaryData[];
  totalCommits: number;
}

/**
 * Lấy thống kê từ SVN log
 */
export async function getStatistics(filePath = '.', options?: StatisticsOptions): Promise<SVNResponse> {
  try {
    const { period = 'all', dateFrom, dateTo } = options || {};

    // Xây dựng lệnh cơ bản
    let command = `svn log "${filePath}"`;

    // Thêm tham số date range dựa trên period hoặc dateFrom/dateTo
    if (dateFrom && dateTo) {
      command += ` --revision "{${dateFrom}}:{${dateTo}}"`;
    } else if (period !== 'all') {
      const today = new Date();
      let fromDate: Date | undefined;

      switch (period) {
        case 'day':
          fromDate = subDays(today, 1);
          break;
        case 'week':
          fromDate = subWeeks(today, 1);
          break;
        case 'month':
          fromDate = subMonths(today, 1);
          break;
        case 'year':
          fromDate = subYears(today, 1);
          break;
      }

      if (fromDate) {
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(today, "yyyy-MM-dd");
        command += ` --revision "{${fromDateStr}}:{${toDateStr}}"`;
      }
    }

    // Thực thi lệnh SVN
    const { stdout, stderr } = await execPromise(command, { cwd: sourceFolder });
    if (stderr) return { status: 'error', message: stderr };

    // Phân tích kết quả
    const entries = stdout
      .split('------------------------------------------------------------------------')
      .map(entry => entry.trim())
      .filter(entry => entry);

    // Khởi tạo các đối tượng để lưu trữ thống kê
    const commitsByDate: Record<string, number> = {};
    const commitsByAuthor: Record<string, number> = {};
    const totalCommits = entries.length;

    // Phân tích từng entry
    for (const entry of entries) {
      const lines = entry.split('\n').map(line => line.trim());
      const headerMatch = lines[0]?.match(/^r\d+\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|/);

      if (headerMatch) {
        const [, author, dateStr] = headerMatch;
        const date = new Date(dateStr);
        const dateKey = format(date, 'yyyy-MM-dd');

        // Thống kê theo ngày
        commitsByDate[dateKey] = (commitsByDate[dateKey] || 0) + 1;

        // Thống kê theo tác giả
        commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
      }
    }

    // Chuyển đổi dữ liệu thành mảng để dễ dàng sử dụng
    const commitsByDateArray = Object.entries(commitsByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));

    const commitsByAuthorArray = Object.entries(commitsByAuthor).map(([author, count]) => ({
      author,
      count
    })).sort((a, b) => b.count - a.count);

    // Tính toán tỷ lệ đóng góp của tác giả
    const authorshipArray = commitsByAuthorArray.map(({ author, count }) => ({
      author,
      count,
      percentage: Math.round((count / totalCommits) * 100)
    }));

    // Tạo dữ liệu tổng hợp
    const summaryArray = authorshipArray.slice();

    // Trả về kết quả
    return {
      status: 'success',
      data: {
        commitsByDate: commitsByDateArray,
        commitsByAuthor: commitsByAuthorArray,
        authorship: authorshipArray,
        summary: summaryArray,
        totalCommits
      }
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
