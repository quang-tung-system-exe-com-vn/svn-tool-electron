'use client'
import toast from '@/components/ui-elements/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import logger from '@/services/logger'
import { AreaChart as AreaChartIcon, BarChart2, BarChart3, BarChartIcon, LineChart as LineChartIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { OverlayLoader } from '../ui-elements/OverlayLoader'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '../ui/chart'

interface CommitByDate {
  date: string
  authors: { author: string; count: number }[]
  totalCount: number
  [key: string]: string | number | { author: string; count: number }[]
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
  data: any
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filePath: string
  dateRange?: DateRange
}

type CommitByDateChartType = 'bar-multiple' | 'bar-horizontal' | 'bar-stacked' | 'line-multiple' | 'area-multiple'
type CommitByAuthorChartType = 'bar-vertical' | 'bar-horizontal'

export function StatisticDialog({ data, isOpen, onOpenChange, filePath, dateRange }: StatisticDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('commit-by-date')
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null)
  const [statisticsPeriod, setStatisticsPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all')
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false)
  const [commitByDateChartType, setCommitByDateChartType] = useState<CommitByDateChartType>('bar-stacked')
  const [commitByAuthorChartType, setCommitByAuthorChartType] = useState<CommitByAuthorChartType>('bar-vertical')
  const loadStatisticsData = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoadingStatistics(true)
      let options: any = { period: statisticsPeriod }
      if (dateRange?.from) {
        const dateFrom = dateRange.from.toISOString()
        const dateTo = dateRange.to?.toISOString()
        options = { dateFrom }
        if (dateTo) {
          options.dateTo = dateTo
        }
      }
      const result = await window.api.svn.statistics(filePath, options)

      if (result.status === 'success') {
        logger.info('Statistics data:', result.data, 'Options:', options)
        setStatisticsData(result.data)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      logger.error('Error loading statistics data:', error)
      toast.error(t('dialog.statisticSvn.dialog.statisticSvn.errorLoading'))
    } finally {
      setIsLoadingStatistics(false)
    }
  }, [filePath, statisticsPeriod, dateRange])

  useEffect(() => {
    if (isOpen) {
      loadStatisticsData()
    }
  }, [statisticsPeriod, isOpen, loadStatisticsData])

  const processedTotalDateData = useMemo(() => {
    return [...(statisticsData?.commitsByDate ?? [])].map(item => ({ date: item.date, count: item.totalCount })).sort((a, b) => a.date.localeCompare(b.date))
  }, [statisticsData?.commitsByDate])

  const processedStackedDateData = useMemo(() => {
    if (!statisticsData?.commitsByDate) return []
    const allAuthors = new Set<string>()
    if (statisticsData.commitsByDate) {
      for (const day of statisticsData.commitsByDate) {
        for (const authorData of day.authors) {
          allAuthors.add(authorData.author)
        }
      }
    }
    const uniqueAuthors = Array.from(allAuthors)
    return [...statisticsData.commitsByDate]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => {
        const dayData: { date: string; totalCount: number; [key: string]: number | string } = {
          date: day.date,
          totalCount: day.totalCount,
        }
        for (const author of uniqueAuthors) {
          dayData[author] = 0
        }
        for (const authorData of day.authors) {
          dayData[authorData.author] = authorData.count
        }
        return dayData
      })
  }, [statisticsData?.commitsByDate])

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

  const commitByDateChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    const allAuthors = new Set<string>()
    if (statisticsData?.commitsByDate) {
      for (const day of statisticsData.commitsByDate) {
        for (const authorData of day.authors) {
          allAuthors.add(authorData.author)
        }
      }
    }

    Array.from(allAuthors).forEach((author, index) => {
      const chartColorIndex = (index % 6) + 1
      config[author] = {
        label: author,
        color: `var(--chart-${chartColorIndex})`,
      }
    })
    return config
  }, [statisticsData?.commitsByDate, t])

  const totalCountChartConfig = useMemo(() => {
    return {
      count: { label: t('dialog.statisticSvn.commitCountLabel', 'Commits'), color: 'var(--chart-1)' },
    }
  }, [t])

  function getBarRadius(data: any[], authorKeys: any[]) {
    const posMap: Record<string, { single?: string; top?: string; bottom?: string }> = {}
    for (const row of data) {
      const authorsWithValue = authorKeys.filter(key => row[key] > 0)
      if (authorsWithValue.length === 1) {
        posMap[row.date] = { single: authorsWithValue[0] }
      } else if (authorsWithValue.length > 1) {
        posMap[row.date] = {
          top: authorsWithValue[authorsWithValue.length - 1],
          bottom: authorsWithValue[0],
        }
      }
    }
    return posMap
  }

  const posMap = getBarRadius(processedStackedDateData, Object.keys(commitByDateChartConfig))

  const getRadiusForAuthor = (date: string | number, author: string | undefined) => {
    if (!posMap[date]) return [0, 0, 0, 0]
    if (posMap[date].single === author) return [4, 4, 4, 4]
    if (posMap[date].top === author) return [4, 4, 0, 0]
    if (posMap[date].bottom === author) return [0, 0, 4, 4]
    return [0, 0, 0, 0]
  }

  function roundedRect(x: any, y: any, width: any, height: any, radiusTopLeft: any, radiusTopRight: number, radiusBottomRight: number, radiusBottomLeft: number) {
    return `
        M${x + radiusTopLeft},${y}
        H${x + width - radiusTopRight}
        Q${x + width},${y} ${x + width},${y + radiusTopRight}
        V${y + height - radiusBottomRight}
        Q${x + width},${y + height} ${x + width - radiusBottomRight},${y + height}
        H${x + radiusBottomLeft}
        Q${x},${y + height} ${x},${y + height - radiusBottomLeft}
        V${y + radiusTopLeft}
        Q${x},${y} ${x + radiusTopLeft},${y}
        Z
      `
  }
  const CustomBarShape = (props: { x: number; y: number; width: number; height: number; payload: any; dataKey: string; fill: string }) => {
    const { x, y, width, height, payload, dataKey, fill, ...rest } = props
    const date = payload.date
    const radius = getRadiusForAuthor(date, dataKey)
    const d = roundedRect(x, y, width, height, ...(radius as [number, number, number, number]))
    return <path d={d} fill={fill} />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="table">
        <DialogHeader className="w-[750px]">
          <DialogTitle>{t('dialog.statisticSvn.title')}</DialogTitle>
          <DialogDescription>{t('dialog.statisticSvn.description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="commit-by-date">{t('dialog.statisticSvn.tabs.commitByDate')}</TabsTrigger>
            <TabsTrigger value="commit-by-author">{t('dialog.statisticSvn.tabs.commitByAuthor')}</TabsTrigger>
            <TabsTrigger value="authorship">{t('dialog.statisticSvn.tabs.authorship')}</TabsTrigger>
            <TabsTrigger value="summary">{t('dialog.statisticSvn.tabs.summary')}</TabsTrigger>
          </TabsList>

          <TabsContent value="commit-by-date" className="h-[550px]">
            <div className="flex flex-col h-full">
              {(statisticsData?.commitsByDate?.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[550px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="flex flex-row items-center justify-between pb-0">
                    <div className="flex flex-col">
                      <CardTitle>{t('dialog.statisticSvn.commitByDate.cardTitle')}</CardTitle>
                      <CardDescription>{t('dialog.statisticSvn.commitByDate.cardDescription')}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant={commitByDateChartType === 'bar-multiple' ? 'default' : 'outline'}
                        onClick={() => setCommitByDateChartType('bar-multiple')}
                        title={t('dialog.statisticSvn.commitByDate.chartTypes.barMultiple')}
                      >
                        <BarChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={commitByDateChartType === 'bar-horizontal' ? 'default' : 'outline'}
                        onClick={() => setCommitByDateChartType('bar-horizontal')}
                        title={t('dialog.statisticSvn.commitByDate.chartTypes.barHorizontal')}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={commitByDateChartType === 'bar-stacked' ? 'default' : 'outline'}
                        onClick={() => setCommitByDateChartType('bar-stacked')}
                        title={t('dialog.statisticSvn.commitByDate.chartTypes.barStacked')}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={commitByDateChartType === 'line-multiple' ? 'default' : 'outline'}
                        onClick={() => setCommitByDateChartType('line-multiple')}
                        title={t('dialog.statisticSvn.commitByDate.chartTypes.lineMultiple')}
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={commitByDateChartType === 'area-multiple' ? 'default' : 'outline'}
                        onClick={() => setCommitByDateChartType('area-multiple')}
                        title={t('dialog.statisticSvn.commitByDate.chartTypes.areaMultiple')}
                      >
                        <AreaChartIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden pt-4">
                    {(() => {
                      const authorKeys = Object.keys(commitByDateChartConfig)
                      if (commitByDateChartType === 'bar-multiple') {
                        return (
                          <ChartContainer config={commitByDateChartConfig} className="w-full mx-auto h-[350px]">
                            <BarChart accessibilityLayer data={processedStackedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              {authorKeys.map(author => (
                                <Bar key={author} dataKey={author} fill={commitByDateChartConfig[author]?.color} radius={4} />
                              ))}
                            </BarChart>
                          </ChartContainer>
                        )
                      }

                      if (commitByDateChartType === 'bar-horizontal') {
                        return (
                          <ChartContainer config={totalCountChartConfig} className="w-full mx-auto h-[350px]">
                            <BarChart accessibilityLayer layout="vertical" data={processedTotalDateData} margin={{ top: 25, right: 30, left: 50, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="count" />
                              <YAxis dataKey="date" type="category" tickLine={false} axisLine={false} width={80} />
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Bar dataKey="count" fill="var(--chart-1)" radius={8}>
                                <LabelList dataKey="count" position="right" offset={8} className="fill-foreground" fontSize={12} />
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )
                      }

                      if (commitByDateChartType === 'bar-stacked') {
                        return (
                          <ChartContainer config={commitByDateChartConfig} className="w-full mx-auto h-[350px]">
                            <BarChart accessibilityLayer data={processedStackedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              {authorKeys.map(author => (
                                <Bar
                                  key={author}
                                  dataKey={author}
                                  stackId="a"
                                  fill={commitByDateChartConfig[author]?.color}
                                  shape={(props: any) => <CustomBarShape {...props} dataKey={author} />}
                                />
                              ))}
                            </BarChart>
                          </ChartContainer>
                        )
                      }

                      if (commitByDateChartType === 'line-multiple') {
                        return (
                          <ChartContainer config={commitByDateChartConfig} className="w-full mx-auto h-[350px]">
                            <LineChart accessibilityLayer data={processedStackedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              {authorKeys.map(author => (
                                <Line key={author} type="monotone" dataKey={author} stroke={commitByDateChartConfig[author]?.color} activeDot={{ r: 8 }} />
                              ))}
                            </LineChart>
                          </ChartContainer>
                        )
                      }

                      if (commitByDateChartType === 'area-multiple') {
                        return (
                          <ChartContainer config={commitByDateChartConfig} className="w-full mx-auto h-[350px]">
                            <AreaChart accessibilityLayer data={processedStackedDateData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              {authorKeys.map(author => (
                                <Area
                                  key={author}
                                  type="monotone"
                                  dataKey={author}
                                  stackId="1"
                                  stroke={commitByDateChartConfig[author]?.color}
                                  fill={commitByDateChartConfig[author]?.color}
                                  fillOpacity={0.4}
                                />
                              ))}
                            </AreaChart>
                          </ChartContainer>
                        )
                      }

                      return <div>{t('dialog.statisticSvn.selectChartType')}</div>
                    })()}
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">{t('dialog.statisticSvn.cardFooter')}</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center min-h-[550px]">
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="commit-by-author" className="h-[550px]">
            <div className="flex flex-col h-full">
              {(statisticsData?.commitsByAuthor?.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[550px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="flex flex-row items-center justify-between pb-0">
                    <div className="flex flex-col">
                      <CardTitle>{t('dialog.statisticSvn.commitByAuthor.cardTitle')}</CardTitle>
                      <CardDescription>{t('dialog.statisticSvn.commitByAuthor.cardDescription')}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant={commitByAuthorChartType === 'bar-vertical' ? 'default' : 'outline'}
                        onClick={() => setCommitByAuthorChartType('bar-vertical')}
                        title={t('dialog.statisticSvn.commitByAuthor.chartTypes.barVertical')}
                      >
                        <BarChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={commitByAuthorChartType === 'bar-horizontal' ? 'default' : 'outline'}
                        onClick={() => setCommitByAuthorChartType('bar-horizontal')}
                        title={t('dialog.statisticSvn.commitByAuthor.chartTypes.barHorizontal')}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden pt-4">
                    {commitByAuthorChartType === 'bar-vertical' && (
                      <ChartContainer config={chartConfig1} className="w-full mx-auto h-[350px]">
                        <BarChart
                          accessibilityLayer
                          data={chartData1}
                          margin={{
                            top: 25,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="author" tickLine={false} tickMargin={10} axisLine={false} />
                          <YAxis />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                          <Bar dataKey="count" fill="var(--color-count)" radius={8}>
                            <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                    {commitByAuthorChartType === 'bar-horizontal' && (
                      <ChartContainer config={chartConfig1} className="w-full mx-auto h-[350px]">
                        <BarChart
                          accessibilityLayer
                          layout="vertical"
                          data={chartData1}
                          margin={{
                            top: 25,
                            right: 30,
                            left: 50,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="author" type="category" tickLine={false} axisLine={false} width={100} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                          <Bar dataKey="count" fill="var(--color-count)" radius={8}>
                            <LabelList position="right" offset={12} className="fill-foreground" fontSize={12} />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">{t('dialog.statisticSvn.cardFooter')}</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center min-h-[550px]">
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="authorship" className="h-[550px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">{t('dialog.statisticSvn.authorship.cardTitle')}</h3>
              {(chartData2.length ?? 0) > 0 ? (
                <Card className="flex flex-col max-w-full sticky h-[518px]">
                  <OverlayLoader isLoading={isLoadingStatistics} />
                  <CardHeader className="items-center pb-0">
                    <CardTitle>{t('dialog.statisticSvn.authorship.cardTitle')}</CardTitle>
                    <CardDescription>{t('dialog.statisticSvn.authorship.cardDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0 overflow-hidden">
                    <ChartContainer config={chartConfig1} className="w-full mx-auto h-full">
                      <PieChart accessibilityLayer>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={chartData2} dataKey="count" label nameKey="author" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">{t('dialog.statisticSvn.cardFooter')}</CardFooter>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center min-h-[550px]">
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="h-[550px] min-h-[550px]">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-2">{t('dialog.statisticSvn.summary.title')}</h3>
              <div className="flex-1 border rounded-md p-4 overflow-auto sticky">
                <OverlayLoader isLoading={isLoadingStatistics} />
                {(statisticsData?.summary?.length ?? 0) > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{t('dialog.statisticSvn.summary.author')}</th>
                        <th className="text-right p-2">{t('dialog.statisticSvn.summary.commitCount')}</th>
                        <th className="text-right p-2">{t('dialog.statisticSvn.summary.percentage')}</th>
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
                        <td className="p-2">{t('dialog.statisticSvn.summary.total')}</td>
                        <td className="text-right p-2">{statisticsData?.totalCommits ?? 0}</td>
                        <td className="text-right p-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex items-center justify-center min-h-[550px]">
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
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
