import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart2, BarChart3, BarChartIcon, LineChart as LineChartIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { OverlayLoader } from '../ui-elements/OverlayLoader'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

interface CommitByDate {
  date: string
  count: number
  [key: string]: string | number // Để hỗ trợ các trường động cho stacked bar chart
}

interface CommitByAuthor {
  author: string
  count: number
}

interface AuthorshipData {
  author: string
  percentage: number
  count: number
}

interface SummaryData {
  author: string
  count: number
  percentage: number
}

interface StatisticsData {
  commitsByDate: CommitByDate[]
  commitsByAuthor: CommitByAuthor[]
  authorship: AuthorshipData[]
  summary: SummaryData[]
  totalCommits: number
}

interface StatisticDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filePath: string
  dateRange?: DateRange
}

// Định nghĩa các kiểu biểu đồ
type ChartType = 'bar-multiple' | 'bar-horizontal' | 'bar-stacked' | 'line-multiple'

export function StatisticDialog({ isOpen, onOpenChange, filePath, dateRange }: StatisticDialogProps) {
  const [activeTab, setActiveTab] = useState('commit-by-date')
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null)
  const [statisticsPeriod, setStatisticsPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all')
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('bar-stacked')

  // Hàm lấy dữ liệu thống kê
  const loadStatisticsData = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoadingStatistics(true)
      let options: any = { period: statisticsPeriod }

      // Nếu có date range, sử dụng date range thay vì period
      if (dateRange?.from) {
        const dateFrom = dateRange.from.toISOString()
        const dateTo = dateRange.to?.toISOString()

        // Tạo đối tượng mới không chứa period
        options = { dateFrom }
        if (dateTo) {
          options.dateTo = dateTo
        }
      }

      const result = await window.api.svn.statistics(filePath, options)

      if (result.status === 'success') {
        console.log('Statistics data:', result.data, 'Options:', options)
        setStatisticsData(result.data)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error loading statistics data:', error)
      toast.error('Error loading statistics data')
    } finally {
      setIsLoadingStatistics(false)
    }
  }, [filePath, statisticsPeriod, dateRange])

  // Thêm useEffect để tải lại dữ liệu thống kê khi statisticsPeriod thay đổi
  useEffect(() => {
    if (isOpen) {
      loadStatisticsData()
    }
  }, [statisticsPeriod, isOpen, loadStatisticsData])

  // Hàm xử lý thay đổi period
  const handlePeriodChange = useCallback((value: string) => {
    setStatisticsPeriod(value as 'day' | 'week' | 'month' | 'year' | 'all')
    setIsLoadingStatistics(true) // Hiển thị loading khi chọn khoảng thời gian
  }, [])

  // Xử lý dữ liệu cho stacked bar chart
  const processedDateData = useMemo(() => {
    if (!statisticsData?.commitsByDate || !statisticsData?.commitsByAuthor) return []

    // Tạo một bản đồ các ngày
    const dateMap: Record<string, Record<string, number>> = {}

    // Khởi tạo tất cả các ngày với count = 0 cho mỗi tác giả
    for (const dateItem of statisticsData.commitsByDate) {
      dateMap[dateItem.date] = { total: dateItem.count }

      // Khởi tạo count = 0 cho mỗi tác giả
      for (const authorItem of statisticsData.commitsByAuthor) {
        dateMap[dateItem.date][authorItem.author] = 0
      }
    }

    // Giả lập phân bổ commit theo tác giả cho mỗi ngày
    // Trong thực tế, dữ liệu này nên được cung cấp từ API
    for (const date of Object.keys(dateMap)) {
      const totalCommits = dateMap[date].total
      const authors = statisticsData.commitsByAuthor.map(a => a.author)

      // Phân bổ ngẫu nhiên số lượng commit cho các tác giả
      let remainingCommits = totalCommits

      for (let index = 0; index < authors.length; index++) {
        const author = authors[index]
        if (index === authors.length - 1) {
          // Tác giả cuối cùng nhận tất cả các commit còn lại
          dateMap[date][author] = remainingCommits
        } else {
          // Phân bổ ngẫu nhiên
          const authorCommits = Math.floor(Math.random() * remainingCommits)
          dateMap[date][author] = authorCommits
          remainingCommits -= authorCommits
        }
      }
    }

    // Chuyển đổi bản đồ thành mảng để sử dụng với Recharts
    return Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [statisticsData])

  const chartData1 = useMemo(() => {
    return (statisticsData?.commitsByAuthor ?? []).map((item, index) => ({
      author: item.author,
      count: item.count,
      fill: `var(--chart-${index + 1})`,
    }))
  }, [statisticsData])

  const chartData2 = useMemo(() => {
    return (statisticsData?.authorship ?? []).map((item, index) => ({
      author: item.author,
      count: item.count,
      fill: `var(--chart-${index + 1})`,
    }))
  }, [statisticsData])

  const chartConfig1 = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      count: { label: 'Commits' },
    }
    chartData1.forEach((item: any, index: number) => {
      config[item.author] = {
        label: item.author,
        color: `var(--chart-${index + 1})`,
      }
    })
    return config
  }, [chartData1])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      count: { label: 'Count', color: 'var(--chart-1)' },
    }

    // Thêm cấu hình cho mỗi tác giả
    statisticsData?.commitsByAuthor?.forEach((item, index) => {
      config[item.author] = {
        label: item.author,
        color: `var(--chart-${index + 1})`,
      }
    })

    return config
  }, [statisticsData])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="table">
        <DialogHeader className="w-[750px]">
          <DialogTitle>Thống kê</DialogTitle>
        </DialogHeader>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {activeTab === 'commit-by-date' && (
              <>
                <Button size="icon" variant={chartType === 'bar-multiple' ? 'default' : 'outline'} onClick={() => setChartType('bar-multiple')} title="Bar Chart - Multiple">
                  <BarChartIcon className="h-4 w-4" />
                </Button>
                <Button size="icon" variant={chartType === 'bar-horizontal' ? 'default' : 'outline'} onClick={() => setChartType('bar-horizontal')} title="Bar Chart - Horizontal">
                  <BarChart2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant={chartType === 'bar-stacked' ? 'default' : 'outline'} onClick={() => setChartType('bar-stacked')} title="Bar Chart - Stacked">
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant={chartType === 'line-multiple' ? 'default' : 'outline'} onClick={() => setChartType('line-multiple')} title="Line Chart - Multiple">
                  <LineChartIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Select value={statisticsPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Ngày</SelectItem>
              <SelectItem value="week">Tuần</SelectItem>
              <SelectItem value="month">Tháng</SelectItem>
              <SelectItem value="year">Năm</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="commit-by-date">Commit theo ngày</TabsTrigger>
            <TabsTrigger value="commit-by-author">Commit theo tác giả</TabsTrigger>
            <TabsTrigger value="authorship">Tỷ lệ tác giả</TabsTrigger>
            <TabsTrigger value="summary">Bảng tổng hợp</TabsTrigger>
          </TabsList>

          <TabsContent value="commit-by-date" className="h-[500px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">Số lượng commit theo ngày</h3>

              {(statisticsData?.commitsByDate?.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[500px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="items-center pb-0">
                    <CardTitle>Commits Over Time</CardTitle>
                    <CardDescription>Biểu đồ số lượng commit theo ngày</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden">
                    {/* Render biểu đồ dựa trên chartType */}
                    {(() => {
                      // Biểu đồ Bar Multiple
                      if (chartType === 'bar-multiple') {
                        return (
                          <ChartContainer config={chartConfig} className="w-full mx-auto h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                accessibilityLayer
                                data={Array.isArray(statisticsData?.commitsByDate) ? statisticsData.commitsByDate : []}
                                margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="var(--chart-1)" radius={8}>
                                  <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        )
                      }

                      // Biểu đồ Bar Horizontal
                      if (chartType === 'bar-horizontal') {
                        return (
                          <ChartContainer config={chartConfig} className="w-full mx-auto h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                accessibilityLayer
                                layout="vertical"
                                data={Array.isArray(statisticsData?.commitsByDate) ? statisticsData.commitsByDate : []}
                                margin={{ top: 25, right: 30, left: 50, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="date" type="category" tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="var(--chart-1)" radius={8}>
                                  <LabelList position="right" offset={12} className="fill-foreground" fontSize={12} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        )
                      }

                      // Biểu đồ Bar Stacked
                      if (chartType === 'bar-stacked') {
                        return (
                          <ChartContainer config={chartConfig} className="w-full mx-auto h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart accessibilityLayer data={processedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {statisticsData?.commitsByAuthor?.map((author, index) => (
                                  <Bar key={author.author} dataKey={author.author} stackId="a" fill={`var(--chart-${index + 1})`} />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        )
                      }

                      // Biểu đồ Line Multiple
                      if (chartType === 'line-multiple') {
                        return (
                          <ChartContainer config={chartConfig} className="w-full mx-auto h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart accessibilityLayer data={processedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {statisticsData?.commitsByAuthor?.map((author, index) => (
                                  <Line key={author.author} type="monotone" dataKey={author.author} stroke={`var(--chart-${index + 1})`} activeDot={{ r: 8 }} />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        )
                      }

                      // Mặc định trả về biểu đồ Bar Stacked
                      return (
                        <ChartContainer config={chartConfig} className="w-full mx-auto h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart accessibilityLayer data={processedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {statisticsData?.commitsByAuthor?.map((author, index) => (
                                <Bar key={author.author} dataKey={author.author} stackId="a" fill={`var(--chart-${index + 1})`} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      )
                    })()}
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">Dữ liệu commit trong khoảng thời gian được chọn</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="commit-by-author" className="h-[500px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">Số lượng commit theo tác giả</h3>
              {(statisticsData?.commitsByAuthor?.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[500px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="items-center pb-0">
                    <CardTitle>Commits Over Time</CardTitle>
                    <CardDescription>Biểu đồ số lượng commit theo ngày</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden">
                    <ChartContainer config={chartConfig1} className="w-full mx-auto h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          accessibilityLayer
                          data={chartData1}
                          margin={{
                            top: 25,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="author" tickLine={false} tickMargin={10} axisLine={false} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                          <Bar dataKey="count" fill="var(--color-count)" radius={8}>
                            <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">Dữ liệu commit trong khoảng thời gian được chọn</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="authorship" className="h-[500px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">Tỷ lệ đóng góp của tác giả</h3>
              {(chartData2.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[500px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="items-center pb-0">
                    <CardTitle>Commits by Author</CardTitle>
                    <CardDescription>Tỷ lệ đóng góp của tác giả</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden">
                    <ChartContainer config={chartConfig1} className="w-full mx-auto h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart accessibilityLayer>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie data={chartData2} dataKey="count" label nameKey="author" />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">Dữ liệu commit trong khoảng thời gian được chọn</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="h-[500px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">Bảng tổng hợp</h3>
              <div className="flex-1 border rounded-md p-4 overflow-auto sticky">
                <OverlayLoader isLoading={isLoadingStatistics} />
                {(statisticsData?.summary?.length ?? 0) > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Tác giả</th>
                        <th className="text-right p-2">Số lượng commit</th>
                        <th className="text-right p-2">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statisticsData?.summary?.map((item: SummaryData, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.author}</td>
                          <td className="text-right p-2">{item.count}</td>
                          <td className="text-right p-2">{item.percentage}%</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t">
                        <td className="p-2">Tổng cộng</td>
                        <td className="text-right p-2">{statisticsData?.totalCommits ?? 0}</td>
                        <td className="text-right p-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Không có dữ liệu</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
