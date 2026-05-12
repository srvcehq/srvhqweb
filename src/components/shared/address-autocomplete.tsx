"use client";

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { publicEnv } from "@/lib/env";

type Props = {
  id?: string;
  value: string;
  /** Called with the typed text on keystrokes, and with the formatted address when a suggestion is picked. */
  onChange: (value: string) => void;
  /** Called with the picked place's details (formatted address + components + lat/lng) when a suggestion is selected. */
  onPlace?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
};

/** The input + Google Places Autocomplete (only mounted when the Maps key is present). */
function AutocompleteInput({ id, value, onChange, onPlace, placeholder, className }: Props) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Keep the latest callbacks without re-binding the place_changed listener
  // (parents pass new inline functions every render).
  const onChangeRef = useRef(onChange);
  const onPlaceRef = useRef(onPlace);
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceRef.current = onPlace;
  });

  useEffect(() => {
    if (!places || !inputRef.current || acRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "address_components", "geometry"],
      types: ["address"],
    });
    acRef.current = ac;
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const formatted = place?.formatted_address ?? inputRef.current?.value ?? "";
      onChangeRef.current(formatted);
      if (place && onPlaceRef.current) onPlaceRef.current(place);
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [places]);

  return (
    <Input
      id={id}
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      // Stop the browser's own autofill from fighting the Google dropdown.
      autoComplete="off"
    />
  );
}

/**
 * An address field with Google Places autocomplete. Degrades to a plain text
 * input when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't configured (so onboarding
 * never breaks if Maps is off).
 *
 * NOTE: the key's Google Cloud project must have the "Places API" enabled
 * (billing on) and the key's HTTP-referrer restrictions must allow this site's
 * origin, or the dropdown silently won't appear.
 */
export function AddressAutocomplete(props: Props) {
  const apiKey = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <Input
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={props.className}
      />
    );
  }
  return (
    <APIProvider apiKey={apiKey}>
      <AutocompleteInput {...props} />
    </APIProvider>
  );
}
