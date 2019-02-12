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

    static readonly VSCODE_URL_PATTERN = 'https://raw.githubusercontent.com/Microsoft/vscode/${VERSION}/src/vs/vscode.d.ts';

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
        versions.unshift('master');

        // keep only 5 versions
        versions.length = 5;
        return versions;
    }

    public async grab(): Promise<ScannerEntry[]> {
        const versions = await this.grabVersions();
        console.log(`🗂  The VSCode versions to compare will be ${versions.join(', ')}`);
        process.stdout.write('🗃  Grabbing content...');

        const versionsPath = await Promise.all(versions.map(async version => {
            const filePath = path.resolve(__dirname, `vscode-${version}.d.ts`);
            const url = GrabVSCodeVersions.VSCODE_URL_PATTERN.replace('${VERSION}', version);
            const content = await this.content.get(url);
            await fs.writeFile(filePath, content);
            const entry: ScannerEntry = { path: filePath, version };
            return entry;
        }));
        process.stdout.write('✔️ \n');
        return versionsPath;
    }
}
