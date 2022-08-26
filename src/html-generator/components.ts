/*********************************************************************
 * Copyright (c) 2022 Ericsson.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Infos } from "../infos";
import { Comparison } from "../parser";
import { retrieveValue } from "../recursive-record";

export interface Renderable {
	render(): string;
}

export class TextNode implements Renderable {
	constructor(private text: string) { }
	render(): string {
		return this.text;
	}
}

export class Tag implements Renderable {
	private children: Renderable[];
	constructor(private name: string, private properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
		this.children = children;
	}

	appendChildren(...children: Renderable[]): void {
		this.children.push(...children);
	}

	appendChild(child: Renderable): void {
		this.children.push(child);
	}

	render(): string {
		return `<${this.name} ${Object.entries(this.properties).map(([key, value]) => `${key}="${value}"`).join(' ')}>${this.children.map(child => child.render()).join('')}</${this.name}>`;
	}

	addClass(className: string): void {
		if (this.properties.class) {
			this.properties.class += ' ' + className.trim();
		} else {
			this.properties.class = className.trim();
		}
	}
}

export class TR extends Tag {
	constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
		super('tr', properties, ...children);
	}
}

export class TD extends Tag {
	constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
		super('td', properties, ...children);
	}
}

export class TH extends Tag {
	constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
		super('th', properties, ...children);
	}
}

export class Row extends TR {
	constructor(name: string, complex: boolean, ...children: Renderable[]) {
		const text = new TextNode(name);
		const firstColumn = new TH({ class: complex ? 'left complex' : 'left simple' }, text);
		super({}, firstColumn, ...children);
	}
}

export class NamespaceRow extends TR {
	constructor(name: string, columns: number) {
		super({}, new TD({ class: 'neutral', colspan: columns.toString() }, new TextNode(`namespace/${name}`)),);
	}
}

class TheiaStatus extends TD {
	constructor(className: string, text: string) {
		super({ class: `status theia ${className}` }, new Tag('span', { class: `badge ${className}` }, new TextNode(text)));
	}
	override appendChild(): void { }
	override appendChildren(): void { }
}

class VSCodeStatus extends TD {
	constructor(present: boolean) {
		const className = `status vscode${present ? '' : ' neutral'}`;
		const text = present ? '✓' : '-';
		super({ class: className }, new TextNode(text));
	}
}

const CORRECT = new TheiaStatus('success', 'Supported');
const ABSENT = new TheiaStatus('danger', 'Unsupported');
const INCORRECT = new TheiaStatus('warning', 'Partial');
const STUBBED = new TheiaStatus('neutral', 'Stubbed');
const NOT_APPLICABLE = new VSCodeStatus(false);
const EXPECTED = new VSCodeStatus(true);

export class HTML extends Tag {
	readonly head: Tag;
	readonly body: Tag;
	constructor() {
		const head = new Tag('head');
		const body = new Tag('body');
		super('html', {}, head, body);
		this.head = head;
		this.body = body;
	}
}

export const filterComponent = new TH({ class: 'top' },
	new Tag('form', { id: 'report-filter-selector-form', style: 'display: flex; justify-content: space-around; align-items: center; flex-flow: row nowrap; height: 100%; width: 100%;' },
		new Tag('label', { for: 'full-report-button' },
			new TextNode('Full'),
			new Tag('input', { type: 'radio', class: 'report-filter-selector', name: 'report-filter-selector', id: 'full-report-button', value: 'full', checked: 'true', style: 'margin-left: 8px;' })
		),
		new Tag('label', { for: 'filtered-report-button' },
			new TextNode('Filtered'),
			new Tag('input', { type: 'radio', class: 'report-filter-selector', name: 'report-filter-selector', id: 'filtered-report-button', value: 'filtered', style: 'margin-left: 8px;' })
		),
	)
);

export class MetadataColumn extends TD {
	constructor(notes: Infos, ...path: string[]) {
		const value = retrieveValue(notes, [...path, '_note']) ?? retrieveValue(notes, ['root', ...path, '_note']);
		const text = typeof value === 'string' ? value : '';
		super({ class: 'note' }, new TextNode(text));
	}
};

export const theiaColumn = (value: boolean | undefined | null | Comparison): Renderable => {
	switch (value) {
		case undefined:
		case null:
			return ABSENT;
		case true: return CORRECT;
		default:
			return INCORRECT;
	}
};

export const VSCodeColumn = (value: boolean | undefined | null | Comparison): Renderable => {
	switch (value) {
		case null: return NOT_APPLICABLE;
		default: return EXPECTED;
	}
};
