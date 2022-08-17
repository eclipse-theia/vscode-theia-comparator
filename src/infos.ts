/*********************************************************************
* Copyright (c) 2022 STMicroelectronics.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as YAML from 'yaml';
import { RecursiveRecord } from './recursive-record';

export interface Infos extends RecursiveRecord<string> { }
interface Note {
    // Start with underscore to not conflict with sub element names
    _note?: string;
}
export type Info = Note & Infos;

export function parseInfos(yaml: string): Infos {
    try {
        const parsed = YAML.parse(yaml);
        // Always return an object
        if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
            return parsed;
        }
        console.info('ℹ  The parsed additional notes didn\'t result in an object. If conf/info.yml is empty, this is expected.');
        return {};
    } catch (err) {
        console.error('⚠  Failed to parse additional notes due to an error', err);
        return {};
    }
}
