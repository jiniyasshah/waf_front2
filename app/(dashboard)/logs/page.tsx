"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// [UPDATED] Imported getDomains
import { getLogs, getDomains } from "@/lib/api";
// [UPDATED] Imported Domain type
import { AttackLog, Domain } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldAlert,
  Activity,
  Filter,
  Download,
  XCircle,
  Terminal,
  ChevronLeft,
  Copy,
  ArrowUpRight,
  FileCode,
  Globe, // [UPDATED] Added icon
} from "lucide-react";
import { toast } from "sonner";

// ... [Keep TableSkeleton and RawRequestViewer components EXACTLY as they were] ...
const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse border-b border-border/40">
        <TableCell className="py-4">
          <div className="h-4 w-4 bg-muted/50 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-24 bg-muted/50 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-48 bg-muted/50 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-32 bg-muted/50 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-20 bg-muted/50 rounded" />
        </TableCell>
        <TableCell>
          <div className="h-5 w-16 bg-muted/50 rounded-full" />
        </TableCell>
        <TableCell className="text-right">
          <div className="h-4 w-12 bg-muted/50 rounded ml-auto" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

const RawRequestViewer = ({
  request,
}: {
  request: NonNullable<AttackLog["request"]>;
}) => {
  const copyToClipboard = () => {
    const content =
      `${request.method} ${request.url}\n` +
      Object.entries(request.headers || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n") +
      (request.body ? `\n\n${request.body}` : "");
    navigator.clipboard.writeText(content);
    toast.success("Request copied to clipboard");
  };

  return (
    <div className="rounded-lg border border-border bg-[#09090b] shadow-sm overflow-hidden text-sm font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          <span>Raw HTTP Request</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-background hover:text-foreground"
          onClick={copyToClipboard}
          title="Copy raw request"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="p-4 overflow-x-auto leading-relaxed">
        <div className="mb-2">
          <span className="text-blue-400 font-bold">{request.method}</span>{" "}
          <span className="text-foreground">{request.url}</span>{" "}
          <span className="text-muted-foreground">HTTP/1.1</span>
        </div>
        <div className="space-y-0.5 mb-4">
          {Object.entries(request.headers || {}).map(([key, values]) => (
            <div key={key} className="flex">
              <span className="text-indigo-300 min-w-[140px] select-none">
                {key}:
              </span>
              <span className="text-muted-foreground break-all">
                {Array.isArray(values) ? values.join(", ") : values}
              </span>
            </div>
          ))}
        </div>
        {request.body && (
          <div className="border-t border-border/40 pt-4 mt-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 select-none">
              Payload Body
            </div>
            <div className="text-foreground/80 whitespace-pre-wrap break-all bg-muted/10 p-2 rounded border border-border/20">
              {request.body}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // [UPDATED] Domain State
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState("20");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // [UPDATED] Load domains list on mount
    async function loadDomains() {
      const list = await getDomains();
      if (list) setDomains(list);
    }
    loadDomains();
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      if (logs.length === 0) setIsLoading(true);

      // [UPDATED] Pass selectedDomain (undefined if "all")
      const domainParam = selectedDomain === "all" ? undefined : selectedDomain;

      const response = await getLogs(page, parseInt(limit), domainParam);

      if (response && response.data) {
        setLogs(response.data);
        if (response.pagination) setTotalPages(response.pagination.total_pages);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedDomain]); // [UPDATED] added selectedDomain dependency

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      if (!isPaused && !document.hidden && page === 1) fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, isPaused, page]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.ip.toLowerCase().includes(q) ||
        log.request_path.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        log.action.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const blocked = logs.filter((l) => l.action === "Blocked").length;
    const flagged = logs.filter((l) => l.action === "Flagged").length;
    const reasons: Record<string, number> = {};
    logs.forEach((l) => {
      reasons[l.reason] = (reasons[l.reason] || 0) + 1;
    });
    const topReason =
      Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    return { total, blocked, flagged, topReason };
  }, [logs]);

  const toggleRow = (id: string) =>
    setExpandedRowId((prev) => (prev === id ? null : id));

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `waf_logs_${new Date().toISOString()}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Traffic Inspector
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time analysis of incoming requests and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              isPaused
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isPaused ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            {isPaused ? "Paused" : "Live Stream"}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="h-8"
          >
            {isPaused ? (
              <PlayCircle className="h-3.5 w-3.5 mr-2" />
            ) : (
              <PauseCircle className="h-3.5 w-3.5 mr-2" />
            )}
            {isPaused ? "Resume" : "Pause"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              fetchLogs();
            }}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 w-8 p-0"
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Events"
          value={stats.total}
          icon={<FileCode className="h-4 w-4 text-primary" />}
        />
        <StatsCard
          title="Blocked"
          value={stats.blocked}
          icon={<ShieldAlert className="h-4 w-4 text-rose-500" />}
        />
        <StatsCard
          title="Flagged"
          value={stats.flagged}
          icon={<Shield className="h-4 w-4 text-yellow-500" />}
        />
        <StatsCard
          title="Top Threat"
          value={stats.topReason}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          textSmall
        />
      </div>

      {/* TOOLBAR & TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search IP, Path, User-Agent..."
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* [UPDATED] Domain Filter */}
          <Select
            value={selectedDomain}
            onValueChange={(v) => {
              setSelectedDomain(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-background/50">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Domains" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="monitor">Monitor</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={limit}
            onValueChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] bg-background/50">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead>Request</TableHead>
                <TableHead className="w-[140px]">Source IP</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px] text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                <TableSkeleton />
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                      <XCircle className="h-8 w-8 opacity-20" />
                      <p>No matching events found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, i) => {
                  const rowId = log._id || String(i);
                  const isExpanded = expandedRowId === rowId;

                  return (
                    <Fragment key={rowId}>
                      <TableRow
                        className={`cursor-pointer transition-all duration-200 border-b border-border/40 
                          ${
                            isExpanded
                              ? "bg-muted/30 border-b-0"
                              : "hover:bg-muted/10"
                          } 
                          animate-in fade-in slide-in-from-bottom-2`}
                        style={{
                          animationDelay: `${i * 30}ms`,
                          animationFillMode: "backwards",
                        }}
                        onClick={() => toggleRow(rowId)}
                      >
                        <TableCell className="py-3 pl-4">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 max-w-[400px]">
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] h-5 px-1.5 rounded-sm uppercase bg-background border-border text-foreground/80"
                            >
                              {log.request?.method || "REQ"}
                            </Badge>
                            <span
                              className="font-mono text-xs text-foreground truncate"
                              title={log.request_path}
                            >
                              {log.request_path}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground py-3">
                          {log.ip}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs font-medium text-foreground/90">
                            {log.reason}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge action={log.action} />
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {log.ml_confidence ? (
                            <span
                              className={`font-mono text-xs font-bold ${
                                log.ml_confidence > 0.8
                                  ? "text-rose-500"
                                  : "text-blue-500"
                              }`}
                            >
                              {(log.ml_confidence * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10 border-b border-border">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8 border-l-2 border-primary/50 ml-1 bg-gradient-to-r from-background to-transparent animate-in slide-in-from-top-2 duration-300">
                              <div className="space-y-6">
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Activity className="h-3.5 w-3.5" /> Threat
                                    Analysis
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-md bg-background border border-border">
                                      <span className="text-xs text-muted-foreground block mb-1">
                                        Detection Engine
                                      </span>
                                      <span className="text-sm font-medium text-foreground">
                                        {log.source}
                                      </span>
                                    </div>
                                    <div className="p-3 rounded-md bg-background border border-border">
                                      <span className="text-xs text-muted-foreground block mb-1">
                                        Threat Score
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              log.score > 80
                                                ? "bg-rose-500"
                                                : "bg-yellow-500"
                                            }`}
                                            style={{ width: `${log.score}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-bold text-foreground">
                                          {log.score}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <ArrowUpRight className="h-3.5 w-3.5" />{" "}
                                    Client Details
                                  </h4>
                                  <div className="space-y-2 p-3 rounded-md bg-background border border-border">
                                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                                      <span className="text-muted-foreground">
                                        User Agent
                                      </span>
                                      <span
                                        className="text-foreground max-w-[280px] truncate"
                                        title={
                                          log.request?.headers?.[
                                            "user-agent"
                                          ]?.[0]
                                        }
                                      >
                                        {log.request?.headers?.[
                                          "user-agent"
                                        ]?.[0] || "Unknown"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs py-1.5 border-b border-border/50">
                                      <span className="text-muted-foreground">
                                        Log ID
                                      </span>
                                      <span className="font-mono text-muted-foreground">
                                        {log._id || "N/A"}
                                      </span>
                                    </div>
                                    <div className="pt-2">
                                      <span className="text-xs text-muted-foreground block mb-1.5">
                                        Rule Tags
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {log.tags?.length ? (
                                          log.tags.map((t) => (
                                            <Badge
                                              key={t}
                                              variant="secondary"
                                              className="text-[10px] px-1.5 h-5 font-mono bg-secondary/50 hover:bg-secondary"
                                            >
                                              {t}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-xs italic text-muted-foreground">
                                            No tags
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {log.request ? (
                                  <RawRequestViewer request={log.request} />
                                ) : (
                                  <div className="h-32 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
                                    Raw request data unavailable
                                  </div>
                                )}

                                {log.trigger_payload && (
                                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                                    <div className="flex items-center gap-2 text-rose-500 mb-2">
                                      <ShieldAlert className="h-4 w-4" />
                                      <span className="text-xs font-bold uppercase tracking-wide">
                                        Payload Match
                                      </span>
                                    </div>
                                    <code className="block text-xs font-mono text-rose-300 break-all bg-black/40 p-2.5 rounded border border-rose-500/10">
                                      {log.trigger_payload}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Showing logs {(page - 1) * parseInt(limit) + 1} to{" "}
              {Math.min(
                page * parseInt(limit),
                page * parseInt(limit) + filteredLogs.length
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <div className="text-xs font-medium px-2 min-w-[80px] text-center">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages || isLoading}
                className="h-8 px-3"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, textSmall }: any) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card flex items-center justify-between shadow-sm">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <div
          className={`font-bold text-foreground mt-1 ${
            textSmall ? "text-lg" : "text-2xl"
          }`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      </div>
      <div className="p-2.5 bg-muted rounded-full opacity-80">{icon}</div>
    </div>
  );
}

function StatusBadge({ action }: { action: string }) {
  let className = "text-muted-foreground bg-muted";

  if (action === "Blocked") {
    className = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  } else if (action === "Flagged") {
    className = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  } else if (action === "Monitor") {
    className = "text-blue-500 bg-blue-500/10 border-blue-500/20";
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 border px-2 ${className}`}
    >
      {action}
    </Badge>
  );
}
