// Source privacy and an approved public website are separate properties.
// This does not discover repositories or grant publication authority.
export function privateSourceIssues(project) {
  if (project.sourceVisibility !== "private") return [];
  const issues = [];
  if (project.githubUrl || project.repositories?.length || project.documentationUrl || project.documentationLinks?.length) issues.push("PRIVATE_SOURCE_LINK");
  if (project.openSource) issues.push("PRIVATE_SOURCE_MARKED_OPEN");
  const liveUrls = project.liveUrls || [];
  const safeSurface = (value) => {
    try {
      const url = new URL(value);
      const sourceHost = /(^|\.)(github\.com|githubusercontent\.com|github\.io|gitlab\.com|bitbucket\.org)$/.test(url.hostname);
      return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && !url.port && !sourceHost;
    } catch { return false; }
  };
  if (liveUrls.some((url) => !safeSurface(url)) || (project.liveUrl && (!liveUrls.includes(project.liveUrl) || !safeSurface(project.liveUrl)))) issues.push("INVALID_PRIVATE_PROJECT_SURFACE");
  // Evidence can refer only to an explicitly approved live URL, never a source
  // or document link smuggled into the evidence collection.
  if ((project.evidenceLinks || []).some((item) => !liveUrls.includes(item?.url) || !safeSurface(item.url))) issues.push("UNAPPROVED_PRIVATE_PROJECT_EVIDENCE");
  return issues;
}
