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
import { Comparison, SupportLevels } from '../parser';
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

        const firstRow = new TR({ style: 'position: sticky; top: -1; z-index: 1000' },
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

        const traverse = (current: Comparison, rows: Renderable[], ...pathSegments: string[]): Array<SupportLevels> => {
            const success: Array<SupportLevels> = new Array(numTheiaVersions + numVscodeVersions).fill(undefined);
            Object.keys(current).sort().forEach(key => {
                const value = current[key];
                const newPathSegments = [...pathSegments, key];
                const effectiveDepth = Math.max(rows === namespaces[0] ? newPathSegments.length : (newPathSegments.length - 1), 1);
                if (value && typeof value === 'object') {
                    if (key.charAt(0).toLowerCase() === key.charAt(0)) { // Probably a namespace
                        const namespaceRenderables = [new NamespaceRow(key, totalColumns)];
                        namespaces.push(namespaceRenderables);
                        traverse(value, namespaceRenderables, ...newPathSegments);
                    } else {
                        const complexRow = new Row(key, effectiveDepth);
                        rows.push(complexRow);
                        const rowSuccess = traverse(value, rows, ...newPathSegments);
                        rowSuccess.forEach((aggregateSuccess, index) => {
                            if (index < numTheiaVersions) {
                                // Empty interfaces will leave the value undefined.
                                complexRow.appendChild(theiaColumn(aggregateSuccess === undefined ? SupportLevels.Full : aggregateSuccess));
                            }
                            if (index === numTheiaVersions - 1) {
                                complexRow.appendChild(VSCodeColumn(SupportLevels.Full)); // Reference version;
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
                    const entry = new Row(key, effectiveDepth);
                    Object.values(comparisons.theia).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version.full, newPathSegments);
                        appearsInFiltered ||= valueAtLocation === SupportLevels.None || valueAtLocation === SupportLevels.Partial || valueAtLocation === SupportLevels.Stubbed;
                        updateSuccessValue(success, index, typeof valueAtLocation === 'object' ? SupportLevels.Partial : valueAtLocation);
                        entry.appendChild(theiaColumn(valueAtLocation));
                    });
                    entry.appendChild(VSCodeColumn(SupportLevels.Full)); // Reference Version
                    Object.values(comparisons.vscode).forEach((version, index) => {
                        const valueAtLocation = retrieveValue(version, newPathSegments);
                        updateSuccessValue(success, index + numTheiaVersions, valueAtLocation === SupportLevels.None ? SupportLevels.None : SupportLevels.Full);
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

const updateSuccessValue = (successes: Array<SupportLevels>, index: number, newValue: SupportLevels) => {
    const current = successes[index];
    if (current === SupportLevels.Partial || current === newValue) { return; }
    if (current === undefined) {
        successes[index] = newValue;
    } else if (current === SupportLevels.Full) {
        successes[index] = SupportLevels.Partial;
    } else {
        successes[index] = Math.max(current, newValue);
    }
};

const rowContainsProblems = (successes: Array<SupportLevels>, numTheiaVersions: number): boolean => {
    for (let i = 0; i < numTheiaVersions; i++) {
        if (successes[i] !== SupportLevels.Full && successes[i] !== undefined) {
            return true;
        }
    }
    return false;
};
