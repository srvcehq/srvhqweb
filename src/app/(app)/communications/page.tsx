"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { Communication, Contact } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Mail,
  Phone,
  StickyNote,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";

type FilterType = "all" | "email" | "sms" | "call" | "note";

export default function CommunicationsPage() {
  const { currentCompanyId } = useCompany();

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formData, setFormData] = useState({
    contact_id: "",
    type: "note" as Communication["type"],
    direction: "outbound" as Communication["direction"],
    subject: "",
    body: "",
  });

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const [comms, ctcts] = await Promise.all([
        db.Communication.filter({ company_id: currentCompanyId }),
        db.Contact.filter({ company_id: currentCompanyId }),
      ]);
      setCommunications(comms);
      setContacts(ctcts);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  const getContactName = (contactId: string) => {
    const c = contacts.find((ct) => ct.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : "Unknown";
  };

  // Filter and search
  const filteredComms = useMemo(() => {
    let result = [...communications].sort(
      (a, b) =>
        new Date(b.sent_at || b.created_date).getTime() -
        new Date(a.sent_at || a.created_date).getTime()
    );

    if (filterType !== "all") {
      result = result.filter((c) => c.type === filterType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.subject?.toLowerCase().includes(q) ||
          c.body?.toLowerCase().includes(q) ||
          getContactName(c.contact_id).toLowerCase().includes(q)
      );
    }

    return result;
  }, [communications, filterType, searchQuery, contacts]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageCircle className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      case "note":
        return <StickyNote className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const typeBadgeStyle = (type: string) => {
    switch (type) {
      case "email":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40";
      case "sms":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40";
      case "call":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40";
      case "note":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40";
    }
  };

  const statusBadgeStyle = (status?: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40";
      case "read":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40";
      case "sent":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40";
      default:
        return "";
    }
  };

  const handleAddCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await db.Communication.create({
      ...formData,
      company_id: currentCompanyId,
      sent_at: new Date().toISOString(),
      status: "sent",
    });
    setCommunications((prev) => [created, ...prev]);
    setShowAddDialog(false);
    setFormData({
      contact_id: "",
      type: "note",
      direction: "outbound",
      subject: "",
      body: "",
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Communications
            </h1>
            <p className="text-muted-foreground mt-2">
              View all messages, calls, and notes with your clients
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Communication
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search communications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "email", "sms", "call", "note"] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className={
                  filterType === type
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    : ""
                }
              >
                {type === "all" ? (
                  "All"
                ) : (
                  <span className="flex items-center gap-1">
                    {typeIcon(type)}
                    <span className="hidden sm:inline capitalize">{type}</span>
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Communications List */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {filteredComms.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Communications Found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== "all"
                    ? "No results match your filters"
                    : "Communications with clients will appear here"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredComms.map((comm) => {
                  const dateStr = comm.sent_at || comm.created_date;
                  const date = new Date(dateStr);

                  return (
                    <div
                      key={comm.id}
                      onClick={() => setSelectedComm(comm)}
                      className="p-4 hover:bg-accent cursor-pointer transition-colors flex items-start gap-4"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            comm.type === "email"
                              ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                              : comm.type === "sms"
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                : comm.type === "call"
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {typeIcon(comm.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {getContactName(comm.contact_id)}
                          </span>
                          <Badge variant="outline" className={typeBadgeStyle(comm.type)}>
                            {comm.type.toUpperCase()}
                          </Badge>
                          {comm.direction && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {comm.direction}
                            </Badge>
                          )}
                          {comm.status && (
                            <Badge
                              variant="outline"
                              className={statusBadgeStyle(comm.status)}
                            >
                              {comm.status}
                            </Badge>
                          )}
                        </div>
                        {comm.subject && (
                          <p className="font-medium text-foreground text-sm mb-0.5">
                            {comm.subject}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {comm.body
                            ? comm.body.length > 100
                              ? comm.body.substring(0, 100) + "..."
                              : comm.body
                            : "No content"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedComm}
        onOpenChange={(open) => !open && setSelectedComm(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedComm && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold">
                  Communication Details
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex gap-2">
                  <Badge variant="outline" className={typeBadgeStyle(selectedComm.type)}>
                    {typeIcon(selectedComm.type)}
                    <span className="ml-1">{selectedComm.type.toUpperCase()}</span>
                  </Badge>
                  {selectedComm.direction && (
                    <Badge variant="outline" className="capitalize">
                      {selectedComm.direction}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Contact</h3>
                  <p className="text-lg font-medium text-foreground">
                    {getContactName(selectedComm.contact_id)}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Date & Time</h3>
                  <p className="text-foreground">
                    {new Date(
                      selectedComm.sent_at || selectedComm.created_date
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(
                      selectedComm.sent_at || selectedComm.created_date
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {selectedComm.subject && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Subject</h3>
                    <p className="text-foreground">{selectedComm.subject}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Content</h3>
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <p className="text-foreground whitespace-pre-wrap">
                      {selectedComm.body || "No content"}
                    </p>
                  </div>
                </div>

                {selectedComm.status && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Status</h3>
                    <Badge
                      variant="outline"
                      className={statusBadgeStyle(selectedComm.status)}
                    >
                      {selectedComm.status}
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Communication Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Add Communication
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCommunication} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact *</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, contact_id: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts
                      .filter((c) => !c.isArchived)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      type: val as Communication["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={formData.direction || "outbound"}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    direction: val as Communication["direction"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Subject or call topic..."
              />
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                rows={5}
                placeholder="Message body, call notes, etc..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.contact_id}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                Save Communication
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
