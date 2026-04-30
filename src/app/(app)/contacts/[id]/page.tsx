"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/data/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/providers/company-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Mail, Phone, MapPin, Loader2,
  LayoutGrid, User, MoreVertical, Pencil, Archive,
  Map, Copy, Wrench, Plus, Eye, DollarSign,
  ClipboardList, FileText, Building2, Trash2,
  ChevronDown, ChevronRight, Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";
import EditContactDialog from "@/components/contacts/edit-contact-dialog";
import DeleteContactDialog from "@/components/contacts/delete-contact-dialog";
import CreateLocationDialog from "@/components/contacts/create-location-dialog";
import EditLocationDialog from "@/components/contacts/edit-location-dialog";
import EditMaintenancePlanDialog from "@/components/contacts/edit-maintenance-plan-dialog";
import type { Contact, MaintenancePlan, MaintenanceVisit, Project, Payment, Location } from "@/data/types";
import { classifyContact } from "@/lib/contact-classification";
import { useSendCommunication } from "@/hooks/use-send-communication";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contactId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCompanyId, isLoading: isLoadingCompany } = useCompany();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [expandedLocationIds, setExpandedLocationIds] = useState<Record<string, boolean>>({});
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const searchParams = useSearchParams();

  const { data: allContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts", currentCompanyId],
    queryFn: () =>
      db.Contact.filter(
        { company_id: currentCompanyId } as Partial<Contact>,
        "created_date"
      ),
    enabled: !!currentCompanyId,
  });

  const contact = allContacts.find((c) => c.id === contactId) || null;

  const { data: bids = [] } = useQuery({
    queryKey: ["contact-bids", contactId, currentCompanyId],
    queryFn: async () => {
      const allBids = await db.Bid.filter(
        { company_id: currentCompanyId } as Partial<Contact>,
        "-created_date"
      );
      return allBids.filter((b) => b.contact_id === contactId);
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["contact-projects", contactId, currentCompanyId],
    queryFn: async () => {
      const allProjects = await db.Project.filter(
        { company_id: currentCompanyId } as Partial<Project>,
        "-created_date"
      );
      return allProjects.filter((p) => p.contact_id === contactId);
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["contact-payments", contactId, currentCompanyId],
    queryFn: async () => {
      return await db.Payment.filter(
        { company_id: currentCompanyId, contact_id: contactId } as Partial<Payment>,
        "-created_date"
      );
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const { data: maintenancePlans = [] } = useQuery({
    queryKey: ["maintenance-plans", contactId, currentCompanyId],
    queryFn: async () => {
      return await db.MaintenancePlan.filter(
        { company_id: currentCompanyId, contact_id: contactId } as Partial<MaintenancePlan>,
        "-created_date"
      );
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const maintenancePlan = maintenancePlans.find((p) => p.status !== "cancelled");

  const { data: maintenanceVisits = [] } = useQuery({
    queryKey: ["maintenance-visits", contactId, currentCompanyId],
    queryFn: async () => {
      return await db.MaintenanceVisit.filter(
        { company_id: currentCompanyId, contact_id: contactId } as Partial<MaintenanceVisit>,
      );
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", contactId, currentCompanyId],
    queryFn: async () => {
      const allLocations = await db.Location.filter(
        { company_id: currentCompanyId } as Partial<Location>,
      );
      return allLocations.filter((l) => l.contact_id === contactId);
    },
    enabled: !!contactId && !!currentCompanyId,
  });

  const { sendLoginLink, sendInviteLink, resendInviteLink, isSending: isSendingComm } = useSendCommunication();
  const isCommercial = contact?.contact_type === "commercial";

  // Auto-open edit plan dialog when navigated with ?editPlan= query param
  const editPlanId = searchParams.get("editPlan");
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "maintenance") {
      setActiveTab("maintenance");
    }
  }, [tabParam]);

  useEffect(() => {
    if (editPlanId && maintenancePlans.length > 0) {
      const plan = maintenancePlans.find((p) => p.id === editPlanId);
      if (plan) {
        setActiveTab("maintenance");
        setEditingPlan(plan);
        // Clean URL so refresh doesn't reopen
        router.replace(`/contacts/${contactId}`, { scroll: false });
      }
    }
  }, [editPlanId, maintenancePlans, contactId, router]);

  // Group maintenance plans by location for commercial contacts
  const plansByLocation = useMemo(() => {
    if (!isCommercial) return {};
    const grouped: Record<string, MaintenancePlan[]> = {};
    for (const plan of maintenancePlans) {
      const key = plan.location_id || "unassigned";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    }
    return grouped;
  }, [maintenancePlans, isCommercial]);

  const toggleLocationExpand = (locId: string) => {
    setExpandedLocationIds((prev) => ({ ...prev, [locId]: !prev[locId] }));
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await db.Location.delete(locationId);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deleted.");
    } catch {
      toast.error("Failed to delete location.");
    }
  };

  const handleOpenInMaps = () => {
    if (!contact) return;
    const addressParts = [
      contact.address_line1,
      contact.address_line2,
      contact.city,
      contact.state,
      contact.zip,
    ].filter(Boolean);

    if (addressParts.length === 0) {
      toast.error("This contact doesn't have an address saved.");
      return;
    }

    const addressString = addressParts.join(" ");
    const encodedAddress = encodeURIComponent(addressString);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

  const handleCopyAddress = async () => {
    if (!contact) return;
    const addressParts = [
      contact.address_line1,
      contact.address_line2,
      contact.city,
      contact.state,
      contact.zip,
    ].filter(Boolean);

    if (addressParts.length === 0) {
      toast.error("This contact doesn't have an address saved.");
      return;
    }

    try {
      await navigator.clipboard.writeText(addressParts.join(", "));
      toast.success("Address copied to clipboard.");
    } catch {
      toast.error("Could not copy address to clipboard.");
    }
  };

  if (isLoadingCompany) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!contactsLoading && allContacts.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href={routes.contacts}>
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Contacts in System</h2>
              <p className="text-muted-foreground mb-6">
                Create your first contact to get started with client management.
              </p>
              <Link href={routes.contacts}>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Go to Contacts & Add First Client
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (contactsLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading contact details...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href={routes.contacts}>
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
          <Card className="shadow-lg border-red-200">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Contact Not Found</h2>
              <p className="text-muted-foreground mb-2">
                The contact with ID{" "}
                <code className="bg-muted px-2 py-1 rounded text-sm">{contactId}</code>{" "}
                could not be found.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                It may have been deleted or the link is incorrect.
              </p>
              <Link href={routes.contacts}>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Return to Contacts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const fullAddress = [
    contact.address_line1,
    contact.address_line2,
    contact.city,
    contact.state,
    contact.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const contactType = classifyContact(contact, maintenancePlans, projects);
  const isMaintenance = contactType === "maintenance";
  const isProject = contactType === "project";
  const isLead = contactType === "lead";

  const getMapsUrl = () => {
    if (!fullAddress) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  };

  const mapsUrl = getMapsUrl();

  const formatPaymentType = (type: string | undefined) => {
    if (!type) return "Payment";
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getPaymentStatusDisplay = (status: string) => {
    if (status === "processing") return "Unpaid";
    if (status === "succeeded") return "Succeeded";
    if (status === "failed") return "Failed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPaymentStatusColor = (status: string) => {
    if (status === "succeeded") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (status === "failed") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (status === "processing") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400";
  };

  const avatarGradient = isCommercial
    ? "from-purple-500 to-indigo-600"
    : maintenancePlan
      ? "from-green-500 to-emerald-600"
      : "from-blue-500 to-indigo-600";

  const avatarInitials = isCommercial && contact.company_name
    ? contact.company_name.substring(0, 2).toUpperCase()
    : `${contact.first_name?.[0]?.toUpperCase() || ""}${contact.last_name?.[0]?.toUpperCase() || ""}`;

  const tabCount = isCommercial ? 5 : 4;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Link href={routes.contacts}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div
              className={`w-12 h-12 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center shadow-lg`}
            >
              <span className="text-white font-bold text-lg">
                {avatarInitials}
              </span>
            </div>
            <div className="flex-1">
              {isCommercial && contact.company_name ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">{contact.company_name}</h1>
                  <p className="text-muted-foreground mt-1">
                    Contact: {fullName}
                    <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40">
                      <Building2 className="w-3 h-3 mr-1" />
                      Commercial
                    </Badge>
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">{fullName}</h1>
                  <p className="text-muted-foreground mt-1">Client Profile & Project Details</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-accent transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setShowEditDialog(true)}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2 text-blue-600" />
                  <span>Edit Contact</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer text-muted-foreground focus:text-foreground focus:bg-accent"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  <span>Archive Contact</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isSendingComm || (!contact.phone && !contact.email)}
                  onClick={() => {
                    if (contact) sendInviteLink(contact);
                  }}
                  className="cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-2 text-green-600" />
                  <span>Send Invite Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isSendingComm || (!contact.phone && !contact.email)}
                  onClick={() => {
                    if (contact) resendInviteLink(contact);
                  }}
                  className="cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-2 text-amber-600" />
                  <span>Resend Invite Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isSendingComm || (!contact.phone && !contact.email)}
                  onClick={() => {
                    if (contact) sendLoginLink(contact);
                  }}
                  className="cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-2 text-green-600" />
                  <span>Send Client Login Link</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenInMaps} className="cursor-pointer">
                  <Map className="w-4 h-4 mr-2 text-green-600" />
                  <span>Open in Maps</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
                  <Copy className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span>Copy Address</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact Info Card */}
        <Card className={`bg-gradient-to-r ${isCommercial ? "from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-800/40" : "from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800/40"}`}>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${isCommercial ? "from-purple-500 to-indigo-600" : "from-green-500 to-emerald-600"} rounded-full flex items-center justify-center`}>
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground">
                    {contact.email || "No email on file"}
                  </p>
                </div>
              </div>
              {contact.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold text-foreground">{contact.phone}</p>
                  </div>
                </div>
              )}
              {fullAddress ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isCommercial ? "Primary Address" : "Address"}</p>
                    <a
                      href={mapsUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-foreground hover:text-green-600 hover:underline transition-colors flex items-start gap-1 group"
                    >
                      <span>{fullAddress}</span>
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-semibold text-muted-foreground italic">No address on file</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Type Banner */}
        {isCommercial && (
          <Alert className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-800/40">
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-600 text-white border-0">
                      <Building2 className="w-3 h-3 mr-1" />
                      COMMERCIAL
                    </Badge>
                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                      {locations.length} location{locations.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Commercial account with multi-location management.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("locations")}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Locations
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLead && (
          <Alert className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 dark:from-gray-900/30 dark:to-gray-800/30 dark:border-gray-700">
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-gray-600 text-white border-0">LEAD</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This contact has no active projects or maintenance plans.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    onClick={() =>
                      router.push(`${routes.bids}?contactId=${contactId}`)
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Bid
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isProject && (
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/40">
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500 text-white border-0">PROJECT CLIENT</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This contact has active or upcoming projects.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("projects")}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Projects
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isMaintenance && (
          <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800/40">
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500 text-white border-0">
                      MAINTENANCE CLIENT
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This contact has active maintenance plans.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("maintenance")}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Maintenance Plans
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isCommercial ? "grid-cols-5" : "grid-cols-4"} bg-card border shadow-sm`}>
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Wrench className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Projects ({projects.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">All Payments</span>
            </TabsTrigger>
            {isCommercial && (
              <TabsTrigger
                value="locations"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Locations ({locations.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Bids</CardTitle>
                </CardHeader>
                <CardContent>
                  {bids.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No bids yet for this client.</p>
                  ) : (
                    <div className="space-y-3">
                      {bids.slice(0, 3).map((bid) => (
                        <div
                          key={bid.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {bid.title || "Untitled Bid"}
                            </p>
                            <p className="text-sm text-muted-foreground">Status: {bid.status}</p>
                          </div>
                          {bid.bid_total !== undefined && (
                            <span className="font-semibold text-green-600">
                              ${bid.bid_total?.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                      {bids.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("projects")}
                          className="w-full text-green-600"
                        >
                          View all {bids.length} bids
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      No projects yet for this client.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {projects.slice(0, 3).map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">{project.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Status: {project.status || "draft"}
                            </p>
                          </div>
                          {project.total_amount !== undefined && (
                            <span className="font-semibold text-green-600">
                              ${project.total_amount?.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                      {projects.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("projects")}
                          className="w-full text-green-600"
                        >
                          View all {projects.length} projects
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  {maintenancePlans.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      No maintenance plans for this client.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {maintenancePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {plan.title || "Maintenance Plan"}
                            </p>
                            <Badge
                              className={
                                plan.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
                              }
                            >
                              {plan.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      No payments yet for this client.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payments.slice(0, 3).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {formatPaymentType(payment.type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-semibold text-green-600">
                            ${(payment.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab (merged with Bids) */}
          <TabsContent value="projects">
            <div className="space-y-6">
              {/* Payment Summary (Project-specific) */}
              {(() => {
                const nonMaintenancePayments = payments.filter((p) => p.type !== "maintenance");
                const acceptedProjects = projects.filter((p) => p.acceptance_state === "accepted");
                const totalAcceptedAmount = acceptedProjects.reduce((s, p) => s + (p.total_amount || 0), 0);
                const totalPaid = nonMaintenancePayments.filter((p) => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                const remaining = totalAcceptedAmount - totalPaid;

                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 p-4">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Accepted</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        ${totalAcceptedAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 p-4">
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                        ${totalPaid.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Remaining Balance</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        ${remaining.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Projects Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No projects yet for this client.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Accepted Projects */}
                      {(() => {
                        const accepted = projects.filter(
                          (p) => p.acceptance_state === "accepted" && !p.is_completed && !p.archived_at
                        );
                        if (accepted.length === 0) return null;
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {accepted.length}
                              </Badge>
                              Accepted Projects
                            </h4>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Title</TableHead>
                                    {isCommercial && <TableHead>Location</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {accepted.map((project) => {
                                    const projLocation = project.location_id
                                      ? locations.find((l) => l.id === project.location_id)
                                      : null;
                                    return (
                                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent">
                                        <TableCell className="font-medium">{project.title}</TableCell>
                                        {isCommercial && (
                                          <TableCell className="text-muted-foreground text-sm">
                                            {projLocation ? projLocation.name : "\u2014"}
                                          </TableCell>
                                        )}
                                        <TableCell>
                                          <Badge className={
                                            project.status === "in_progress"
                                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                              : project.status === "scheduled"
                                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                                : "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400"
                                          }>
                                            {project.status || "draft"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>${project.total_amount?.toFixed(2) || "0.00"}</TableCell>
                                        <TableCell>{new Date(project.created_date).toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Waiting for Response */}
                      {(() => {
                        const waiting = projects.filter(
                          (p) =>
                            (!p.acceptance_state || p.acceptance_state === "pending") &&
                            !p.is_completed &&
                            !p.archived_at
                        );
                        // Also include projects linked to sent bids
                        const sentBidProjectIds = new Set(
                          bids.filter((b) => b.status === "sent" && b.project_id).map((b) => b.project_id)
                        );
                        const waitingWithSentBids = projects.filter(
                          (p) =>
                            sentBidProjectIds.has(p.id) &&
                            p.acceptance_state !== "accepted" &&
                            !p.is_completed &&
                            !p.archived_at &&
                            !waiting.some((w) => w.id === p.id)
                        );
                        const combined = [...waiting, ...waitingWithSentBids];
                        if (combined.length === 0) return null;
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {combined.length}
                              </Badge>
                              Waiting for Response
                            </h4>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Title</TableHead>
                                    {isCommercial && <TableHead>Location</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {combined.map((project) => {
                                    const projLocation = project.location_id
                                      ? locations.find((l) => l.id === project.location_id)
                                      : null;
                                    return (
                                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent">
                                        <TableCell className="font-medium">{project.title}</TableCell>
                                        {isCommercial && (
                                          <TableCell className="text-muted-foreground text-sm">
                                            {projLocation ? projLocation.name : "\u2014"}
                                          </TableCell>
                                        )}
                                        <TableCell>
                                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                            {project.acceptance_state || "pending"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>${project.total_amount?.toFixed(2) || "0.00"}</TableCell>
                                        <TableCell>{new Date(project.created_date).toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Completed Projects */}
                      {(() => {
                        const completed = projects.filter((p) => p.is_completed && !p.archived_at);
                        if (completed.length === 0) return null;
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
                                {completed.length}
                              </Badge>
                              Completed Projects
                            </h4>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Title</TableHead>
                                    {isCommercial && <TableHead>Location</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {completed.map((project) => {
                                    const projLocation = project.location_id
                                      ? locations.find((l) => l.id === project.location_id)
                                      : null;
                                    return (
                                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent">
                                        <TableCell className="font-medium">{project.title}</TableCell>
                                        {isCommercial && (
                                          <TableCell className="text-muted-foreground text-sm">
                                            {projLocation ? projLocation.name : "\u2014"}
                                          </TableCell>
                                        )}
                                        <TableCell>
                                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            completed
                                          </Badge>
                                        </TableCell>
                                        <TableCell>${project.total_amount?.toFixed(2) || "0.00"}</TableCell>
                                        <TableCell>{new Date(project.created_date).toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Archived Projects */}
                      {(() => {
                        const archived = projects.filter((p) => !!p.archived_at);
                        if (archived.length === 0) return null;
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-500">
                                {archived.length}
                              </Badge>
                              Archived Projects
                            </h4>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Title</TableHead>
                                    {isCommercial && <TableHead>Location</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {archived.map((project) => {
                                    const projLocation = project.location_id
                                      ? locations.find((l) => l.id === project.location_id)
                                      : null;
                                    return (
                                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent opacity-60">
                                        <TableCell className="font-medium">{project.title}</TableCell>
                                        {isCommercial && (
                                          <TableCell className="text-muted-foreground text-sm">
                                            {projLocation ? projLocation.name : "\u2014"}
                                          </TableCell>
                                        )}
                                        <TableCell>
                                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-500">
                                            archived
                                          </Badge>
                                        </TableCell>
                                        <TableCell>${project.total_amount?.toFixed(2) || "0.00"}</TableCell>
                                        <TableCell>{new Date(project.created_date).toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bids Section (moved from old Bids tab) */}
              <Card>
                <CardHeader>
                  <CardTitle>Bids</CardTitle>
                </CardHeader>
                <CardContent>
                  {bids.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-4">No bids yet for this client.</p>
                      <Button
                        onClick={() =>
                          router.push(`${routes.bids}?contactId=${contactId}`)
                        }
                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Bid
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bids.map((bid) => (
                            <TableRow key={bid.id} className="cursor-pointer hover:bg-accent">
                              <TableCell className="font-medium">
                                {bid.title || "Untitled Bid"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    bid.status === "accepted"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : bid.status === "sent"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                        : bid.status === "declined"
                                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                          : "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400"
                                  }
                                >
                                  {bid.status}
                                </Badge>
                              </TableCell>
                              <TableCell>${bid.bid_total?.toFixed(2) || "0.00"}</TableCell>
                              <TableCell>
                                {new Date(bid.created_date).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Locations Tab (Commercial only) */}
          {isCommercial && (
            <TabsContent value="locations">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      Locations
                      <Badge variant="secondary">{locations.length}</Badge>
                    </CardTitle>
                    <Button
                      onClick={() => setShowCreateLocation(true)}
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-purple-300" />
                      </div>
                      <p className="text-muted-foreground mb-4">
                        No locations added yet for this commercial contact.
                      </p>
                      <Button
                        onClick={() => setShowCreateLocation(true)}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800/40 dark:text-purple-400 dark:hover:bg-purple-950/20"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Location
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {locations.map((loc) => {
                        const locPlans = maintenancePlans.filter((p) => p.location_id === loc.id && !p.deleted_at);
                        const activePlanCount = locPlans.filter((p) => p.status === "active").length;
                        const locAddress = [loc.address_line1, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");

                        return (
                          <div
                            key={loc.id}
                            className="border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground">{loc.name}</h3>
                                  {loc.is_primary && (
                                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">Primary</Badge>
                                  )}
                                  {loc.billing_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {loc.billing_type === "monthly_contract" ? "Monthly Contract" : "Per Visit"}
                                    </Badge>
                                  )}
                                  {activePlanCount > 0 ? (
                                    <Badge className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40">
                                      {activePlanCount} active plan{activePlanCount !== 1 ? "s" : ""}
                                    </Badge>
                                  ) : (
                                    <Badge className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">No plans</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {locAddress}
                                </div>
                                {loc.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{loc.notes}</p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setEditingLocation(loc)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4 mr-2 text-blue-600" />
                                    Edit Location
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteLocation(loc.id)}
                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Location
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            {maintenancePlans.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wrench className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      No maintenance plans for this client.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create a maintenance plan from the contacts list.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isCommercial ? (
              /* Commercial: group by location */
              <div className="space-y-6">
                {/* Maintenance Payment Summary */}
                {(() => {
                  const maintPayments = payments.filter((p) => p.type === "maintenance");
                  const maintPaid = maintPayments.filter((p) => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                  const maintUnpaid = maintPayments.filter((p) => p.status !== "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 p-4">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">${maintPaid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Unpaid</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">${maintUnpaid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Avg Price/Visit</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                          ${(() => {
                            const prices = maintenancePlans.filter((p) => p.price_per_visit).map((p) => p.price_per_visit!);
                            return prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : "0.00";
                          })()}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Per-location plan groups */}
                {locations.map((loc) => {
                  const locPlans = plansByLocation[loc.id] || [];
                  if (locPlans.length === 0) return null;
                  const isExpanded = expandedLocationIds[loc.id] !== false;

                  return (
                    <div key={loc.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleLocationExpand(loc.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-foreground">{loc.name}</span>
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                          {locPlans.filter((p) => p.status === "active").length} active
                        </Badge>
                      </button>
                      {isExpanded && (
                        <div className="p-4 space-y-4">
                          {locPlans.map((plan) => {
                            const planVisits = maintenanceVisits.filter(
                              (v) => v.maintenance_plan_id === plan.id
                            );
                            const today = new Date().toISOString().split("T")[0];
                            const scheduledVisits = planVisits.filter(
                              (v) => v.status === "scheduled"
                            );
                            const upcomingScheduled = scheduledVisits.filter(
                              (v) => v.visit_date >= today
                            );
                            const overdueVisits = scheduledVisits.filter(
                              (v) => v.visit_date < today
                            );
                            const historyVisits = planVisits.filter(
                              (v) => v.status === "completed" || v.status === "cancelled"
                            );
                            const nextVisit = upcomingScheduled.sort((a, b) => a.visit_date.localeCompare(b.visit_date))[0];

                            return (
                              <div key={plan.id} className="space-y-4">
                                {/* Active Plan Card */}
                                <Card className="shadow-sm">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-semibold text-foreground text-lg">
                                        {plan.title || "Maintenance Plan"}
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          className={
                                            plan.status === "active"
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                              : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
                                          }
                                        >
                                          {plan.status}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => setEditingPlan(plan)}
                                        >
                                          <Pencil className="w-3 h-3 mr-1" />
                                          Edit Plan
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Frequency</p>
                                        <p className="font-medium capitalize">{plan.frequency}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Next Visit</p>
                                        <p className="font-medium">
                                          {nextVisit
                                            ? new Date(nextVisit.visit_date).toLocaleDateString()
                                            : "None scheduled"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Price/Visit</p>
                                        <p className="font-medium">${plan.price_per_visit?.toFixed(2) || "0.00"}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Assigned Crew</p>
                                        <p className="font-medium">
                                          {plan.assigned_team_id || plan.assigned_employee_ids?.length
                                            ? `${plan.assigned_employee_ids?.length || 0} member(s)`
                                            : "Unassigned"}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Upcoming / Scheduled Visits */}
                                {(upcomingScheduled.length > 0 || overdueVisits.length > 0) && (
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base">Upcoming / Scheduled Visits</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="rounded-lg border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Service</TableHead>
                                              <TableHead>Status</TableHead>
                                              <TableHead>Payment</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {[...overdueVisits, ...upcomingScheduled]
                                              .sort((a, b) => a.visit_date.localeCompare(b.visit_date))
                                              .map((visit) => {
                                                const isOverdue = visit.visit_date < today;
                                                return (
                                                  <TableRow key={visit.id}>
                                                    <TableCell className="font-medium">
                                                      {new Date(visit.visit_date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                                    <TableCell>
                                                      <Badge className={
                                                        isOverdue
                                                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                      }>
                                                        {isOverdue ? "overdue" : "scheduled"}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Badge className={
                                                        visit.payment_status === "paid"
                                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                          : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                      }>
                                                        {visit.payment_status || "unpaid"}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Service History */}
                                {historyVisits.length > 0 && (
                                  <Card className="shadow-sm">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base">Service History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="rounded-lg border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Service</TableHead>
                                              <TableHead>Status</TableHead>
                                              <TableHead>Payment</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {historyVisits
                                              .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
                                              .map((visit) => (
                                                <TableRow key={visit.id}>
                                                  <TableCell className="font-medium">
                                                    {new Date(visit.visit_date).toLocaleDateString()}
                                                  </TableCell>
                                                  <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                                  <TableCell>
                                                    <Badge className={
                                                      visit.status === "completed"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                    }>
                                                      {visit.status}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Badge className={
                                                      visit.payment_status === "paid"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                    }>
                                                      {visit.payment_status || "unpaid"}
                                                    </Badge>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned plans (no location) */}
                {(plansByLocation["unassigned"] || []).length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">No Location Assigned</span>
                    </div>
                    <div className="p-4 space-y-4">
                      {(plansByLocation["unassigned"] || []).map((plan) => {
                        const planVisits = maintenanceVisits.filter(
                          (v) => v.maintenance_plan_id === plan.id
                        );
                        const today = new Date().toISOString().split("T")[0];
                        const scheduledVisits = planVisits.filter((v) => v.status === "scheduled");
                        const upcomingScheduled = scheduledVisits.filter((v) => v.visit_date >= today);
                        const overdueVisits = scheduledVisits.filter((v) => v.visit_date < today);
                        const historyVisits = planVisits.filter((v) => v.status === "completed" || v.status === "cancelled");
                        const nextVisit = upcomingScheduled.sort((a, b) => a.visit_date.localeCompare(b.visit_date))[0];

                        return (
                          <div key={plan.id} className="space-y-4">
                            <Card className="shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-semibold text-foreground text-lg">
                                    {plan.title || "Maintenance Plan"}
                                  </h3>
                                  <Badge
                                    className={
                                      plan.status === "active"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
                                    }
                                  >
                                    {plan.status}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Frequency</p>
                                    <p className="font-medium capitalize">{plan.frequency}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Next Visit</p>
                                    <p className="font-medium">
                                      {nextVisit
                                        ? new Date(nextVisit.visit_date).toLocaleDateString()
                                        : "None scheduled"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Price/Visit</p>
                                    <p className="font-medium">${plan.price_per_visit?.toFixed(2) || "0.00"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Assigned Crew</p>
                                    <p className="font-medium">
                                      {plan.assigned_team_id || plan.assigned_employee_ids?.length
                                        ? `${plan.assigned_employee_ids?.length || 0} member(s)`
                                        : "Unassigned"}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {(upcomingScheduled.length > 0 || overdueVisits.length > 0) && (
                              <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Upcoming / Scheduled Visits</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="rounded-lg border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Service</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Payment</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {[...overdueVisits, ...upcomingScheduled]
                                          .sort((a, b) => a.visit_date.localeCompare(b.visit_date))
                                          .map((visit) => {
                                            const isOverdue = visit.visit_date < today;
                                            return (
                                              <TableRow key={visit.id}>
                                                <TableCell className="font-medium">
                                                  {new Date(visit.visit_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                                <TableCell>
                                                  <Badge className={
                                                    isOverdue
                                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                  }>
                                                    {isOverdue ? "overdue" : "scheduled"}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge className={
                                                    visit.payment_status === "paid"
                                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                      : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                  }>
                                                    {visit.payment_status || "unpaid"}
                                                  </Badge>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {historyVisits.length > 0 && (
                              <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Service History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="rounded-lg border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Service</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Payment</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {historyVisits
                                          .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
                                          .map((visit) => (
                                            <TableRow key={visit.id}>
                                              <TableCell className="font-medium">
                                                {new Date(visit.visit_date).toLocaleDateString()}
                                              </TableCell>
                                              <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                              <TableCell>
                                                <Badge className={
                                                  visit.status === "completed"
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                }>
                                                  {visit.status}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                <Badge className={
                                                  visit.payment_status === "paid"
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                                }>
                                                  {visit.payment_status || "unpaid"}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Residential: flat plan list with structured sections */
              <div className="space-y-6">
                {/* Maintenance Payment Summary */}
                {(() => {
                  const maintPayments = payments.filter((p) => p.type === "maintenance");
                  const maintPaid = maintPayments.filter((p) => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                  const maintUnpaid = maintPayments.filter((p) => p.status !== "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 p-4">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">${maintPaid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Unpaid</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">${maintUnpaid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Price/Visit</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                          ${maintenancePlan?.price_per_visit?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {maintenancePlans.map((plan) => {
                  const planVisits = maintenanceVisits.filter(
                    (v) => v.maintenance_plan_id === plan.id
                  );
                  const today = new Date().toISOString().split("T")[0];
                  const scheduledVisits = planVisits.filter((v) => v.status === "scheduled");
                  const upcomingScheduled = scheduledVisits.filter((v) => v.visit_date >= today);
                  const overdueVisits = scheduledVisits.filter((v) => v.visit_date < today);
                  const historyVisits = planVisits.filter((v) => v.status === "completed" || v.status === "cancelled");
                  const nextVisit = upcomingScheduled.sort((a, b) => a.visit_date.localeCompare(b.visit_date))[0];

                  return (
                    <div key={plan.id} className="space-y-4">
                      {/* Active Plan Card */}
                      <Card className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground text-lg">
                              {plan.title || "Maintenance Plan"}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  plan.status === "active"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
                                }
                              >
                                {plan.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingPlan(plan)}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit Plan
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Frequency</p>
                              <p className="font-medium capitalize">{plan.frequency}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Next Visit</p>
                              <p className="font-medium">
                                {nextVisit
                                  ? new Date(nextVisit.visit_date).toLocaleDateString()
                                  : "None scheduled"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price/Visit</p>
                              <p className="font-medium">${plan.price_per_visit?.toFixed(2) || "0.00"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned Crew</p>
                              <p className="font-medium">
                                {plan.assigned_team_id || plan.assigned_employee_ids?.length
                                  ? `${plan.assigned_employee_ids?.length || 0} member(s)`
                                  : "Unassigned"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Upcoming / Scheduled Visits */}
                      {(upcomingScheduled.length > 0 || overdueVisits.length > 0) && (
                        <Card className="shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Upcoming / Scheduled Visits</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...overdueVisits, ...upcomingScheduled]
                                    .sort((a, b) => a.visit_date.localeCompare(b.visit_date))
                                    .map((visit) => {
                                      const isOverdue = visit.visit_date < today;
                                      return (
                                        <TableRow key={visit.id}>
                                          <TableCell className="font-medium">
                                            {new Date(visit.visit_date).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                          <TableCell>
                                            <Badge className={
                                              isOverdue
                                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            }>
                                              {isOverdue ? "overdue" : "scheduled"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge className={
                                              visit.payment_status === "paid"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                            }>
                                              {visit.payment_status || "unpaid"}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Service History */}
                      {historyVisits.length > 0 && (
                        <Card className="shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Service History</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {historyVisits
                                    .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
                                    .map((visit) => (
                                      <TableRow key={visit.id}>
                                        <TableCell className="font-medium">
                                          {new Date(visit.visit_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{visit.service_performed || "General maintenance"}</TableCell>
                                        <TableCell>
                                          <Badge className={
                                            visit.status === "completed"
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                              : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                          }>
                                            {visit.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={
                                            visit.payment_status === "paid"
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                              : "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400"
                                          }>
                                            {visit.payment_status || "unpaid"}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No payments yet for this client.</p>
                  </div>
                ) : isCommercial && locations.length > 0 ? (
                  /* Commercial: group payments by location */
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 p-4">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          ${payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Unpaid</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                          ${payments.filter((p) => p.status !== "succeeded").reduce((s, p) => s + (p.amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Per-location breakdown */}
                    {locations.map((loc) => {
                      const locPayments = payments.filter((p) => p.location_id === loc.id);
                      if (locPayments.length === 0) return null;
                      const locPaid = locPayments.filter((p) => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                      const locUnpaid = locPayments.filter((p) => p.status !== "succeeded").reduce((s, p) => s + (p.amount || 0), 0);
                      return (
                        <div key={loc.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{loc.name}</p>
                              <p className="text-xs text-muted-foreground">{loc.city}, {loc.state}</p>
                            </div>
                            <div className="flex gap-4 text-xs">
                              <span className="text-green-600 font-semibold">Paid: ${locPaid.toFixed(2)}</span>
                              {locUnpaid > 0 && <span className="text-amber-600 font-semibold">Unpaid: ${locUnpaid.toFixed(2)}</span>}
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {locPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-medium">
                                    {new Date(payment.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                  </TableCell>
                                  <TableCell>{formatPaymentType(payment.type)}</TableCell>
                                  <TableCell className="font-semibold">${(payment.amount || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge className={getPaymentStatusColor(payment.status)}>{getPaymentStatusDisplay(payment.status)}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}

                    {/* Payments without a location */}
                    {(() => {
                      const unlocated = payments.filter((p) => !p.location_id || !locations.some((l) => l.id === p.location_id));
                      if (unlocated.length === 0) return null;
                      return (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-3">
                            <p className="font-semibold text-foreground text-sm">No Location Assigned</p>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unlocated.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-medium">
                                    {new Date(payment.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                  </TableCell>
                                  <TableCell>{formatPaymentType(payment.type)}</TableCell>
                                  <TableCell className="font-semibold">${(payment.amount || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge className={getPaymentStatusColor(payment.status)}>{getPaymentStatusDisplay(payment.status)}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Residential: flat table */
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {new Date(payment.created_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell>{formatPaymentType(payment.type)}</TableCell>
                            <TableCell className="font-semibold">
                              ${(payment.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {payment.payment_method && payment.payment_method !== "unknown"
                                ? payment.payment_method.toUpperCase()
                                : "--"}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPaymentStatusColor(payment.status)}>
                                {getPaymentStatusDisplay(payment.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Dialogs */}
        <EditContactDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          contact={contact}
        />

        <DeleteContactDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          contact={contact}
          navigateAfterDelete
        />

        {isCommercial && (
          <>
            <CreateLocationDialog
              open={showCreateLocation}
              onOpenChange={setShowCreateLocation}
              contactId={contactId}
            />
            <EditLocationDialog
              open={!!editingLocation}
              onOpenChange={(open) => !open && setEditingLocation(null)}
              location={editingLocation}
            />
          </>
        )}

        {editingPlan && (
          <EditMaintenancePlanDialog
            open={!!editingPlan}
            onOpenChange={(open) => !open && setEditingPlan(null)}
            plan={editingPlan}
          />
        )}
      </div>
    </div>
  );
}
