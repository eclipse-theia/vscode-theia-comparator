/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

// Here to add some functions that are done inside the code
declare module '@theia/plugin' {

    export namespace extensions {

        export function getExtension(extensionId: string): Extension<any> | undefined;

        export function getExtension<T>(extensionId: string): Extension<T> | undefined;

        export let all: Extension<any>[];
    }


    export namespace commands {
        export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    }


}