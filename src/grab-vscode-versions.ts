/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as path from 'path';
import * as https from 'https';
import { GraphQLClient } from 'graphql-request';
import * as fs from 'fs-extra';
import { ScannerEntry } from './scanner-entry';
import { Content } from './content';

export class GrabVSCodeVersions {

    static readonly VSCODE_URL_PATTERN_PRE_1_63 = 'https://raw.githubusercontent.com/Microsoft/vscode/${VERSION}/src/vs/vscode.d.ts';
    static readonly VSCODE_URL_PATTERN = 'https://raw.githubusercontent.com/Microsoft/vscode/${VERSION}/src/vscode-dts/vscode.d.ts';
    // Version that is officially supported
    static readonly CURRENT_REFERENCE_VERSION = '1.53.2';
    // Target version that will be officially supported next
    static readonly CURRENT_REFERENCE_TARGET_VERSION = '1.55.2';

    private readonly content = new Content();

    // grab latest 6 VSCode versions

    public async grabVersions(): Promise<string[]> {
        console.log('🔍 Searching on github the VSCode versions...');
        const query = `{
    repository(owner: "Microsoft", name: "vscode") {
      refs(refPrefix: "refs/tags/", last: 20, orderBy: {field: TAG_COMMIT_DATE, direction: ASC}) {
        edges {
          node {
            name
            target {
              oid
              ... on Tag {
                message
                commitUrl
                tagger {
                  name
                  email
                  date
                }
              }
            }
          }
        }
      }
    }
  }`;

        const endpoint = 'https://api.github.com/graphql';
        const graphQLClient = new GraphQLClient(endpoint, {
            headers: {
                authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            },
        });
        const data = await graphQLClient.request(query);

        // reverse order
        const edges = (data as any).repository.refs.edges.reverse();

        // add only if changing major versions
        let currVersion = edges[0].node.name;
        const versions = [currVersion];
        edges.forEach(element => {
            if (element.node.name.substring(0, 4) !== currVersion.substring(0, 4)) {
                currVersion = element.node.name;
                versions.push(currVersion);
            }
        });

        // keep only the last 4 versions
        versions.length = 4;

        // add main version
        versions.unshift('main');

        // add current reference target version
        versions.push(GrabVSCodeVersions.CURRENT_REFERENCE_TARGET_VERSION);

        // add current reference version
        versions.push(GrabVSCodeVersions.CURRENT_REFERENCE_VERSION);

        return versions;
    }

    public async grab(): Promise<ScannerEntry[]> {
        const versions = await this.grabVersions();
        console.log(`🗂  The VSCode versions to compare will be ${versions.join(', ')}`);
        process.stdout.write('🗃  Grabbing content...');

        const versionsPath = await Promise.all(versions.map(async version => {
            const filePath = path.resolve(__dirname, `vscode-${version}.d.ts`);
            // The repository location of the api definition file changed with VSCode 1.63
            const major = parseInt(version.split('.')[0]);
            const minor = parseInt(version.split('.')[1]);
            const urlPattern = major === 1 && minor < 63
                ? GrabVSCodeVersions.VSCODE_URL_PATTERN_PRE_1_63
                : GrabVSCodeVersions.VSCODE_URL_PATTERN;
            const url = urlPattern.replace('${VERSION}', version);
            const content = await this.content.get(url);
            await fs.writeFile(filePath, content);
            const entry: ScannerEntry = { path: filePath, version };
            return entry;
        }));
        process.stdout.write('✔️ \n');
        return versionsPath;
    }
}
