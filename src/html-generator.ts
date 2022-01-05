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
import { DocEntry } from './doc-entry';

export class HTMLGenerator {

    constructor(private readonly vsCodeEntries: ScannerEntry[], private readonly theiaEntries: ScannerEntry[], private readonly globalResult: Map<string, DocEntry[]>) {

    }

    generate(): string {
        // ok, now export data to HTML

        // row = Each command
        // column = Each Theia version

        let html = `<html>
<head>
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css" integrity="sha384-fnmOCqbTlWIlj8LyTjo7mOUStjsKC4pOpQbqyi7RrhN7udi9RwhKkMHpvLbHG9Sr" crossorigin="anonymous">
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/js/bootstrap.min.js" integrity="sha384-B0UglyR+jN6CkvvICOB2joaf5I4l3gm9GU6Hc1og6Ls7i6U/mkkaduKaBhlAXv9k" crossorigin="anonymous"></script>
</head>
<body>
<div class="container">
`;

        let firstRow = '<div class="row  bg-primary"><div class="col-4 command">&nbsp;</div>';
        this.theiaEntries.forEach(theiaEntry => firstRow += `<div class="col ide">Theia ${theiaEntry.version}</div>`);
        this.vsCodeEntries.forEach(vsCodeEntry => firstRow += `<div class="col ide">VSCode ${vsCodeEntry.version}</div>`);
        firstRow += '</div>';
        html += firstRow;

        // loop on result
        Array.from(this.globalResult.keys()).forEach(namespaceKey => {

            html += `<div class="row bg-warning"><div class="col-4">namespace/${namespaceKey}</div></div>`;

            const commands = this.globalResult.get(namespaceKey).sort(this.byKey);

            commands.forEach(command => {
                let row = `<div class="row bg-info"><div class="col-4 command" title="${this.htmlEntities(command.documentation)}">${this.handleTypeIcon(command)} <b>${command.name}</b></div>`;
                row += this.generateInclusionColumns(command);
                row += '</div>';

                if (command.constructors && command.constructors.length > 0 && command.includedIn[0].available === 'yes') {

                    command.constructors.forEach(constructor => {
                        let subRow = `<div class="row bg-info"><div class="col-4 command">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;constructor(${this.constructorPrettyName(constructor)})</div>`;
                        subRow += this.generateInclusionColumns(constructor);
                        subRow += '</div>';
                        row += subRow;

                    });

                }

                // has members ? if yes then add lines for methods
                if (command.members && command.members.length > 0 && command.includedIn[0].available === 'yes') {

                    command.members.forEach(member => {
                        let subRow = `<div class="row bg-info"><div class="col-4 command" title="${this.htmlEntities(member.documentation)}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${member.name}</div>`;
                        subRow += this.generateInclusionColumns(member);
                        subRow += '</div>';
                        row += subRow;

                    });

                }

                // has unions ? if yes then add lines for methods
                if (command.unions && command.unions.length > 0 && command.includedIn[0].available === 'yes') {

                    command.unions.forEach(union => {
                        let subRow = `<div class="row bg-info"><div class="col-4 command">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${union.name}</div>`;
                        subRow += this.generateInclusionColumns(union);
                        subRow += '</div>';
                        row += subRow;

                    });

                }

                html += row;
            });

        });

        html += '</div></body></html>';

        return html;
    }

    private handleTypeIcon(entry: DocEntry): string {
        if (entry.handleType === 'ClassDeclaration') {
            return '<i title="Class" class="fa fa-copyright"></i>';
        } else if (entry.handleType === 'InterfaceDeclaration') {
            return '<i title="Interface" class="fas fa-info-circle"></i>';
        } else if (entry.handleType === 'EnumDeclaration') {
            return '<i title="Enum" class="fas fa-list-ol"></i>';
        } else if (entry.handleType === 'FunctionDeclaration') {
            return '<i title="Function" class="fab fa-foursquare"></i>';
        } else if (entry.handleType === 'VariableDeclaration') {
            return '<i title="Variable" class="fab fa-vimeo"></i>';
        } else if (entry.handleType === 'TypeAliasDeclaration') {
            return '<i title="TypeAlias" class="fab fa-tumblr-square"></i>';
        }

        return `Unknown ${entry.handleType}`;
    }

    private byKey(a: DocEntry, b: DocEntry): number {
        return a.name.localeCompare(b.name);
    }

    private constructorPrettyName(constructor: DocEntry): string {
        return constructor.parameters!.map(parameter => parameter.name).join('/');
    }

    private htmlEntities(content: string): string {
        if (!content) {
            return 'N/A';
        }
        return content.replace(/[\u00A0-\u9999<>\&]/gim, i =>
            '&#' + i.charCodeAt(0) + ';');
    }

    private generateInclusionColumns(element: DocEntry): string {
        if (!element.includedIn) {
            return '';
        }
        let columns = '';
        element.includedIn.forEach(included => {
            columns += '<div class="col ';
            let txt = '';
            if (included.available === 'N/A') {
                txt = 'N/A';
                columns += 'bg-light';
            } else if (included.available === 'yes') {
                txt = '<i class="fa fa-check"></i>';
                columns += 'bg-success';
            } else if (included.available === 'defined') {
                txt = '<i class="fa fa-check"></i>';
                columns += 'bg-info';
            } else if (included.available === 'no') {
                txt = '<i class="fa fa-times"></i>';
                columns += 'bg-danger';
            }

            columns += `" title="${included.version}">${txt}</div>`;
        });

        return columns;
    }
}
