const BLOCK_ALL_RULE_ID = 9999;

// Optional logging toggle via chrome.storage.local.debug
function log(...args) {
  chrome.storage.local.get("debug", ({ debug }) => {
    if (debug) console.log("[STRICT-WHITELIST]", ...args);
  });
}

function updateAllowRules(allowedList) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) {
    console.error("declarativeNetRequest API unavailable.");
    return;
  }

  // Deduplicate and validate
  const unique = Array.from(
    new Map(
      allowedList
        .filter(({ domain }) => /^[a-z0-9.-]+$/i.test(domain)) // strict domain validation
        .map(item => [`${item.domain}/${item.path || "*"}`, item])
    ).values()
  );

  const allowRules = unique.map((entry, index) => {
    const { domain, path } = entry;

    const urlFilter = path
      ? `*://${domain}/${path}`
      : `*://${domain}/*`;

    return {
      id: index + 1,
      priority: 2,
      action: { type: "allow" },
      condition: {
        urlFilter,
        resourceTypes: ["main_frame"]
      }
    };
  });

  const blockAllRule = {
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
  };

  const ruleIdsToRemove = Array.from({ length: 1000 }, (_, i) => i + 1).concat(BLOCK_ALL_RULE_ID);

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIdsToRemove,
    addRules: [blockAllRule, ...allowRules]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Rule update failed:", chrome.runtime.lastError);
    } else {
      log("Rules updated:", allowRules);
    }
  });
}

chrome.storage.local.get(["allowedList", "debug"], (data) => {
  const allowedList = data.allowedList || [];
  if (typeof data.debug !== "boolean") {
    chrome.storage.local.set({ debug: false });
  }
  updateAllowRules(allowedList);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.allowedList) {
    updateAllowRules(changes.allowedList.newValue);
  }
});
