/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { Included } from './included';

export interface DocEntry {
    name?: string,
    type?: string,
    optional?: boolean,
    documentation?: string,
    kind?: string,
    signatures?: DocEntry[],
    parameters?: DocEntry[],
    return?: string,
    handleType?: string,
    modifiers?: string[];
    constructors?: DocEntry[],
    members?: DocEntry[];
    unions?: DocEntry[];
    value?: string;
    hash?: string;
    includedIn?: Included[];
}
