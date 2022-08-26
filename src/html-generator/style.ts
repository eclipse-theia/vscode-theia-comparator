/*********************************************************************
 * Copyright (c) 2022 Ericsson.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Tag, TextNode } from "./components"

const styleRules = `
body {
	color: #212529;
	font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
}

table {
	border-collapse: collapse;
}

tbody tr:hover td, tbody tr:hover th {
    background-color: rgba(189, 235, 250, 0.76);
}

th, td {
	border: 1px solid #918f8f;
	padding: 0.3rem;
}

th {
	text-align: left;
}

th.top {
	vertical-align: middle;
	color: #fff;
	background-color: #212529;
	border-color: #32383e;
}

th.top form {
	margin: 0;
}

th.left {
	border: 1px solid #918f8f;
	padding-right: 6px;
	background-color: rgba(0, 0, 0, 0.075);
}

th.left.complex {
	padding-left: 0.2rem;
	font-weight: bold;
}

th.left.simple {
	padding-left: 1.5rem;
	font-weight: normal;
}

.badge {
	display: inline-block;
	text-align: center;
	white-space: nowrap;
	border-radius: 0.25rem;
	padding: 0.15em 0.25em;
}

td.success {
	background-color: #c3e6cb;
}

td .badge.success {
	color: #fff;
	background-color: #28a745;
}

td.warning {
	background-color: #ffeeba;
}

td .badge.warning {
	color: #212529;
	background-color: #ffc107;
}

td.danger {
	background-color: #f5c6cb;
}

td .badge.danger {
	color: #fff;
	background-color: #dc3545;
}

td.neutral {
	background-color: #d6d8db;
}

td .badge.neutral {
	color: #fff;
	background-color: #6c757d;
}
`

export const styles = new Tag('style', {}, new TextNode(styleRules));
