"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { Contact } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Phone,
  Mail,
  Search,
  Map as MapIcon,
  Users,
} from "lucide-react";

export default function ClientMapPage() {
  const { currentCompanyId } = useCompany();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const data = await db.Contact.filter({ company_id: currentCompanyId });
      setContacts(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => !c.isArchived);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.address_line1?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contacts, searchQuery]);

  // Group by city
  const contactsByCity = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    filteredContacts.forEach((c) => {
      const city = c.city || "Unknown";
      if (!groups[city]) groups[city] = [];
      groups[city].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-card-header-from via-background to-card-header-to">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-600" />
                Client Map
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredContacts.length} client
                {filteredContacts.length !== 1 ? "s" : ""} with addresses
              </p>
            </div>
          </div>

          {/* Map Placeholder */}
          <Card className="shadow-lg overflow-hidden border-2 border-green-400">
            <CardHeader className="bg-card border-b-2 border-green-400 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Route Map</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Interactive map of all client locations
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[350px] bg-gradient-to-br from-muted to-muted/80 flex flex-col items-center justify-center">
                <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium text-lg">
                  Map view requires Google Maps API key
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Configure your API key in Settings to enable the interactive map
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, address, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Contact Cards by City */}
          {contactsByCity.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Clients Found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No clients match your search"
                    : "Add contacts with addresses to see them on the map"}
                </p>
              </CardContent>
            </Card>
          ) : (
            contactsByCity.map(([city, cityContacts]) => (
              <div key={city}>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  {city}
                  <Badge variant="outline" className="text-xs">
                    {cityContacts.length}
                  </Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {cityContacts.map((contact) => (
                    <Card
                      key={contact.id}
                      className={`shadow-md hover:shadow-lg transition-all cursor-pointer ${
                        selectedContact?.id === contact.id
                          ? "ring-2 ring-green-500 border-green-300"
                          : "hover:border-green-200"
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.tags && contact.tags.length > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40 text-xs"
                            >
                              {contact.tags[0]}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" />
                            <span>
                              {contact.address_line1 || "No address"}
                              {contact.city && `, ${contact.city}`}
                              {contact.state && `, ${contact.state}`}
                              {contact.zip && ` ${contact.zip}`}
                            </span>
                          </div>

                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                              <span>{contact.phone}</span>
                            </div>
                          )}

                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>

                        {contact.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {contact.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
