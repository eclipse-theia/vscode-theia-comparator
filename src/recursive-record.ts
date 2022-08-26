/*********************************************************************
* Copyright (c) 2022 Ericsson.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

export interface RecursiveRecord<T> {
    [key: string]: T | RecursiveRecord<T>;
}

export function retrieveValue<T>(target: RecursiveRecord<T>, path: string[]): RecursiveRecord<T> | T | undefined {
    let current: RecursiveRecord<T> | T | undefined = target;
    for (const key of path) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[key];
    }
    return current;
}
