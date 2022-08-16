/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { ScannerEntry } from './scanner-entry';
import { Infos, resolveInfo } from './infos';
import { VersionComparisons } from './comparator';
import { Comparison } from './parser';

interface Renderable {
    render(): string;
}

class TextNode implements Renderable {
    constructor(private text: string) { }
    render(): string {
        return this.text;
    }
}

class Tag implements Renderable {
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
}

class TR extends Tag {
    constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
        super('tr', properties, ...children);
    }
}

class TD extends Tag {
    constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
        super('td', properties, ...children);
    }
}

class TH extends Tag {
    constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
        super('th', properties, ...children);
    }
}

class Row extends TR {
    constructor(name: string, complex: boolean, ...children: Renderable[]) {
        const text = new TextNode(name);
        const props = complex ? { class: 'command' } : { style: 'padding-left: 16px;' };
        const firstColumn = new TD(props, complex ? new Tag('b', {}, text) : text);
        super({ class: 'bg-info' }, firstColumn, ...children);
    }
}

class Status extends TD {
    constructor(statusColor: string, statusEmoji: string) {
        super({ class: `bg-${statusColor}` }, new TextNode(statusEmoji));
    }
    override appendChild(): void { }
    override appendChildren(): void { }
}

const CORRECT = new Status('success', '✔️');
const ABSENT = new Status('danger', '✖️');
const INCORRECT = new Status('warning', '⚠️');
const NOT_APPLICABLE = new TD({ class: 'bg-light' }, new TextNode('N/A'));
const EXPECTED = new Status('info', '✔️');

export class HTMLGenerator {

    static generate(comparisons: VersionComparisons, notes: Infos): string {
        // ok, now export data to HTML

        // row = Each command
        // column = Each Theia version
        const numTheiaVersions = Object.keys(comparisons.theia).length;
        const numVscodeVersions = Object.keys(comparisons.vscode).length + 1; // Plus the reference versions
        // The Theia versions + VSCode versions + notes
        const totalColumns = numTheiaVersions + numVscodeVersions + 1;
        const html = new Tag('html');
        const head = new Tag('head', {}, new TextNode(`
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>
<base target="_blank">
<style>
a { color: #0056b3; }
</style>
        `));
        const body = new Tag('body');
        const table = new Tag('table');
        const thead = new Tag('thead');
        const tbodyFull = new Tag('tbody', { id: 'full-report' });
        const tbodyFiltered = new Tag('tbody', { id: 'filtered-report', style: 'display: none;' });
        table.appendChildren(thead, tbodyFull, tbodyFiltered);
        html.appendChildren(head, body);
        body.appendChild(table);
        body.appendChild(new TextNode(`
    <script>
        const form = document.getElementById('report-filter-selector-form');
        const fullReport = document.getElementById('full-report');
        const filteredReport = document.getElementById('filtered-report');
        const radioButtons = document.getElementsByClassName('report-filter-selector');
        Array.from(radioButtons).forEach(button => button.addEventListener('change', () => {
            if (form['report-filter-selector'].value === 'filtered') {
                fullReport.style.display = 'none';
                filteredReport.style.display = '';
            } else {
                filteredReport.style.display = 'none';
                fullReport.style.display = '';
            }
        }));
    </script>
        `))
        const topRowProps = { class: 'ide' };
        const namespaceRow = (name: string) => new TR({ class: 'bg-warning' },
            new TD({ colspan: totalColumns.toString() }, new TextNode(`namespace/${name}`)),
        );
        const firstRow = new TR({ class: 'bg-primary', style: 'position: sticky; top: 0; z-index: 1000' },
            new TH({ class: 'command' },
                new Tag('form', { id: 'report-filter-selector-form', style: 'display: flex; justify-content: space-around; align-items: center; flex-flow: row nowrap; height: 100%; width: 100%;' },
                    new Tag('label', { for: 'full-report-button' }, new TextNode('Full'), new Tag('input', { type: 'radio', class: 'report-filter-selector', name: 'report-filter-selector', id: 'full-report-button', value: "full", checked: 'true', style: 'margin-left: 8px;' })),
                    new Tag('label', { for: 'filtered-report-button' }, new TextNode('Filtered'), new Tag('input', { type: 'radio', class: 'report-filter-selector', name: 'report-filter-selector', id: 'filtered-report-button', value: "filtered", style: 'margin-left: 8px;' })),
                )),
            ...Object.keys(comparisons.theia).map(version => new TH(topRowProps, new TextNode(`Theia ${version}`))),
            new TH(topRowProps, new TextNode(`VSCode ${comparisons.vscodeReferenceVersion}`)),
            ...Object.keys(comparisons.vscode).map(version => new TH(topRowProps, new TextNode(`VSCode ${version}`))),
        );
        thead.appendChild(firstRow);
        const namespaces = new Array<[Renderable[], Renderable[]]>([[namespaceRow('root')], [namespaceRow('root')]]);
        const theiaColumn = (value: boolean | undefined | null | Comparison): Renderable => {
            switch (value) {
                case undefined:
                case null:
                    return ABSENT;
                case true: return CORRECT;
                default:
                    return INCORRECT;
            }
        };
        const VSCodeColumn = (value: boolean | undefined | null | Comparison): Renderable => {
            switch (value) {
                case null: return NOT_APPLICABLE;
                default: return EXPECTED;
            }
        };
        const traverse = (current: Comparison, rows: Renderable[], filteredRows: Renderable[], ...pathSegments: string[]): Array<boolean | null> => {
            const success: Array<boolean | null | undefined> = new Array(totalColumns - 2).fill(undefined);
            Object.keys(current).sort().forEach(key => {
                const value = current[key];
                const newPathSegments = [...pathSegments, key];
                if (value && typeof value === 'object') {
                    if (key.charAt(0).toLowerCase() === key.charAt(0)) { // Probably a namespace
                        const namespaceLabel = namespaceRow(key);
                        const namespaceRenderables: [Renderable[], Renderable[]] = [[namespaceLabel], [namespaceLabel]];
                        namespaces.push(namespaceRenderables)
                        traverse(value, namespaceRenderables[0], namespaceRenderables[1], ...newPathSegments);
                    } else {
                        const complexRow = new Row(key, true);
                        rows.push(complexRow);
                        const numFilteredRowsBeforeTraversal = filteredRows.push(complexRow);
                        const rowSuccess = traverse(value, rows, filteredRows, ...newPathSegments);
                        if (filteredRows.length === numFilteredRowsBeforeTraversal) { // No child rows were added - we should remove the complex row.
                            filteredRows.pop();
                        }
                        rowSuccess.forEach((aggregateSuccess, index) => {
                            if (index < numTheiaVersions) {
                                // Empty interfaces will leave the value undefined.
                                complexRow.appendChild(theiaColumn(aggregateSuccess === undefined ? true : aggregateSuccess));
                            }
                            if (index === numTheiaVersions - 1) {
                                complexRow.appendChild(EXPECTED); // Reference version
                            }
                            if (index >= numTheiaVersions) {
                                complexRow.appendChild(VSCodeColumn(aggregateSuccess));
                            }
                        });
                    }
                } else {
                    let appearsInFiltered = false;
                    const entry = new Row(key, false);
                    Object.values(comparisons.theia).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version.full, newPathSegments);
                        appearsInFiltered ||= valueAtLocation === null || valueAtLocation === false;
                        updateSuccessValue(success, index, (valueAtLocation && typeof valueAtLocation === 'object') ? false : valueAtLocation as boolean | null);
                        entry.appendChild(theiaColumn(valueAtLocation));
                    });
                    entry.appendChild(EXPECTED); // Reference Version
                    Object.values(comparisons.vscode).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version, newPathSegments);
                        updateSuccessValue(success, index + numTheiaVersions, valueAtLocation === null ? null : true);
                        entry.appendChild(VSCodeColumn(valueAtLocation));
                    });

                    rows.push(entry);
                    if (appearsInFiltered) {
                        filteredRows.push(entry);
                    }
                }
            });
            return success;
        };

        const updateSuccessValue = (successes: Array<boolean | null>, index: number, newValue: boolean | null) => {
            if (successes[index] === false) { return; }
            if (successes[index] === true) {
                successes[index] = newValue || false;
            } else if (successes[index] === null && newValue !== null) {
                successes[index] = false;
            } else if (successes[index] === undefined) {
                successes[index] = newValue;
            }
        };

        traverse(Object.values(comparisons.theia)[0].full, ...namespaces[0]);
        namespaces.forEach(([namespaceContents, filteredContents]) => {
            tbodyFull.appendChildren(...namespaceContents);
            tbodyFiltered.appendChildren(...filteredContents);
        });
        return html.render();
    }

}

function retrieveValue(target: Comparison, path: string[]): Comparison | boolean | null | undefined {
    let current: Comparison | boolean | null | undefined = target;
    for (const key of path) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[key];
    }
    return current;
}
