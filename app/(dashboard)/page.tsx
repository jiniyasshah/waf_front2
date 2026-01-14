"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSystemStatus, getLogs, getDomains } from "@/lib/api";
import { SystemStatus, AttackLog, Domain } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  Shield,
  AlertOctagon,
  Server,
  Database,
  Cpu,
  Zap,
  TrendingUp,
  Radio,
  PauseCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// --- TYPES ---
interface TrafficPoint {
  time: string;
  total: number;
  threats: number;
}

// --- SMART POLLING HOOK ---
function useSmartPolling(intervalMs: number = 5000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttackLog[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Graph State
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>([]);
  // Refs to store previous totals for delta calculation
  const prevStats = useRef({ total: 0, threats: 0 });
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, logsRes, domainsRes] = await Promise.all([
        getSystemStatus(),
        getLogs(1, 10),
        getDomains(),
      ]);

      if (statusRes) setStatus(statusRes);
      if (logsRes?.data) setRecentLogs(logsRes.data);

      if (domainsRes) {
        setDomains(domainsRes);

        // --- LIVE GRAPH CALCULATION ---
        const currentStats = domainsRes.reduce(
          (acc, d) => ({
            total: acc.total + (d.stats?.total_requests || 0),
            threats:
              acc.threats +
              (d.stats?.blocked_requests || 0) +
              (d.stats?.flagged_requests || 0),
          }),
          { total: 0, threats: 0 }
        );

        // Calculate Deltas (Traffic in the last 5s interval)
        // If it's the first load, show 0 to prevent a huge spike from 0 -> Total
        let deltaTotal = 0;
        let deltaThreats = 0;

        if (!isFirstLoad.current) {
          deltaTotal = Math.max(
            0,
            currentStats.total - prevStats.current.total
          );
          deltaThreats = Math.max(
            0,
            currentStats.threats - prevStats.current.threats
          );
        }

        // Update Refs
        prevStats.current = currentStats;
        isFirstLoad.current = false;

        // Add to History (Keep last 20 points)
        const now = new Date();
        const timeLabel = `${now.getHours()}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        setTrafficHistory((prev) => {
          const newHistory = [
            ...prev,
            { time: timeLabel, total: deltaTotal, threats: deltaThreats },
          ];
          return newHistory.slice(-20); // Keep graph clean (last 20 intervals)
        });
      }

      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Polling Error:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchData();
        setIsPaused(false);
      } else {
        setIsPaused(true);
      }
    }, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) {
        setIsPaused(false);
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData, intervalMs]);

  return {
    status,
    recentLogs,
    domains,
    isPaused,
    lastRefreshed,
    trafficHistory,
  };
}

export default function DashboardPage() {
  const {
    status,
    recentLogs,
    domains,
    isPaused,
    lastRefreshed,
    trafficHistory,
  } = useSmartPolling(5000);

  const stats = domains.reduce(
    (acc, domain) => ({
      totalRequests: acc.totalRequests + (domain.stats?.total_requests || 0),
      blocked: acc.blocked + (domain.stats?.blocked_requests || 0),
      flagged: acc.flagged + (domain.stats?.flagged_requests || 0),
    }),
    { totalRequests: 0, blocked: 0, flagged: 0 }
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time threat intelligence and traffic analysis.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            Last updated: {formatRelativeTime(lastRefreshed.toISOString())}
          </span>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isPaused
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <div className="pulse-dot">
              <span
                className={isPaused ? "bg-yellow-500" : "bg-emerald-500"}
              ></span>
              <span
                className={`pulse-dot-inner ${
                  isPaused ? "bg-yellow-500" : "bg-emerald-500"
                }`}
              ></span>
            </div>
            {isPaused ? "Paused" : "Live Stream"}
          </div>
        </div>
      </div>

      {/* --- LIVE TRAFFIC GRAPH --- */}
      <Card className="p-1 overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/40 mb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Traffic vs. Threats
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Requests per 5 seconds
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] w-full pt-2 pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trafficHistory}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#27272a"
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
                itemStyle={{ fontSize: "12px" }}
                labelStyle={{
                  color: "#a1a1aa",
                  marginBottom: "4px",
                  fontSize: "12px",
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />

              {/* Total Traffic Area */}
              <Area
                name="Total Requests"
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
                animationDuration={1000}
                isAnimationActive={false} // Smoother updates for real-time
              />

              {/* Threats Area (Layered on top) */}
              <Area
                name="Detected Threats"
                type="monotone"
                dataKey="threats"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorThreats)"
                animationDuration={1000}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System Status Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard
          title="Gateway Node"
          icon={<Server className="h-5 w-5 text-indigo-400" />}
          status={status?.gateway.status}
          details={`${status?.gateway.cpu || "0%"} CPU • ${
            status?.gateway.memory || "0MB"
          } RAM`}
          colorClass="bg-indigo-500/10 border-indigo-500/20"
        />
        <StatusCard
          title="Database Cluster"
          icon={<Database className="h-5 w-5 text-emerald-400" />}
          status={status?.database.status}
          details="Primary Shard Active"
          colorClass="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatusCard
          title="ML Inference"
          icon={<Cpu className="h-5 w-5 text-purple-400" />}
          status={status?.ml_scorer.status}
          details="Model Loaded (v2.1)"
          colorClass="bg-purple-500/10 border-purple-500/20"
        />
      </div>

      {/* Traffic Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime processed
            </p>
            <div className="w-full bg-secondary h-1 mt-4 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: "100%" }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocked Threats
            </CardTitle>
            <Shield className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.blocked.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-rose-400">
              High severity interventions
            </p>
            <div className="w-full bg-secondary h-1 mt-4 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{
                  width: `${
                    stats.totalRequests > 0
                      ? (stats.blocked / stats.totalRequests) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anomalies
            </CardTitle>
            <AlertOctagon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.flagged.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires manual review
            </p>
            <div className="w-full bg-secondary h-1 mt-4 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full rounded-full"
                style={{
                  width: `${
                    stats.totalRequests > 0
                      ? (stats.flagged / stats.totalRequests) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden border-border/50">
        <CardHeader className="bg-white/[0.02] border-b border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Security Events</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recent interceptions and flagged requests
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-black text-xs font-normal px-3 py-1 border-white/10"
            >
              Real-time Feed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-3">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  System secure. No threats detected.
                </p>
              </div>
            ) : (
              recentLogs.map((log, i) => (
                <div
                  key={log._id || i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 p-2 rounded-lg border ${
                        log.action === "Blocked"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                      }`}
                    >
                      {log.action === "Blocked" ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {log.reason}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                          {log.request?.method}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{log.ip}</span>
                        <span className="text-border">|</span>
                        <span className="truncate max-w-[200px]">
                          {log.request_path}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right sm:pl-0 pl-14">
                    {log.ml_confidence && (
                      <div className="hidden sm:block text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Confidence
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            log.ml_confidence > 0.8
                              ? "text-rose-400"
                              : "text-blue-400"
                          }`}
                        >
                          {(log.ml_confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
                      {formatRelativeTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Visual Status Card Helper
function StatusCard({ title, status, details, icon, colorClass }: any) {
  const isOnline = status === "Online";
  return (
    <Card className="relative overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                colorClass ? colorClass : "bg-secondary"
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <h3 className="text-xl font-bold text-white mt-1">
                {status || "..."}
              </h3>
            </div>
          </div>
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isOnline
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                : "bg-rose-500"
            }`}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{details}</span>
          {isOnline && (
            <span className="text-emerald-500 font-medium">Operational</span>
          )}
        </div>
      </div>
    </Card>
  );
}
