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
import { HTMLGenerator } from './html-generator';
import { GrabVSCodeVersions } from './grab-vscode-versions';
import { GrabTheiaVersions } from './grab-theia-versions';
import { parseInfos } from './infos';

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

    // Parse additional information
    console.log('⚙️  Parsing additional information from infos.yml...');
    const infoFileContent = fs.readFileSync(path.resolve(__dirname, '..', 'conf', 'infos.yml'), 'utf-8');
    const infos = parseInfos(infoFileContent);

    // Generate HTML output
    console.log('⚙️  Generating HTML report...');
    const htmlGenerator = new HTMLGenerator(vsCodeEntries, theiaEntries, comparator.result(), infos);
    const content = htmlGenerator.generate();
    await fs.ensureDir(path.resolve(__dirname, '../out'));
    const outputFile = path.resolve(__dirname, '../out', 'status.html');
    fs.writeFileSync(outputFile, content);
    console.log(`✍️  HTML status written at ${outputFile}`);

    // Generate filtered HTML report only containing entries unsupported in at least one theia version
    console.log('⚙️  Generating filtered HTML report...');
    comparator.removeSupported();
    const filteredHtmlGenerator = new HTMLGenerator(vsCodeEntries, theiaEntries, comparator.result(), infos);
    const filteredContent = filteredHtmlGenerator.generate();
    const filteredOutputFile = path.resolve(__dirname, '../out', 'filtered-status.html');
    fs.writeFileSync(filteredOutputFile, filteredContent);
    console.log(`✍️  Filtered HTML status written at ${filteredOutputFile}`);
}

if (!process.env.GITHUB_TOKEN) {
    console.error('🚒 Missing GITHUB_TOKEN environment variable');
    process.exit(1);
} else {

    init().catch(err => {
        console.error(`🚒 ${err}`);
        process.exit(1);
    });

}
