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
import { type } from 'os';
import * as ts from 'typescript';
import { RecursiveRecord } from './recursive-record';

export const enum SupportLevels {
    None,
    Stubbed,
    Partial,
    Full,
}

export interface Comparison extends RecursiveRecord<SupportLevels> { }

export interface FullAndFilteredComparisons {
    full: Comparison;
    filtered: Comparison;
}

interface TypeContainer extends RecursiveRecord<NodeAndType> { }

class NodeAndType {
    constructor(readonly type: ts.Type, readonly node: NamedDeclarations) { }
}

interface EnhancedChecker extends ts.TypeChecker {
    isTypeAssignableTo(source: ts.Type, target: ts.Type): boolean;
}

export class Parser {

    static compareVscodeToVscode(referenceDeclarations: TypeContainer | Comparison, otherVersion: string): Comparison {
        const program = ts.createProgram([otherVersion], { target: ts.ScriptTarget.ES2022 });
        const checker = program.getTypeChecker();
        const source = program.getSourceFile(otherVersion);
        const otherTypes = this.buildDeclarationTree(source, checker);
        const missing: Comparison = Object.create(null);
        const isLeaf = (value: boolean | NodeAndType | TypeContainer | Comparison): value is boolean | NodeAndType | null => !value || typeof value === 'boolean' || isType(value);
        const compare = (reference: TypeContainer | Comparison, other: TypeContainer, result: Comparison): Comparison => {
            Object.entries(reference).forEach(([key, value]) => {
                const correspondent = other[key];
                if (isLeaf(value)) {
                    if (correspondent === undefined) {
                        result[key] = SupportLevels.None;
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
                ts.isVariableDeclaration(node)
                || ts.isTypeAliasDeclaration(node)
                || ts.isFunctionDeclaration(node)
                || ts.isPropertyDeclaration(node)
                || ts.isConstructorDeclaration(node)
                || ts.isMethodDeclaration(node)
                || ts.isPropertySignature(node)
                || ts.isMethodSignature(node)
                || ts.isEnumMember(node)
            ) {
                const simpleNodeName = getName(node);
                if (simpleNodeName) {
                    target[simpleNodeName] = new NodeAndType(checker.getTypeAtLocation(node), node);
                }
            } else if (
                ts.isModuleDeclaration(node)
                || ts.isEnumDeclaration(node)
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
                const correspondent: TypeContainer | NodeAndType | undefined = theiaSide[key];
                if (isType(target) && isType(correspondent)) {
                    const isStubbed = (correspondent.type.symbol?.declarations ?? []).flatMap(node => ts.getJSDocTags(node)).some(tag => tag.tagName.escapedText === 'stubbed');
                    if (isStubbed) {
                        result[key] = SupportLevels.Stubbed;
                        failures[key] = SupportLevels.Stubbed;
                    } else {
                        let isCompatible;
                        // Is a function or method with several overload declarations - TS will automatically merge declarations, so to get extra detail, we fall back to text
                        if ((ts.isFunctionDeclaration(target.node) || ts.isMethodDeclaration(target.node)) && target.type.symbol.declarations.length > 1) {
                            const targetDeclarations = target.type.symbol.declarations.map(node => extractTextWithoutComments(node));
                            const correspondingDeclarations = correspondent.type.symbol.declarations.map(node => extractTextWithoutComments(node));
                            isCompatible = targetDeclarations.every(declaration => correspondingDeclarations.some(candidate => candidate === declaration));
                        } else {
                            const isTheiaAssignableToVscode = checker.isTypeAssignableTo(correspondent.type, target.type);
                            const isVSCodeAssignableToTheia = checker.isTypeAssignableTo(target.type, correspondent.type);
                            isCompatible = (isTheiaAssignableToVscode && isVSCodeAssignableToTheia) || areTextuallyIdentical(target.node, correspondent.node);
                        }
                        result[key] = isCompatible ? SupportLevels.Full : SupportLevels.Partial;
                        if (!isCompatible) {
                            failures[key] = SupportLevels.Partial;
                        }
                    }
                } else if (isType(target)) {
                    const value = correspondent ? SupportLevels.Partial : SupportLevels.None;
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

function isType(candidate: RecursiveRecord<unknown> | NodeAndType): candidate is NodeAndType {
    return candidate instanceof NodeAndType;
}

type NamedDeclarations = ts.ClassDeclaration | ts.MethodSignature | ts.PropertySignature | ts.ClassElement | ts.InterfaceDeclaration | ts.FunctionDeclaration | ts.EnumDeclaration | ts.VariableDeclaration | ts.TypeAliasDeclaration | ts.ModuleDeclaration | ts.EnumMember;

function getName(node: NamedDeclarations): string {
    try {
        if (ts.isConstructorDeclaration(node)) {
            return 'constructor';
        }
        return node.name.getText();
    } catch {
        return '';
    }
}

function areTextuallyIdentical(one: NamedDeclarations, other: NamedDeclarations): boolean {
    const oneText = extractTextWithoutComments(one); const otherText = extractTextWithoutComments(other);
    return oneText === otherText;
}

function extractTextWithoutComments(node: ts.Node): string {
    return node.getChildren()
        .map(child => {
            if (ts.isJSDoc(child)) {
                return ''
            }
            if (child.getChildCount() > 0) {
                return extractTextWithoutComments(child);
            }
            const candidate = child.getFullText().slice(child.getLeadingTriviaWidth()).trim();
            return candidate;
        })
        .join('')
        .replace(/\s/g, '');
}
