/*********************************************************************
 * Copyright (c) 2022 Ericsson.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Tag, RawHTMLNode } from './components';

const scriptCode = `
(function() {
	const tbody = document.getElementById('full-report');
	const rows = Array.from(tbody.querySelectorAll('tr'));
	const searchInput = document.getElementById('api-search');
	const resultsCount = document.getElementById('results-count');
	const toolbar = document.getElementById('toolbar');
	const styleSheet = document.head.querySelector('style').sheet;

	// Categorize rows and cache depth
	const dataRows = [];
	const rowDepth = new Map();
	const nsChildren = new Map();
	let currentNs = null;
	for (const row of rows) {
		if (row.hasAttribute('data-namespace')) {
			currentNs = row;
			nsChildren.set(currentNs, []);
		} else {
			dataRows.push(row);
			if (currentNs) { nsChildren.get(currentNs).push(row); }
			const th = row.querySelector('th.left');
			const m = th && th.className.match(/depth-(\\d+)/);
			rowDepth.set(row, m ? parseInt(m[1], 10) : 1);
		}
	}

	// --- Dropdown toggle ---
	document.querySelectorAll('.dropdown-btn').forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation();
			const dd = btn.parentElement;
			const wasOpen = dd.classList.contains('open');
			document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
			if (!wasOpen) { dd.classList.add('open'); }
		});
	});
	document.addEventListener('click', () => {
		document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
	});
	document.querySelectorAll('.dropdown-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));

	// --- Toggle all logic for dropdowns ---
	document.querySelectorAll('.dropdown').forEach(dd => {
		const toggleAll = dd.querySelector('input[class$="-toggle-all"]');
		const items = Array.from(dd.querySelectorAll('input[class$="-item"]'));
		if (!toggleAll) return;
		// "All" just controls checkboxes, then individual listeners handle the table
		toggleAll.addEventListener('change', () => {
			const target = toggleAll.checked;
			items.forEach(cb => {
				if (cb.checked !== target) {
					cb.checked = target;
					cb.dispatchEvent(new Event('change'));
				}
			});
		});
		// Sync "All" when individual items change
		items.forEach(cb => cb.addEventListener('change', () => {
			toggleAll.checked = items.every(c => c.checked);
		}));
	});

	// --- Status filter ---
	const statusItems = Array.from(document.querySelectorAll('#status-dropdown .dropdown-item input[data-status]'));
	// Map col-index to its checkbox for quick lookup
	const colIndexChecked = new Map();
	function getVisibleStatuses(row) {
		const statuses = new Set();
		const cells = row.children;
		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			if (!cell.classList.contains('theia')) { continue; }
			// colIndexChecked keys are nth-child (1-based), DOM childIndex is 0-based
			const cb = colIndexChecked.get(i + 1);
			if (cb && !cb.checked) { continue; }
			if (cell.classList.contains('success')) { statuses.add('success'); }
			else if (cell.classList.contains('danger')) { statuses.add('danger'); }
			else if (cell.classList.contains('warning')) { statuses.add('warning'); }
			else if (cell.classList.contains('neutral')) { statuses.add('neutral'); }
		}
		return statuses;
	}
	function applyStatusFilter() {
		const active = new Set();
		statusItems.forEach(cb => { if (cb.checked) active.add(cb.getAttribute('data-status')); });
		dataRows.forEach(r => {
			const statuses = getVisibleStatuses(r);
			r.classList.toggle('hide-status', statuses.size > 0 && !Array.from(statuses).some(s => active.has(s)));
		});
	}
	statusItems.forEach(cb => cb.addEventListener('change', () => { applyStatusFilter(); applySearchFilter(); ensureParentsVisible(); updateNamespaces(); updateCount(); }));

	// --- Search filter ---
	let searchTimer;
	function applySearchFilter() {
		const q = searchInput.value.trim().toLowerCase();
		dataRows.forEach(r => {
			r.classList.toggle('hide-search', q !== '' && !(r.getAttribute('data-name') || '').includes(q));
		});
	}
	searchInput.addEventListener('input', () => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => { applySearchFilter(); applyStatusFilter(); ensureParentsVisible(); updateNamespaces(); updateCount(); }, 150);
	});

	// --- Ensure parent rows of visible children stay visible ---
	function ensureParentsVisible() {
		// ancestors[depth] = most recent row at that depth
		const ancestors = {};
		for (const r of dataRows) {
			const depth = rowDepth.get(r);
			ancestors[depth] = r;
			const isHidden = r.classList.contains('hide-status') || r.classList.contains('hide-search');
			if (!isHidden) {
				for (let d = depth - 1; d >= 1; d--) {
					if (ancestors[d]) {
						ancestors[d].classList.remove('hide-status');
						ancestors[d].classList.remove('hide-search');
					}
				}
			}
		}
	}

	// --- Namespace visibility ---
	function updateNamespaces() {
		const anyFilterActive = searchInput.value.trim() !== '' || statusItems.some(cb => !cb.checked);
		nsChildren.forEach((children, nsRow) => {
			// Always show namespace rows when filters are active (even if no children match)
			// Only hide when no filters are active and all children are hidden for other reasons
			nsRow.classList.toggle('hide-namespace', !anyFilterActive && children.every(c =>
				c.classList.contains('hide-search') ||
				c.classList.contains('hide-status')
			));
		});
	}

	// --- Column toggle ---
	const colItems = Array.from(document.querySelectorAll('#columns-dropdown .dropdown-item input[data-col-index]'));
	// Build col-index -> checkbox map (data-col-index is 1-based, nth-child is +1)
	colItems.forEach(cb => {
		const ci = parseInt(cb.getAttribute('data-col-index'), 10) + 1;
		colIndexChecked.set(ci, cb);
	});
	function rebuildColRules() {
		// Remove old column rules (tracked at end of stylesheet)
		while (styleSheet.cssRules.length > 0 && styleSheet.cssRules[styleSheet.cssRules.length - 1].__colRule) {
			styleSheet.deleteRule(styleSheet.cssRules.length - 1);
		}
		colItems.forEach(cb => {
			if (!cb.checked) {
				const ci = parseInt(cb.getAttribute('data-col-index'), 10) + 1;
				const idx = styleSheet.insertRule(
					'td:nth-child(' + ci + '), th:nth-child(' + ci + ') { display: none !important; }',
					styleSheet.cssRules.length
				);
				styleSheet.cssRules[idx].__colRule = true;
			}
		});
	}
	colItems.forEach(cb => cb.addEventListener('change', () => {
		rebuildColRules();
		applyStatusFilter();
		applySearchFilter();
		ensureParentsVisible();
		updateNamespaces();
		updateCount();
	}));

	// --- Results counter ---
	function updateCount() {
		const visible = dataRows.filter(r =>
			!r.classList.contains('hide-search') &&
			!r.classList.contains('hide-status')
		).length;
		resultsCount.textContent = visible + ' / ' + dataRows.length + ' APIs';
	}

	// --- Toolbar height for sticky header ---
	function updateToolbarHeight() {
		document.documentElement.style.setProperty('--toolbar-height', toolbar.getBoundingClientRect().height + 'px');
	}
	if (typeof ResizeObserver !== 'undefined') {
		new ResizeObserver(updateToolbarHeight).observe(toolbar);
	}
	updateToolbarHeight();

	// Initial state
	applyStatusFilter();
	applySearchFilter();
	ensureParentsVisible();
	updateNamespaces();
	updateCount();
})();
`;

export const script = new Tag('script', {}, new RawHTMLNode(scriptCode));
