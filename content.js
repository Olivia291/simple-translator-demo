(function() {
  'use strict';

  let popup = null;
  let isProcessing = false;

  function createPopup() {
    if (popup) popup.remove();
    popup = document.createElement('div');
    popup.id = 'simple-translator-popup';
    popup.innerHTML = '<div class="st-header"><span class="st-word"></span><button class="st-speaker" title="朗读">🔊</button></div><div class="st-phonetic"></div><div class="st-meaning"></div>';
    document.body.appendChild(popup);
    popup.querySelector('.st-speaker').addEventListener('click', (e) => {
      e.stopPropagation();
      const word = popup.querySelector('.st-word').textContent;
      if (word) speak(word);
    });
    popup.addEventListener('click', (e) => e.stopPropagation());
    return popup;
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  function getSelectionPosition() {
    const s = window.getSelection();
    if (!s.rangeCount) return null;
    const r = s.getRangeAt(0).getBoundingClientRect();
    return { left: r.left + r.width / 2, top: r.top, bottom: r.bottom };
  }

  function isEnglishWord(text) {
    return /^[a-zA-Z]+$/.test(text) && text.length > 0 && text.length <= 50;
  }

  function showPopup(word, data) {
    const p = createPopup();
    const pos = getSelectionPosition();
    if (!pos) return;
    p.querySelector('.st-word').textContent = word;
    p.querySelector('.st-phonetic').textContent = data.phonetic || '';
    p.querySelector('.st-meaning').textContent = data.meaning || '';
    let left = pos.left - 140, top = pos.top - 130;
    if (left < 10) left = 10;
    if (left + 280 > window.innerWidth - 10) left = window.innerWidth - 290;
    if (top < 10) top = pos.bottom + 10;
    p.style.left = left + 'px';
    p.style.top = top + window.scrollY + 'px';
    p.style.display = 'block';
  }

  function hidePopup() { if (popup) popup.style.display = 'none'; }
  function removePopup() { if (popup) { popup.remove(); popup = null; } }

  async function translate(word) {
    try {
      const res = await fetch('https://dict.youdao.com/jsonapi?q=' + encodeURIComponent(word) + '&jsonversion=2');
      const data = await res.json();
      let result = { phonetic: '', meaning: '' };
      if (data.ec && data.ec.word && data.ec.word.length > 0) {
        const w = data.ec.word[0];
        result.phonetic = w.ukphone ? '/ ' + w.ukphone + ' /' : w.usphone ? '/ ' + w.usphone + ' /' : w.phone ? '/ ' + w.phone + ' /' : '';
        if (w.trs && w.trs.length > 0) {
          const m = [];
          w.trs.forEach(tr => {
            if (tr.tr && tr.tr.length > 0 && tr.tr[0].l && tr.tr[0].l.i && tr.tr[0].l.i.length > 0) {
              const meaning = tr.tr[0].l.i[0];
              if (meaning) m.push((tr.pos || '') + ' ' + meaning);
            }
          });
          result.meaning = m.slice(0, 3).join('; ');
        }
      }
      if (!result.meaning && data.ce && data.ce.word && data.ce.word.length > 0) {
        const w = data.ce.word[0];
        if (w.trs && w.trs.length > 0) result.meaning = w.trs[0];
      }
      return result;
    } catch (e) {
      return { phonetic: '', meaning: '翻译失败，请重试' };
    }
  }

  async function handleSelection() {
    if (isProcessing) return;
    const t = getSelectedText();
    if (!isEnglishWord(t)) { hidePopup(); return; }
    isProcessing = true;
    try {
      const data = await translate(t.toLowerCase());
      showPopup(t, data);
    } finally { isProcessing = false; }
  }

  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      if (isEnglishWord(getSelectedText())) handleSelection();
      else hidePopup();
    }, 10);
  });
  document.addEventListener('mousedown', (e) => { if (popup && !popup.contains(e.target)) removePopup(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') removePopup(); });
  window.addEventListener('scroll', () => removePopup(), { passive: true });
})();
