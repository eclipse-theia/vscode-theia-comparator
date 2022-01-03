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
import { Parser } from './parser';
import { DocEntry } from './doc-entry';

export class Comparator {

    private globalResult: Map<string, DocEntry[]>;

    constructor(private readonly vsCodeEntries: ScannerEntry[], private readonly theiaEntries: ScannerEntry[]) {

        // take latest vscode and then add value inside
        this.globalResult = new Map<string, DocEntry[]>();

    }

    result(): Map<string, DocEntry[]> {
        return this.globalResult;
    }

    init() {

        this.vsCodeEntries.forEach(vscodeEntry => {
            vscodeEntry.parser = new Parser();
            vscodeEntry.parser.generateDocumentation(vscodeEntry.path);
        });

        this.theiaEntries.forEach(theiaEntry => {
            theiaEntry.parser = new Parser();
            theiaEntry.parser.generateDocumentation(...theiaEntry.paths);
            const rootNS = theiaEntry.parser.getNamespaces().get(Parser.ROOT_NAMESPACE);
            const pluginContext = rootNS.find(entry => entry.name === 'PluginContext');
            if (pluginContext) {
                pluginContext.name = 'ExtensionContext';
            }
            const plugin = rootNS.find(entry => entry.name === 'Plugin');
            if (plugin) {
                plugin.name = 'Extension';

                const pluginPath = plugin.members.find(member => member.name === 'pluginPath');
                if (pluginPath) {
                    pluginPath.name = 'extensionPath';
                }

            }

        });

    }

    equalsConstructor(constructor1: DocEntry, constructor2: DocEntry): boolean {
        const oneWay = constructor1.parameters.map(param => constructor2.parameters.find(param2 => param2.name === param.name && param2.type === param.type));
        const otherWay = constructor2.parameters.map(param => constructor1.parameters.find(param2 => param2.name === param.name && param2.type === param.type));
        return oneWay.length === otherWay.length && oneWay.length === constructor1.parameters.length;
    }

    // now compare commands

    updateThenable(value: string) {
        if (value) {
            return value.replace(/Thenable/g, 'PromiseLike');
        }
        return '';
    }

    compare() {

        // init map with all entries of latest vsCode
        const latestParser = this.vsCodeEntries[0].parser;
        const latestVersion = this.vsCodeEntries[0].version;
        Array.from(latestParser.getNamespaces().keys()).forEach(vsCodeNamespaceKey => {
            const vscodeCommands = latestParser.getNamespaces().get(vsCodeNamespaceKey);
            this.globalResult.set(vsCodeNamespaceKey, vscodeCommands);

            if (vscodeCommands) {
                vscodeCommands.forEach(command => {
                    command.includedIn = [];
                    command.includedIn.push({ version: `vscode/${latestVersion}`, available: 'defined' });

                    if (command.members) {
                        command.members.forEach(member => {
                            member.includedIn = [];
                            member.includedIn.push({ version: `vscode/${latestVersion}`, available: 'defined' });
                        });
                    }

                    if (command.constructors) {
                        command.constructors.forEach(constructor => {
                            constructor.includedIn = [];
                            constructor.includedIn.push({ version: `vscode/${latestVersion}`, available: 'defined' });
                        });
                    }

                    if (command.unions) {
                        command.unions.forEach(union => {
                            union.includedIn = [];
                            union.includedIn.push({ version: `vscode/${latestVersion}`, available: 'defined' });
                        });
                    }

                });
            }

        }
        );

        // ok, now compare with each version of vscode (except latest one which is first index
        // it should be only yes or N/A
        Array.from(this.globalResult.keys()).forEach(vsCodeNamespaceKey => {

            for (let i = 1; i < this.vsCodeEntries.length; i++) {
                const currentVSCodeParser = this.vsCodeEntries[i].parser;
                const currentVsCodeCommands = currentVSCodeParser.getNamespaces().get(vsCodeNamespaceKey);
                const latestVsCodeCommands = this.globalResult.get(vsCodeNamespaceKey);

                if (latestVsCodeCommands) {
                    // compare from theia to vscode
                    latestVsCodeCommands.forEach(docEntryLatestVsCodeCommand => {
                        let inCurrent: DocEntry;
                        if (currentVsCodeCommands) {
                            inCurrent = currentVsCodeCommands.find(currentTmp => {
                                if (currentTmp.name === docEntryLatestVsCodeCommand.name) {
                                    if (docEntryLatestVsCodeCommand.hash) {
                                        if (currentTmp.hash === docEntryLatestVsCodeCommand.hash) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                return false;
                            });
                        }
                        if (!inCurrent) {
                            // need to flag it as 'N/A'
                            docEntryLatestVsCodeCommand.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'N/A' });

                            // Flag all members as N/A
                            if (docEntryLatestVsCodeCommand.members && docEntryLatestVsCodeCommand.members.length > 0) {
                                docEntryLatestVsCodeCommand.members.forEach(member => {
                                    member.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'N/A' });
                                });
                            }
                        } else {
                            // it's there, add it
                            docEntryLatestVsCodeCommand.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'defined' });

                            // now check members
                            if (docEntryLatestVsCodeCommand.members && docEntryLatestVsCodeCommand.members.length > 0) {
                                // ok so here search in all members if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.members.forEach(member => {
                                    const searchedMember = inCurrent.members?.find(currentMember =>
                                        (currentMember.name === member.name));

                                    // it's there, add it
                                    if (searchedMember) {
                                        member.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'defined' });
                                    } else {
                                        member.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'N/A' });
                                    }

                                });

                            }

                            if (docEntryLatestVsCodeCommand.constructors && docEntryLatestVsCodeCommand.constructors.length > 0) {
                                // ok so here search in all members if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.constructors.forEach(constructor => {
                                    const searchedConstructor = inCurrent.constructors?.find(currentConstructor =>
                                        this.equalsConstructor(currentConstructor, constructor));

                                    // it's there, add it
                                    if (searchedConstructor) {
                                        constructor.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'defined' });
                                    } else {
                                        constructor.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'N/A' });
                                    }

                                });

                            }

                            if (docEntryLatestVsCodeCommand.unions && docEntryLatestVsCodeCommand.unions.length > 0) {
                                // ok so here search in all unions if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.unions.forEach(union => {
                                    const searchedUnion = inCurrent.unions?.find(currentUnion =>
                                        currentUnion.name === union.name);

                                    // it's there, add it
                                    if (searchedUnion) {
                                        union.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'defined' });
                                    } else {
                                        union.includedIn.push({ version: `vscode/${this.vsCodeEntries[i].version}`, available: 'N/A' });
                                    }

                                });

                            }
                        }

                    });
                }
            }
        });

        // ok, now compare with each version of theia
        // it should be only yes or no
        Array.from(this.globalResult.keys()).forEach(vsCodeNamespaceKey => {

            for (let i = this.theiaEntries.length - 1; i >= 0; i--) {
                const theiaEntry = this.theiaEntries[i];
                const currentTheiaParser = theiaEntry.parser;

                const currentTheiaCommands = currentTheiaParser.getNamespaces().get(vsCodeNamespaceKey);
                const latestVsCodeCommands = this.globalResult.get(vsCodeNamespaceKey);

                if (latestVsCodeCommands) {
                    // compare from theia to vscode
                    latestVsCodeCommands.forEach(docEntryLatestVsCodeCommand => {
                        let inCurrent;
                        if (currentTheiaCommands) {
                            inCurrent = currentTheiaCommands.find(currentTmp => {
                                if (currentTmp.name === docEntryLatestVsCodeCommand.name) {
                                    if (docEntryLatestVsCodeCommand.hash) {
                                        if (currentTmp.hash === docEntryLatestVsCodeCommand.hash) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                return false;
                            });
                        }
                        if (!inCurrent) {
                            // need to flag it as 'no'
                            docEntryLatestVsCodeCommand.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });

                            // Flag all members as N/A
                            if (docEntryLatestVsCodeCommand.members && docEntryLatestVsCodeCommand.members.length > 0) {
                                docEntryLatestVsCodeCommand.members.forEach(member => {
                                    member.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });
                                });
                            }

                            if (docEntryLatestVsCodeCommand.constructors && docEntryLatestVsCodeCommand.constructors.length > 0) {
                                docEntryLatestVsCodeCommand.constructors.forEach(constructor => {
                                    constructor.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });
                                });
                            }
                        } else {
                            // it's there, add it
                            docEntryLatestVsCodeCommand.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'yes' });

                            // now check members
                            if (docEntryLatestVsCodeCommand.members && docEntryLatestVsCodeCommand.members.length > 0) {
                                // ok so here search in all members if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.members.forEach(member => {
                                    const searchedMember = inCurrent.members?.find(currentMember =>
                                        (currentMember.name === member.name));

                                    // it's there, add it
                                    if (searchedMember) {
                                        member.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'yes' });
                                    } else {
                                        member.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });
                                    }

                                });

                            }
                            if (docEntryLatestVsCodeCommand.constructors && docEntryLatestVsCodeCommand.constructors.length > 0) {
                                // ok so here search in all constructors if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.constructors.forEach(constructor => {
                                    const searchedConstrutor = inCurrent.constructors?.find(currentConstructor =>
                                        this.equalsConstructor(currentConstructor, constructor));

                                    // it's there, add it
                                    if (searchedConstrutor) {
                                        constructor.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'yes' });
                                    } else {
                                        constructor.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });
                                    }

                                });

                            }

                            if (docEntryLatestVsCodeCommand.unions && docEntryLatestVsCodeCommand.unions.length > 0) {
                                // ok so here search in all unions if it's defined in each vscode version
                                docEntryLatestVsCodeCommand.unions.forEach(union => {
                                    const searchedUnion = inCurrent.unions?.find(currentUnion => currentUnion.name === this.updateThenable(union.name));

                                    // it's there, add it
                                    if (searchedUnion) {
                                        union.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'yes' });
                                    } else {
                                        union.includedIn.unshift({ version: `theia/${theiaEntry.version}`, available: 'no' });
                                    }

                                });

                            }
                        }

                    });
                }
            }
        });

    }
}
