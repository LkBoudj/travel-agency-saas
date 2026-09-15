import type { ThemeLayoutProps } from "@/themes/contracts";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

export default function ExplorerLayout({
  context,
  children,
}: ThemeLayoutProps) {
  const { branding } = context;
  return (
    <>
      <Header
        agencyName={branding.name}
        logo={branding.logo}
        navLinks={context.navigation}
      />
      <main className="font-sans">{children}</main>
      <Footer
        agencyName={branding.name}
        logo={branding.logo}
        footer={context.agency.footer}
      />
    </>
  );
}