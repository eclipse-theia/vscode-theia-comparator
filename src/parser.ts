/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as ts from 'typescript';

export interface Comparison {
    [key: string]: boolean | null | Comparison;
}

interface TypeContainer {
    [key: string]: ts.Type | TypeContainer;
}

export class Parser {

    /** Generate documentation for all classes in a set of .ts files */
    static compareTheiaToVscode(theiaEntryPoint: string, vscodeEntryPoint: string, ...paths: string[]): void {

        /* tslint:disable */
        const VSCode: TypeContainer = Object.create(null);
        const Theia: TypeContainer = Object.create(null);

        const program = ts.createProgram(paths, { target: ts.ScriptTarget.ES2022 });
        const theiaSource = program.getSourceFile(theiaEntryPoint);
        const vscodeSource = program.getSourceFile(vscodeEntryPoint);
        const checker = program.getTypeChecker() as ts.TypeChecker & { isTypeIdenticalTo(source: ts.Type, target: ts.Type): boolean };
        const unhandledTypes = new Set();

        [vscodeSource, theiaSource].forEach((source, index) => {

            let module = index === 0 ? VSCode : Theia;
            let enteredMainModule = false;

            const visit = (target: TypeContainer) => (node: ts.Node) => {
                if (
                    ts.isEnumDeclaration(node)
                    || ts.isVariableDeclaration(node)
                    || ts.isTypeAliasDeclaration(node)
                    || ts.isFunctionDeclaration(node)
                    || ts.isPropertyDeclaration(node)
                    || ts.isConstructorDeclaration(node)
                    || ts.isMethodDeclaration(node)
                    || ts.isPropertySignature(node)
                    || ts.isMethodSignature(node)
                ) {
                    const simpleNodeName = getName(node);
                    if (simpleNodeName) {
                        target[simpleNodeName] = checker.getTypeAtLocation(node);
                    }
                } else if (
                    ts.isModuleDeclaration(node)
                    || ts.isClassDeclaration(node)
                    || ts.isInterfaceDeclaration(node)
                ) {
                    if (enteredMainModule) {
                        const complexNodeName = getName(node);
                        const newTarget = target[complexNodeName] = Object.create(null);
                        ts.forEachChild(node, visit(newTarget));
                    } else {
                        enteredMainModule = true;
                        ts.forEachChild(node, visit(target));
                    }
                } else {
                    unhandledTypes.add(node.kind);
                    ts.forEachChild(node, visit(target));
                }
            };
            ts.forEachChild(source, visit(module));
        });

        const comparison: Comparison = Object.create(null);
        const failuresOnly: Comparison = Object.create(null);
        const compare = (vscodeSide: TypeContainer, theiaSide: TypeContainer, result: Comparison, failures: Comparison): void => {
            Object.entries(vscodeSide).forEach(([key, target]) => {
                const correspondent = theiaSide[key];
                if (!correspondent) {
                    result[key] = null;
                } else if (isType(target) && isType(correspondent)) {
                    const isCompatible = result[key] = checker.isTypeIdenticalTo(correspondent, target);
                    if (!isCompatible) {
                        failures[key] = false;
                    }
                } else if (isType(target) || isType(correspondent)) {
                    result[key] = false;
                } else {
                    const newFailures = Object.create(null);
                    compare(target, correspondent, result[key] = Object.create(null), newFailures);
                    if (Object.keys(newFailures).length) {
                        failures[key] = newFailures;
                    }
                }
            });
        }

        compare(VSCode, Theia, comparison, failuresOnly);
        console.log('SENTINEL FOR BAD TYPES AND THINGS THAT FAIL', unhandledTypes);
        process.exit(1);
    }
}

function isType(candidate: Record<string, unknown> | ts.Type): candidate is ts.Type {
    return typeof candidate.getConstraint === 'function';
}

function getName(node: ts.ClassDeclaration | ts.MethodSignature | ts.PropertySignature | ts.ClassElement | ts.InterfaceDeclaration | ts.FunctionDeclaration | ts.EnumDeclaration | ts.VariableDeclaration | ts.TypeAliasDeclaration | ts.ModuleDeclaration): string {
    try {
        if (ts.isConstructorDeclaration(node)) {
            return 'constructor';
        }
        return node.name.getText();
    } catch {
        // checkType(node);
        return '';
    }
}
