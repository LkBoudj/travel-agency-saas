import { demoAgencyConfig } from "@/features/agency/demo-agency";
import { getActiveStorefront } from "@/themes/resolver";

export default function Home() {
  const agency = demoAgencyConfig;
  const { theme, context, settings } = getActiveStorefront(agency);
  const { HomeTemplate } = theme;

  return <HomeTemplate context={context} settings={settings} />;
}