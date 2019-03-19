#!/usr/bin/env node
/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';
import { ScannerEntry } from './scanner-entry';
import { Comparator } from './comparator';
import { HTMLGenerator } from './html-generator';
import { GrabVSCodeVersions } from './grab-vscode-versions';
import { GrabTheiaVersions } from './grab-theia-versions';

async function init() {

    // grab remote VS Code versions dumped locally
    const grabTheiaVersions = new GrabTheiaVersions();
    const theiaEntries = await grabTheiaVersions.grab();

    // grab remote VS Code versions dumped locally
    const grabVSCodeVersions = new GrabVSCodeVersions();
    const vsCodeEntries = await grabVSCodeVersions.grab();

    // start comparator
    const comparator = new Comparator(vsCodeEntries, theiaEntries);
    comparator.init();
    comparator.compare();

    // Generate HTML output
    const htmlGenerator = new HTMLGenerator(vsCodeEntries, theiaEntries, comparator.result());
    const content = htmlGenerator.generate();
    await fs.ensureDir(path.resolve(__dirname, '../out'));
    const outputFile = path.resolve(__dirname, '../out', 'status.html');
    fs.writeFileSync(outputFile, content);
    console.log(`✍️  HTML status written at ${outputFile}`);
}

if (!process.env.GITHUB_TOKEN) {
    console.log('🚒 Missing GITHUB_TOKEN environment variable');
} else {

    init().catch(err => {
        console.log(`🚒 ${err}`);
    });

}
