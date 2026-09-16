export type SafetyAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  at: string;
  area: string;
};

export const safetyAlerts: SafetyAlert[] = [
  {
    id: "a1",
    severity: "warning",
    title: "Severe thunderstorm watch until 8 p.m.",
    detail:
      "Kent County is under a severe thunderstorm watch. Move indoors if you hear thunder. Outdoor practices are suspended until further notice.",
    at: "Today, 2:40 PM",
    area: "All campus",
  },
  {
    id: "a2",
    severity: "info",
    title: "Lot 6 closed for resurfacing through Friday",
    detail:
      "Overflow parking is available in Lot 9 behind Knollcrest East. The shuttle will add a Lot 9 stop every 15 minutes.",
    at: "Today, 7:15 AM",
    area: "Knollcrest East",
  },
  {
    id: "a3",
    severity: "info",
    title: "Fire alarm test: Science Building, Thursday 9 a.m.",
    detail:
      "Alarms will sound for roughly ten minutes. No evacuation is required, but labs should pause volatile work.",
    at: "Sep 11, 4:30 PM",
    area: "Science Building",
  },
];

export type EmergencyContact = {
  id: string;
  name: string;
  detail: string;
  phone: string;
  urgent?: boolean;
};

export const emergencyContacts: EmergencyContact[] = [
  {
    id: "c1",
    name: "Campus Safety dispatch",
    detail: "Staffed 24/7, onsite in under three minutes",
    phone: "6165263333",
    urgent: true,
  },
  {
    id: "c2",
    name: "Emergency (911)",
    detail: "Police, fire, and medical",
    phone: "911",
    urgent: true,
  },
  {
    id: "c3",
    name: "Counseling Center",
    detail: "Mon-Fri 8 a.m. to 5 p.m.",
    phone: "6165263485",
  },
  {
    id: "c4",
    name: "Health Services",
    detail: "Mon-Fri 8:30 a.m. to 4:30 p.m.",
    phone: "6165263266",
  },
  {
    id: "c5",
    name: "Title IX Coordinator",
    detail: "Confidential reporting support",
    phone: "6165268775",
  },
  {
    id: "c6",
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text, 24/7",
    phone: "988",
  },
];
