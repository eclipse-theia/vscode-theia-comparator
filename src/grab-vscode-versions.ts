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
    static readonly THEIA_API_URL_PATTERN = 'https://raw.githubusercontent.com/eclipse-theia/theia/${VERSION}/dev-packages/application-package/src/api.ts';

    protected readonly argumentPrefix = 'vscode';
    protected readonly displayName = 'VSCode';
    protected readonly primaryBranchName = 'main';

    private readonly content = new Content();

    /** The VS Code version that Theia's latest release officially targets. */
    supportedVersion: string | undefined;

    /**
     * Resolve the VS Code supported version from a Theia version's api.ts.
     */
    async resolveSupportedVersion(theiaVersion: string): Promise<void> {
        const url = GrabVSCodeVersions.THEIA_API_URL_PATTERN.replace('${VERSION}', theiaVersion);
        try {
            const apiContent = await this.content.get(url) as string;
            const match = apiContent.match(/DEFAULT_SUPPORTED_API_VERSION\s*=\s*'([^']+)'/);
            if (match) {
                this.supportedVersion = match[1];
                console.log(`📌 Resolved VS Code supported version ${this.supportedVersion} from Theia ${theiaVersion}`);
                return;
            }
        } catch {
            // fall through
        }
        console.warn(`⚠️  Could not resolve VS Code supported version from Theia ${theiaVersion}`);
    }

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

        const edges = (data as any).repository.refs.edges.reverse();
        const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;

        // All valid tags, newest first
        const allTags: string[] = [];
        for (const edge of edges) {
            const name: string = edge.node.name;
            if (versionRegex.test(name)) { allTags.push(name); }
        }

        // Deduplicate to one per major.minor (for older versions)
        const seen = new Set<string>();
        const deduped: string[] = [];
        for (const tag of allTags) {
            const m = tag.match(versionRegex)!;
            const majorMinor = `${m[1]}.${m[2]}`;
            if (!seen.has(majorMinor)) {
                seen.add(majorMinor);
                deduped.push(tag);
            }
        }

        if (!this.supportedVersion) {
            return ['main', ...deduped.slice(0, 6)];
        }

        const parseVersion = (v: string) => {
            const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
            return m ? parseInt(m[1]) * 1000000 + parseInt(m[2]) * 1000 + parseInt(m[3]) : 0;
        };
        const supVersion = parseVersion(this.supportedVersion);

        // Newer: all individual tags strictly newer than supported (including same major.minor with higher patch)
        const newer = allTags.filter(t => parseVersion(t) > supVersion);
        // Older: deduplicated, 3 entries with lower major.minor
        const parseMajorMinor = (v: string) => {
            const m = v.match(/^(\d+)\.(\d+)/);
            return m ? parseInt(m[1]) * 10000 + parseInt(m[2]) : 0;
        };
        const supMajorMinor = parseMajorMinor(this.supportedVersion);
        const older = deduped.filter(t => parseMajorMinor(t) < supMajorMinor).slice(0, 3);

        // main first (comparator uses [0] as the comparison baseline), then newer, supported, older
        return ['main', ...newer, this.supportedVersion, ...older];
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
