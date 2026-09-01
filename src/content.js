(() => {
  'use strict';

  const ROOT_ID = 'ghat-root';
  const API = 'https://api.github.com';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const ERROR_BACKOFF_MS = 30 * 1000;
  const SEP = '\u001f'; // folder path separator (unlikely to appear in workflow names)

  const ICONS = {
    folder:
      '<svg class="ghat-icon ghat-icon-folder" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path></svg>',
    chevron:
      '<svg class="ghat-icon ghat-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path></svg>',
    workflow:
      '<svg class="ghat-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h3.5C6.216 0 7 .784 7 1.75v3.5A1.75 1.75 0 0 1 5.25 7H4v4a1 1 0 0 0 1 1h4v-1.25C9 9.784 9.784 9 10.75 9h3.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 14.25 16h-3.5A1.75 1.75 0 0 1 9 14.25V13.5H5A2.5 2.5 0 0 1 2.5 11V7h-.75A1.75 1.75 0 0 1 0 5.25Zm1.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Zm9 9a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Z"></path></svg>',
    sync:
      '<svg class="ghat-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204a.25.25 0 0 1-.177.427H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"></path></svg>',
    list:
      '<svg class="ghat-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 2.75A.75.75 0 0 1 2.75 2h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 2.75Zm0 5A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75Zm0 5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"></path></svg>',
  };

  // ---------------------------------------------------------------- utils

  // Strict owner/repo shapes so URL-path-derived values can't form unexpected
  // API paths (e.g. ".." traversal). GitHub owners are alphanumeric + "-",
  // repos also allow "." and "_" but can never be "." / "..".
  const OWNER_RE = /^[A-Za-z0-9-]+$/;
  const REPO_RE = /^[A-Za-z0-9._-]+$/;

  function repoFromPath() {
    const m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/actions(?:\/|$)/);
    if (!m) return null;
    if (m[1] === 'orgs' || m[1] === 'organizations') return null;
    const [, owner, repo] = m;
    if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === '.' || repo === '..') {
      return null;
    }
    return { owner, repo };
  }

  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }

  function currentWorkflowFile() {
    const m = location.pathname.match(/\/actions\/workflows\/([^/?#]+)/);
    return m ? safeDecode(m[1]) : null;
  }

  function lsKey(info, kind) {
    return `ghat:${kind}:${info.owner}/${info.repo}`;
  }

  function lsGetJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function lsSetJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / disabled: non-fatal */
    }
  }

  function getToken() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ token: '' }, (v) => resolve(v.token || ''));
      } catch {
        resolve('');
      }
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  // ---------------------------------------------------------------- name parsing

  // "[A][B]_deploy" -> { folders: ["A", "B"], leaf: "deploy" }
  // Separators between/after brackets may be "_", "-", or spaces.
  function parseName(name) {
    const folders = [];
    let rest = name.trim();
    for (;;) {
      const m = rest.match(/^\[([^\]]*)\][-_\s]*/);
      if (!m) break;
      const seg = m[1].trim();
      if (seg) folders.push(seg);
      rest = rest.slice(m[0].length);
    }
    return { folders, leaf: rest.trim() || name.trim() };
  }

  function buildTree(workflows) {
    const root = { folders: new Map(), leaves: [] };
    for (const wf of workflows) {
      const { folders, leaf } = parseName(wf.name);
      let node = root;
      for (const f of folders) {
        if (!node.folders.has(f)) node.folders.set(f, { folders: new Map(), leaves: [] });
        node = node.folders.get(f);
      }
      node.leaves.push({ label: leaf, wf });
    }
    return root;
  }

  function countLeaves(node) {
    let n = node.leaves.length;
    for (const child of node.folders.values()) n += countLeaves(child);
    return n;
  }

  // ---------------------------------------------------------------- data fetching

  async function fetchWorkflowsViaApi(info, token) {
    const all = [];
    for (let page = 1; page <= 30; page++) {
      const headers = { Accept: 'application/vnd.github+json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `${API}/repos/${info.owner}/${info.repo}/actions/workflows?per_page=100&page=${page}`,
        { headers }
      );
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      const batch = data.workflows || [];
      all.push(...batch);
      if (batch.length === 0 || all.length >= (data.total_count || 0)) break;
    }
    return all.map((w) => ({
      name: w.name,
      file: (w.path || '').split('/').pop() || String(w.id),
      state: w.state || 'active',
    }));
  }

  function sidebarWorkflowAnchors(scope) {
    return [...scope.querySelectorAll('a[href*="/actions/workflows/"]')].filter(
      (a) => !a.closest(`#${ROOT_ID}`)
    );
  }

  // Sidebar container = the element (nav/aside, or common list) holding the workflow links.
  // nav/aside candidates always win over bare <ul> ones, so workflow links that GitHub
  // might add to the main run list can never out-vote the real sidebar.
  function findSidebarContainer() {
    const anchors = sidebarWorkflowAnchors(document);
    if (anchors.length === 0) return null;
    const navCounts = new Map();
    const listCounts = new Map();
    for (const a of anchors) {
      const nav = a.closest('nav, aside');
      if (nav) {
        navCounts.set(nav, (navCounts.get(nav) || 0) + 1);
        continue;
      }
      const ul = a.closest('ul');
      if (ul) listCounts.set(ul, (listCounts.get(ul) || 0) + 1);
    }
    const counts = navCounts.size > 0 ? navCounts : listCounts;
    let best = null;
    let bestCount = 0;
    for (const [c, n] of counts) {
      if (n > bestCount) {
        best = c;
        bestCount = n;
      }
    }
    return best;
  }

  // Click "Show more workflows" until every workflow is in the DOM.
  // Only real buttons or href-less anchors are clicked, so a plain link that
  // happens to match the text can never navigate the page away.
  async function expandSidebar(container) {
    for (let i = 0; i < 50; i++) {
      const btn = [...container.querySelectorAll('button, a')].find((el) => {
        if (!/show more workflows/i.test(el.textContent || '')) return false;
        if (el.tagName === 'BUTTON') return true;
        const href = el.getAttribute('href') || '';
        return href === '' || href === '#';
      });
      if (!btn) return;
      const before = sidebarWorkflowAnchors(container).length;
      btn.click();
      // wait for new items to arrive (up to ~5s)
      let grew = false;
      for (let w = 0; w < 25; w++) {
        await sleep(200);
        if (sidebarWorkflowAnchors(container).length > before) {
          grew = true;
          break;
        }
      }
      if (!grew) return; // nothing loaded; stop to avoid an infinite loop
    }
  }

  function scrapeWorkflows(container) {
    const seen = new Map();
    for (const a of sidebarWorkflowAnchors(container)) {
      const m = (a.getAttribute('href') || '').match(/\/actions\/workflows\/([^/?#]+)/);
      if (!m) continue;
      const file = safeDecode(m[1]);
      const name = (a.textContent || '').trim();
      if (name && !seen.has(file)) seen.set(file, { name, file, state: 'active' });
    }
    return [...seen.values()];
  }

  async function getWorkflows(info, container, { force = false } = {}) {
    const cacheKey = lsKey(info, 'cache');
    if (!force) {
      const cached = lsGetJSON(cacheKey);
      if (cached && Date.now() - cached.t < CACHE_TTL_MS && Array.isArray(cached.workflows)) {
        return cached.workflows;
      }
    }
    let workflows = null;
    try {
      workflows = await fetchWorkflowsViaApi(info, await getToken());
    } catch {
      // Private repo without a token, rate limit, etc. -> fall back to the DOM.
      await expandSidebar(container);
      workflows = scrapeWorkflows(container);
    }
    if (workflows && workflows.length > 0) {
      lsSetJSON(cacheKey, { t: Date.now(), workflows });
    }
    return workflows || [];
  }

  // ---------------------------------------------------------------- rendering

  function hideOriginalLists(container) {
    const lists = new Set();
    for (const a of sidebarWorkflowAnchors(container)) {
      const ul = a.closest('ul, ol');
      if (ul && !ul.closest(`#${ROOT_ID}`)) lists.add(ul);
    }
    for (const ul of lists) ul.classList.add('ghat-hidden-original');
    return [...lists];
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function renderNode(node, parentEl, info, path, openSet, activeFile) {
    const folderNames = [...node.folders.keys()].sort((a, b) => collator.compare(a, b));
    for (const name of folderNames) {
      const child = node.folders.get(name);
      const childPath = path ? path + SEP + name : name;
      const details = el('details', 'ghat-folder');
      details.dataset.path = childPath;
      if (openSet.has(childPath)) details.open = true;

      const summary = el('summary', 'ghat-summary');
      summary.innerHTML = ICONS.chevron + ICONS.folder;
      const label = el('span', 'ghat-label');
      label.textContent = name;
      summary.appendChild(label);
      const count = el('span', 'ghat-count');
      count.textContent = String(countLeaves(child));
      summary.appendChild(count);
      details.appendChild(summary);

      const children = el('div', 'ghat-children');
      renderNode(child, children, info, childPath, openSet, activeFile);
      details.appendChild(children);
      parentEl.appendChild(details);
    }

    const leaves = [...node.leaves].sort((a, b) => collator.compare(a.label, b.label));
    for (const { label, wf } of leaves) {
      const a = el('a', 'ghat-leaf');
      a.href = `/${info.owner}/${info.repo}/actions/workflows/${encodeURIComponent(wf.file)}`;
      a.dataset.file = wf.file;
      a.dataset.search = `${wf.name} ${label}`.toLowerCase();
      a.title = wf.name;
      a.innerHTML = ICONS.workflow;
      const span = el('span', 'ghat-label');
      span.textContent = label;
      a.appendChild(span);
      if (wf.state && wf.state !== 'active') a.classList.add('ghat-disabled');
      if (activeFile && wf.file === activeFile) a.classList.add('ghat-active');
      parentEl.appendChild(a);
    }
  }

  function openAncestors(leafEl) {
    let d = leafEl.closest('details');
    while (d) {
      d.open = true;
      d = d.parentElement ? d.parentElement.closest('details') : null;
    }
  }

  function updateActive(root) {
    const file = currentWorkflowFile();
    for (const a of root.querySelectorAll('.ghat-leaf')) {
      const active = !!file && a.dataset.file === file;
      a.classList.toggle('ghat-active', active);
      if (active) openAncestors(a);
    }
  }

  function applyFilter(root, query) {
    const q = query.trim().toLowerCase();
    const tree = root.querySelector('.ghat-tree');
    if (!tree) return;
    tree.classList.toggle('ghat-filtering', q.length > 0);
    for (const a of tree.querySelectorAll('.ghat-leaf')) {
      a.classList.toggle('ghat-filtered-out', q.length > 0 && !a.dataset.search.includes(q));
    }
    // A folder is hidden while filtering if it has no visible leaf below it.
    for (const d of [...tree.querySelectorAll('details.ghat-folder')].reverse()) {
      const visible =
        q.length === 0 || !!d.querySelector('.ghat-leaf:not(.ghat-filtered-out)');
      d.classList.toggle('ghat-filtered-out', !visible);
      if (q.length > 0 && visible) d.open = true;
    }
    if (q.length === 0) {
      // restore persisted open state
      const info = repoFromPath();
      if (info) {
        const openSet = new Set(lsGetJSON(lsKey(info, 'open')) || []);
        for (const d of tree.querySelectorAll('details.ghat-folder')) {
          d.open = openSet.has(d.dataset.path);
        }
      }
      updateActive(root);
    }
  }

  function saveOpenState(info, root) {
    const open = [...root.querySelectorAll('details.ghat-folder')]
      .filter((d) => d.open)
      .map((d) => d.dataset.path);
    lsSetJSON(lsKey(info, 'open'), open);
  }

  function applyOriginalVisibility(root, info, container) {
    const showOriginal = lsGetJSON(lsKey(info, 'showOriginal')) === true;
    root.classList.toggle('ghat-collapsed', showOriginal);
    for (const ul of container.querySelectorAll('.ghat-hidden-original')) {
      ul.classList.toggle('ghat-visible-again', showOriginal);
    }
  }

  function buildRoot(info, workflows, container) {
    const root = el('div');
    root.id = ROOT_ID;

    const header = el('div', 'ghat-header');
    const all = el('a', 'ghat-all');
    all.href = `/${info.owner}/${info.repo}/actions`;
    all.textContent = 'All workflows';
    header.appendChild(all);

    const spacer = el('span', 'ghat-spacer');
    header.appendChild(spacer);

    const refreshBtn = el('button', 'ghat-btn', ICONS.sync);
    refreshBtn.type = 'button';
    refreshBtn.title = 'Reload workflow list';
    header.appendChild(refreshBtn);

    const toggleBtn = el('button', 'ghat-btn', ICONS.list);
    toggleBtn.type = 'button';
    toggleBtn.title = 'Toggle original flat list';
    header.appendChild(toggleBtn);
    root.appendChild(header);

    const filter = el('input', 'ghat-filter');
    filter.type = 'search';
    filter.placeholder = 'Filter workflows…';
    filter.setAttribute('aria-label', 'Filter workflows');
    root.appendChild(filter);

    const tree = el('div', 'ghat-tree');
    root.appendChild(tree);

    const openSet = new Set(lsGetJSON(lsKey(info, 'open')) || []);
    renderNode(buildTree(workflows), tree, info, '', openSet, currentWorkflowFile());
    updateActive(root);

    tree.addEventListener('toggle', () => {
      if (!filter.value.trim()) saveOpenState(info, root);
    }, true);
    filter.addEventListener('input', () => applyFilter(root, filter.value));
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        localStorage.removeItem(lsKey(info, 'cache'));
        const fresh = await getWorkflows(info, container, { force: true });
        tree.textContent = '';
        renderNode(buildTree(fresh), tree, info, '', new Set(lsGetJSON(lsKey(info, 'open')) || []), currentWorkflowFile());
        updateActive(root);
        applyFilter(root, filter.value);
      } catch {
        /* keep the current tree on refresh failure */
      } finally {
        refreshBtn.disabled = false;
      }
    });
    toggleBtn.addEventListener('click', () => {
      const key = lsKey(info, 'showOriginal');
      lsSetJSON(key, !(lsGetJSON(key) === true));
      applyOriginalVisibility(root, info, container);
    });

    return root;
  }

  // ---------------------------------------------------------------- lifecycle

  let busy = false;
  let currentRepoKey = '';
  let lastPathname = '';
  let lastErrorAt = 0;

  async function run() {
    const info = repoFromPath();
    const existing = document.getElementById(ROOT_ID);

    if (!info) {
      if (existing) existing.remove();
      currentRepoKey = '';
      return;
    }

    const repoKey = `${info.owner}/${info.repo}`;

    if (existing && currentRepoKey === repoKey) {
      // Same repo: React may have re-rendered the original list; keep it hidden,
      // and refresh the active highlight when the URL changed.
      const container = findSidebarContainer();
      if (container) {
        hideOriginalLists(container);
        applyOriginalVisibility(existing, info, container);
      }
      if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        updateActive(existing);
      }
      return;
    }

    if (Date.now() - lastErrorAt < ERROR_BACKOFF_MS) return;

    const container = findSidebarContainer();
    if (!container) return; // sidebar not rendered yet; try again on next tick

    try {
      const workflows = await getWorkflows(info, container);
      if (workflows.length === 0) return;

      // Re-query: the sidebar may have been re-rendered while we were fetching.
      const freshContainer = findSidebarContainer() || container;
      const lists = hideOriginalLists(freshContainer);
      document.getElementById(ROOT_ID)?.remove();

      const root = buildRoot(info, workflows, freshContainer);
      if (lists.length > 0) {
        lists[0].parentNode.insertBefore(root, lists[0]);
      } else {
        freshContainer.prepend(root);
      }
      applyOriginalVisibility(root, info, freshContainer);
      currentRepoKey = repoKey;
      lastPathname = location.pathname;
    } catch {
      lastErrorAt = Date.now();
    }
  }

  async function tick() {
    if (busy) return;
    busy = true;
    try {
      await run();
    } catch {
      // Never let a transient DOM/URL edge case surface as a page console error
      // every tick; back off and retry later.
      lastErrorAt = Date.now();
    } finally {
      busy = false;
    }
  }

  setInterval(tick, 800);
  document.addEventListener('turbo:load', tick);
  document.addEventListener('turbo:render', tick);
  window.addEventListener('popstate', tick);
  tick();
})();
