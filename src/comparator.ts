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
import { Comparison, FullAndFilteredComparisons, Parser } from './parser';

export interface VersionComparisons {
    /** keys are version numbers */
    theia: Record<string, FullAndFilteredComparisons>
    /** keys are version numbers */
    vscode: Record<string, Comparison>
    vscodeReferenceVersion: string;
}

export class Comparator {

    static compare(vscodeEntries: ScannerEntry[], theiaEntries: ScannerEntry[]): VersionComparisons {
        const vscodeReferenceEntry = vscodeEntries[0];
        let referenceComparison: Comparison;
        const theia = theiaEntries.reduce<Record<string, FullAndFilteredComparisons>>((comparisons, current) => {
            this.logWork(current.path);
            comparisons[current.version] = Parser.compareTheiaToVscode(current.path, vscodeReferenceEntry.path, ...current.paths);
            referenceComparison ??= comparisons[current.version].full;
            return comparisons;
        }, Object.create(null));
        const vscode = vscodeEntries.slice(1).reduce<Record<string, Comparison>>((comparisons, current) => {
            this.logWork(current.path);
            comparisons[current.version] = Parser.compareVscodeToVscode(referenceComparison, current.path);
            return comparisons;
        }, Object.create(null));
        return {
            theia,
            vscode,
            vscodeReferenceVersion: vscodeReferenceEntry.version,
        };
    }

    static logWork(path: string): void {
        console.log(`⚙️  Analyzing ${path}...`);
    }
}
