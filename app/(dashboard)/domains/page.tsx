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
  toggleDNSRecordOriginSSL, // [NEW] Import this
} from "@/lib/api";
import { Domain, DNSRecord } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Globe,
  CheckCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  X,
  Cloud,
  CloudLightning,
  Lock, // [NEW] Icon
  Unlock, // [NEW] Icon
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Regex Patterns for Validation
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
// ✅ Correct (JavaScript syntax)
const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

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
    ttl: 300, // Added TTL default
  });
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsLoading(true);
    const result = await getDomains();
    if (result) {
      setDomains(result);
    }
    setIsLoading(false);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();

    // [VALIDATION] Domain Name
    if (!newDomainName) {
      toast.error("Domain name is required");
      return;
    }
    if (!DOMAIN_REGEX.test(newDomainName)) {
      toast.error("Invalid domain name format (e.g., example.com)");
      return;
    }

    setIsAdding(true);

    const result = await addDomain({ name: newDomainName });
    if (result) {
      toast.success("Domain added successfully!");
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
        toast.success(result.message);
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

    // Fetch DNS records if not already loaded
    if (!dnsRecords[domain.id]) {
      setLoadingRecords(domain.id);
      const records = await getDNSRecords(domain.id);
      if (records) {
        setDnsRecords((prev) => ({ ...prev, [domain.id]: records }));
      }
      setLoadingRecords(null);
    }
  };

  // Handle Proxy Toggle
  const handleToggleProxy = async (domainId: string, record: DNSRecord) => {
    // Optimistic update
    const previousRecords = dnsRecords[domainId];
    const newProxiedState = !record.proxied;

    setDnsRecords((prev) => ({
      ...prev,
      [domainId]: prev[domainId].map((r) =>
        r.id === record.id ? { ...r, proxied: newProxiedState } : r
      ),
    }));

    const result = await toggleDNSRecordProxy(
      domainId,
      record.id,
      newProxiedState
    );

    if (result && result.status === "success") {
      toast.success(
        `Proxy status updated to ${newProxiedState ? "Enabled" : "Disabled"}`
      );
    } else {
      // Revert on failure
      toast.error("Failed to update proxy status");
      setDnsRecords((prev) => ({ ...prev, [domainId]: previousRecords }));
    }
  };

  // [NEW] Handle Origin SSL Toggle
  const handleToggleOriginSSL = async (domainId: string, record: DNSRecord) => {
    const newStatus = !record.origin_ssl;

    // Optimistic UI Update
    setDnsRecords((prev) => ({
      ...prev,
      [domainId]: prev[domainId].map((r) =>
        r.id === record.id ? { ...r, origin_ssl: newStatus } : r
      ),
    }));

    try {
      await toggleDNSRecordOriginSSL(domainId, record.id, newStatus);
      toast.success(
        `Origin SSL ${newStatus ? "enabled" : "disabled"} for ${record.name}`
      );
    } catch (error) {
      // Revert on failure
      setDnsRecords((prev) => ({
        ...prev,
        [domainId]: prev[domainId].map((r) =>
          r.id === record.id ? { ...r, origin_ssl: !newStatus } : r
        ),
      }));
      toast.error("Failed to update Origin SSL status");
    }
  };

  const openAddRecordModal = (domain: Domain) => {
    setSelectedDomainForRecord(domain);
    setNewRecord({ name: "", type: "A", content: "", proxied: true, ttl: 300 });
    setShowAddRecordModal(true);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainForRecord) return;

    // --- [START] INPUT VALIDATION LOGIC ---

    // 1. Name Validation
    if (!newRecord.name) {
      toast.error("Record name is required (use @ for root)");
      return;
    }
    // Allow @, alphanumeric, hyphens
    if (newRecord.name !== "@" && !/^[a-zA-Z0-9-.*]+$/.test(newRecord.name)) {
      toast.error("Name contains invalid characters");
      return;
    }

    // 2. Content Validation based on Type
    const content = newRecord.content.trim();
    if (!content) {
      toast.error("Content is required");
      return;
    }

    switch (newRecord.type) {
      case "A":
        if (!IPV4_REGEX.test(content)) {
          toast.error("Invalid IPv4 address (e.g., 1.2.3.4)");
          return;
        }
        break;
      case "AAAA":
        if (!IPV6_REGEX.test(content)) {
          toast.error("Invalid IPv6 address");
          return;
        }
        break;
      case "CNAME":
      case "MX":
      case "NS":
        if (IPV4_REGEX.test(content) || IPV6_REGEX.test(content)) {
          toast.error(
            `${newRecord.type} record must be a domain name, not an IP address`
          );
          return;
        }
        if (!DOMAIN_REGEX.test(content)) {
          toast.error("Invalid domain format in content");
          return;
        }
        break;
      case "TXT":
        if (content.length > 2048) {
          toast.error("TXT record is too long");
          return;
        }
        break;
    }
    // --- [END] INPUT VALIDATION LOGIC ---

    setIsAddingRecord(true);

    const result = await addDNSRecord({
      domain_id: selectedDomainForRecord.id,
      name: newRecord.name || "@",
      type: newRecord.type,
      content: newRecord.content,
      proxied: newRecord.proxied,
      ttl: newRecord.ttl,
    });

    if (result && result.status === "success") {
      toast.success("DNS record added successfully!");

      // Refresh records for this domain
      const records = await getDNSRecords(selectedDomainForRecord.id);
      if (records) {
        setDnsRecords((prev) => ({
          ...prev,
          [selectedDomainForRecord.id]: records,
        }));
      }

      setShowAddRecordModal(false);
      setNewRecord({
        name: "",
        type: "A",
        content: "",
        proxied: true,
        ttl: 300,
      });
    } else if (result && result.message) {
      toast.error(result.message);
    }

    setIsAddingRecord(false);
  };

  const handleDeleteRecord = async (domainId: string, recordId: string) => {
    const result = await deleteDNSRecord(domainId, recordId);

    if (result && result.status === "success") {
      toast.success("Record deleted successfully!");

      // Remove from local state
      setDnsRecords((prev) => ({
        ...prev,
        [domainId]: prev[domainId].filter((r) => r.id !== recordId),
      }));
    } else if (result && result.message) {
      toast.error(result.message);
    }
  };

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      A: "bg-blue-500/20 text-blue-400",
      AAAA: "bg-purple-500/20 text-purple-400",
      CNAME: "bg-green-500/20 text-green-400",
      MX: "bg-orange-500/20 text-orange-400",
      TXT: "bg-gray-500/20 text-gray-400",
      NS: "bg-yellow-500/20 text-yellow-400",
    };
    return colors[type] || "bg-gray-500/20 text-gray-400";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Domains</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-card animate-shimmer rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">Manage your protected domains</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add New Domain</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAddDomain}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <div className="flex gap-2 p-6 pt-0">
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? "Adding..." : "Add Domain"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add DNS Record Modal */}
      {showAddRecordModal && selectedDomainForRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add DNS Record</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddRecordModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAddRecord}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedDomainForRecord.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordName">Name</Label>
                    <Input
                      id="recordName"
                      placeholder="@ or www"
                      value={newRecord.name}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, name: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Use @ for root domain
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordType">Type</Label>
                    <Select
                      value={newRecord.type}
                      onValueChange={(value) =>
                        setNewRecord({ ...newRecord, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="AAAA">AAAA</SelectItem>
                        <SelectItem value="CNAME">CNAME</SelectItem>
                        <SelectItem value="MX">MX</SelectItem>
                        <SelectItem value="TXT">TXT</SelectItem>
                        <SelectItem value="NS">NS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recordContent">Content</Label>
                  <Input
                    id="recordContent"
                    placeholder={
                      newRecord.type === "A"
                        ? "1.2.3.4"
                        : newRecord.type === "CNAME"
                        ? "target.example.com"
                        : "Value"
                    }
                    value={newRecord.content}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, content: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Only show proxy toggle for A, AAAA, CNAME */}
                {(newRecord.type === "A" ||
                  newRecord.type === "AAAA" ||
                  newRecord.type === "CNAME") && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {newRecord.proxied ? (
                        <CloudLightning className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Cloud className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {newRecord.proxied ? "Proxied" : "DNS Only"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {newRecord.proxied
                            ? "Traffic flows through WAF"
                            : "Direct connection to origin"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={newRecord.proxied}
                      onCheckedChange={(checked) =>
                        setNewRecord({ ...newRecord, proxied: checked })
                      }
                    />
                  </div>
                )}
              </CardContent>
              <div className="flex gap-2 p-6 pt-0">
                <Button type="submit" disabled={isAddingRecord}>
                  {isAddingRecord ? "Adding..." : "Add Record"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddRecordModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Domains List */}
      <div className="grid gap-4">
        {domains.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No domains added yet</p>
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                Add your first domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          domains?.map((domain) => (
            <Card key={domain.id} className="border-border/50 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">{domain.name}</h3>
                      <Badge
                        variant={
                          domain.status === "active" ? "default" : "outline"
                        }
                        className={
                          domain.status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/50"
                            : ""
                        }
                      >
                        {domain.status === "active" ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {domain.status === "active"
                          ? "Active"
                          : "Pending Verification"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p>{formatDate(domain.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Nameservers:
                        </span>
                        <div className="mt-1 space-y-1">
                          {domain?.nameservers?.map((ns, i) => (
                            <p
                              key={i}
                              className="font-mono text-xs bg-background px-2 py-1 rounded"
                            >
                              {ns}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {domain.status === "pending_verification" ? (
                      <Button
                        onClick={() => handleVerifyDomain(domain.id)}
                        variant="outline"
                      >
                        Verify Domain
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => openAddRecordModal(domain)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Record
                        </Button>
                        <Button
                          onClick={() => toggleDomainExpand(domain)}
                          variant="ghost"
                          size="sm"
                        >
                          {expandedDomain === domain.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* DNS Records Section */}
                {expandedDomain === domain.id && domain.status === "active" && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <h4 className="text-sm font-semibold mb-3">DNS Records</h4>

                    {loadingRecords === domain.id ? (
                      <div className="text-sm text-muted-foreground">
                        Loading records...
                      </div>
                    ) : dnsRecords[domain.id]?.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No DNS records yet. Add your first record to get
                        started.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dnsRecords[domain.id]?.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-4">
                              <Badge
                                className={`${getRecordTypeColor(
                                  record.type
                                )} border-0 font-mono`}
                              >
                                {record.type}
                              </Badge>
                              <div className="min-w-[200px]">
                                <p className="font-mono text-sm font-medium">
                                  {record.name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px]">
                                  {record.content}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* [NEW] ORIGIN SSL TOGGLE (HTTP/HTTPS) */}
                              {(record.type === "A" ||
                                record.type === "AAAA" ||
                                record.type === "CNAME") && (
                                <div
                                  className="flex items-center gap-2"
                                  title="Toggle Origin SSL (Secure Backend)"
                                >
                                  {record.origin_ssl ? (
                                    <Lock className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Unlock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Switch
                                    checked={record.origin_ssl || false}
                                    onCheckedChange={() =>
                                      handleToggleOriginSSL(domain.id, record)
                                    }
                                    className="scale-75 data-[state=checked]:bg-green-500"
                                  />
                                </div>
                              )}

                              {/* Proxy Toggle for Supported Types */}
                              {(record.type === "A" ||
                                record.type === "AAAA" ||
                                record.type === "CNAME") && (
                                <div
                                  className="flex items-center gap-2"
                                  title="Toggle Proxy Status"
                                >
                                  {record.proxied ? (
                                    <CloudLightning className="h-4 w-4 text-orange-500" />
                                  ) : (
                                    <Cloud className="h-4 w-4 text-gray-500" />
                                  )}
                                  <Switch
                                    checked={record.proxied || false}
                                    onCheckedChange={() =>
                                      handleToggleProxy(domain.id, record)
                                    }
                                    className="scale-75 data-[state=checked]:bg-orange-500"
                                  />
                                </div>
                              )}

                              <span className="text-xs text-muted-foreground w-16 text-right">
                                TTL: {record.ttl}
                              </span>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
