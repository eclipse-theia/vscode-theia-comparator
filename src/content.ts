
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

export class Content {
    public get(url: string) {
        return new Promise((resolve, reject) => {

            https.get(url, resp => {
                let data = '';
                resp.on('data', chunk => {
                    data += chunk;
                });
                resp.on('end', () => {
                    resolve(data);
                });
            }).on('"error', err => {
                reject(err);
            });
        });
    }
}
