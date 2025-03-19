(async function autoScrollAndStopRecording() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const { delay } = await chrome.storage.local.get('delay') || { delay: 500 };
  const totalHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;

  let currentPosition = 0;

  while (currentPosition + viewportHeight < totalHeight) {
    currentPosition += viewportHeight / 2;
    window.scrollTo({ top: currentPosition, behavior: 'smooth' });
    await sleep(delay);
  }

  window.scrollTo({ top: totalHeight, behavior: 'smooth' });
  await sleep(delay + 500);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(delay + 500);

  // Автоматическая отправка stopRecording после завершения прокрутки
  chrome.runtime.sendMessage({ action: "stopRecording" });
})();
