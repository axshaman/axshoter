// Получаем элементы управления
const delayInput = document.getElementById('scrollDelay');
const delayValue = document.getElementById('delayValue');
const videoQuality = document.getElementById('videoQuality');

// Обновление отображаемого значения задержки
delayInput?.addEventListener('input', () => delayValue.textContent = delayInput.value);

// Переменные для записи экрана
let recorder = null;
let chunks = [];
let stream = null;

document.getElementById('startScreenRec').onclick = () => {
  chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"], async (streamId) => {
    if (!streamId) {
      alert('Recording cancelled.');
      return;
    }

    try {
      // Запрашиваем поток с экрана, окна или вкладки
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      });

      // Получаем сохраненное качество видео
      chrome.storage.local.get('bitrate', ({ bitrate }) => {
        chunks = [];
        recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: bitrate || 1500000 // 1.5 Mbps по умолчанию
        });

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({ url, filename: 'screen_recording.webm' });
        };

        recorder.start();
      });

    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
};

// Остановка записи экрана
document.getElementById('stopRecording').onclick = () => {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

// Запуск скринкаста с записью видео
document.getElementById('startScreencast')?.addEventListener('click', () => {
  chrome.storage.local.set({
    delay: parseInt(delayInput.value),
    bitrate: parseInt(videoQuality.value)
  }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length === 0) return;
      
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["scroller.js"]
      });

      chrome.tabCapture.capture({ audio: false, video: true }, (capturedStream) => {
        if (!capturedStream) return alert('Capture failed: ' + chrome.runtime.lastError.message);

        chunks = [];
        recorder = new MediaRecorder(capturedStream, { mimeType: 'video/webm' });

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({ url, filename: 'autoscreencast.webm' });
        };

        recorder.start();

        chrome.runtime.onMessage.addListener(msg => {
          if (msg.action === "stopRecording" && recorder.state !== "inactive") {
            recorder.stop();
            capturedStream.getTracks().forEach(track => track.stop());
          }
        });
      });
    });
  });
});

// Остановка скринкаста
document.getElementById('stopScreencast')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "stopScreencast" });
});

// Функция начала записи экрана
function startRecording(capturedStream) {
  if (!capturedStream) return alert('Capture failed.');

  stream = capturedStream;
  chunks = [];

  chrome.storage.local.get('bitrate', ({ bitrate }) => {
    recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp8',
      videoBitsPerSecond: bitrate || 1500000
    });

    recorder.ondataavailable = e => chunks.push(e.data);
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: 'axshoter_recording.webm' });
    };

    recorder.start();

    chrome.runtime.onMessage.addListener(msg => {
      if (msg.action === "stopRecording" && recorder.state !== 'inactive') {
        recorder.stop();
        stream.getTracks().forEach(t => t.stop());
      }
    });
  });
}

// Запуск логирования активности
document.getElementById('startLogging')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["activity_logger.js"]
    });
  });
});

// Остановка логирования активности
document.getElementById('stopLogging')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: "stopLogging" }, () => {
      if (chrome.runtime.lastError) {
        alert('Activity logging was not started.');
      }
    });
  });
});

// Сделать стандартный скриншот
document.getElementById('standardScreenshot')?.addEventListener('click', () => {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
    if (!dataUrl) return alert('Failed to capture screenshot.');
    chrome.downloads.download({ url: dataUrl, filename: 'standard_screenshot.png' });
  });
});

// Сделать вертикальный скриншот
document.getElementById('verticalScreenshot')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["vertical_full_capture.js"]
    });
  });
});
