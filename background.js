chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startScreenSharing") {
    chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"], sender.tab, (streamId) => {
      if (!streamId) {
        sendResponse({ success: false, error: "Выбор экрана отменен пользователем." });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          sendResponse({ success: false, error: "Нет активной вкладки для отправки сообщения." });
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { action: "startScreenRecording", streamId }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            sendResponse({ success: false, error: "Ошибка при передаче потока в контентный скрипт." });
          } else {
            sendResponse({ success: true });
          }
        });
      });
    });
    return true; // Указываем, что `sendResponse` будет вызван асинхронно
  }
  if (request.action === "screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, dataUrl => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ screenshotUrl: dataUrl });
      }
    });
    return true; // Указываем, что ответ будет передан асинхронно
  }
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;
    const tabId = tabs[0].id;

    switch (command) {
      case 'start_screencast':
        chrome.scripting.executeScript({ target: { tabId }, files: ["scroller.js"] });
        break;

      case 'start_screen_recording':
        chrome.tabs.sendMessage(tabId, { action: "startScreenSharing" });
        break;

      case 'stop_screen_recording':
        chrome.tabs.sendMessage(tabId, { action: "stopRecording" });
        break;

      case 'vertical_screenshot':
        chrome.scripting.executeScript({ target: { tabId }, files: ["vertical_full_capture.js"] });
        break;
    }
  });
});

