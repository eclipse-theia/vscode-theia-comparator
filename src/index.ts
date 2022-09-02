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
import { Comparator } from './comparator';
import { HTMLGenerator } from './html-generator/html-generator';
import { GrabVSCodeVersions } from './grab-vscode-versions';
import { GrabTheiaVersions } from './grab-theia-versions';
import { parseInfos } from './infos';

async function init() {

    // Find or download the declaration files for Theia and VSCode
    const theiaEntries = await new GrabTheiaVersions().grab();
    const vsCodeEntries = await new GrabVSCodeVersions().grab();

    const comparisons = Comparator.compare(vsCodeEntries, theiaEntries);

    // Parse additional information
    console.log('⚙️  Parsing additional information from infos.yml...');
    const infoFileContent = fs.readFileSync(path.resolve(__dirname, '..', 'conf', 'infos.yml'), 'utf-8');
    const infos = parseInfos(infoFileContent);

    // Generate HTML output
    console.log('⚙️  Generating HTML report...');
    const content = HTMLGenerator.generate(comparisons, infos);
    await fs.ensureDir(path.resolve(__dirname, '../out'));
    const outputFile = path.resolve(__dirname, '../out', 'status.html');
    fs.writeFileSync(outputFile, content);
    console.log(`✍️  HTML status written at ${outputFile}`);
}

if (!process.env.GITHUB_TOKEN) {
    console.error('🚒 Missing GITHUB_TOKEN environment variable');
    process.exit(1);
} else {

    init().catch(err => {
        console.error(`🚒 ${err.stack}`);
        process.exit(1);
    });

}
