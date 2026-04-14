"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { db } from "@/data/api";
import { DoorToDoorPin } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import CreateContactDialog from "@/components/contacts/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Status Config                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  DoorToDoorPin["status"],
  { label: string; color: string }
> = {
  interested: { label: "Interested", color: "#3b82f6" },
  follow_up: { label: "Follow Up", color: "#eab308" },
  no_answer: { label: "No Answer", color: "#9ca3af" },
  not_interested: { label: "Not Interested", color: "#ef4444" },
  do_not_knock: { label: "Do Not Knock", color: "#1f2937" },
  made_sale: { label: "Made Sale", color: "#22c55e" },
  maintenance_customer: { label: "Maintenance Customer", color: "#10b981" },
};

const DEFAULT_CENTER = { lat: 39.7392, lng: -104.9903 };
const DEFAULT_ZOOM = 15;

/* ------------------------------------------------------------------ */
/* Map Content (must be inside APIProvider)                             */
/* ------------------------------------------------------------------ */

function DoorToDoorMapContent() {
  const map = useMap();
  const geocoding = useMapsLibrary("geocoding");
  const { currentCompanyId } = useCompany();

  // Data
  const [pins, setPins] = useState<DoorToDoorPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Add pin flow
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedPosition, setClickedPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [clickedAddress, setClickedAddress] = useState("");
  const [addressParts, setAddressParts] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  const [pinStatus, setPinStatus] =
    useState<DoorToDoorPin["status"]>("interested");
  const [pinNotes, setPinNotes] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Pin detail
  const [selectedPin, setSelectedPin] = useState<DoorToDoorPin | null>(null);

  // Create contact flow
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [contactPrefill, setContactPrefill] = useState<Partial<Contact>>({});

  // Guards
  const markerClickedRef = useRef(false);
  const hasCenteredRef = useRef(false);

  // Load pins
  useEffect(() => {
    async function load() {
      const data = await db.DoorToDoorPin.filter({
        company_id: currentCompanyId,
      });
      setPins(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Watch user location (live GPS tracking)
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(loc);

        // Center map on user once at startup
        if (!hasCenteredRef.current && map) {
          map.panTo(loc);
          map.setZoom(16);
          hasCenteredRef.current = true;
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map]);

  // Reverse geocode lat/lng → address components
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!geocoding) return;
      setIsGeocoding(true);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geocoder = new (geocoding as any).Geocoder();
        const response = await geocoder.geocode({
          location: { lat, lng },
        });

        if (response.results?.[0]) {
          const result = response.results[0];
          setClickedAddress(result.formatted_address || "");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const get = (type: string) =>
            result.address_components?.find((c: any) =>
              c.types?.includes(type)
            )?.long_name || "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const getShort = (type: string) =>
            result.address_components?.find((c: any) =>
              c.types?.includes(type)
            )?.short_name || "";

          setAddressParts({
            street: `${get("street_number")} ${get("route")}`.trim(),
            city: get("locality") || get("sublocality"),
            state: getShort("administrative_area_level_1"),
            zip: get("postal_code"),
          });
        }
      } catch {
        setClickedAddress("Address unavailable");
      } finally {
        setIsGeocoding(false);
      }
    },
    [geocoding]
  );

  // Map click → open add pin modal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = useCallback(
    (e: any) => {
      if (markerClickedRef.current) {
        markerClickedRef.current = false;
        return;
      }

      const latLng = e.detail?.latLng;
      if (!latLng) return;

      const { lat, lng } = latLng;
      setClickedPosition({ lat, lng });
      setPinStatus("interested");
      setPinNotes("");
      setClickedAddress("");
      setAddressParts({ street: "", city: "", state: "", zip: "" });
      setSelectedPin(null);
      setShowAddModal(true);

      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Save pin
  const handleSavePin = async () => {
    if (!clickedPosition) return;

    const pin = await db.DoorToDoorPin.create({
      company_id: currentCompanyId,
      lat: clickedPosition.lat,
      lng: clickedPosition.lng,
      address: clickedAddress || "Unknown address",
      status: pinStatus,
      notes: pinNotes,
      visited_at: new Date().toISOString(),
    });

    setPins((prev) => [...prev, pin]);
    setShowAddModal(false);

    // Made Sale or Maintenance Customer → open create contact flow
    if (pinStatus === "made_sale" || pinStatus === "maintenance_customer") {
      toast.success("Sale recorded! Now add this customer.");
      setContactPrefill({
        address_line1: addressParts.street,
        city: addressParts.city,
        state: addressParts.state,
        zip: addressParts.zip,
        notes: pinNotes,
      });
      setShowCreateContact(true);
    } else {
      toast.success("Pin saved.");
    }

    // Reset
    setClickedPosition(null);
    setClickedAddress("");
    setPinNotes("");
    setPinStatus("interested");
  };

  // Marker click → show detail
  const handleMarkerClick = (pin: DoorToDoorPin) => {
    markerClickedRef.current = true;
    setSelectedPin(pin);
    setTimeout(() => {
      markerClickedRef.current = false;
    }, 100);
  };

  // Delete pin
  const handleDeletePin = async (pinId: string) => {
    await db.DoorToDoorPin.delete(pinId);
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    setSelectedPin(null);
    toast.success("Pin removed.");
  };

  // Center on user
  const handleCenterOnUser = () => {
    if (userLocation && map) {
      map.panTo(userLocation);
      map.setZoom(16);
    }
  };

  // Contact created callback
  const handleContactCreated = (contact: Contact) => {
    toast.success(
      `Contact "${contact.first_name} ${contact.last_name}" created!`
    );
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Google Map */}
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
        className="w-full h-full"
        onClick={handleMapClick}
      >
        {/* Existing pin markers */}
        {pins.map((pin) => {
          const cfg = STATUS_CONFIG[pin.status];
          return (
            <AdvancedMarker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              onClick={() => handleMarkerClick(pin)}
            >
              <div
                className="w-7 h-7 rounded-full border-[2.5px] border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: cfg?.color || "#9ca3af" }}
                title={cfg?.label}
              >
                {pin.status === "maintenance_customer" && "\u2605"}
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Live user location (blue pulsing dot) */}
        {userLocation && (
          <AdvancedMarker position={userLocation} clickable={false}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping" />
              <div className="w-4 h-4 bg-blue-500 rounded-full border-[2.5px] border-white shadow-lg relative z-10" />
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {/* ---- Floating Controls ---- */}

      {/* Center on me */}
      <button
        onClick={handleCenterOnUser}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150"
        title="Center on my location"
      >
        <Navigation className="w-5 h-5 text-blue-500" />
      </button>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-10 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 p-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Legend
        </p>
        <div className="space-y-1.5">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-zinc-600 flex items-center justify-center text-white text-[7px]"
                style={{ backgroundColor: config.color }}
              >
                {key === "maintenance_customer" && "\u2605"}
              </div>
              <span className="text-xs text-gray-600 dark:text-zinc-400">
                {config.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-zinc-700 mt-1">
            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border border-gray-200 dark:border-zinc-600" />
            <span className="text-xs text-gray-600 dark:text-zinc-400">
              Your Location
            </span>
          </div>
        </div>
      </div>

      {/* ---- Add Pin Modal ---- */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Drop Pin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Reverse-geocoded address */}
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                {isGeocoding ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Looking up address...
                  </span>
                ) : (
                  clickedAddress || "Unknown address"
                )}
              </p>
            </div>

            {/* Status selector */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={pinStatus}
                onValueChange={(val) =>
                  setPinStatus(val as DoorToDoorPin["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={pinNotes}
                onChange={(e) => setPinNotes(e.target.value)}
                placeholder="Any notes about this door..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePin}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Save Pin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Pin Detail Modal ---- */}
      <Dialog
        open={!!selectedPin}
        onOpenChange={(open) => !open && setSelectedPin(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Pin Details
            </DialogTitle>
          </DialogHeader>
          {selectedPin && (
            <div className="space-y-3 mt-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-gray-200 dark:border-zinc-600 flex items-center justify-center text-white text-[8px]"
                  style={{
                    backgroundColor:
                      STATUS_CONFIG[selectedPin.status]?.color || "#9ca3af",
                  }}
                >
                  {selectedPin.status === "maintenance_customer" && "\u2605"}
                </div>
                <span className="font-semibold text-sm">
                  {STATUS_CONFIG[selectedPin.status]?.label ||
                    selectedPin.status}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {selectedPin.address}
              </p>

              {selectedPin.notes && (
                <div className="text-sm bg-muted rounded-lg p-3">
                  {selectedPin.notes}
                </div>
              )}

              {selectedPin.visited_at && (
                <p className="text-xs text-muted-foreground">
                  Visited:{" "}
                  {new Date(selectedPin.visited_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => handleDeletePin(selectedPin.id)}
                >
                  Remove Pin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Create Contact (Made Sale / Maintenance Customer) ---- */}
      <CreateContactDialog
        open={showCreateContact}
        onOpenChange={setShowCreateContact}
        prefillData={contactPrefill}
        onContactCreated={handleContactCreated}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page (outer wrapper with API key check)                             */
/* ------------------------------------------------------------------ */

export default function DoorToDoorPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <MapPin className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Google Maps API Key Required
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            To use the Door to Door feature, add your Google Maps credentials
            to your{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              .env.local
            </code>{" "}
            file.
          </p>
          <div className="bg-muted rounded-lg p-4 text-left text-xs font-mono space-y-1 text-foreground">
            <p>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here</p>
            <p>NEXT_PUBLIC_GOOGLE_MAP_ID=your_map_id_here</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Get both for free at{" "}
            <span className="text-foreground font-medium">
              Google Cloud Console
            </span>{" "}
            &rarr; APIs &amp; Services
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden">
      <APIProvider apiKey={apiKey}>
        <DoorToDoorMapContent />
      </APIProvider>
    </div>
  );
}
