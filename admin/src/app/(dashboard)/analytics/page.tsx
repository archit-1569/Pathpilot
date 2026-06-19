"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  ShieldAlert, 
  Award, 
  FileText, 
  Eye, 
  MessageSquare, 
  RefreshCw,
  TrendingUp,
  Brain
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Color palettes
const COLORS = {
  primary: "#6366f1", // Indigo
  secondary: "#10b981", // Emerald
  accent1: "#8b5cf6", // Violet
  accent2: "#f59e0b", // Amber
  accent3: "#ec4899", // Pink
  grid: "#374151", // Gray 700 for grid lines in dark theme
};

// HSL tailored colors for Recharts bars
const BAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"];

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<any>({
    total_users: 0,
    active_users: 0,
    recommendations_generated: 0,
    resume_analyses: 0,
    exam_views: 0,
    ai_mentor_conversations: 0,
  });
  const [charts, setCharts] = useState<any>({
    user_growth: [],
    recommended_careers: [],
    viewed_exams: [],
    selected_skills: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const [kpiData, chartData] = await Promise.all([
        apiRequest("/admin/analytics/kpis"),
        apiRequest("/admin/analytics/charts")
      ]);
      setKpis(kpiData);
      setCharts(chartData);
    } catch (e: any) {
      console.error("Failed to load analytics datasets", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Compiling analytics report...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total Users",
      value: kpis.total_users,
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10 border-indigo-500/10",
      description: "Registered profiles"
    },
    {
      title: "Active Users",
      value: kpis.active_users,
      icon: ShieldAlert,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/10",
      description: "Non-disabled profiles"
    },
    {
      title: "Career Recommendations",
      value: kpis.recommendations_generated,
      icon: Award,
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/10",
      description: "Fit reports generated"
    },
    {
      title: "Resume Analyses",
      value: kpis.resume_analyses,
      icon: FileText,
      color: "text-pink-500",
      bg: "bg-pink-500/10 border-pink-500/10",
      description: "ATS scans completed"
    },
    {
      title: "Govt Exam Views",
      value: kpis.exam_views,
      icon: Eye,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/10",
      description: "Guide exploration count"
    },
    {
      title: "AI Mentor Chats",
      value: kpis.ai_mentor_conversations,
      icon: MessageSquare,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10 border-cyan-500/10",
      description: "Conversing users"
    }
  ];

  // Helper component for styled recharts tooltips
  const CustomTooltip = ({ active, payload, label, valueKey, labelKey }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/90 text-popover-foreground border border-border px-3 py-2 text-xs rounded-md shadow-md backdrop-blur-sm">
          <p className="font-semibold">{payload[0].payload[labelKey] || label}</p>
          <p className="text-primary mt-0.5">
            Count: <span className="font-bold">{payload[0].payload[valueKey] || payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time usage insights, generated reports, and student interests.</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="shadow-sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Stats"}
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`flex flex-col p-5 bg-card text-card-foreground rounded-xl border shadow-xs hover:shadow-md transition-all group ${card.bg}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</span>
                <Icon className={`h-5 w-5 shrink-0 ${card.color} group-hover:scale-110 transition-transform`} />
              </div>
              <span className="text-2xl font-bold mt-3 tracking-tight">{card.value.toLocaleString()}</span>
              <span className="text-2xs text-muted-foreground mt-1.5">{card.description}</span>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* User Growth (Area Chart) */}
        <div className="p-6 bg-card text-card-foreground border rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold tracking-tight">User Registration Growth</h2>
          </div>
          <div className="h-72 w-full">
            {charts.user_growth.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">No registration logs yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.user_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                  <Tooltip content={<CustomTooltip valueKey="count" labelKey="date" />} />
                  <Area type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#userGrowthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Most Recommended Careers (Bar Chart) */}
        <div className="p-6 bg-card text-card-foreground border rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold tracking-tight">Top Recommended Careers</h2>
          </div>
          <div className="h-72 w-full">
            {charts.recommended_careers.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">No career recommendations generated yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.recommended_careers} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="career_name" tickLine={false} axisLine={false} width={120} style={{ fontSize: 10, fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltip valueKey="count" labelKey="career_name" />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {charts.recommended_careers.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Most Viewed Government Exams (Bar Chart) */}
        <div className="p-6 bg-card text-card-foreground border rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold tracking-tight">Most Viewed Exams</h2>
          </div>
          <div className="h-72 w-full">
            {charts.viewed_exams.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">No exam view logs yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.viewed_exams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="exam_name" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip valueKey="count" labelKey="exam_name" />} />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={32}>
                    {charts.viewed_exams.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[(index + 2) % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Most Selected Skills (Bar Chart) */}
        <div className="p-6 bg-card text-card-foreground border rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">Most Selected Student Skills</h2>
          </div>
          <div className="h-72 w-full">
            {charts.selected_skills.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">No skills logged in profiles yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.selected_skills} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="skill_name" tickLine={false} axisLine={false} width={100} style={{ fontSize: 10, fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltip valueKey="count" labelKey="skill_name" />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {charts.selected_skills.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[(index + 1) % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
