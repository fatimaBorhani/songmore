// Run this snippet in DevTools on the signed-in Melodify liked-songs page.
// First try MAX_TRACKS = 2, then use Infinity for the whole list.
// Results download as JSON. The script reads the visible player and lyrics panel.
(async () => {
  const MAX_TRACKS = 2;
  const LIKED_PATH = '/user-liked';
  const LIST_SELECTOR = '#user-liked-page';
  const TITLE_SELECTOR = '.infinite-scroll-component p.fa-format-600-en-num';
  const PANEL_SELECTOR = 'div.overflow-scroll.pt-r144';
  const CLOSE_SELECTOR = ':scope > div.cursor-pointer > div.cursor-pointer';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function waitFor(find, timeout = 5000) {
    const deadline = Date.now() + timeout;
    do {
      const value = find();
      if (value) return value;
      await sleep(150);
    } while (Date.now() < deadline);
    return null;
  }

  const visible = element =>
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  const panel = () => [...document.querySelectorAll(PANEL_SELECTOR)].find(visible);
  const titles = () => [...document.querySelectorAll(TITLE_SELECTOR)].filter(visible);
  const lyricButton = () => [...document.querySelectorAll('span')].find(element =>
    element.textContent.trim() === 'متن آهنگ' && visible(element)
  );
  function isSelected(title) {
    return title.classList.contains('text-yellow');
  }

  async function closePanel() {
    const openPanel = panel();
    if (!openPanel) return;
    const close = openPanel.querySelector(CLOSE_SELECTOR);
    if (!close) throw new Error('دکمهٔ بستن پنل متن پیدا نشد.');
    close.click();
    if (!await waitFor(() => !panel())) throw new Error('پنل متن بسته نشد.');
  }

  async function loadTitles(list) {
    if (!await waitFor(() => titles().length, 8000)) {
      throw new Error('فهرست لایک‌ها خالی است یا ساختار صفحه عوض شده.');
    }
    // The page requests more items when its scroll container reaches the end.
    for (let page = 0; page < 80; page += 1) {
      const count = titles().length;
      if (count >= MAX_TRACKS) return true;
      list.scrollTop = 0;
      await sleep(200);
      list.scrollTop = list.scrollHeight;
      if (!await waitFor(() => titles().length > count, 4500)) return true;
    }
    return false;
  }

  async function readTrack(titleElement, track) {
    if (!isSelected(titleElement)) titleElement.click();
    if (!await waitFor(() => isSelected(titleElement))) return 'track_not_selected';

    // Give the player a moment to replace the previous track's controls.
    await sleep(500);
    const button = await waitFor(lyricButton);
    if (!button) return 'lyrics_button_not_found';
    button.click();

    const openPanel = await waitFor(() => {
      const candidate = panel();
      return candidate?.querySelector(':scope > p')?.textContent.trim() === track.title
        ? candidate
        : null;
    });
    if (!openPanel) return 'lyrics_panel_not_confirmed';

    const lineElements = [...openPanel.querySelectorAll(':scope > div > div[dir]')];
    track.lines = lineElements.flatMap(element =>
      element.innerText.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
    );
    return track.lines.length ? 'ok' : 'unrecognized_or_empty_lyrics';
  }

  function download(report) {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'melodify-liked-lyrics.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 30000);
  }

  if (location.origin !== 'https://desktop.melodify.app' || location.pathname !== LIKED_PATH) {
    console.error('اسکریپت را در صفحهٔ «لایک شده‌ها» در ملودیفای اجرا کن.');
    return;
  }

  const list = document.querySelector(LIST_SELECTOR);
  if (!list) {
    console.error('صبر کن فهرست آهنگ‌ها کامل نمایش داده شود، بعد دوباره اجرا کن.');
    return;
  }

  const report = {
    source: location.origin + LIKED_PATH,
    exportedAt: new Date().toISOString(),
    scope: Number.isFinite(MAX_TRACKS) ? 'sample' : 'liked',
    listStoppedGrowing: false,
    processedAllLoaded: false,
    tracks: [],
  };
  const originalScrollTop = list.scrollTop;
  const mediaThatWasPlaying = new Set(
    [...document.querySelectorAll('audio, video')].filter(media => !media.paused)
  );
  let started = false;
  try {
    await closePanel();
    const finishedLoading = await loadTitles(list);
    report.listStoppedGrowing = report.scope === 'liked' && finishedLoading;
    const loadedTitles = titles();
    const selectedTitles = loadedTitles.slice(0, MAX_TRACKS);
    for (const titleElement of selectedTitles) {
      await closePanel();
      const track = {
        title: titleElement.textContent.trim(),
        artist: titleElement.nextElementSibling?.textContent.trim() ?? '',
        lines: [],
      };
      started = true;
      track.status = await readTrack(titleElement, track);
      report.tracks.push(track);
      console.info(`ملودیفای ${report.tracks.length}/${selectedTitles.length}`, track.title, track.status);
    }
    report.processedAllLoaded = report.tracks.length === loadedTitles.length;
  } catch (error) {
    report.interrupted = error.message;
    console.error('استخراج متوقف شد.', error.message);
  } finally {
    if (started) {
      for (const media of document.querySelectorAll('audio, video')) {
        if (!mediaThatWasPlaying.has(media)) media.pause();
      }
    }
    list.scrollTop = originalScrollTop;
    if (report.tracks.length) {
      download(report);
      console.info('متن ذخیره‌شده', report.tracks.filter(track => track.status === 'ok').length);
    }
  }
})();
