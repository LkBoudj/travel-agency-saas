import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { demoAgencyConfig } from "@/features/agency/demo-agency";
import { getActiveStorefront } from "@/themes/resolver";
import { brandingToCssVars } from "@/design-system/branding";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sahara Travel — Tours & Destinations",
  description:
    "Thoughtfully crafted journeys, handpicked destinations, and unforgettable travel experiences.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const agency = demoAgencyConfig;
  const { theme, context } = getActiveStorefront(agency);
  const { Layout } = theme;

  return (
    <html
      lang={agency.locale}
      dir="ltr"
      className={`${inter.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col"
        style={brandingToCssVars(agency.branding)}
      >
        <Layout context={context}>{children}</Layout>
      </body>
    </html>
  );
}