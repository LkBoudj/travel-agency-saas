import { BadgeCheck, Headset, MapPin, ShieldCheck } from "lucide-react";
import type { Feature } from "./types";

// TEMPORARY demo data — replace with agency trust points from the backend.
export const demoFeatures: Feature[] = [
  {
    id: "handpicked-tours",
    icon: BadgeCheck,
    title: "Handpicked Tours",
    description: "Carefully selected travel experiences.",
  },
  {
    id: "local-expertise",
    icon: MapPin,
    title: "Local Expertise",
    description: "Knowledge you can rely on.",
  },
  {
    id: "secure-booking",
    icon: ShieldCheck,
    title: "Secure Booking",
    description: "Simple and safe reservations.",
  },
  {
    id: "dedicated-support",
    icon: Headset,
    title: "Dedicated Support",
    description: "Help before and during your trip.",
  },
];