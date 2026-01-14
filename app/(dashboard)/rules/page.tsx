"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getGlobalRules,
  getCustomRules,
  addCustomRule,
  toggleRule,
  getDomains,
} from "@/lib/api";
import { Rule, RuleCondition, Domain } from "@/types";
import { toast } from "sonner";
import { Plus, Shield, Layout, X } from "lucide-react"; // [UPDATED] Added X icon

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<"global" | "custom">("global");
  const [globalRules, setGlobalRules] = useState<Rule[]>([]);
  const [customRules, setCustomRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // [NEW] Domain State
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  // [NEW] State to toggle between Dropdown and Custom Input for fields
  const [isCustomField, setIsCustomField] = useState(false);

  const [newRule, setNewRule] = useState({
    name: "",
    // [UPDATED] Removed strict type casting to allow custom strings like "request.combined"
    field: "path",
    operator: "contains" as "contains" | "regex" | "equals",
    value: "",
    action: "score" as "score" | "block",
    score: 10,
    tags: "",
  });

  // 1. Fetch Domains on Mount
  useEffect(() => {
    async function init() {
      const domainList = await getDomains();
      if (domainList && domainList.length > 0) {
        setDomains(domainList);
        setSelectedDomain(domainList[0].id); // Default to first domain
      }
      setIsLoading(false);
    }
    init();
  }, []);

  // 2. Fetch Rules when Domain Changes
  useEffect(() => {
    if (selectedDomain) {
      fetchRules();
    }
  }, [selectedDomain]);

  const fetchRules = async () => {
    setIsLoading(true);
    const [global, custom] = await Promise.all([
      getGlobalRules(selectedDomain),
      getCustomRules(selectedDomain),
    ]);
    if (global) setGlobalRules(global);
    if (custom) setCustomRules(custom);
    setIsLoading(false);
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    if (!selectedDomain) {
      toast.error("Please select a domain first");
      return;
    }

    const result = await toggleRule({
      id: ruleId,
      enabled: !currentEnabled,
      domain_id: selectedDomain,
    });

    if (result) {
      toast.success("Rule status updated");
      fetchRules();
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();

    // [NOTE] Ensure your types/index.ts RuleCondition['field'] is typed as string
    // or includes these new fields to avoid TS errors.
    const conditions: RuleCondition[] = [
      {
        field: newRule.field as any, // Cast to any to bypass strict literal check if needed
        operator: newRule.operator,
        value: newRule.value,
      },
    ];

    const tags = newRule.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await addCustomRule({
      name: newRule.name,
      conditions,
      on_match: {
        score_add: newRule.action === "score" ? newRule.score : 0,
        tags,
        hard_block: newRule.action === "block",
      },
    });

    if (result) {
      toast.success("Custom rule created");
      setShowAddModal(false);
      // Reset form
      setNewRule({
        name: "",
        field: "path",
        operator: "contains",
        value: "",
        action: "score",
        score: 10,
        tags: "",
      });
      setIsCustomField(false);
      fetchRules();
    }
  };

  const rules = activeTab === "global" ? globalRules : customRules;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Rules</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card animate-shimmer rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Rules</h1>
          <p className="text-muted-foreground">
            Manage your WAF protection rules
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select
              value={selectedDomain}
              onValueChange={setSelectedDomain}
              disabled={domains.length === 0}
            >
              <SelectTrigger className="bg-background">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-muted-foreground" />
                  <SelectValue
                    placeholder={
                      domains.length === 0 ? "No Domains" : "Select Domain"
                    }
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeTab === "custom" && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Rule
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("global")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "global"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Global Rules
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "custom"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom Rules
        </button>
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add Custom Rule</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddRule}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    placeholder="Block SQL Injection"
                    value={newRule.name}
                    onChange={(e) =>
                      setNewRule({ ...newRule, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* [UPDATED] Field Selection Logic */}
                  <div className="space-y-2">
                    <Label htmlFor="field">Field</Label>
                    <div className="flex gap-2">
                      {isCustomField ? (
                        <Input
                          id="field"
                          placeholder="e.g. request.headers.X-Token"
                          value={newRule.field}
                          onChange={(e) =>
                            setNewRule({ ...newRule, field: e.target.value })
                          }
                          autoFocus
                          className="h-10"
                        />
                      ) : (
                        <select
                          id="field"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={newRule.field}
                          onChange={(e) => {
                            if (e.target.value === "custom") {
                              setIsCustomField(true);
                              setNewRule({ ...newRule, field: "" });
                            } else {
                              setNewRule({ ...newRule, field: e.target.value });
                            }
                          }}
                        >
                          <option value="path">Path</option>
                          <option value="query">Query</option>
                          <option value="body">Body</option>
                          <option value="ip">IP Address</option>
                          <option value="request.headers.User-Agent">
                            User-Agent
                          </option>
                          <option value="request.combined">
                            Entire Request
                          </option>
                          <option value="custom">Custom Field...</option>
                        </select>
                      )}

                      {/* Button to toggle back to Dropdown if in Custom mode */}
                      {isCustomField && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setIsCustomField(false);
                            setNewRule({ ...newRule, field: "path" });
                          }}
                          title="Back to presets"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operator">Operator</Label>
                    <select
                      id="operator"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newRule.operator}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          operator: e.target.value as any,
                        })
                      }
                    >
                      <option value="contains">Contains</option>
                      <option value="regex">Regex</option>
                      <option value="equals">Equals</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      placeholder="pattern"
                      value={newRule.value}
                      onChange={(e) =>
                        setNewRule({ ...newRule, value: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="action">Action</Label>
                    <select
                      id="action"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newRule.action}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          action: e.target.value as any,
                        })
                      }
                    >
                      <option value="score">Add Score</option>
                      <option value="block">Hard Block</option>
                    </select>
                  </div>
                  {newRule.action === "score" && (
                    <div className="space-y-2">
                      <Label htmlFor="score">Score</Label>
                      <Input
                        id="score"
                        type="number"
                        min="1"
                        max="100"
                        value={newRule.score}
                        onChange={(e) =>
                          setNewRule({
                            ...newRule,
                            score: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="sql-injection, security"
                    value={newRule.tags}
                    onChange={(e) =>
                      setNewRule({ ...newRule, tags: e.target.value })
                    }
                  />
                </div>
              </CardContent>
              <div className="flex gap-2 p-6 pt-0">
                <Button type="submit">Create Rule</Button>
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

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {activeTab === "global"
                  ? "No global rules available"
                  : "No custom rules created yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="border-border/50 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">{rule.name}</h3>
                      {rule.on_match.hard_block && (
                        <Badge variant="destructive">Hard Block</Badge>
                      )}
                    </div>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-muted-foreground">
                          Conditions:{" "}
                        </span>
                        {rule.conditions.map((cond, i) => (
                          <span
                            key={i}
                            className="font-mono text-xs bg-background px-2 py-1 rounded mr-2"
                          >
                            {cond.field} {cond.operator} "{cond.value}"
                          </span>
                        ))}
                      </div>
                      {rule.on_match.score_add &&
                        rule.on_match.score_add > 0 && (
                          <div>
                            <span className="text-muted-foreground">
                              Score:{" "}
                            </span>
                            <span className="text-yellow-500">
                              +{rule.on_match.score_add}
                            </span>
                          </div>
                        )}
                      <div className="flex gap-1 flex-wrap">
                        {rule.on_match.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() =>
                        handleToggleRule(rule.id, rule.enabled)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
