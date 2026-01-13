// type: uploaded file
// fileName: app/(dashboard)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSystemStatus, getLogs, getDomains } from "@/lib/api"; // [UPDATED] Import getDomains
import { SystemStatus, AttackLog } from "@/types";
import { getActionColor, formatRelativeTime } from "@/lib/utils";
import {
  Server,
  Database,
  Brain,
  Activity,
  Shield,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttackLog[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    blocked: 0,
    flagged: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch System Status
        const systemStatus = await getSystemStatus();
        if (systemStatus) setStatus(systemStatus);

        // 2. Fetch Logs
        const logsResponse = await getLogs(1, 20);
        if (logsResponse && logsResponse.data) {
          setRecentLogs(logsResponse.data);
        }

        // 3. Fetch Domains & Aggregate Stats [ADDED]
        const domains = await getDomains();
        if (domains) {
          const aggregated = domains.reduce(
            (acc, domain) => ({
              totalRequests:
                acc.totalRequests + (domain.stats?.total_requests || 0),
              blocked: acc.blocked + (domain.stats?.blocked_requests || 0),
              flagged: acc.flagged + (domain.stats?.flagged_requests || 0),
            }),
            { totalRequests: 0, blocked: 0, flagged: 0 }
          );
          setStats(aggregated);
        }
      } catch (error) {
        console.error("Dashboard data fetch failed", error);
      }
    };

    fetchData();

    // Poll every 5 seconds to match backend flush interval
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gateway Status
            </CardTitle>
            <Server
              className={`h-4 w-4 ${
                status?.gateway.status === "Online"
                  ? "text-success"
                  : "text-destructive"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.gateway.status}</div>
            <p className="text-xs text-muted-foreground">
              CPU: {status?.gateway.cpu} | RAM: {status?.gateway.memory}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {status?.gateway.network}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database
              className={`h-4 w-4 ${
                status?.database.status === "Online"
                  ? "text-success"
                  : "text-destructive"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.database.status}</div>
            <p className="text-xs text-muted-foreground">Managed MongoDB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ML Engine</CardTitle>
            <Brain
              className={`h-4 w-4 ${
                status?.ml_scorer.status === "Online"
                  ? "text-success"
                  : "text-destructive"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.ml_scorer.status}</div>
            <p className="text-xs text-muted-foreground">
              CPU: {status?.ml_scorer.cpu} | RAM: {status?.ml_scorer.memory}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Blocked Attacks
            </CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.blocked.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Threats mitigated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Flagged Events
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats.flagged.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Suspicious activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attack Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent attacks detected.
              </p>
            ) : (
              recentLogs.map((log, index) => (
                <div
                  key={log._id || index}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                        {log.request?.method || "GET"} {log.request_path}
                      </span>
                      <span className="text-sm font-medium">{log.reason}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{log.ip}</span>
                      <span>•</span>
                      <span className={getActionColor(log.action)}>
                        {log.action}
                      </span>
                      <span>•</span>
                      <span>Score: {log.score}</span>
                      {log.ml_confidence && (
                        <>
                          <span>•</span>
                          <span>
                            Confidence: {(log.ml_confidence * 100).toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {log.tags?.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
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
