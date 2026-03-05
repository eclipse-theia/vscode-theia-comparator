/*********************************************************************
 * Copyright (c) 2022 Ericsson.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Infos } from '../infos';
import { Comparison, SupportLevels } from '../parser';
import { retrieveValue } from '../recursive-record';

export interface Renderable {
    render(): string;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export class TextNode implements Renderable {
    constructor(private text: string) { }
    render(): string {
        return escapeHtml(this.text);
    }
}

export class RawHTMLNode implements Renderable {
    constructor(private html: string) { }
    render(): string {
        return this.html;
    }
}

export class Tag implements Renderable {
    private children: Renderable[];
    protected properties: Record<string, string>;
    constructor(private name: string, properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
        this.properties = properties;
        this.children = children;
    }

    appendChildren(...children: Renderable[]): void {
        this.children.push(...children);
    }

    appendChild(child: Renderable): void {
        this.children.push(child);
    }

    setProperty(key: string, value: string): void {
        this.properties[key] = value;
    }

    render(): string {
        return `<${this.name} ${Object.entries(this.properties).map(([key, value]) => `${escapeHtml(key)}="${escapeHtml(value)}"`).join(' ')}>${this.children.map(child => child.render()).join('')}</${this.name}>`;
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
    constructor(name: string, depth: number, ...children: Renderable[]) {
        const text = new TextNode(name);
        const firstColumn = new TH({ class: 'left depth-' + depth }, text);
        super({ 'data-name': name.toLowerCase() }, firstColumn, ...children);
    }
}

export class NamespaceRow extends TR {
    constructor(name: string, columns: number) {
        super({ 'data-namespace': 'true' }, new TD({ class: 'neutral', colspan: columns.toString() }, new TextNode(`namespace/${name}`)));
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

export const nameColumnHeader = new TH({ class: 'top' }, new TextNode('API'));

function createDropdown(id: string, buttonLabel: string, items: { id: string; label: string; attrs?: Record<string, string> }[]): Tag {
    const wrapper = new Tag('div', { class: 'dropdown', id });
    wrapper.appendChild(new Tag('button', { class: 'dropdown-btn', type: 'button' }, new TextNode(buttonLabel + ' ▾')));
    const menu = new Tag('div', { class: 'dropdown-menu' });
    menu.appendChild(new Tag('label', { class: 'dropdown-item dropdown-toggle-all' },
        new Tag('input', { type: 'checkbox', checked: 'true', class: `${id}-toggle-all` }),
        new TextNode(' All')
    ));
    menu.appendChild(new Tag('hr', { class: 'dropdown-divider' }));
    for (const item of items) {
        const inputProps: Record<string, string> = { type: 'checkbox', checked: 'true', class: `${id}-item`, ...item.attrs };
        menu.appendChild(new Tag('label', { class: 'dropdown-item' },
            new Tag('input', inputProps),
            new TextNode(` ${item.label}`)
        ));
    }
    wrapper.appendChild(menu);
    return wrapper;
}

export function createToolbar(versionLabels: string[]): Tag {
    const toolbar = new Tag('div', { id: 'toolbar' });

    // Search
    toolbar.appendChild(new Tag('div', { class: 'toolbar-group' },
        new Tag('input', { type: 'text', id: 'api-search', placeholder: 'Filter by API name...' })
    ));

    // Status filter dropdown
    toolbar.appendChild(createDropdown('status-dropdown', 'Status', [
        { id: 'status-success', label: 'Supported', attrs: { 'data-status': 'success' } },
        { id: 'status-danger', label: 'Unsupported', attrs: { 'data-status': 'danger' } },
        { id: 'status-warning', label: 'Partial', attrs: { 'data-status': 'warning' } },
        { id: 'status-neutral', label: 'Stubbed', attrs: { 'data-status': 'neutral' } },
    ]));

    // Columns dropdown
    const allColumns = [...versionLabels, 'Note'];
    toolbar.appendChild(createDropdown('columns-dropdown', 'Columns',
        allColumns.map((label, i) => ({
            id: `col-toggle-${i + 1}`,
            label,
            attrs: { 'data-col-index': (i + 1).toString() },
        }))
    ));

    // Results counter
    toolbar.appendChild(new Tag('div', { class: 'toolbar-group toolbar-results' },
        new Tag('span', { id: 'results-count' })
    ));

    return toolbar;
}

export function supportLevelToClass(value: SupportLevels | undefined): string {
    switch (value) {
        case SupportLevels.Full: return 'success';
        case SupportLevels.None:
        case undefined: return 'danger';
        case SupportLevels.Stubbed: return 'neutral';
        default: return 'warning';
    }
}

export class MetadataColumn extends TD {
    constructor(notes: Infos, ...path: string[]) {
        const value = retrieveValue(notes, [...path, '_note']) ?? retrieveValue(notes, ['root', ...path, '_note']);
        const text = typeof value === 'string' ? value : '';
        super({ class: 'note' }, new RawHTMLNode(text));
    }
}

export const theiaColumn = (value: SupportLevels | Comparison): Renderable => {
    switch (value) {
        case undefined:
        case SupportLevels.None:
            return ABSENT;
        case SupportLevels.Full: return CORRECT;
        case SupportLevels.Stubbed: return STUBBED;
        default:
            return INCORRECT;
    }
};

export const VSCodeColumn = (value: SupportLevels | Comparison): Renderable => {
    switch (value) {
        case SupportLevels.None: return NOT_APPLICABLE;
        default: return EXPECTED;
    }
};
