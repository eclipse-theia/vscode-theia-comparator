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

export interface Infos {
    [element: string]: Record<string, Info>;
}
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

/**
 * Resolve additional information for a namespace, an element (e.g. class, interface) or a sub element thereof (e.g. member, constructor).
 *
 * @param infos All additional information
 * @param namespace Namespace key of the element
 * @param element Name of the element
 * @param subElement Name of the sub element
 * @returns the resolved info or undefined if there is none
 */
export function resolveInfo(infos: Infos, namespace: string, element?: string, subElement?: string): Info | undefined {
    let resolved = infos[namespace];
    if (resolved && element) {
        resolved = resolved[element];
        if (resolved && subElement) {
            resolved = resolved[subElement];
        }
    }
    return resolved;
}
