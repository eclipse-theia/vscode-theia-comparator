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

const scriptCode = `
const form = document.getElementById('report-filter-selector-form');
const radioButtons = document.getElementsByClassName('report-filter-selector');
const styleSheet = document.head.getElementsByTagName('style')[0].sheet;
const selector = '.to-filter'
const rule = \`\${selector} { display: none; }\`;
const addRule = () => {
	const ruleIndex = Array.from(styleSheet.cssRules).findIndex(rule => rule.selectorText === selector);
	if (ruleIndex === -1) {
		styleSheet.insertRule(rule, 0);
	} else {
		styleSheet.cssRules[ruleIndex].style.display = 'none';
	}
}
const removeRule = () => {
	const ruleIndex = Array.from(styleSheet.cssRules).findIndex(rule => rule.selectorText === selector);
	if (ruleIndex !== -1) {
		styleSheet.deleteRule(ruleIndex);
	}
}
const enactFilter = () => {
	if (form['report-filter-selector'].value === 'filtered') {
		addRule();
	} else {
		removeRule();
	}
};
Array.from(radioButtons).forEach(button => button.addEventListener('change', enactFilter));
enactFilter();
`

export const script = new Tag('script', {}, new TextNode(scriptCode))
