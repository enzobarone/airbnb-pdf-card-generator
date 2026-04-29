chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !/airbnb\.[a-z.]+\/rooms\//.test(tab.url)) {
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#FF5A5F", tabId: tab.id });
    return;
  }

  chrome.action.setBadgeText({ text: "", tabId: tab.id });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const data = results?.[0]?.result;
    if (!data) {
      console.error("Airbnb PDF Card: nothing extracted — Airbnb may have changed their DOM again.");
      return;
    }

    await chrome.storage.local.set({ airbnbCardData: data });
    chrome.tabs.create({ url: chrome.runtime.getURL("print.html") });

  } catch (err) {
    console.error("Airbnb PDF Card:", err);
  }
});
