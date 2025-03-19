chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "startScreenRecording" && msg.streamId) {
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: msg.streamId } }
    }).then((stream) => {
      startRecording(stream);
      sendResponse({ success: true });
    }).catch((err) => {
      console.error('Ошибка захвата:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Указываем, что sendResponse будет вызван асинхронно
  }
});

function startRecording(stream) {
  window.stream = stream;
  window.recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });

  const chunks = [];
  window.recorder.ondataavailable = e => chunks.push(e.data);

  window.recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ action: "saveRecording", url });
  };

  window.recorder.start();
}
