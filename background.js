// background.js
const BLOCK_ALL_RULE_ID = 9999;

function sanitizePath(path = "") {
  return path.split("?")[0];
}

function buildQueryMatcher(query) {
  if (!query || typeof query !== "object") return "";
  return Object.entries(query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateRules(allowedList) {
  const rules = [];
  let idCounter = 1;

  for (const entry of allowedList) {
    const domain = entry.domain;
    const path = sanitizePath(entry.path || "");
    const query = entry.query || null;

    const escapedDomain = escapeRegex(domain);
    const escapedPath = escapeRegex(path);
    const queryString = buildQueryMatcher(query);

    if (queryString) {
      const strictRegex = `^https:\/\/${escapedDomain}\/${escapedPath}.*[?&]${escapeRegex(queryString)}(&.*)?$`;

      rules.push({
        id: idCounter++,
        priority: 2,
        action: { type: "allow" },
        condition: {
          regexFilter: strictRegex,
          resourceTypes: ["main_frame"]
        }
      });

      rules.push({
        id: idCounter++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: `*://${domain}/${path}*`,
          resourceTypes: ["main_frame"]
        }
      });
    } else {
      rules.push({
        id: idCounter++,
        priority: 2,
        action: { type: "allow" },
        condition: {
          urlFilter: `*://${domain}/${path}*`,
          resourceTypes: ["main_frame"]
        }
      });
    }
  }

  // Global block rule (redirect to blank page)
  rules.push({
    id: BLOCK_ALL_RULE_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: "data:text/html," }
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame"]
    }
  });

  return rules;
}

function updateDynamicRules(allowedList) {
  const rules = generateRules(allowedList);
  const ruleIds = rules.map(r => r.id);

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIds,
    addRules: rules
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Failed to update rules:", chrome.runtime.lastError);
    } else {
      console.log("Rules updated:", rules);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("allowedList", ({ allowedList = [] }) => {
    updateDynamicRules(allowedList);
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.allowedList) {
    updateDynamicRules(changes.allowedList.newValue);
  }
});
