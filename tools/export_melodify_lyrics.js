// Run this snippet in DevTools on the signed-in Melodify liked-songs page.
// First try MAX_TRACKS = 2, then use Infinity for the whole list.
// Results download as JSON. The script reads the visible player and lyrics panel.
(async () => {
  const MAX_TRACKS = 2;
  const LIKED_PATH = '/user-liked';
  const LIST_SELECTOR = '#user-liked-page';
  const ROW_SELECTOR = '[data-test-id="virtuoso-item-list"] > [data-item-index]';
  const TITLE_SELECTOR = 'p.fa-format-600-en-num';
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
  const rows = list => [...list.querySelectorAll(ROW_SELECTOR)].map(element => ({
    index: Number(element.dataset.itemIndex),
    titleElement: element.querySelector(TITLE_SELECTOR),
  })).filter(row => Number.isSafeInteger(row.index) && row.titleElement);
  const lineElements = openPanel => [...openPanel.querySelectorAll(':scope > div > div[dir]')];
  const titleVisibleInList = (titleElement, list) => {
    const title = titleElement.querySelector('span') ?? titleElement;
    const bounds = title.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    const x = (bounds.left + bounds.right) / 2;
    const y = (bounds.top + bounds.bottom) / 2;
    return y >= listBounds.top && y < listBounds.bottom
      && titleElement.contains(document.elementFromPoint(x, y));
  };
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

    const lines = await waitFor(() => {
      const elements = lineElements(openPanel);
      return elements.some(element => element.innerText.trim()) ? elements : null;
    });
    track.lines = (lines ?? []).flatMap(element =>
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
    reachedListEnd: false,
    tracks: [],
  };
  const originalScrollTop = list.scrollTop;
  const mediaThatWasPlaying = new Set(
    [...document.querySelectorAll('audio, video')].filter(media => !media.paused)
  );
  let started = false;
  try {
    await closePanel();
    list.scrollTop = 0;
    if (!await waitFor(() => rows(list).some(row => row.index === 0), 8000)) {
      throw new Error('ردیف اول فهرست پیدا نشد.');
    }

    let nextIndex = 0;
    while (nextIndex < MAX_TRACKS) {
      await closePanel();
      const row = rows(list).find(candidate => candidate.index === nextIndex);
      if (row && titleVisibleInList(row.titleElement, list)) {
        const track = {
          position: nextIndex + 1,
          title: row.titleElement.textContent.trim(),
          artist: row.titleElement.nextElementSibling?.textContent.trim() ?? '',
          lines: [],
        };
        started = true;
        track.status = await readTrack(row.titleElement, track);
        report.tracks.push(track);
        nextIndex += 1;
        console.info(`ملودیفای · ردیف ${nextIndex}`, track.title, track.status);
        continue;
      }

      const oldTop = list.scrollTop;
      const oldHeight = list.scrollHeight;
      const bottom = oldHeight - list.clientHeight;
      if (oldTop < bottom - 1) {
        // Leave some overlap so no item is skipped when the list recycles its rows.
        list.scrollTop = Math.min(bottom, oldTop + Math.floor(list.clientHeight / 2));
        await sleep(250);
        continue;
      }

      if (await waitFor(() => list.scrollHeight > oldHeight, 4500)) continue;
      const rendered = rows(list);
      const tailPadding = Number.parseFloat(list.querySelector('[data-test-id="virtuoso-item-list"]')?.style.paddingBottom);
      if (rendered.at(-1)?.index === nextIndex - 1 && tailPadding === 0) {
        report.reachedListEnd = true;
        break;
      }
      throw new Error(`ردیف ${nextIndex + 1} در دسترس نیست. خروجی تا آخرین ردیف پیوسته ذخیره می‌شود.`);
    }
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
