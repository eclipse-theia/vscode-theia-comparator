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

const styleRules = `
:root {
	--bg-body: #f8f9fa;
	--text-primary: #1e293b;
	--text-secondary: #64748b;
	--border-color: #e2e8f0;
	--toolbar-bg: #1e293b;
	--toolbar-text: #e2e8f0;
	--toolbar-height: 0px;
	--header-bg: #334155;
	--header-text: #f1f5f9;
	--row-hover: rgba(59,130,246,0.08);
	--left-bg: #f8fafc;
	--success-bg: #dcfce7;
	--success-badge: #16a34a;
	--warning-bg: #fef9c3;
	--warning-badge: #d97706;
	--danger-bg: #fee2e2;
	--danger-badge: #dc2626;
	--neutral-bg: #e2e8f0;
	--neutral-badge: #64748b;
	--namespace-bg: #f1f5f9;
	--namespace-border: #6366f1;
}

* { box-sizing: border-box; }

body {
	margin: 0;
	padding-top: var(--toolbar-height);
	color: var(--text-primary);
	background: var(--bg-body);
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 15px;
	line-height: 1.5;
}

/* Toolbar */
#toolbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1100;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	background: var(--toolbar-bg);
	color: var(--toolbar-text);
	box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.toolbar-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.toolbar-results {
	margin-left: auto;
	font-size: 13px;
	color: #94a3b8;
}

#api-search {
	padding: 5px 10px;
	border: 1px solid #475569;
	border-radius: 4px;
	background: #0f172a;
	color: #e2e8f0;
	font-size: 14px;
	width: 220px;
	outline: none;
}

#api-search:focus {
	border-color: #6366f1;
	box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
}

#api-search::placeholder {
	color: #64748b;
}

/* Dropdowns */
.dropdown {
	position: relative;
}

.dropdown-btn {
	padding: 5px 12px;
	border: 1px solid #475569;
	border-radius: 4px;
	background: #0f172a;
	color: #e2e8f0;
	font-size: 13px;
	cursor: pointer;
	white-space: nowrap;
}

.dropdown-btn:hover {
	border-color: #6366f1;
}

.dropdown-divider {
	margin: 4px 0;
	border: none;
	border-top: 1px solid #475569;
}

.dropdown-toggle-all {
	font-weight: 600;
}

.dropdown-menu {
	display: none;
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 4px;
	padding: 6px 0;
	background: #1e293b;
	border: 1px solid #475569;
	border-radius: 4px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.3);
	z-index: 1200;
	min-width: max-content;
}

.dropdown.open .dropdown-menu {
	display: block;
}

.dropdown-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 12px;
	font-size: 13px;
	cursor: pointer;
	white-space: nowrap;
	color: #e2e8f0;
}

.dropdown-item:hover {
	background: #334155;
}

.dropdown-item input {
	margin: 0;
	cursor: pointer;
}

/* Table */
table {
	border-collapse: separate;
	border-spacing: 0;
	margin: 0 auto;
	width: 100%;
}

thead th {
	position: sticky;
	top: var(--toolbar-height);
	z-index: 1000;
}

tbody tr:hover td, tbody tr:hover th {
	background-color: var(--row-hover);
}

th, td {
	border: 1px solid var(--border-color);
	padding: 5px 8px;
}

th {
	text-align: left;
}

th.top {
	vertical-align: middle;
	color: var(--header-text);
	background-color: var(--header-bg);
	border-color: #475569;
	font-size: 14px;
	font-weight: 600;
	white-space: nowrap;
	text-align: center;
}

th.top:first-child,
th.top:last-child {
	text-align: left;
}

.header-link {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	border: 1.5px solid #94a3b8;
	color: #94a3b8;
	text-decoration: none;
	font-size: 10px;
	font-weight: 700;
	font-style: normal;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	vertical-align: middle;
	line-height: 1;
}

.header-link:hover {
	color: #fff;
	border-color: #fff;
}

th.left {
	padding-right: 8px;
	background-color: var(--left-bg);
	font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
	font-size: 14px;
}

th.left.depth-1 {
	padding-left: 4px;
	font-weight: 700;
}

th.left.depth-2 {
	padding-left: 20px;
	font-weight: 600;
}

th.left.depth-3 {
	padding-left: 36px;
	font-weight: 400;
}

/* Namespace rows */
tr[data-namespace] td {
	background: var(--namespace-bg);
	border-left: 3px solid var(--namespace-border);
	font-weight: 600;
	font-size: 14px;
	color: var(--text-secondary);
	padding: 6px 10px;
	letter-spacing: 0.02em;
}

/* Badges */
.badge {
	display: inline-block;
	text-align: center;
	white-space: nowrap;
	border-radius: 4px;
	padding: 2px 8px;
	font-size: 13px;
	font-weight: 600;
}

td.success {
	background-color: var(--success-bg);
}

td .badge.success {
	color: #fff;
	background-color: var(--success-badge);
}

td.warning {
	background-color: var(--warning-bg);
}

td .badge.warning {
	color: #fff;
	background-color: var(--warning-badge);
}

td.danger {
	background-color: var(--danger-bg);
}

td .badge.danger {
	color: #fff;
	background-color: var(--danger-badge);
}

td.neutral {
	background-color: var(--neutral-bg);
}

td .badge.neutral {
	color: #fff;
	background-color: var(--neutral-badge);
}

/* Status columns */
td.status {
	text-align: center;
	white-space: nowrap;
}

/* VSCode columns */
td.vscode {
	text-align: center;
}

/* Note column */
td.note {
	max-width: 260px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 13px;
	color: var(--text-secondary);
}

td.note a {
	color: #6366f1;
	text-decoration: none;
}

td.note a:hover {
	text-decoration: underline;
}

/* Filter hide classes */
.hide-search, .hide-status, .hide-namespace { display: none; }
`;

export const styles = new Tag('style', {}, new RawHTMLNode(styleRules));
