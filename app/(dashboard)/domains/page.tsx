"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getDomains,
  addDomain,
  verifyDomain,
  getDNSRecords,
  addDNSRecord,
  deleteDNSRecord,
  toggleDNSRecordProxy,
  toggleDNSRecordOriginSSL,
} from "@/lib/api";
import { Domain, DNSRecord } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Globe,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Cloud,
  CloudLightning,
  Lock,
  Unlock,
  Server,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// ... existing imports

// Regex Patterns
const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
// ADD THESE NEW ONES:
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX =
  /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // DNS Records state
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<Record<string, DNSRecord[]>>({});
  const [loadingRecords, setLoadingRecords] = useState<string | null>(null);

  // Add Record Modal
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [selectedDomainForRecord, setSelectedDomainForRecord] =
    useState<Domain | null>(null);
  const [newRecord, setNewRecord] = useState({
    name: "",
    type: "A",
    content: "",
    proxied: true,
    ttl: 300,
  });
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsLoading(true);
    const result = await getDomains();
    if (result) setDomains(result);
    setIsLoading(false);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName) return toast.error("Domain name required");
    if (!DOMAIN_REGEX.test(newDomainName))
      return toast.error("Invalid domain format");

    setIsAdding(true);
    const result = await addDomain({ name: newDomainName });
    if (result) {
      toast.success("Domain added successfully");
      setDomains([result, ...domains]);
      setNewDomainName("");
      setShowAddModal(false);
    }
    setIsAdding(false);
  };

  const handleVerifyDomain = async (domainId: string) => {
    const result = await verifyDomain(domainId);
    if (result) {
      if (result.status === "active") {
        toast.success("Domain verified successfully");
        fetchDomains();
      } else {
        toast.error(result.message);
      }
    }
  };

  const toggleDomainExpand = async (domain: Domain) => {
    if (expandedDomain === domain.id) {
      setExpandedDomain(null);
      return;
    }
    setExpandedDomain(domain.id);
    if (!dnsRecords[domain.id]) {
      setLoadingRecords(domain.id);
      const records = await getDNSRecords(domain.id);
      if (records) setDnsRecords((prev) => ({ ...prev, [domain.id]: records }));
      setLoadingRecords(null);
    }
  };

  const handleToggleProxy = async (domainId: string, record: DNSRecord) => {
    const previousRecords = dnsRecords[domainId];
    const newProxiedState = !record.proxied;

    setDnsRecords((prev) => ({
      ...prev,
      [domainId]: prev[domainId].map((r) =>
        r.id === record.id ? { ...r, proxied: newProxiedState } : r,
      ),
    }));

    const result = await toggleDNSRecordProxy(
      domainId,
      record.id,
      newProxiedState,
    );
    if (!result || result.status !== "success") {
      toast.error("Failed to update proxy status");
      setDnsRecords((prev) => ({ ...prev, [domainId]: previousRecords }));
    }
  };

  const handleToggleOriginSSL = async (domainId: string, record: DNSRecord) => {
    const newStatus = !record.origin_ssl;
    setDnsRecords((prev) => ({
      ...prev,
      [domainId]: prev[domainId].map((r) =>
        r.id === record.id ? { ...r, origin_ssl: newStatus } : r,
      ),
    }));

    try {
      await toggleDNSRecordOriginSSL(domainId, record.id, newStatus);
    } catch {
      setDnsRecords((prev) => ({
        ...prev,
        [domainId]: prev[domainId].map((r) =>
          r.id === record.id ? { ...r, origin_ssl: !newStatus } : r,
        ),
      }));
      toast.error("Failed to update SSL status");
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainForRecord) return;

    if (!newRecord.name) return toast.error("Name required");
    if (!newRecord.content) return toast.error("Content required");

    // --- NEW VALIDATION LOGIC START ---
    let isValid = true;
    let errorMessage = "";

    switch (newRecord.type) {
      case "A":
        if (!IPV4_REGEX.test(newRecord.content)) {
          isValid = false;
          errorMessage = "Invalid IPv4 address (e.g., 192.0.2.1)";
        }
        break;
      case "AAAA":
        if (!IPV6_REGEX.test(newRecord.content)) {
          isValid = false;
          errorMessage = "Invalid IPv6 address";
        }
        break;
      case "CNAME":
      case "MX":
      case "NS":
        // Using your existing DOMAIN_REGEX for hostnames
        if (!DOMAIN_REGEX.test(newRecord.content)) {
          isValid = false;
          errorMessage = "Invalid domain format (e.g., example.com)";
        }
        break;
      case "TXT":
        // TXT records are usually permissive, but shouldn't be empty
        if (newRecord.content.length < 1) {
          isValid = false;
          errorMessage = "TXT content cannot be empty";
        }
        break;
    }

    if (!isValid) {
      return toast.error(errorMessage);
    }
    // --- NEW VALIDATION LOGIC END ---

    setIsAddingRecord(true);
    const result = await addDNSRecord({
      domain_id: selectedDomainForRecord.id,
      name: newRecord.name,
      type: newRecord.type,
      content: newRecord.content,
      proxied: newRecord.proxied,
      ttl: newRecord.ttl,
    });

    if (result && result.status === "success") {
      toast.success("Record added");
      const records = await getDNSRecords(selectedDomainForRecord.id);
      if (records)
        setDnsRecords((prev) => ({
          ...prev,
          [selectedDomainForRecord.id]: records,
        }));
      setShowAddRecordModal(false);
      setNewRecord({
        name: "",
        type: "A",
        content: "",
        proxied: true,
        ttl: 300,
      });
    } else {
      toast.error(result?.message || "Failed to add record");
    }
    setIsAddingRecord(false);
  };

  const handleDeleteRecord = async (domainId: string, recordId: string) => {
    const result = await deleteDNSRecord(domainId, recordId);
    if (result && result.status === "success") {
      toast.success("Record deleted");
      setDnsRecords((prev) => ({
        ...prev,
        [domainId]: prev[domainId].filter((r) => r.id !== recordId),
      }));
    } else {
      toast.error("Failed to delete record");
    }
  };

  const getRecordTypeStyle = (type: string) => {
    const styles: Record<string, string> = {
      A: "text-blue-400 bg-blue-400/10 border-blue-400/20",
      AAAA: "text-purple-400 bg-purple-400/10 border-purple-400/20",
      CNAME: "text-orange-400 bg-orange-400/10 border-orange-400/20",
      MX: "text-pink-400 bg-pink-400/10 border-pink-400/20",
      TXT: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
      NS: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    };
    return styles[type] || "text-muted-foreground bg-muted border-border";
  };

  // [UPDATED] Replaced text loader with a Skeleton layout to prevent layout shift
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-64 bg-muted/50 animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>

        {/* List Skeleton */}
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] w-full bg-muted/20 animate-pulse rounded-lg border border-border/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    // [UPDATED] Removed 'animate-in fade-in duration-500' to stop re-animating on visit
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Domain Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure DNS records, proxy settings, and SSL termination.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Domain
        </Button>
      </div>

      {/* DOMAIN LIST */}
      <div className="grid gap-4">
        {domains.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/5">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">
              No domains configured
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a domain to start protecting your infrastructure.
            </p>
            <Button onClick={() => setShowAddModal(true)} variant="outline">
              Add First Domain
            </Button>
          </div>
        ) : (
          domains.map((domain) => {
            const isExpanded = expandedDomain === domain.id;
            const isActive = domain.status === "active";

            return (
              <Card
                key={domain.id}
                className={`border-border transition-all duration-200 ${
                  isExpanded
                    ? "ring-1 ring-primary/20"
                    : "hover:border-primary/30"
                }`}
              >
                <div
                  className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 cursor-pointer"
                  onClick={() => isActive && toggleDomainExpand(domain)}
                >
                  {/* Icon & Status */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div
                      className={`p-3 rounded-full ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {domain.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`flex h-2 w-2 rounded-full ${
                            isActive
                              ? "bg-emerald-500"
                              : "bg-yellow-500 animate-pulse"
                          }`}
                        />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {isActive
                            ? "Active & Protected"
                            : "Pending Verification"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Nameservers
                      </span>
                      <div className="flex gap-2">
                        {domain.nameservers.slice(0, 2).map((ns, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="font-mono text-[10px] px-1.5"
                          >
                            {ns}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Added On
                      </span>
                      <span className="font-medium">
                        {formatDate(domain.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isActive ? (
                      <Button
                        onClick={() => handleVerifyDomain(domain.id)}
                        size="sm"
                        className="gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" /> Verify Setup
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDomainForRecord(domain);
                            setNewRecord({
                              name: "",
                              type: "A",
                              content: "",
                              proxied: true,
                              ttl: 300,
                            });
                            setShowAddRecordModal(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Record
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => toggleDomainExpand(domain)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* DNS RECORDS PANEL */}
                {isExpanded && isActive && (
                  <div className="border-t border-border bg-muted/10 p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Server className="h-4 w-4" /> DNS Configuration
                      </h4>
                    </div>

                    {loadingRecords === domain.id ? (
                      <div className="text-sm text-muted-foreground py-4">
                        Loading records...
                      </div>
                    ) : dnsRecords[domain.id]?.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">
                        No records found.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {dnsRecords[domain.id]?.map((record) => (
                          <div
                            key={record.id}
                            className="group flex flex-col md:flex-row md:items-center justify-between p-3 rounded-md bg-background border border-border/50 hover:border-primary/20 transition-all"
                          >
                            {/* Record Info */}
                            <div className="flex items-center gap-4 flex-1">
                              <Badge
                                variant="outline"
                                className={`w-16 justify-center font-mono text-xs font-bold border ${getRecordTypeStyle(
                                  record.type,
                                )}`}
                              >
                                {record.type}
                              </Badge>
                              <div className="flex flex-col">
                                <span className="font-mono text-sm font-medium text-foreground">
                                  {record.name}
                                </span>
                                <span
                                  className="font-mono text-xs text-muted-foreground truncate max-w-[300px]"
                                  title={record.content}
                                >
                                  {record.content}
                                </span>
                              </div>
                            </div>

                            {/* Toggles & Actions */}
                            <div className="flex items-center gap-6 mt-3 md:mt-0">
                              {/* SSL Toggle */}
                              {["A", "AAAA", "CNAME"].includes(record.type) && (
                                <div
                                  className="flex items-center gap-2"
                                  title="Origin SSL: Encrypt traffic to backend"
                                >
                                  {record.origin_ssl ? (
                                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <Switch
                                    checked={record.origin_ssl}
                                    onCheckedChange={() =>
                                      handleToggleOriginSSL(domain.id, record)
                                    }
                                    className="scale-75"
                                  />
                                </div>
                              )}

                              {/* Proxy Toggle */}
                              {["A", "AAAA", "CNAME"].includes(record.type) && (
                                <div
                                  className="flex items-center gap-2"
                                  title="Proxy Status: WAF Protection"
                                >
                                  {record.proxied ? (
                                    <CloudLightning className="h-3.5 w-3.5 text-orange-500" />
                                  ) : (
                                    <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <Switch
                                    checked={record.proxied}
                                    onCheckedChange={() =>
                                      handleToggleProxy(domain.id, record)
                                    }
                                    className="scale-75 data-[state=checked]:bg-orange-500"
                                  />
                                </div>
                              )}

                              <div className="h-4 w-px bg-border mx-2" />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() =>
                                  handleDeleteRecord(domain.id, record.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* --- ADD DOMAIN MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Add New Domain</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddDomain}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Domain Name</Label>
                  <Input
                    placeholder="example.com"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? "Adding..." : "Add Domain"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* --- ADD RECORD MODAL --- */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Add DNS Record</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddRecord}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newRecord.type}
                      onValueChange={(v) =>
                        setNewRecord({ ...newRecord, type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="@"
                      value={newRecord.name}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Input
                    // UPDATED PLACEHOLDER LOGIC
                    placeholder={
                      {
                        A: "192.0.2.1",
                        AAAA: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
                        CNAME: "example.com",
                        MX: "mail.example.com",
                        TXT: "v=spf1 include:_spf.google.com ~all",
                        NS: "ns1.example.com",
                      }[newRecord.type] || "Content"
                    }
                    value={newRecord.content}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, content: e.target.value })
                    }
                  />
                  {/* OPTIONAL: Helper text to guide user */}
                  <p className="text-[10px] text-muted-foreground">
                    {newRecord.type === "A" && "Enter a valid IPv4 address."}
                    {newRecord.type === "AAAA" && "Enter a valid IPv6 address."}
                    {(newRecord.type === "CNAME" ||
                      newRecord.type === "NS" ||
                      newRecord.type === "MX") &&
                      "Enter a valid hostname."}
                  </p>
                </div>

                {["A", "AAAA", "CNAME"].includes(newRecord.type) && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                    <div className="space-y-0.5">
                      <Label>Proxy Status</Label>
                      <p className="text-xs text-muted-foreground">
                        Route traffic through WAF
                      </p>
                    </div>
                    <Switch
                      checked={newRecord.proxied}
                      onCheckedChange={(c) =>
                        setNewRecord({ ...newRecord, proxied: c })
                      }
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                )}
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddRecordModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingRecord}>
                  {isAddingRecord ? "Adding..." : "Save Record"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
