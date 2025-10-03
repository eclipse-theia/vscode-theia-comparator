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
import untildify = require('untildify');
import { GraphQLClient } from 'graphql-request';
import * as fs from 'fs-extra';
import { ScannerEntry } from './scanner-entry';
import { Content } from './content';
import { AbstractVersionGrabber } from './abstract-version-grabber';

export class GrabVSCodeVersions extends AbstractVersionGrabber {

    static readonly VSCODE_URL_PATTERN = 'https://raw.githubusercontent.com/Microsoft/vscode/${VERSION}/src/vscode-dts/vscode.d.ts';
    // Version that is officially supported
    static readonly CURRENT_REFERENCE_VERSION = '1.104.0';
    protected readonly argumentPrefix = 'vscode';
    protected readonly displayName = 'VSCode';
    protected readonly primaryBranchName = 'main';

    private readonly content = new Content();

    // grab latest 4 VSCode versions
    protected async grabVersionsFromRemote(): Promise<string[]> {
        console.log('🔍 Searching on GitHub for tagged VSCode versions...');
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

        // add only if changing major.minor versions
        const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
        let currVersion = edges[0].node.name;
        const versions = [currVersion];
        const currMatch = currVersion.match(versionRegex);
        let currMajorMinor = currMatch ? `${currMatch[1]}.${currMatch[2]}` : '';

        edges.forEach(element => {
            const versionName = element.node.name;
            const match = versionName.match(versionRegex);
            const majorMinor = match ? `${match[1]}.${match[2]}` : '';

            if (majorMinor && majorMinor !== currMajorMinor) {
                currVersion = versionName;
                versions.push(currVersion);
                const newMatch = currVersion.match(versionRegex);
                currMajorMinor = newMatch ? `${newMatch[1]}.${newMatch[2]}` : '';
            }
        });

        // keep only the last 4 versions
        versions.length = 4;

        // add main version
        versions.unshift('main');

        // add current reference version
        versions.push(GrabVSCodeVersions.CURRENT_REFERENCE_VERSION);
        return versions;
    }

    protected async getPathFromCLI(): Promise<[ScannerEntry] | undefined> {
        const relativePathFromCLI = untildify(process.argv.slice(2).find(arg => arg.startsWith('vscode-path='))?.substring('vscode-path='.length) ?? '');
        if (relativePathFromCLI) {
            if (relativePathFromCLI.endsWith('.d.ts')) {
                const absolute = path.resolve(relativePathFromCLI);
                return (await fs.pathExists(absolute)) ? [{ version: 'local', path: absolute }] : undefined;
            }
        }
    }

    protected async versionToEntry(version: string): Promise<ScannerEntry> {
        const filePath = path.resolve(__dirname, `vscode-${version}.d.ts`);
        const url = GrabVSCodeVersions.VSCODE_URL_PATTERN.replace('${VERSION}', version);
        const content = await this.content.get(url);
        await fs.writeFile(filePath, content);
        return { path: filePath, version };
    }
}
