"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
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
import { publicEnv } from "@/lib/env";

const DEFAULT_CENTER = { lat: 39.7392, lng: -104.9903 };
const DEFAULT_ZOOM = 11;

type Coords = { lat: number; lng: number };

function formatAddress(c: Contact): string | null {
  if (!c.address_line1) return null;
  const parts = [c.address_line1, c.city, c.state, c.zip].filter(Boolean);
  return parts.join(", ");
}

function ClientMapContent({
  contacts,
  selectedContact,
  onSelectContact,
}: {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (c: Contact) => void;
}) {
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");
  const [coordsByContactId, setCoordsByContactId] = useState<Record<string, Coords>>({});
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const failedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  useEffect(() => {
    if (!geocoderRef.current) return;

    const toGeocode = contacts.filter((c) => {
      if (coordsByContactId[c.id]) return false;
      if (failedRef.current.has(c.id)) return false;
      if (c.latitude !== undefined && c.longitude !== undefined) return false;
      return Boolean(formatAddress(c));
    });

    if (toGeocode.length === 0) return;

    let cancelled = false;
    const geocoder = geocoderRef.current;

    (async () => {
      for (const contact of toGeocode) {
        if (cancelled) return;
        const address = formatAddress(contact);
        if (!address) continue;

        try {
          const result = await geocoder.geocode({ address });
          if (cancelled) return;
          const loc = result.results[0]?.geometry.location;
          if (loc) {
            setCoordsByContactId((prev) => ({
              ...prev,
              [contact.id]: { lat: loc.lat(), lng: loc.lng() },
            }));
          } else {
            failedRef.current.add(contact.id);
          }
        } catch {
          failedRef.current.add(contact.id);
        }
        await new Promise((r) => setTimeout(r, 60));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contacts, coordsByContactId]);

  const markers = useMemo(() => {
    return contacts
      .map((c) => {
        const coords =
          c.latitude !== undefined && c.longitude !== undefined
            ? { lat: c.latitude, lng: c.longitude }
            : coordsByContactId[c.id];
        return coords ? { contact: c, coords } : null;
      })
      .filter((m): m is { contact: Contact; coords: Coords } => m !== null);
  }, [contacts, coordsByContactId]);

  useEffect(() => {
    if (!map || !selectedContact) return;
    const match = markers.find((m) => m.contact.id === selectedContact.id);
    if (match) {
      map.panTo(match.coords);
      map.setZoom(15);
    }
  }, [map, selectedContact, markers]);

  useEffect(() => {
    if (!map || markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend(m.coords));
    map.fitBounds(bounds, 80);
  }, [map, markers.length]);

  const totalAddressed = contacts.filter((c) => formatAddress(c)).length;
  const placed = markers.length;
  const pending = totalAddressed - placed - failedRef.current.size;

  return (
    <div className="relative h-full w-full">
      <Map
        mapId={publicEnv.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="w-full h-full"
      >
        {markers.map(({ contact, coords }) => (
          <AdvancedMarker
            key={contact.id}
            position={coords}
            onClick={() => onSelectContact(contact)}
          >
            <div
              className={`w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform ${
                selectedContact?.id === contact.id
                  ? "bg-green-600 scale-125"
                  : "bg-green-500 hover:scale-110"
              }`}
              title={`${contact.first_name} ${contact.last_name}`}
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
          </AdvancedMarker>
        ))}
      </Map>

      {pending > 0 && (
        <div className="absolute top-3 right-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur rounded-md px-3 py-1.5 text-xs font-medium shadow-md border border-zinc-200 dark:border-zinc-800">
          Geocoding {pending} more address{pending === 1 ? "" : "es"}…
        </div>
      )}
      {failedRef.current.size > 0 && (
        <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur rounded-md px-3 py-1.5 text-xs font-medium shadow-md border border-zinc-200 dark:border-zinc-800">
          {failedRef.current.size} address{failedRef.current.size === 1 ? "" : "es"} could not be geocoded
        </div>
      )}
    </div>
  );
}

export default function ClientMapPage() {
  const { currentCompanyId } = useCompany();
  const apiKey = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    async function load() {
      const data = await db.Contact.filter({ company_id: currentCompanyId });
      setContacts(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

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
              <div className="h-[450px]">
                {!apiKey ? (
                  <div className="h-full bg-gradient-to-br from-muted to-muted/80 flex flex-col items-center justify-center p-6 text-center">
                    <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium text-lg">
                      Map view requires Google Maps API key
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Add <code className="bg-card px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code className="bg-card px-1.5 py-0.5 rounded text-xs">.env.local</code>
                    </p>
                  </div>
                ) : (
                  <APIProvider apiKey={apiKey} libraries={["geocoding"]}>
                    <ClientMapContent
                      contacts={filteredContacts}
                      selectedContact={selectedContact}
                      onSelectContact={setSelectedContact}
                    />
                  </APIProvider>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, address, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

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
