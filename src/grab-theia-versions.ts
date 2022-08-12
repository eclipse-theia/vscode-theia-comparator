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
import * as fs from 'fs-extra';
import untildify = require('untildify');
import { GraphQLClient } from 'graphql-request';
import { ScannerEntry } from './scanner-entry';
import { Content } from './content';
import { AbstractVersionGrabber } from './abstract-version-grabber';

export class GrabTheiaVersions extends AbstractVersionGrabber {

    static readonly THEIA_URL_PATTERN = 'https://raw.githubusercontent.com/theia-ide/theia/${VERSION}/packages/plugin/src/theia.d.ts';

    private readonly content = new Content();
    protected readonly argumentPrefix = 'theia';
    protected readonly displayName = 'Theia';
    protected readonly primaryBranchName = 'master';

    protected async grabVersionsFromRemote(): Promise<string[]> {
        console.log('🔍 Searching on GitHub for tagged Theia versions...');
        const query = `{
    repository(owner: "theia-ide", name: "theia") {
      refs(refPrefix: "refs/tags/", last: 15, orderBy: {field: TAG_COMMIT_DATE, direction: ASC}) {
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
        // add master and some latest tags
        const versions = ['master'];
        edges.forEach(element => {
            const currentVersion = element.node.name;
            if (currentVersion.startsWith('v')) {
                versions.push(currentVersion);
            }
        });

        // keep only 3 versions
        versions.length = 3;
        return versions;
    }

    protected async getPathFromCLI(): Promise<[ScannerEntry] | undefined> {
        const relativePathFromCLI = untildify(process.argv.slice(2).find(arg => arg.startsWith('theia-path='))?.substring('theia-path='.length) ?? '');
        if (relativePathFromCLI) {
            const theiaFromCLI = relativePathFromCLI.endsWith('theia.d.ts') ? path.resolve(relativePathFromCLI) : path.resolve(relativePathFromCLI, 'packages', 'plugin', 'src', 'theia.d.ts');
            if (await fs.pathExists(theiaFromCLI)) {
                return [{ paths: [path.resolve(__dirname, '../conf', 'vscode-theia.d.ts')], version: 'local', path: path.resolve(theiaFromCLI) }];
            }
        }
    }

    protected async versionToEntry(version: string): Promise<ScannerEntry> {
        const filePath = path.resolve(__dirname, `theia-${version}.d.ts`);
        const url = GrabTheiaVersions.THEIA_URL_PATTERN.replace('${VERSION}', version);
        const content = await this.content.get(url);
        await fs.writeFile(filePath, content);
        const paths = [path.resolve(__dirname, '../conf', 'vscode-theia.d.ts')];
        return { paths, version, path: filePath };
    }
}
