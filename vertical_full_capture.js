(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Сохраняем оригинальные стили
  const originalOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // Размеры страницы
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const totalHeight = document.documentElement.scrollHeight;

  // Создаем OffscreenCanvas
  const canvas = new OffscreenCanvas(viewportWidth, totalHeight);
  const ctx = canvas.getContext('2d');

  let currentPosition = 0;
  let yOffset = 0;
  let firstShot = true;
  const captures = [];

  // **Фильтрация `fixed` и `sticky` элементов** (будем скрывать, но не удалять)
  const getFixedElements = () => [...document.querySelectorAll('*')].filter(el => {
    const style = window.getComputedStyle(el);
    return style.position === 'fixed' || style.position === 'sticky';
  });

  // **Скрываем `fixed`/`sticky` элементы, но не удаляем их**
  const hideFixedElements = () => {
    getFixedElements().forEach(el => el.style.opacity = '0');
  };

  // **1. Первый снимок (без скролла)**
  captures.push(new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "screenshot" }, response => {
      if (response.error) {
        console.error('Ошибка скриншота:', response.error);
        resolve(null);
      } else {
        resolve({ dataUrl: response.screenshotUrl, yOffset: 0 });
      }
    });
  }));

  while (currentPosition + viewportHeight < totalHeight) {
    currentPosition += viewportHeight;
    window.scrollTo(0, currentPosition);
    await sleep(300); // Ждем обновления макета

    if (firstShot) {
      hideFixedElements(); // Скрываем `fixed`/`sticky` элементы после первого кадра
    }

    // **Скрываем `fixed` элементы на каждом шаге**, если они появляются снова
    hideFixedElements();

    captures.push(new Promise(resolve => {
      chrome.runtime.sendMessage({ action: "screenshot" }, response => {
        if (response.error) {
          console.error('Ошибка скриншота:', response.error);
          resolve(null);
        } else {
          resolve({ dataUrl: response.screenshotUrl, yOffset });
        }
      });
    }));

    yOffset += viewportHeight;
    firstShot = false;
  }

  // Восстанавливаем `fixed` элементы
  getFixedElements().forEach(el => el.style.opacity = '');

  // Ждем завершения всех скриншотов
  const results = await Promise.all(captures);

  // **Склейка в OffscreenCanvas**
  for (const result of results) {
    if (!result) continue;
    
    const img = new Image();
    img.src = result.dataUrl;
    await new Promise(res => (img.onload = res));

    const cutHeight = Math.min(viewportHeight, totalHeight - result.yOffset);
    ctx.drawImage(img, 0, result.yOffset, viewportWidth, cutHeight);
  }

  // Восстанавливаем страницу
  document.documentElement.style.overflow = originalOverflow;
  window.scrollTo(0, 0);

  // **Генерируем PNG**
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const url = URL.createObjectURL(blob);

  // **Скачивание одного файла**
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vertical_screenshot.png';
  a.click();
})();
