"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Status config                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
    icon: <Pencil className="w-3.5 h-3.5" />,
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Send className="w-3.5 h-3.5" />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCurrency(amount?: number): string {
  if (!amount) return "\u2014";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function BidsPage() {
  const { currentCompanyId } = useCompany();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("active");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingBid, setViewingBid] = useState<string | null>(null);

  // Data fetching
  const { data: allBids = [], isLoading } = useQuery({
    queryKey: ["bids", currentCompanyId],
    queryFn: () =>
      db.Bid.filter({ company_id: currentCompanyId }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-bids", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-bids", currentCompanyId],
    queryFn: () => db.Project.filter({ company_id: currentCompanyId }),
  });

  // Helpers
  const getContactName = (contactId: string) => {
    if (!contactId) return "No client linked";
    const c = contacts.find((x) => x.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : "Unknown";
  };

  const hasProject = (bidId: string) => {
    return projects.some((p) => p.bid_id === bidId);
  };

  // Filter bids
  const activeBids = allBids.filter((b) => !b.archived_at);
  const archivedBids = allBids.filter((b) => !!b.archived_at);

  const displayedBids = useMemo(() => {
    let bids =
      visibilityFilter === "archived"
        ? archivedBids
        : visibilityFilter === "all"
          ? allBids
          : activeBids;

    if (statusFilter !== "all") {
      bids = bids.filter((b) => b.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bids = bids.filter((b) => {
        const contactName = getContactName(b.contact_id).toLowerCase();
        const title = (b.title || "").toLowerCase();
        return contactName.includes(q) || title.includes(q);
      });
    }

    return bids;
  }, [allBids, activeBids, archivedBids, visibilityFilter, statusFilter, searchQuery, contacts]);

  // Stats
  const draftCount = activeBids.filter((b) => b.status === "draft").length;
  const sentCount = activeBids.filter((b) => b.status === "sent").length;
  const acceptedCount = activeBids.filter((b) => b.status === "accepted").length;
  const totalPipelineValue = activeBids
    .filter((b) => b.status === "sent" || b.status === "draft")
    .reduce((sum, b) => sum + (b.bid_total || 0), 0);

  // Viewing bid details
  const selectedBid = viewingBid
    ? allBids.find((b) => b.id === viewingBid)
    : null;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Bids
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Create, track, and manage client proposals
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bid
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Pencil className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-foreground">{sentCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-foreground">
                  {acceptedCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalPipelineValue)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bids or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bids List */}
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
            <CardTitle className="flex items-center gap-2">
              Bids
              <Badge variant="secondary">{displayedBids.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : displayedBids.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No bids found</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Bid
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayedBids.map((bid) => {
                  const statusCfg =
                    STATUS_CONFIG[bid.status] || STATUS_CONFIG.draft;
                  const contactName = getContactName(bid.contact_id);
                  const linkedProject = hasProject(bid.id);

                  return (
                    <div
                      key={bid.id}
                      className="p-4 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            bid.status === "accepted"
                              ? "bg-green-100 dark:bg-green-900/30"
                              : bid.status === "sent"
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : bid.status === "declined"
                                  ? "bg-red-100 dark:bg-red-900/30"
                                  : "bg-muted"
                          }`}
                        >
                          {statusCfg.icon}
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-foreground truncate">
                              {bid.title || "Untitled Bid"}
                            </span>
                            <Badge
                              variant="outline"
                              className={statusCfg.className}
                            >
                              {statusCfg.label}
                            </Badge>
                            {bid.bid_mode && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {bid.bid_mode}
                              </Badge>
                            )}
                            {bid.archived_at && (
                              <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 text-xs"
                              >
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span>{contactName}</span>
                            {bid.sent_at && (
                              <span className="flex items-center gap-1">
                                <Send className="w-3 h-3" />
                                Sent {timeAgo(bid.sent_at)}
                              </span>
                            )}
                            {bid.accepted_at && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Accepted {timeAgo(bid.accepted_at)}
                              </span>
                            )}
                            {linkedProject && (
                              <span className="text-xs text-purple-600 font-medium">
                                Project linked
                              </span>
                            )}
                          </div>

                          {bid.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">
                              {bid.description}
                            </p>
                          )}

                          {/* Pricing breakdown */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {bid.direct_cost_subtotal != null && (
                              <span>
                                Cost: ${bid.direct_cost_subtotal.toLocaleString()}
                              </span>
                            )}
                            {bid.overhead_total != null && (
                              <span>
                                Overhead: ${bid.overhead_total.toLocaleString()}
                              </span>
                            )}
                            {bid.profit_value != null && (
                              <span>
                                Profit: {bid.profit_value}
                                {bid.profit_type === "percent" ? "%" : " flat"}
                              </span>
                            )}
                            {bid.deposit_amount != null && bid.deposit_amount > 0 && (
                              <span className="text-green-600">
                                Deposit: ${bid.deposit_amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Total & actions */}
                        <div className="text-right flex-shrink-0 flex items-start gap-2">
                          {bid.bid_total ? (
                            <div>
                              <div className="text-lg font-bold text-foreground">
                                {formatCurrency(bid.bid_total)}
                              </div>
                              <div className="text-xs text-muted-foreground">total</div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              No total
                            </div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingBid(bid.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Bid
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Bid
                              </DropdownMenuItem>
                              {bid.status === "draft" && (
                                <DropdownMenuItem>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send to Client
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {!bid.archived_at ? (
                                <DropdownMenuItem>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Unarchive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Bid Dialog (stub) */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Bid</DialogTitle>
              <DialogDescription>
                Start a new bid proposal for a client. Choose between quick bid,
                detailed line-item bid, or tiered good/better/best pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <button className="p-4 rounded-lg border-2 border-border hover:border-green-400 transition-colors text-left">
                  <div className="font-medium text-foreground">Quick Bid</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Simple total with optional line items. Best for small jobs.
                  </div>
                </button>
                <button className="p-4 rounded-lg border-2 border-border hover:border-green-400 transition-colors text-left">
                  <div className="font-medium text-foreground">Detailed Bid</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Full line-item breakdown with overhead, profit, and labor
                    calculations.
                  </div>
                </button>
                <button className="p-4 rounded-lg border-2 border-border hover:border-green-400 transition-colors text-left">
                  <div className="font-medium text-foreground">
                    Good / Better / Best
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Three-tier pricing options. Let the client choose their
                    level.
                  </div>
                </button>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 p-3 text-sm text-amber-800">
                The full bid creation wizard is coming soon. This will include
                client selection, line items, overhead, and deposit
                configuration.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Bid Dialog */}
        <Dialog
          open={!!viewingBid}
          onOpenChange={() => setViewingBid(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedBid?.title || "Bid Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedBid && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-medium">
                      Client
                    </div>
                    <div className="font-medium">
                      {getContactName(selectedBid.contact_id)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-medium">
                      Status
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        STATUS_CONFIG[selectedBid.status]?.className || ""
                      }
                    >
                      {STATUS_CONFIG[selectedBid.status]?.label ||
                        selectedBid.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-medium">
                      Bid Total
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(selectedBid.bid_total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-medium">
                      Deposit
                    </div>
                    <div className="font-medium">
                      {selectedBid.deposit_amount
                        ? formatCurrency(selectedBid.deposit_amount)
                        : "\u2014"}
                    </div>
                  </div>
                </div>

                {selectedBid.description && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                      Description
                    </div>
                    <p className="text-sm text-foreground">
                      {selectedBid.description}
                    </p>
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <div className="text-xs text-muted-foreground uppercase font-medium">
                    Cost Breakdown
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Direct Costs</span>
                      <span className="font-medium">
                        ${(selectedBid.direct_cost_subtotal || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overhead</span>
                      <span className="font-medium">
                        ${(selectedBid.overhead_total || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit</span>
                      <span className="font-medium">
                        {selectedBid.profit_value || 0}
                        {selectedBid.profit_type === "percent" ? "%" : " flat"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor Est.</span>
                      <span className="font-medium">
                        ${(selectedBid.labor_estimate_total || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {selectedBid.sent_at && (
                    <div>
                      Sent: {formatDate(selectedBid.sent_at)}
                    </div>
                  )}
                  {selectedBid.accepted_at && (
                    <div>
                      Accepted: {formatDate(selectedBid.accepted_at)}
                    </div>
                  )}
                  <div>
                    Payment: {[
                      selectedBid.payment_method_card_enabled && "Card",
                      selectedBid.payment_method_ach_enabled && "ACH",
                    ]
                      .filter(Boolean)
                      .join(", ") || "\u2014"}
                  </div>
                  <div>Mode: {selectedBid.bid_mode || "standard"}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingBid(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
