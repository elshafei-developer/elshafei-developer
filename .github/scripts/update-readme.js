const fs = require("fs");
const axios = require("axios");

const username = "elshafei-developer";
const repos = ["frappe/frappe", "frappe/erpnext", "frappe/hrms"];
const token = process.env.GITHUB_TOKEN;

const headers = { Authorization: `token ${token}` };

async function fetchItems(url) {
  const res = await axios.get(url, { headers });
  return res.data.items || [];
}

async function getPRs(state) {
  const queries = repos.map(
    (repo) => `repo:${repo}+is:pr+author:${username}+state:${state}`
  );
  const all = await Promise.all(
    queries.map((q) =>
      fetchItems(`https://api.github.com/search/issues?q=${q}&sort=updated&order=desc`)
    )
  );
  return all.flat().slice(0, 5);
}

async function getIssues(state) {
  const queries = repos.map(
    (repo) => `repo:${repo}+is:issue+author:${username}+state:${state}`
  );
  const all = await Promise.all(
    queries.map((q) =>
      fetchItems(`https://api.github.com/search/issues?q=${q}&sort=updated&order=desc`)
    )
  );
  return all.flat().slice(0, 5);
}

function formatList(title, items) {
  if (!items.length) return `### ${title}\n> No items found.\n`;
  const list = items
    .map((i) => `- [${i.title}](${i.html_url}) — _${i.repository_url.split("/").slice(-2).join("/")}_)`)
    .join("\n");
  return `### ${title}\n${list}\n`;
}

async function updateReadme() {
  console.log("Fetching GitHub activity...");
  const [openPRs, mergedPRs, openIssues, closedIssues] = await Promise.all([
    getPRs("open"),
    getPRs("closed"),
    getIssues("open"),
    getIssues("closed"),
  ]);

  // تصفية الـ PRs المدموجة فقط (لأن بعض الـ closed قد تكون مغلقة بدون دمج)
  const mergedOnly = mergedPRs.filter((pr) => pr.pull_request && pr.pull_request.merged_at);

  const newSection =
    "## 🧩 Recent GitHub Activity\n\n" +
    formatList("🟢 Open Pull Requests", openPRs) +
    formatList("✅ Merged Pull Requests", mergedOnly) +
    formatList("🐞 Open Issues", openIssues) +
    formatList("🧭 Closed Issues", closedIssues) +
    "\n";

  const readme = fs.readFileSync("README.md", "utf-8");

  const updated = readme.replace(
    /## 🧩 Recent GitHub Activity[\s\S]*?(?=\n##|$)/,
    newSection
  );

  fs.writeFileSync("README.md", updated);
  console.log("README updated successfully ✅");
}

updateReadme().catch((err) => console.error("Error:", err));
