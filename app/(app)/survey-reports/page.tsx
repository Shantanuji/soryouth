
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend as RechartsLegend, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { ClipboardList, CalendarDays, MapPin, Building, Home, Sun, List, Loader2, User } from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { CONSUMER_CATEGORIES_OPTIONS } from '@/lib/constants';
import type { SiteSurvey, ConsumerCategoryType } from '@/types';
import { getSiteSurveys } from '@/app/(app)/site-survey/actions';
import { DhonuStatCard } from '@/components/dhonu/stat-card';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SurveyReportsPage() {
  const [surveys, setSurveys] = useState<SiteSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const fetchedSurveys = await getSiteSurveys();
      setSurveys(fetchedSurveys);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const surveysInLast30Days = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(today, 29)); 
    return surveys.filter(survey => {
      const surveyDate = parseISO(survey.date);
      return isWithinInterval(surveyDate, { start: thirtyDaysAgo, end: endOfDay(today) });
    });
  }, [surveys]);

  const userDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    surveysInLast30Days.forEach(survey => {
      counts[survey.surveyorName] = (counts[survey.surveyorName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([user, count]) => ({ user, surveys: count }))
      .sort((a, b) => b.surveys - a.surveys);
  }, [surveysInLast30Days]);

  const typeDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    CONSUMER_CATEGORIES_OPTIONS.forEach(type => counts[type] = 0);

    surveysInLast30Days.forEach(survey => {
      if (counts[survey.consumerCategory] !== undefined) {
        counts[survey.consumerCategory]++;
      }
    });
    return CONSUMER_CATEGORIES_OPTIONS.map((type, index) => ({
      name: type,
      value: counts[type] || 0,
      fill: COLORS[index % COLORS.length],
    })).filter(item => item.value > 0);
  }, [surveysInLast30Days]);

  const userChartConfig: ChartConfig = {
    surveys: { label: 'Surveys', color: 'hsl(var(--chart-1))' },
  };

  const typeChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    typeDistributionData.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [typeDistributionData]);

  if (isLoading) {
    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading Survey Reports...</p>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Survey Reports"
        description="Overview of recent survey activities, distributions by location and type."
        icon={ClipboardList}
        actions={
          <Button asChild>
            <Link href="/survey-list">
              <List className="mr-2 h-4 w-4" /> View Survey List
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-6">
        <DhonuStatCard
          title="Surveys (Last 30 Days)"
          value={surveysInLast30Days.length}
          icon={CalendarDays}
          variant="primary"
          trendLabel="Total surveys conducted recently."
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>User-wise Distribution</CardTitle>
            </div>
            <CardDescription>Number of surveys conducted per user in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pb-0">
            {userDistributionData.length > 0 ? (
              <ChartContainer config={userChartConfig} className="w-full h-full">
                <ResponsiveContainer>
                  <BarChart data={userDistributionData} layout="vertical" margin={{ right: 30, left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="user" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="surveys" fill="var(--color-surveys)" radius={[0, 4, 4, 0]} barSize={30}>
                        <LabelList dataKey="surveys" position="right" offset={8} className="fill-foreground" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No survey data for user distribution.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle>Type-wise Distribution</CardTitle>
            </div>
            <CardDescription>Breakdown of surveys by consumer type in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pb-0">
            {typeDistributionData.length > 0 ? (
              <ChartContainer config={typeChartConfig} className="w-full h-full">
                <ResponsiveContainer>
                  <PieChart>
                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={typeDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                      {typeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No survey data for type distribution.</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Recent Surveys (Last 30 Days)</CardTitle>
            <CardDescription>A quick look at the most recent surveys.</CardDescription>
        </CardHeader>
        <CardContent>
            {surveysInLast30Days.length > 0 ? (
                <div className="space-y-3">
                    {surveysInLast30Days.slice(0, 5).map(survey => ( 
                        <div key={survey.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                            <div>
                                <p className="font-medium text-sm">{survey.consumerName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {survey.location} - {survey.consumerCategory}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm">{format(parseISO(survey.date), "dd MMM, yyyy")}</p>
                                <p className="text-xs text-muted-foreground">By: {survey.surveyorName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No surveys conducted in the last 30 days.</p>
            )}
        </CardContent>
      </Card>
    </>
  );
}
