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

class Div extends Tag {
    constructor(properties: Record<string, string> = Object.create(null), ...children: Renderable[]) {
        super('div', properties, ...children);
    }
}

class Row extends Div {
    constructor(name: string, complex: boolean, ...children: Renderable[]) {
        const text = new TextNode(name);
        const props = { class: complex ? 'col-4 command' : 'col-4' };
        const firstColumn = new Div(props, complex ? new Tag('b', {}, text) : new Div({ style: 'padding-left: 16px;' }, text));
        super({ class: 'row bg-info' }, firstColumn, ...children);
    }
}

class Status extends Div {
    constructor(statusColor: string, statusEmoji: string) {
        super({ class: `col bg-${statusColor}`, style: 'max-width: 90px;' }, new TextNode(statusEmoji));
    }
    override appendChild(): void { }
    override appendChildren(): void { }
}

const CORRECT = new Status('success', '✔️');
const ABSENT = new Status('danger', '✖️');
const INCORRECT = new Status('warning', '✖️');
const NOT_APPLICABLE = new Div({ class: 'col bg-light', style: 'max-width: 90px;' }, new TextNode('N/A'));
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
        const pageContainer = new Div({ class: 'container-fluid' });
        html.appendChildren(head, body);
        body.appendChild(pageContainer);
        const topRowProps = { class: 'col ide', style: 'max-width: 90px;' };
        const namespaceRow = (name: string) => new Div({ class: 'row bg-warning' },
            new Div({ class: 'col-4' }, new TextNode(`namespace/${name}`)),
            ...new Array(totalColumns).fill(new Div({ class: 'col', style: 'max-width: 90px;' }))
        );
        const firstRow = new Div({ class: 'row bg-primary', style: 'position: sticky; top: 0; z-index: 1000' },
            new Div({ class: 'col-4 command' }, new TextNode('&nbsp;')),
            ...Object.keys(comparisons.theia).map(version => new Div(topRowProps, new TextNode(`Theia ${version}`))),
            new Div(topRowProps, new TextNode(`VSCode ${comparisons.vscodeReferenceVersion}`)),
            ...Object.keys(comparisons.vscode).map(version => new Div(topRowProps, new TextNode(`VSCode ${version}`))),
        );
        pageContainer.appendChild(firstRow);
        const namespaces = new Array<Renderable[]>([namespaceRow('root')]);
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
        const traverse = (current: Comparison, rows: Renderable[], ...pathSegments: string[]): Array<boolean | null> => {
            const success: Array<boolean | null | undefined> = new Array(totalColumns - 2).fill(undefined);
            Object.keys(current).sort().forEach(key => {
                const value = current[key];
                const newPathSegments = [...pathSegments, key];
                if (value && typeof value === 'object') {
                    if (key.charAt(0).toLowerCase() === key.charAt(0)) { // Probably a namespace
                        const namespaceRows = [namespaceRow(key)];
                        traverse(value, namespaceRows, ...newPathSegments);
                    } else {
                        const complexRow = new Row(key, true);
                        rows.push(complexRow);
                        const rowSuccess = traverse(value, rows, ...newPathSegments);
                        rowSuccess.forEach((aggregateSuccess, index) => {
                            if (index < numTheiaVersions) {
                                complexRow.appendChild(theiaColumn(aggregateSuccess === undefined ? true : aggregateSuccess)); // Empty interfaces will leave the value undefined.
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
                    const entry = new Row(key, false);
                    Object.values(comparisons.theia).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version.full, newPathSegments);
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
                }
            });
            return success;
        };

        const updateSuccessValue = (successes: Array<boolean | null>, index: number, newValue: boolean | null) => {
            if (successes[index] === false) { return; }
            if (successes[index] === true) { successes[index] = newValue || false; } else if (successes[index] === null && newValue !== null) { successes[index] = false; } else if (successes[index] === undefined) { successes[index] = newValue; }
        };

        traverse(Object.values(comparisons.theia)[0].full, namespaces[0]);
        namespaces.forEach(namespaceContents => pageContainer.appendChildren(...namespaceContents));
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
