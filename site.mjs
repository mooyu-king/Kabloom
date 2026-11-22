import { compareScores } from './scores.mjs';

const find = selector => document.querySelector(selector);
const canonical = 'https://kabloom.cc/';
const track = (name, properties = {}) => {
  if (location.hostname !== 'kabloom.cc') return;
  try {
    window.plausible?.(name, { props: properties });
  } catch {
    // 统计失败时，访客操作继续。
  }
};

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const status = dialog.querySelector('[role=status]');
    try {
      await navigator.clipboard.writeText(canonical);
      status.textContent = 'Site link copied.';
      if (dialog.id === 'install-dialog') track('PWA Link Copied');
    } catch {
      const field = dialog.querySelector('.share-field');
      field.hidden = false;
      field.querySelector('input').focus();
      field.querySelector('input').select();
      status.textContent = 'Select and copy the site link.';
    }
  });
}

const installDialog = find('#install-dialog');
const nativeInstall = find('#native-install');
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  nativeInstall.hidden = false;
  track('PWA Install Available');
});
find('[data-install]').addEventListener('click', () => {
  installDialog.showModal();
  track('PWA Install Click');
  if (!installPrompt) track('PWA Install Help');
});
nativeInstall.addEventListener('click', async () => {
  const prompt = installPrompt;
  if (!prompt) return;
  installPrompt = null;
  nativeInstall.disabled = true;
  const status = installDialog.querySelector('[role=status]');
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') status.textContent = 'Installation accepted.';
    track('PWA Install Result', { outcome: choice.outcome });
  } catch {
    status.textContent = 'Use your browser menu to install.';
    track('PWA Install Result', { outcome: 'unavailable' });
  } finally {
    const hadFocus = document.activeElement === nativeInstall;
    nativeInstall.hidden = !installPrompt;
    nativeInstall.disabled = false;
    if (hadFocus && nativeInstall.hidden) installDialog.querySelector('[data-copy]').focus();
  }
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  nativeInstall.hidden = true;
  installDialog.querySelector('[role=status]').textContent = 'Kabloom is installed.';
  track('PWA Installed');
});
const display = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'standalone' : 'browser';
window.addEventListener('load', () => {
  track('PWA Page View', { display });
  try {
    if (!sessionStorage.getItem('kabloom-visit')) {
      sessionStorage.setItem('kabloom-visit', '1');
      track('PWA Session', { display });
    }
  } catch {
    // 浏览器可能关闭会话存储。
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => track('PWA Service Worker Error'));
  }
}, { once: true });

const player = find('#player');
if (player) {
  const viewport = find('#game-viewport');
  const launch = find('#launch');
  const cover = find('#launch-cover');
  const close = find('#close-game');
  const fullscreen = find('#fullscreen');
  const status = find('#player-status');
  const external = player.querySelector('a[target="_blank"]');
  let frame;
  let timeout;

  const setStatus = message => {
    status.hidden = !message;
    status.textContent = message;
  };
  launch.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (frame) return;
    if (!navigator.onLine) {
      setStatus('You’re offline. Reconnect and choose Play Free to try again.');
      return;
    }
    const nextFrame = document.createElement('iframe');
    nextFrame.title = 'Crowdict Draft — Sky Climb';
    nextFrame.allow = 'fullscreen';
    nextFrame.allowFullscreen = true;
    nextFrame.referrerPolicy = 'strict-origin-when-cross-origin';
    nextFrame.addEventListener('load', () => {
      if (frame !== nextFrame) return;
      clearTimeout(timeout);
      setStatus('');
    }, { once: true });
    nextFrame.addEventListener('error', () => {
      if (frame !== nextFrame) return;
      clearTimeout(timeout);
      setStatus('The game could not be opened. Try the new-tab button or close the game to retry.');
    }, { once: true });
    frame = nextFrame;
    nextFrame.src = viewport.dataset.playerUrl;
    setStatus('Opening the game…');
    timeout = setTimeout(() => setStatus('Still opening the game. If the frame stays blank, use the new-tab button.'), 12000);
    cover.hidden = true;
    close.hidden = false;
    viewport.append(frame);
    frame.focus();
  });
  close.addEventListener('click', () => {
    if (!frame || !window.confirm('Close the game? Your current round may be lost.')) return;
    clearTimeout(timeout);
    frame.remove();
    frame = null;
    close.hidden = true;
    cover.hidden = false;
    setStatus('');
    launch.focus();
  });
  if (document.fullscreenEnabled && player.requestFullscreen) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await player.requestFullscreen();
      } catch {
        setStatus('Fullscreen is unavailable. Use the new-tab button for more room.');
        external.focus();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const active = document.fullscreenElement === player;
      const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
      fullscreen.setAttribute('aria-pressed', String(active));
      fullscreen.setAttribute('aria-label', label);
      fullscreen.title = label;
      fullscreen.querySelector('path').setAttribute('d', active ? 'M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5' : 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5');
    });
  }

  const save = find('#save');
  const saveStatus = find('#save-status');
  function displaySaved(saved) {
    save.setAttribute('aria-pressed', String(saved));
    const label = saved ? 'Remove saved page' : 'Save page';
    save.setAttribute('aria-label', label);
    save.title = label;
    saveStatus.textContent = saved ? 'Saved on this browser' : '';
  }
  try {
    displaySaved(localStorage.getItem('kabloom-saved') === 'yes');
  } catch {
    displaySaved(false);
  }
  save.hidden = false;
  save.addEventListener('click', () => {
    const saved = save.getAttribute('aria-pressed') === 'true';
    try {
      if (saved) localStorage.removeItem('kabloom-saved');
      else localStorage.setItem('kabloom-saved', 'yes');
      displaySaved(!saved);
      if (saved) saveStatus.textContent = 'Removed from saved';
    } catch {
      saveStatus.textContent = 'Browser storage is unavailable.';
    }
  });

  const share = find('#share');
  share.hidden = false;
  share.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kabloom Sky Climb', url: canonical });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    const dialog = find('#share-dialog');
    if (!dialog.open) dialog.showModal();
  });

  for (const link of document.querySelectorAll('[data-art]')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const dialog = find('#art-dialog');
      const fullImage = dialog.querySelector('img');
      fullImage.src = link.href;
      fullImage.alt = link.querySelector('img').alt;
      dialog.showModal();
    });
  }

  const scoreForm = find('#score-form');
  const updateScore = () => {
    const scores = compareScores(Number(scoreForm.elements.first.value), Number(scoreForm.elements.second.value));
    find('[data-forward]').textContent = scores.forward;
    find('[data-reverse]').textContent = scores.reverse;
  };
  scoreForm.addEventListener('change', updateScore);
  scoreForm.addEventListener('reset', () => requestAnimationFrame(updateScore));
}

for(const button of document.querySelectorAll('[data-pause-updates]'))button.addEventListener('click',()=>{const ticker=button.closest('.medical-updates');const paused=ticker.dataset.paused!=='true';ticker.dataset.paused=String(paused);button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Resume updates':'Pause updates');button.title=paused?'Resume updates':'Pause updates';button.textContent=paused?'▶':'Ⅱ'});

// 保留原生 details 的触屏与键盘切换，补齐浮层退出行为。
for (const menu of document.querySelectorAll('.medical-more')) {
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
      event.preventDefault();
    }
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
}
