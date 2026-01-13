// type: uploaded file
// fileName: jiniyasshah/waf-dashboard/waf-dashboard-main/app/(dashboard)/logs/page.tsx
"use client";

import { useEffect, useState, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLogs, createLogStream, getDomains } from "@/lib/api";
import { AttackLog } from "@/types";
import { formatDate, getSourceColor } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to view Raw HTTP Request
const RawRequestViewer = ({
  request,
}: {
  request: NonNullable<AttackLog["request"]>;
}) => {
  const headerString = Object.entries(request.headers || {})
    .map(([key, values]) => {
      const valStr = Array.isArray(values) ? values.join(", ") : values;
      return `${key}: ${valStr}`;
    })
    .join("\n");

  return (
    <div className="font-mono text-xs bg-black text-green-400 p-4 rounded-md border border-green-900/50 shadow-inner overflow-x-auto">
      <div className="font-bold mb-1">
        {request.method} {request.url} {request.proto || "HTTP/1.1"}
      </div>
      <pre className="whitespace-pre-wrap text-green-400/80 mb-4">
        {headerString}
      </pre>
      {request.body && (
        <>
          <div className="h-px bg-green-900/50 my-2" />
          <pre className="whitespace-pre-wrap text-white/90">
            {request.body}
          </pre>
        </>
      )}
    </div>
  );
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => {
    const loadDomains = async () => {
      const res = await getDomains();
      if (res) setDomains(res);
    };
    loadDomains();
  }, []);

  useEffect(() => {
    fetchLogs();

    const eventSource = createLogStream((newLog: any) => {
      setIsLive(true);
      // Only live update if looking at first page and "all" or specific matching domain
      if (
        page === 1 &&
        (selectedDomain === "all" || selectedDomain === newLog.domain_id)
      ) {
        setLogs((prev) => [newLog, ...prev]);
        toast("Security Event Detected", {
          description: `${newLog.ip} - ${newLog.reason}`,
        });
      }
    });

    return () => {
      eventSource?.close();
    };
  }, [page, selectedDomain]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const domainFilter =
        selectedDomain === "all" ? undefined : selectedDomain;
      const result = await getLogs(page, 20, domainFilter);

      if (result && result.data) {
        setLogs(result.data);
        setTotalPages(result.pagination.total_pages);
      } else {
        setLogs([]);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attack Logs</h1>
          <p className="text-muted-foreground">Monitor security events</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge
              variant="outline"
              className="animate-pulse border-green-500 text-green-500 gap-1 mr-2"
            >
              <Activity className="h-3 w-3" /> Live
            </Badge>
          )}

          <Select
            value={selectedDomain}
            onValueChange={(v) => {
              setSelectedDomain(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Domain" />
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
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[140px]">IP</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell
                        colSpan={8}
                        className="h-12 bg-muted/20 animate-pulse"
                      />
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    // Use Fragment with _id Key to fix React warnings
                    <Fragment key={log._id || index}>
                      <TableRow
                        className={`cursor-pointer transition-colors ${
                          expandedRow === index
                            ? "bg-muted/50"
                            : "hover:bg-muted/30"
                        }`}
                        onClick={() =>
                          setExpandedRow(expandedRow === index ? null : index)
                        }
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">
                          {log.ip}
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs font-mono"
                          title={log.request_path}
                        >
                          {log.request_path || "/"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {log.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.action === "Blocked"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getSourceColor(
                              log.source
                            )}`}
                          >
                            {log.source}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-bold ${
                              log.score > 80
                                ? "text-red-500"
                                : "text-orange-500"
                            }`}
                          >
                            {log.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expandedRow === index ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                      </TableRow>

                      {expandedRow === index && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-6 space-y-6 border-t border-border/50 shadow-inner">
                              <div className="flex gap-2 flex-wrap mb-4">
                                {log.tags?.map((tag, i) => (
                                  <Badge key={i} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))}
                                {log.trigger_payload && (
                                  <Badge
                                    variant="outline"
                                    className="border-red-500 text-red-500"
                                  >
                                    Trigger: {log.trigger_payload}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Terminal className="h-4 w-4" /> Raw HTTP
                                    Request
                                  </div>
                                  {log.request ? (
                                    <RawRequestViewer request={log.request} />
                                  ) : (
                                    <div className="p-4 border rounded bg-background text-sm text-muted-foreground">
                                      Request details not available.
                                    </div>
                                  )}
                                </div>

                                {/* Right side stats */}
                                <div className="space-y-4">
                                  <div className="bg-background border rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold">
                                      Detection Analysis
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                      <span className="text-muted-foreground">
                                        Source Engine:
                                      </span>
                                      <span className="font-medium">
                                        {log.source}
                                      </span>

                                      <span className="text-muted-foreground">
                                        Threat Score:
                                      </span>
                                      <span className="font-medium">
                                        {log.score}/100
                                      </span>

                                      {log.ml_confidence && (
                                        <>
                                          <span className="text-muted-foreground">
                                            AI Confidence:
                                          </span>
                                          <span className="font-medium text-blue-500">
                                            {(log.ml_confidence * 100).toFixed(
                                              2
                                            )}
                                            %
                                          </span>
                                        </>
                                      )}

                                      <span className="text-muted-foreground">
                                        Action Taken:
                                      </span>
                                      <span className="font-medium">
                                        {log.action}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-end space-x-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
