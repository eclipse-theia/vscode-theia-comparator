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
    const theiaGrabber = new GrabTheiaVersions();
    const theiaEntries = await theiaGrabber.grab();

    // Resolve the VS Code supported version from the latest tagged Theia release
    const vscodeGrabber = new GrabVSCodeVersions();
    const theiaVersions = await theiaGrabber.grabVersions();
    const latestTheiaTag = theiaVersions.find(v => v.startsWith('v')) ?? theiaVersions[0];
    await vscodeGrabber.resolveSupportedVersion(latestTheiaTag);
    const vsCodeEntries = await vscodeGrabber.grab();

    const comparisons = Comparator.compare(vsCodeEntries, theiaEntries);

    // Parse additional information
    console.log('⚙️  Parsing additional information from infos.yml...');
    const infoFileContent = fs.readFileSync(path.resolve(__dirname, '..', 'conf', 'infos.yml'), 'utf-8');
    const infos = parseInfos(infoFileContent);

    // Generate HTML output
    console.log('⚙️  Generating HTML report...');
    const content = HTMLGenerator.generate(comparisons, infos, vscodeGrabber.supportedVersion);
    await fs.ensureDir(path.resolve(__dirname, '../out'));
    const outputFile = path.resolve(__dirname, '../out', 'status.html');
    fs.writeFileSync(outputFile, content);
    const fileUri = `file://${outputFile}`;
    console.log(`✍️  HTML status written at ${outputFile}`);
    console.log(`🔗 Open in browser: ${fileUri}`);
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
