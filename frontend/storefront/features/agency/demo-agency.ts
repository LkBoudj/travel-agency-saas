import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { AgencyStorefrontConfig } from "./types";

/**
 * TEMPORARY demo config — the storefront's development adapter.
 * Replace with the real `agency.*` storefront payload once the backend
 * exposes it. Only the existing logo asset is real; contact/social values
 * are isolated placeholders for visual development.
 */
export const demoAgencyConfig: AgencyStorefrontConfig = {
  id: "demo-agency",
  locale: "en",
  activeThemeId: "explorer",
  branding: {
    name: "Sahara",
    primaryColor: "#0f766e",
    logo: {
      src: "/demo-agency-logo.png",
      alt: "Sahara",
      width: 2009,
      height: 783,
    },
  },
  navigation: [
    { label: "Tours", href: "#tours" },
    { label: "Destinations", href: "#destinations" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
  footer: {
    description:
      "Thoughtfully crafted journeys and unforgettable travel experiences.",
    navigation: {
      explore: {
        heading: "Explore",
        ariaLabel: "Explore",
        links: [
          { label: "Tours", href: "/tours" },
          { label: "Destinations", href: "/destinations" },
          { label: "Special Offers", href: "/offers" },
        ],
      },
      company: {
        heading: "Company",
        ariaLabel: "Company",
        links: [
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      },
    },
    contact: [
      {
        id: "phone",
        label: "Phone",
        value: "+1 (555) 013-0000",
        href: "tel:+15550130000",
        icon: Phone,
      },
      {
        id: "email",
        label: "Email",
        value: "hello@saharatravel.example",
        href: "mailto:hello@saharatravel.example",
        icon: Mail,
      },
      {
        id: "address",
        label: "Location",
        value: "12 Marina Walk, Old Town, Greece",
        icon: MapPin,
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        value: "+1 (555) 013-0000",
        icon: MessageCircle,
      },
    ],
    socialLinks: [
      { id: "instagram", label: "Instagram", href: "#" },
      { id: "facebook", label: "Facebook", href: "#" },
      { id: "linkedin", label: "LinkedIn", href: "#" },
    ],
    legalHrefs: {
      privacy: "/privacy",
      terms: "/terms",
    },
  },
  settings: {},
};