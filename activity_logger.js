if (!window.axshoterActivityLoggingStarted) {
  window.axshoterActivityLoggingStarted = true;
  window.activityLog = '';

  const logEvent = e => {
    activityLog += `[${new Date().toISOString()}] ${e.type}: ${e.key || e.button || e.clipboardData?.getData('text')}\n`;
  };

  ['click', 'mousemove', 'keydown', 'paste'].forEach(event =>
    document.addEventListener(event, logEvent)
  );

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "stopLogging") {
      ['click', 'mousemove', 'keydown', 'paste'].forEach(event =>
        document.removeEventListener(event, logEvent)
      );
      const blob = new Blob([activityLog], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_log_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.axshoterActivityLoggingStarted = false;
      window.activityLog = '';
    }
  });
}
