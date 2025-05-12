# Strict URL Whitelist (Chrome Extension)

## Overview
Strict URL Whitelist is a Chrome extension that enforces domain-level access control by allowing navigation only to explicitly whitelisted URLs. All other network requests are blocked by default using Chrome’s `declarativeNetRequest` API. This model enables a secure, deterministic browsing environment with no UI or interaction required.

The extension does not inject scripts or modify page content. All request filtering is declarative and based on configuration stored in `chrome.storage.local`.

## Technical Architecture

### Whitelisting Mechanism
Request filtering is implemented using `chrome.declarativeNetRequest.updateDynamicRules()`. The service worker loads a persistent allowlist of domain/path pairs from `chrome.storage.local` and constructs corresponding `allow` rules. A high-priority `block` rule matches all other requests and redirects them to a blank page.

Steps:
- A persistent `block` rule denies all top-level navigation (`main_frame`) by default.
- Dynamic `allow` rules are created for each entry in the configured allowlist.
- If a request matches an allow rule, it is permitted; otherwise, it is silently blocked.
- Configuration updates take effect immediately without requiring a reload.

### Declarative Rule Structure

**Example: Allow entire domain**
```json
{
  "id": 1,
  "priority": 2,
  "action": { "type": "allow" },
  "condition": {
    "urlFilter": "*://example.com/*",
    "resourceTypes": ["main_frame"]
  }
}
```

**Example: Allow dynamic path**
```json
{
  "id": 2,
  "priority": 2,
  "action": { "type": "allow" },
  "condition": {
    "urlFilter": "*://example.com/section/*/",
    "resourceTypes": ["main_frame"]
  }
}
```

**Default block rule (applied automatically):**
```json
{
  "id": 9999,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "url": "data:text/html," }
  },
  "condition": {
    "urlFilter": "*",
    "resourceTypes": ["main_frame"]
  }
}
```

### Storage & Rule Synchronization

Allowlist configuration is managed via `chrome.storage.local`:

**Example: Add allowed entry**
```js
chrome.storage.local.set({
  allowedList: [
    { domain: "example.com", path: "section/*/" }
  ]
});
```

**Listen for changes and update rules dynamically**
```js
chrome.storage.onChanged.addListener((changes) => {
  if (changes.allowedList) {
    updateAllowRules(changes.allowedList.newValue);
  }
});
```

### Service Worker Execution

- Initializes by loading allowlist and injecting dynamic rules
- Listens for updates and applies rule changes immediately
- No UI, background page, or content scripts used

## Privacy & Compliance

- No Remote Code Execution
- No Content Script Injection
- No Analytics or User Tracking
- All configuration stays local to the device

Strict URL Whitelist is intended for restrictive environments such as kiosk deployments, testing sandboxes, or private browsing stations where only explicitly trusted URLs should be reachable.
