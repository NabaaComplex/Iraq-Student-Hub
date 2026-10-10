(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const STORE = 'iraq-student-hub-v1';
  let state = {saved: [], steps: []};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (Array.isArray(saved.saved)) state.saved = saved.saved.filter(x => typeof x === 'string');
    if (Array.isArray(saved.steps)) state.steps = saved.steps.filter(x => typeof x === 'string');
  } catch { storageAvailable = false; }
  let toastTimer;
  function toast(message) {
    const el = $('.toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.classList.add('visible');
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch { storageAvailable = false; }
  }
  function renderSaved() {
    $$('[data-saved-count]').forEach(el => { el.textContent = state.saved.length; });
    $$('[data-save]').forEach(button => {
      const saved = state.saved.includes(button.dataset.save);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${button.dataset.title}`);
    });
  }
  $$('[data-save]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.save;
    const saved = state.saved.includes(id);
    state.saved = saved ? state.saved.filter(item => item !== id) : [...state.saved, id];
    persist(); renderSaved(); filterResources();
    toast(`${saved ? 'Removed from saved' : 'Saved for later'}${storageAvailable ? '.' : ' for this visit. Browser storage is unavailable.'}`);
  }));
  renderSaved();
  const menu = $('.menu-toggle');
  const nav = $('#primary-nav');
  function closeMenu() { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); menu?.setAttribute('aria-label', 'Open navigation'); }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
  });
  $$('#primary-nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) { closeMenu(); menu.focus(); }
    if (event.key === '/' && $('#resource-search') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault(); $('#resource-search').focus();
    }
  });
  document.addEventListener('click', event => { if (nav?.classList.contains('open') && !event.target.closest('.site-header')) closeMenu(); });
  let category = '';
  let onlySaved = location.hash === '#saved';
  const cards = $$('#resource-grid [data-entry]');
  function filterResources() {
    if (!cards.length) return;
    const query = ($('#resource-search')?.value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const region = $('#region-filter')?.value || '';
    const stage = $('#stage-filter')?.value || '';
    let count = 0;
    cards.forEach(card => {
      const show = (!category || card.dataset.kind === category) && (!region || card.dataset.region === region) && (!stage || card.dataset.stage.split(',').includes(stage) || card.dataset.stage === 'All levels') && (!onlySaved || state.saved.includes(card.dataset.entry)) && query.every(word => card.dataset.search.includes(word));
      card.hidden = !show;
      if (show) count++;
    });
    $('#result-count').textContent = `Showing ${count} ${count === 1 ? 'resource' : 'resources'}${onlySaved ? ' from your saved list' : ''}`;
    $('#empty-state').hidden = count !== 0;
    const emptyHeading = $('#empty-state h2');
    emptyHeading.textContent = onlySaved && !state.saved.length ? 'Your shortlist starts here.' : 'No matches just yet.';
    $('#empty-state p').textContent = onlySaved && !state.saved.length ? 'Use the bookmark button on a resource to save it for later.' : 'Try a different search or clear a filter to explore more options.';
    $('#saved-filter')?.setAttribute('aria-pressed', String(onlySaved));
  }
  ['resource-search', 'region-filter', 'stage-filter'].forEach(id => {
    const el = $('#' + id); el?.addEventListener(id === 'resource-search' ? 'input' : 'change', filterResources);
  });
  $$('.category-tab').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    $$('.category-tab').forEach(other => { const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active)); });
    filterResources();
  }));
  $('#saved-filter')?.addEventListener('click', () => {
    onlySaved = !onlySaved;
    history.replaceState(null, '', onlySaved ? '#saved' : location.pathname + location.search);
    filterResources();
  });
  function clearFilters() {
    if (!cards.length) return;
    $('#resource-search').value = ''; $('#region-filter').value = ''; $('#stage-filter').value = '';
    category = ''; onlySaved = false;
    $$('.category-tab').forEach(button => { const active = button.dataset.category === ''; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    history.replaceState(null, '', location.pathname + location.search); filterResources();
  }
  $('#clear-filters')?.addEventListener('click', clearFilters);
  $$('[data-clear-filters]').forEach(button => button.addEventListener('click', clearFilters));
  window.addEventListener('hashchange', () => { if (cards.length) { onlySaved = location.hash === '#saved'; filterResources(); } });
  filterResources();
  const steps = $$('[data-step]');
  function renderPlan() {
    if (!steps.length) return;
    steps.forEach(input => { input.checked = state.steps.includes(input.dataset.step); });
    const count = steps.filter(input => input.checked).length;
    $('[data-plan-count]').textContent = `${count} / ${steps.length}`;
    $('[data-plan-progress]').style.width = `${count / steps.length * 100}%`;
    $('[data-plan-message]').textContent = ['You’re at the beginning. That’s a good place to be.', 'A direction chosen. Keep going.', 'You’re halfway through your starter plan.', 'One practical step left.', 'Your starter plan is complete. Keep building on it.'][count];
  }
  steps.forEach(input => input.addEventListener('change', () => {
    state.steps = steps.filter(item => item.checked).map(item => item.dataset.step); persist(); renderPlan();
    if (!storageAvailable) toast('Progress is kept for this visit. Browser storage is unavailable.');
  }));
  $('[data-reset-plan]')?.addEventListener('click', () => { state.steps = []; persist(); renderPlan(); toast('Checklist reset. Your saved resources are still here.'); });
  renderPlan();
  // Opening a contents link also expands native English lesson accordions.
  function revealHash() {
    if (location.hash.length < 2) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    let parent = target.closest('details');
    while (parent) { parent.open = true; parent = parent.parentElement.closest('details'); }
    if (target.tagName === 'DETAILS') target.open = true;
  }
  window.addEventListener('hashchange', revealHash); revealHash();
  const progress = $('.reading-progress>div');
  const tocLinks = $$('.contents-panel nav>a');
  let ticking = false;
  function updateReading() {
    if (progress) {
      const body = $('.reading-article');
      const top = body.getBoundingClientRect().top + window.scrollY - 120;
      const length = Math.max(body.offsetHeight - window.innerHeight + 120, 1);
      progress.style.width = `${Math.min(100, Math.max(0, (window.scrollY - top) / length * 100))}%`;
      let current;
      tocLinks.forEach(link => { const el = document.getElementById(link.hash.slice(1)); if (el && el.getBoundingClientRect().top < 170) current = link; });
      tocLinks.forEach(link => link.classList.toggle('active', link === current));
    }
    ticking = false;
  }
  if (progress) {
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateReading); ticking = true; } }, {passive:true});
    $$('details').forEach(detail => detail.addEventListener('toggle', updateReading));
    updateReading();
  }
  const previouslyOpen = new Set();
  function preparePrint() { $$('details').forEach(detail => { if (detail.open) previouslyOpen.add(detail); detail.open = true; }); }
  function restorePrint() { $$('details').forEach(detail => { detail.open = previouslyOpen.has(detail); }); previouslyOpen.clear(); }
  $('[data-print]')?.addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', preparePrint); window.addEventListener('afterprint', restorePrint);
  window.addEventListener('storage', event => {
    if (event.key !== STORE) return;
    try { const next = JSON.parse(event.newValue || '{}'); state.saved = Array.isArray(next.saved) ? next.saved : []; state.steps = Array.isArray(next.steps) ? next.steps : []; renderSaved(); renderPlan(); filterResources(); } catch { /* Preserve this tab's state for invalid stored values. */ }
  });
})();
