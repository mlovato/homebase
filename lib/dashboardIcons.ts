const DASHBOARD_ICONS_CDN =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";

/** The formats dashboard-icons publishes, each in a directory of its own. */
export type DashboardIconFormat = "svg" | "png";

export function dashboardIconUrl(
  name: string,
  format: DashboardIconFormat = "svg",
): string {
  return `${DASHBOARD_ICONS_CDN}/${format}/${name}.${format}`;
}

/**
 * Every file a slug may be published as, in the order to try them: its SVG,
 * the light and dark SVG variants, then the PNG — about a quarter of the
 * icons are published only as PNG.
 */
export function dashboardIconSources(slug: string): string[] {
  return [
    dashboardIconUrl(slug),
    dashboardIconUrl(`${slug}-light`),
    dashboardIconUrl(`${slug}-dark`),
    dashboardIconUrl(slug, "png"),
  ];
}
