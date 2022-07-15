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

export abstract class AbstractVersionGrabber {
    /** A prefix for CLI args for this grabber */
    protected abstract readonly argumentPrefix: string;
    protected abstract readonly displayName: string;
    protected abstract readonly primaryBranchName: string;
    protected versionsFromCLI(): string[] | undefined {
        const argLabel = `${this.argumentPrefix}-versions=`;
        return process.argv.slice(2).find(arg => arg.startsWith(argLabel))?.substring(argLabel.length).split(',').filter(Boolean).sort((a, b) => {
            if (a === 'local') { return -1; }
            if (b === 'local') { return 1; }
            if (a === this.primaryBranchName) { return -1; }
            if (b === this.primaryBranchName) { return 1; }
            return 0;
        });
    }

    async grabVersions(): Promise<string[]> {
        return this.versionsFromCLI() ?? this.grabVersionsFromRemote();
    }

    protected abstract grabVersionsFromRemote(): Promise<string[]>;

    public async grab(): Promise<ScannerEntry[]> {
        const entryFromCli = await this.getPathFromCLI();
        if (entryFromCli) {
            const versionsFromCLI = this.versionsFromCLI();
            this.logVersions([`local repository at ${entryFromCli[0].path}`].concat(versionsFromCLI ?? []));
            return versionsFromCLI ? entryFromCli.concat(await this.versionsToEntries(versionsFromCLI)) : entryFromCli;
        }
        const versions = await this.grabVersions();
        this.logVersions(versions);
        return this.versionsToEntries(versions);
    }

    protected abstract getPathFromCLI(): Promise<[ScannerEntry] | undefined>;

    protected async versionsToEntries(versions: string[]): Promise<ScannerEntry[]> {
        process.stdout.write('🗃  Grabbing content...');
        const entries = await Promise.all(versions.map(async version => this.versionToEntry(version)));
        process.stdout.write('✔️ \n');
        return entries;
    }

    protected abstract versionToEntry(version: string): Promise<ScannerEntry>;

    private logVersions(versions: string[]): void {
        console.log(`🗂  The ${this.displayName} versions to compare will be ${versions.join(', ')}`);
    }
}
