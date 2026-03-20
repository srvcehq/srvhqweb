import { Team } from "../types";

export const mockTeams: Omit<Team, "id" | "created_date" | "updated_date">[] = [
  { name: "Alpha Crew", color: "#22c55e", member_ids: ["2", "3", "4"], lead_id: "2", start_address: "1500 Market St, Denver, CO 80202", start_lat: 39.7507, start_lng: -104.9997, company_id: "1" },
  { name: "Bravo Crew", color: "#3b82f6", member_ids: ["5", "6"], lead_id: "5", start_address: "2200 Blake St, Denver, CO 80205", start_lat: 39.7553, start_lng: -104.9873, company_id: "1" },
  { name: "Charlie Crew", color: "#f59e0b", member_ids: ["7"], lead_id: "7", start_address: "800 Auraria Pkwy, Denver, CO 80204", start_lat: 39.7447, start_lng: -105.0076, company_id: "1" },
];
