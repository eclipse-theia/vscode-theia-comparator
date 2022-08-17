/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

/* tslint:disable */
import * as ts from 'typescript';
import { RecursiveRecord } from './recursive-record';

export interface Comparison extends RecursiveRecord<boolean | null> { }

export interface FullAndFilteredComparisons {
    full: Comparison;
    filtered: Comparison;
}

interface TypeContainer {
    [key: string]: ts.Type | TypeContainer;
}

interface EnhancedChecker extends ts.TypeChecker {
    isTypeIdenticalTo(source: ts.Type, target: ts.Type): boolean;
}

export class Parser {

    static compareVscodeToVscode(referenceDeclarations: TypeContainer | Comparison, otherVersion: string): Comparison {
        const program = ts.createProgram([otherVersion], { target: ts.ScriptTarget.ES2022 });
        const checker = program.getTypeChecker();
        const source = program.getSourceFile(otherVersion);
        const otherTypes = this.buildDeclarationTree(source, checker);
        const missing: Comparison = Object.create(null);
        const isLeaf = (value: boolean | ts.Type | TypeContainer | Comparison): value is boolean | ts.Type | null => !value || typeof value === 'boolean' || isType(value);
        const compare = (reference: TypeContainer | Comparison, other: TypeContainer, result: Comparison): Comparison => {
            Object.entries(reference).forEach(([key, value]) => {
                const correspondent = other[key];
                if (isLeaf(value)) {
                    if (correspondent === undefined) {
                        result[key] = null;
                    }
                } else {
                    const applicableCorrespondent: TypeContainer = isLeaf(correspondent) || !correspondent ? Object.create(null) : correspondent;
                    const failureContainer = Object.create(null);
                    compare(value, applicableCorrespondent, failureContainer);
                    if (Object.keys(failureContainer).length) {
                        result[key] = failureContainer;
                    }
                }
            });
            return result;
        };
        return compare(referenceDeclarations, otherTypes, missing);
    }

    /** Generate documentation for all classes in a set of .ts files */
    static compareTheiaToVscode(theiaEntryPoint: string, vscodeEntryPoint: string, ...paths: string[]): FullAndFilteredComparisons {

        const program = ts.createProgram([theiaEntryPoint, vscodeEntryPoint, ...paths], { target: ts.ScriptTarget.ES2022 });
        const theiaSource = program.getSourceFile(theiaEntryPoint);
        const vscodeSource = program.getSourceFile(vscodeEntryPoint);
        const checker = program.getTypeChecker() as EnhancedChecker;

        const VSCode = this.buildDeclarationTree(vscodeSource, checker);
        const Theia = this.buildDeclarationTree(theiaSource, checker);

        return this.compare(checker, VSCode, Theia);
    }

    private static buildDeclarationTree(source: ts.SourceFile, checker: ts.TypeChecker): TypeContainer {

        let enteredMainModule = false;
        const module = Object.create(null);

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
                ts.forEachChild(node, visit(target));
            }
        };
        ts.forEachChild(source, visit(module));

        return module;
    }

    private static compare(checker: EnhancedChecker, VSCode: TypeContainer, Theia: TypeContainer): FullAndFilteredComparisons {
        const comparison: Comparison = Object.create(null);
        const failuresOnly: Comparison = Object.create(null);
        const compare = (vscodeSide: TypeContainer, theiaSide: TypeContainer, result: Comparison, failures: Comparison): FullAndFilteredComparisons => {
            Object.entries(vscodeSide).forEach(([key, target]) => {
                const correspondent: TypeContainer | ts.Type | undefined = theiaSide[key];
                if (isType(target) && isType(correspondent)) {
                    const isCompatible = result[key] = checker.isTypeIdenticalTo(correspondent, target);
                    if (!isCompatible) {
                        failures[key] = false;
                    }
                } else if (isType(target)) {
                    const value = correspondent ? false : null;
                    result[key] = value;
                    failures[key] = value;
                } else {
                    const newFailures = Object.create(null);
                    const applicableCorrespondent = !correspondent || isType(correspondent) ? Object.create(null) : correspondent;
                    compare(target, applicableCorrespondent, result[key] = Object.create(null), newFailures);
                    if (Object.keys(newFailures).length) {
                        failures[key] = newFailures;
                    }
                }
            });
            return { full: result, filtered: failures, };
        };

        return compare(VSCode, Theia, comparison, failuresOnly);
    }
}

function isType(candidate: Record<string, unknown> | ts.Type): candidate is ts.Type {
    return typeof candidate?.getConstraint === 'function';
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
