(() => {
  let isActive = false;
  let floatBtn = null;
  let popupHost = null;
  let currentWord = null;
  let currentContext = null;
  let currentRect = null;

  // Load CSS text for Shadow DOM injection
  let cssText = null;
  fetch(chrome.runtime.getURL('src/content/popup.css'))
    .then(r => r.text())
    .then(t => { cssText = t; });

  chrome.runtime.sendMessage({ type: 'GET_ACTIVE_STATE' })
    .then(res => { isActive = res?.active || false; })
    .catch(() => {});

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ACTIVE_STATE_CHANGED') {
      isActive = message.active;
      if (!isActive) dismissAll();
    }
  });

  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') dismissAll(); });

  function onMouseDown(e) {
    if (floatBtn && !floatBtn.contains(e.target)) dismissFloat();
    if (popupHost && !popupHost.contains(e.target) && !(floatBtn && floatBtn.contains(e.target))) dismissPopup();
  }

  function onMouseUp(e) {
    if (!isActive) return;
    if (floatBtn && floatBtn.contains(e.target)) return;
    if (popupHost && popupHost.contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text || text.length < 2 || text.length > 80 || text.split(/\s+/).length > 6) {
        dismissFloat();
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      currentWord = text;
      currentContext = getContextSentence(range);
      currentRect = rect;
      showFloatButton(rect);
    }, 100);
  }

  // Detect how much position:fixed is offset by a CSS transform on an ancestor.
  // On sites like SVT.se the <body> (or a wrapper) has transform applied, which makes
  // position:fixed elements positioned relative to that ancestor instead of the viewport.
  // We probe by inserting a hidden element at top:0/left:0 and reading where it actually lands.
  function getTransformOffset() {
    const probe = document.createElement('div');
    Object.assign(probe.style, {
      position: 'fixed', top: '0px', left: '0px',
      width: '0px', height: '0px', visibility: 'hidden', pointerEvents: 'none',
    });
    document.body.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return { x: r.left, y: r.top };
  }

  function startDrag(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const off = getTransformOffset(); // calculate once; reuse throughout the drag
    const x0 = e.clientX, y0 = e.clientY;
    const l0 = parseFloat(popupHost.style.left) + off.x; // current viewport left
    const t0 = parseFloat(popupHost.style.top) + off.y;  // current viewport top
    document.body.style.userSelect = 'none';
    function onMove(ev) {
      if (!popupHost) return;
      const vpX = Math.max(8, Math.min(l0 + ev.clientX - x0, window.innerWidth - 308 - 8));
      const vpY = Math.max(8, Math.min(t0 + ev.clientY - y0, window.innerHeight - 40));
      popupHost.style.left = (vpX - off.x) + 'px';
      popupHost.style.top  = (vpY - off.y) + 'px';
    }
    function onUp() {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function showFloatButton(rect) {
    dismissFloat();

    floatBtn = document.createElement('div');
    floatBtn.id = 'nysta-float-btn';

    const offset = getTransformOffset();
    // Desired viewport positions, converted to the fixed-position coordinate space.
    const left = rect.left + rect.width / 2 - offset.x;
    const top = rect.top - 40 - offset.y;

    Object.assign(floatBtn.style, {
      position: 'fixed',
      left: left + 'px',
      top: top + 'px',
      transform: 'translateX(-50%)',
      background: '#1a1a1a',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '5px 12px',
      borderRadius: '20px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      zIndex: '2147483646',
      userSelect: 'none',
      lineHeight: '1.4',
    });

    floatBtn.innerHTML = '<span style="font-size:11px">🧵</span> Explain with Nysta';

    floatBtn.addEventListener('click', e => {
      e.stopPropagation();
      console.log('[Nysta] Float button clicked, word:', currentWord);
      // Get the button's position at click time — more reliable than stored rect
      const btnRect = floatBtn.getBoundingClientRect();
      const clickRect = {
        left: btnRect.left,
        right: btnRect.right,
        top: btnRect.bottom + 4,
        bottom: btnRect.bottom + 4,
      };
      dismissFloat();
      showPopup(currentWord, clickRect, currentContext);
    });

    document.body.appendChild(floatBtn);

    requestAnimationFrame(() => {
      if (!floatBtn) return;
      const br = floatBtn.getBoundingClientRect(); // actual viewport coords
      const off = getTransformOffset();
      // br values are viewport coords; CSS values must account for the offset.
      if (br.left < 8) { floatBtn.style.left = (8 - off.x) + 'px'; floatBtn.style.transform = 'none'; }
      if (br.right > window.innerWidth - 8) { floatBtn.style.left = (window.innerWidth - br.width - 8 - off.x) + 'px'; floatBtn.style.transform = 'none'; }
      if (br.top < 8) floatBtn.style.top = (rect.bottom + 8 - off.y) + 'px';
    });
  }

  function showPopup(word, rect, contextSentence) {
    dismissPopup();

    // Create host element
    popupHost = document.createElement('div');
    popupHost.id = 'nysta-popup-host';

    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    const popWidth = 308;
    const popMaxHeight = Math.min(380, vpHeight - 32);

    // Horizontal: align to button, clamped
    let popLeft = Math.max(8, Math.min(rect.left, vpWidth - popWidth - 8));

    // Vertical: try below button first
    let popTop = rect.bottom + 8;
    // If it would go off the bottom, show above instead
    if (popTop + popMaxHeight > vpHeight - 8) {
      popTop = rect.top - popMaxHeight - 8;
    }
    // Final clamp — never go above 8px from top
    popTop = Math.max(8, popTop);

    Object.assign(popupHost.style, {
      position: 'fixed',
      left: popLeft + 'px',
      top: popTop + 'px',
      zIndex: '2147483647',
      width: popWidth + 'px',
      maxHeight: popMaxHeight + 'px',
      overflowY: 'auto',
      overflowX: 'hidden',
    });

    // Attach Shadow DOM — completely isolated from page styles
    const shadow = popupHost.attachShadow({ mode: 'open' });

    // Drag-to-move: mousedown on the header area starts a drag
    shadow.addEventListener('mousedown', e => {
      if (!e.target.closest('.nysta-header') || e.target.closest('.nysta-close-btn')) return;
      startDrag(e);
    });
    // Close button
    shadow.addEventListener('click', e => {
      if (e.target.closest('.nysta-close-btn')) dismissPopup();
    });

    // Inject our CSS into the shadow root
    const style = document.createElement('style');
    style.textContent = cssText || '';
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = getLoadingHTML(word);
    shadow.appendChild(container);

    document.body.appendChild(popupHost);
    repositionPopup(rect);

    // Wake the service worker first — it may be sleeping
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_STATE' }).catch(() => {});

    const messageTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('No response from extension — try reloading the page')), 25000)
    );

    Promise.race([
      chrome.runtime.sendMessage({ type: 'LOOKUP', word, contextSentence }),
      messageTimeout
    ])
      .then(data => {
        if (!popupHost || currentWord !== word) return;
        if (data.error === 'NO_API_KEY') { container.innerHTML = getNoApiKeyHTML(); return; }
        if (data.error) { container.innerHTML = getErrorHTML(data.error); return; }
        container.innerHTML = getPopupHTML(data, word, contextSentence);
        attachPopupEvents(shadow, container, data, word, contextSentence);
        repositionPopup(rect);
      })
      .catch(err => {
        console.error('[Nysta] Lookup error:', err);
        if (container) container.innerHTML = getErrorHTML(err.message);
      });
  }

  function repositionPopup(rect) {
    if (!popupHost) return;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    const off = getTransformOffset();

    // Clamp horizontal position (viewport coords → CSS coords)
    const vpLeft = Math.max(8, Math.min(rect.left, vpWidth - 308 - 8));
    popupHost.style.left = (vpLeft - off.x) + 'px';

    // Initial vertical: try below the anchor
    popupHost.style.top = (rect.bottom + 12 - off.y) + 'px';

    requestAnimationFrame(() => {
      if (!popupHost) return;
      const pr = popupHost.getBoundingClientRect(); // actual viewport coords

      if (pr.bottom > vpHeight - 8) {
        const aboveTop = rect.top - pr.height - 12;
        if (aboveTop >= 8) {
          // Fits cleanly above
          popupHost.style.top = (aboveTop - off.y) + 'px';
        } else {
          // Neither fits: pin to top edge and shrink to available height
          popupHost.style.top = (8 - off.y) + 'px';
          popupHost.style.maxHeight = (vpHeight - 16) + 'px';
        }
      }
    });
  }

  function dismissFloat() { if (floatBtn) { floatBtn.remove(); floatBtn = null; } }
  function dismissPopup() { if (popupHost) { popupHost.remove(); popupHost = null; } }
  function dismissAll() { dismissFloat(); dismissPopup(); currentWord = null; }

  function getContextSentence(range) {
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const text = el.innerText || el.textContent || '';
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    const selected = range.toString().trim();
    for (const s of sentences) { if (s.includes(selected)) return s.trim().slice(0, 300); }
    return text.trim().slice(0, 300);
  }

  function attachPopupEvents(shadow, container, data, word, contextSentence) {
    // Position tooltips on hover so they don't overflow
    shadow.querySelectorAll('.nysta-qmark').forEach(qmark => {
      const tip = qmark.querySelector('.nysta-tooltip');
      if (!tip) return;
      qmark.addEventListener('mouseenter', () => {
        const r = qmark.getBoundingClientRect(); // viewport coords
        const vpWidth = window.innerWidth;
        const off = getTransformOffset();
        let vpLeft = r.right + 6;
        if (vpLeft + 210 > vpWidth - 8) vpLeft = r.left - 216;
        vpLeft = Math.max(8, vpLeft);
        const vpTop = Math.max(8, r.top - 4);
        tip.style.left = (vpLeft - off.x) + 'px';
        tip.style.top = (vpTop - off.y) + 'px';
      });
    });

    shadow.querySelector('.nysta-acc-header')?.addEventListener('click', function () {
      const body = this.nextElementSibling;
      const chevron = this.querySelector('.nysta-acc-chevron');
      const open = body.classList.toggle('open');
      chevron.style.transform = open ? 'rotate(90deg)' : '';
    });

    const saveBtn = shadow.querySelector('#nysta-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (saveBtn.dataset.status === 'saved' || saveBtn.dataset.status === 'known') return;
        const entry = {
          word: data.word || word, pos: data.pos,
          definition: data.definition_sv || data.definition_en || '',
          definition_en: data.definition_en || '',
          contextSentence, sourceUrl: location.href, sourceDomain: location.hostname
        };
        const result = await chrome.runtime.sendMessage({ type: 'SAVE_WORD', entry });
        saveBtn.textContent = result.alreadySaved ? 'already saved' : '✓ saved';
        saveBtn.dataset.status = 'saved';
        saveBtn.style.opacity = '0.6';
        saveBtn.style.cursor = 'default';
      });
    }

    const translateBtn = shadow.querySelector('#nysta-translate');
    if (translateBtn) {
      let visible = false, tlData = null;
      const tlBlock = shadow.querySelector('#nysta-translation');

      translateBtn.addEventListener('click', async () => {
        if (visible) {
          tlBlock.style.display = 'none'; visible = false;
          translateBtn.textContent = 'translate →'; translateBtn.style.opacity = '1';
          return;
        }
        if (tlData) {
          tlBlock.style.display = 'block'; visible = true;
          translateBtn.textContent = 'translated ✓'; translateBtn.style.opacity = '0.6';
          return;
        }
        translateBtn.textContent = '…'; translateBtn.disabled = true;
        try {
          tlData = await chrome.runtime.sendMessage({ type: 'TRANSLATE', word, contextSentence });
          const alt = tlData.alternatives?.length ? ' / ' + tlData.alternatives.join(' / ') : '';
          tlBlock.innerHTML = `
            <p class="nysta-tl-label">translation</p>
            <p class="nysta-tl-word">${esc(tlData.translation)}${esc(alt)}</p>
            <p class="nysta-tl-ctx">"…${esc(tlData.contextPhrase || '')}…"</p>
            ${tlData.nuanceNote ? `<p class="nysta-tl-note">${esc(tlData.nuanceNote)}</p>` : ''}
          `;
          tlBlock.style.display = 'block'; visible = true;
          translateBtn.textContent = 'translated ✓'; translateBtn.disabled = false; translateBtn.style.opacity = '0.6';
        } catch {
          translateBtn.textContent = 'error — retry'; translateBtn.disabled = false;
        }
      });
    }
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const CLOSE_BTN = '<button class="nysta-close-btn" aria-label="Close">&#x2715;</button>';

  function getLoadingHTML(word) {
    return `<div class="nysta-card">
      <div class="nysta-header">
        <p class="nysta-word">${esc(word)}</p>
        ${CLOSE_BTN}
      </div>
      <div class="nysta-skeleton-line" style="width:60%;margin-top:10px"></div>
      <div class="nysta-skeleton-line" style="width:90%;margin-top:6px"></div>
      <div class="nysta-skeleton-line" style="width:75%;margin-top:6px"></div>
      <div class="nysta-skeleton-line" style="width:85%;margin-top:6px"></div>
      <div class="nysta-thread-anim"></div>
      <p class="nysta-loading">pulling the thread…</p>
    </div>`;
  }
  function getNoApiKeyHTML() {
    return `<div class="nysta-card"><div class="nysta-header"><p class="nysta-word">Nysta</p>${CLOSE_BTN}</div><p class="nysta-error">No API key — open settings to add one.</p></div>`;
  }
  function getErrorHTML(msg) {
    return `<div class="nysta-card"><div class="nysta-header">${CLOSE_BTN}</div><p class="nysta-error">Something went wrong: ${esc(msg)}</p></div>`;
  }

  function getPopupHTML(data, word, contextSentence) {
    const { pos, register, definition_sv, definition_en, exampleSentences=[], wordFormation,
      isComposite, synonyms=[], otherMeanings=[], enEtt, declensionGroup, verbGroup,
      forms={}, wordStatus, commonPhrases=[], relatedForms=[] } = data;

    const statusLabel = wordStatus === 'known'
      ? `<span class="nysta-status-badge nysta-badge-known">✓ known</span>`
      : wordStatus === 'saved' ? `<span class="nysta-status-badge nysta-badge-saved">saved</span>` : '';
    const saveLabel = wordStatus === 'known' ? '✓ known' : wordStatus === 'saved' ? '✓ saved' : '+ save word';
    const saveDisabled = (wordStatus === 'known' || wordStatus === 'saved') ? 'style="opacity:0.6;cursor:default"' : '';
    const regTag = register && register !== 'neutral' && register !== 'null'
      ? `<span class="nysta-tag nysta-tag-reg">${esc(register)}</span>` : '';
    const showWf = isComposite && wordFormation;
    const qf = buildQuickFacts(pos, enEtt, declensionGroup, verbGroup, forms);
    const acc = buildAccordionBody(pos, forms, commonPhrases, relatedForms);

    return `<div class="nysta-card">
      <div class="nysta-header">
        <p class="nysta-word">${esc(data.word||word)}</p>${statusLabel}
        ${CLOSE_BTN}
      </div>
      <div class="nysta-meta">
        <span class="nysta-tag nysta-tag-pos">${esc(pos||'')}</span>${regTag}
      </div>
      <p class="nysta-context-note">likely meaning in this context</p>
      <p class="nysta-def-sv">${esc(definition_sv||'')}</p>
      ${definition_en ? `<p class="nysta-def-en">${esc(definition_en)}</p>` : ''}
      ${exampleSentences.map(e=>`<p class="nysta-example">${esc(e)}</p>`).join('')}
      <div id="nysta-translation" style="display:none" class="nysta-translation-block"></div>
      ${showWf ? `<hr class="nysta-divider"><p class="nysta-section-label">word formation</p><p class="nysta-etym">${esc(wordFormation)}</p>` : ''}
      ${synonyms.length ? `<hr class="nysta-divider"><p class="nysta-section-label">synonyms</p><div class="nysta-synonym-row">${synonyms.map(s=>`<span class="nysta-synonym">${esc(s)}</span>`).join('')}</div>` : ''}
      ${otherMeanings.length ? `<hr class="nysta-divider"><p class="nysta-section-label">other meanings</p>${otherMeanings.map(m=>`<div class="nysta-other-meaning"><span class="nysta-sense-num">${m.sense}</span>${esc(m.text)}</div>`).join('')}` : ''}
      ${qf ? `<div class="nysta-quick-facts">${qf}</div>` : ''}
      ${acc ? `<div class="nysta-accordion">
        <button class="nysta-acc-header"><span>grammar & usage</span><span class="nysta-acc-chevron">›</span></button>
        <div class="nysta-acc-body">${acc}</div>
      </div>` : ''}
      <div class="nysta-btn-row">
        <button id="nysta-save" class="nysta-btn nysta-btn-save" data-status="${esc(wordStatus||'')}" ${saveDisabled}>${saveLabel}</button>
        <button id="nysta-translate" class="nysta-btn">translate →</button>
      </div>
    </div>`;
  }

  function verbGroupTip(g) {
    const s = String(g).toLowerCase();
    if (s.includes('2a')) return 'Group 2a: past tense adds -de after a voiced consonant — e.g. stänga → stängde.';
    if (s.includes('2b')) return 'Group 2b: past tense adds -te after a voiceless consonant — e.g. köpa → köpte.';
    if (s.includes('1'))  return 'Group 1 (most common): infinitive ends in -a, past tense adds -ade — e.g. tala → talade.';
    if (s.includes('2'))  return 'Group 2: past tense adds -de or -te depending on the final consonant — e.g. stänga → stängde, köpa → köpte.';
    if (s.includes('3'))  return 'Group 3: short verbs with a stressed stem vowel, past tense adds -dde — e.g. bo → bodde.';
    if (s.includes('4'))  return 'Group 4 (strong verbs): the stem vowel changes in past tense instead of adding an ending — e.g. sjunga → sjöng, skriva → skrev.';
    return 'Swedish verbs are grouped 1–4 by how they form past tense.';
  }

  function declensionTip(g) {
    const s = String(g).toLowerCase();
    if (s.includes('1')) return '1st declension (en-words): plural ends in -or — e.g. flicka → flickor, flickorna.';
    if (s.includes('2')) return '2nd declension (en-words): plural ends in -ar — e.g. bil → bilar, bilarna.';
    if (s.includes('3')) return '3rd declension (en-words): plural ends in -er — e.g. sport → sporter, sporterna.';
    if (s.includes('4')) return '4th declension (ett-words): plural ends in -n — e.g. äpple → äpplen, äpplena.';
    if (s.includes('5')) return '5th declension: plural is the same as the singular — e.g. hus → hus, husen.';
    return 'Swedish nouns follow one of five declension patterns that determine plural and definite forms.';
  }

  function enEttTip(enEtt) {
    if (enEtt === 'en')  return '"en" noun: takes en as its article (en bil) and adds -en or -n in the definite singular (bilen). Most Swedish nouns are en-words.';
    if (enEtt === 'ett') return '"ett" noun: takes ett as its article (ett hus) and adds -et or -t in the definite singular (huset).';
    return 'Swedish nouns are either en-words or ett-words, which determines the article and adjective agreement.';
  }

  function buildQuickFacts(pos, enEtt, declensionGroup, verbGroup, forms) {
    const rows = [];
    if (pos === 'noun') {
      if (enEtt) rows.push(qfRow('en/ett', enEtt+'-word', enEttTip(enEtt)));
      if (forms.indefinitePlural) rows.push(qfRow('plural', forms.indefinitePlural, null));
      if (declensionGroup) rows.push(qfRow('declension', declensionGroup, declensionTip(declensionGroup)));
    }
    if (pos === 'verb') {
      if (verbGroup) rows.push(qfRow('group', verbGroup, verbGroupTip(verbGroup)));
      if (forms.presens) rows.push(qfRow('presens', forms.presens, null));
      if (forms.preteritum) rows.push(qfRow('preteritum', forms.preteritum, null));
    }
    if (pos === 'adjective') {
      const inv = forms.enForm && forms.enForm === forms.ettForm;
      rows.push(qfRow('en/ett forms', inv ? 'invariable' : (forms.enForm||'–'), inv ? "This adjective has the same form regardless of the noun's gender, number, or definiteness — no endings needed." : 'Adjectives agree with the noun: add -t for ett-words (sg), -a for plural and definite forms.'));
      if (forms.comparative) rows.push(qfRow('comparative', forms.comparative, null));
    }
    return rows.join('');
  }

  function qfRow(label, value, tooltip) {
    const tip = tooltip ? `<span class="nysta-qmark">?<span class="nysta-tooltip">${esc(tooltip)}</span></span>` : '';
    return `<div class="nysta-qf-row"><span class="nysta-qf-label">${esc(label)}</span><span class="nysta-qf-value">${esc(value)}</span>${tip}</div>`;
  }

  function buildAccordionBody(pos, forms, commonPhrases, relatedForms) {
    const sections = [];
    if (pos === 'noun' && Object.keys(forms).length) {
      sections.push(`<p class="nysta-acc-label">all forms</p><table class="nysta-form-table">
        ${['indefiniteSg','definiteSg','indefinitePlural','definitePlural'].filter(f=>forms[f]).map(f=>`<tr><td>${f.replace(/([A-Z])/g,' $1').replace('indefinite','indef').replace('definite','def').replace('Plural','pl').replace('Sg','sg').trim()}</td><td>${esc(forms[f])}</td></tr>`).join('')}
      </table>`);
    }
    if (pos === 'verb' && Object.keys(forms).length) {
      sections.push(`<p class="nysta-acc-label">conjugation</p><table class="nysta-form-table">
        ${['infinitiv','presens','preteritum','perfekt','pluskvamperfekt','futur','konditionalis','imperativ','passiv'].filter(f=>forms[f]).map(f=>`<tr><td>${f}</td><td>${esc(forms[f])}</td></tr>`).join('')}
      </table>`);
    }
    if (pos === 'adjective' && Object.keys(forms).length) {
      sections.push(`<p class="nysta-acc-label">inflection</p><table class="nysta-form-table">
        ${[['enForm','en-word (sg)'],['ettForm','ett-word (sg)'],['pluralForm','plural'],['definiteForm','definite'],['comparative','comparative'],['superlative','superlative']].filter(([k])=>forms[k]).map(([k,l])=>`<tr><td>${l}</td><td>${esc(forms[k])}</td></tr>`).join('')}
      </table>`);
    }
    if (commonPhrases?.length) {
      sections.push(`<p class="nysta-acc-label">common phrases</p>
        ${commonPhrases.map(p=>`<div class="nysta-phrase-row"><span class="nysta-phrase-word">${esc(p.phrase)}</span><span class="nysta-phrase-gloss">${esc(p.gloss)}</span></div>`).join('')}`);
    }
    if (relatedForms?.length) {
      sections.push(`<p class="nysta-acc-label">related forms</p><table class="nysta-form-table">
        ${relatedForms.map(r=>`<tr><td>${esc(r.pos)}</td><td>${esc(r.form)} <span style="opacity:0.6;font-size:11px">${esc(r.gloss)}</span></td></tr>`).join('')}
      </table>`);
    }
    return sections.join('');
  }
})();
