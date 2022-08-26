/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Infos } from '../infos';
import { VersionComparisons } from '../comparator';
import { Comparison } from '../parser';
import { filterComponent, HTML, MetadataColumn, NamespaceRow, Renderable, Row, Tag, TD, TextNode, TH, theiaColumn, TR, VSCodeColumn } from './components';
import { styles } from './style';
import { script } from './script';
import { retrieveValue } from '../recursive-record';

export class HTMLGenerator {

    static generate(comparisons: VersionComparisons, notes: Infos): string {
        const html = new HTML();
        html.head.appendChild(new Tag('base', { target: '_blank' }));
        html.head.appendChild(styles);
        const table = new Tag('table', { style: 'margin: auto;' });
        const thead = new Tag('thead');
        const tbody = new Tag('tbody', { id: 'full-report' });
        table.appendChildren(thead, tbody);
        html.body.appendChild(table);
        html.body.appendChild(script);

        const topRowProps = { class: 'top' };

        const firstRow = new TR({ style: 'position: sticky; top: 0; z-index: 1000' },
            filterComponent,
            ...Object.keys(comparisons.theia).map(version => new TH(topRowProps, new TextNode(`Theia ${version}`))),
            new TH(topRowProps, new TextNode(`VSCode ${comparisons.vscodeReferenceVersion}`)),
            ...Object.keys(comparisons.vscode).map(version => new TH(topRowProps, new TextNode(`VSCode ${version}`))),
            new TH({ style: 'text-align: center;', class: 'top' }, new TextNode('Note'))
        );
        thead.appendChild(firstRow);

        const namespaces = this.traverse(comparisons, notes);
        namespaces.forEach(namespaceContents => tbody.appendChildren(...namespaceContents));

        return html.render();
    }

    protected static traverse(comparisons: VersionComparisons, notes: Infos): Array<Renderable[]> {
        const numTheiaVersions = Object.keys(comparisons.theia).length;
        const numVscodeVersions = Object.keys(comparisons.vscode).length;
        // The Theia versions + VSCode versions + label + VSCode reference version + notes
        const totalColumns = numTheiaVersions + numVscodeVersions + 3;

        const namespaces = new Array<Renderable[]>([new NamespaceRow('root', totalColumns)]);

        const traverse = (current: Comparison, rows: Renderable[], ...pathSegments: string[]): Array<boolean | null> => {
            const success: Array<boolean | null | undefined> = new Array(numTheiaVersions + numVscodeVersions).fill(undefined);
            Object.keys(current).sort().forEach(key => {
                const value = current[key];
                const newPathSegments = [...pathSegments, key];
                if (value && typeof value === 'object') {
                    if (key.charAt(0).toLowerCase() === key.charAt(0)) { // Probably a namespace
                        const namespaceRenderables = [new NamespaceRow(key, totalColumns)];
                        namespaces.push(namespaceRenderables);
                        traverse(value, namespaceRenderables, ...newPathSegments);
                    } else {
                        const complexRow = new Row(key, true);
                        rows.push(complexRow);
                        const rowSuccess = traverse(value, rows, ...newPathSegments);
                        rowSuccess.forEach((aggregateSuccess, index) => {
                            if (index < numTheiaVersions) {
                                // Empty interfaces will leave the value undefined.
                                complexRow.appendChild(theiaColumn(aggregateSuccess === undefined ? true : aggregateSuccess));
                            }
                            if (index === numTheiaVersions - 1) {
                                complexRow.appendChild(VSCodeColumn(true)); // Reference version;
                            }
                            if (index >= numTheiaVersions) {
                                complexRow.appendChild(VSCodeColumn(aggregateSuccess));
                            }
                        });
                        complexRow.appendChild(new MetadataColumn(notes, ...newPathSegments));
                        if (!rowContainsProblems(rowSuccess, numTheiaVersions)) {
                            complexRow.addClass('to-filter');
                        }
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
                    entry.appendChild(VSCodeColumn(true)); // Reference Version
                    Object.values(comparisons.vscode).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version, newPathSegments);
                        updateSuccessValue(success, index + numTheiaVersions, valueAtLocation === null ? null : true);
                        entry.appendChild(VSCodeColumn(valueAtLocation));
                    });
                    entry.appendChild(new MetadataColumn(notes, ...newPathSegments));

                    rows.push(entry);
                    if (!appearsInFiltered) {
                        entry.addClass('to-filter');
                    }
                }
            });
            return success;
        };

        traverse(Object.values(comparisons.theia)[0].full, namespaces[0]);
        return namespaces;
    }

}

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

const rowContainsProblems = (successes: Array<boolean | null>, numTheiaVersions: number): boolean => {
    for (let i = 0; i < numTheiaVersions; i++) {
        if (successes[i] === null || successes[i] === false) {
            return true;
        }
    }
    return false;
};
