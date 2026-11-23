/**
 * Extracts normalized App Store, Google Play, and Website URLs for a project.
 * Also auto-detects store URLs if pasted into liveUrl.
 */
export function getProjectStoreLinks(project) {
  if (!project) {
    return { appStoreUrl: "", playStoreUrl: "", websiteUrl: "" };
  }

  let appStoreUrl = (project.appStoreUrl || "").trim();
  let playStoreUrl = (project.playStoreUrl || "").trim();
  let websiteUrl = (project.liveUrl || "").trim();

  if (websiteUrl) {
    if (/apps\.apple\.com/i.test(websiteUrl)) {
      if (!appStoreUrl) appStoreUrl = websiteUrl;
      websiteUrl = "";
    } else if (/play\.google\.com/i.test(websiteUrl)) {
      if (!playStoreUrl) playStoreUrl = websiteUrl;
      websiteUrl = "";
    }
  }

  return { appStoreUrl, playStoreUrl, websiteUrl };
}
