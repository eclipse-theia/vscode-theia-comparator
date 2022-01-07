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
import { DocEntry } from './doc-entry';

export class Parser {

    private checker: ts.TypeChecker;

    private namespaces = new Map<string, DocEntry[]>();
    public static readonly ROOT_NAMESPACE = 'root';

    serializeConstructorSymbol = (symbol: ts.Symbol): DocEntry =>
        ({
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(
                this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
            ),
            handleType: 'ConstructorDeclaration',
        })

    private serializeEnum(symbol: ts.Symbol) {
        const enumType = this.checker.getTypeAtLocation(symbol.declarations[0]) as ts.EnumType;

        const details = {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(enumType),
            handleType: 'EnumDeclaration',
            members: []
        };

        if ((enumType as any).types) {
            (enumType as any).types.forEach(type => {
                let typeDoc: DocEntry = {};
                typeDoc = {
                    name: type.symbol.getEscapedName(),
                    value: '' + (type as ts.LiteralType).value
                };
                details.members.push(typeDoc);

            });
        }
        return details;

    }

    private getMatchingSignature(node: ts.Node, signatures: ReadonlyArray<ts.Signature>): ts.Signature {
        return signatures.find(sig => sig.declaration.pos === node.pos && sig.declaration.end === node.end);

    }

    private getReturnType(signature: ts.Signature): string {
        return this.checker.typeToString(signature.getReturnType());
    }

    private hashCode(str) {
        return str.split('').reduce((prevHash, currVal) =>
            (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
    }

    private serializeFunction(node: ts.Node, symbol: ts.Symbol) {

        const funcType = this.checker.getTypeAtLocation(node);

        let toHash = symbol.getName();
        const functionSignature = this.getMatchingSignature(node, funcType.getCallSignatures());
        const returnType = this.getReturnType(functionSignature);

        const details: DocEntry = {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            return: returnType,
            handleType: 'FunctionDeclaration',
            parameters: []
        };

        functionSignature.parameters.forEach(parameter => {

            const memberDoc: DocEntry = {};
            memberDoc.name = parameter.name;
            const callSignature = this.getCallSignature(((parameter.valueDeclaration) as any).symbol);
            if (callSignature) {
                memberDoc.parameters = this.getParameterInfo(callSignature);
            }

            const parameterType = this.checker.getTypeAtLocation(parameter.valueDeclaration);
            memberDoc.type = this.checker.typeToString(parameterType);

            // Thenable --> PromiseLike for hash
            toHash += memberDoc.type.replace('Thenable', 'PromiseLike');

            details.parameters.push(memberDoc);
        });

        details.hash = this.hashCode(toHash);
        return details;
    }

    private serializeInterface(symbol: ts.Symbol) {

        const interfaceType = this.checker.getTypeAtLocation(symbol.declarations[0]);

        const details = {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(interfaceType),
            handleType: 'InterfaceDeclaration',
            members: []
        };

        const members = symbol.members;

        members.forEach(member => {

            const memberDoc: DocEntry = {};
            memberDoc.name = member.name;

            const callSignature = this.getCallSignature(symbol);
            if (callSignature) {
                memberDoc.parameters = this.getParameterInfo(callSignature);
            }
            memberDoc.type = this.syntaxKindToName(member.declarations[0].kind);
            try {
                memberDoc.documentation = ts.displayPartsToString(member.getDocumentationComment(this.checker));
            } catch (error) {
                memberDoc.documentation = '';
            }
            memberDoc.return = this.checker.typeToString(this.checker.getTypeAtLocation(member.declarations[0]));
            details.members.push(memberDoc);
        });

        return details;
    }

    private serializeTypeAlias(symbol: ts.Symbol) {
        const interfaceType = this.checker.getTypeAtLocation(symbol.declarations[0]) as ts.UnionOrIntersectionType;

        const details = {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(interfaceType),
            handleType: 'TypeAliasDeclaration',
            unions: []
        };

        if (interfaceType.types) {
            interfaceType.types.forEach(type => {
                let typeDoc: DocEntry = {};
                let name = 'UNKNOWN_TYPE';
                if ((type as any).intrinsicName) {
                    name = (type as any).intrinsicName;
                } else if ((type as ts.LiteralType).value) {
                    name = '' + ((type as ts.LiteralType)).value;
                } else if (type.symbol) {
                    name = type.symbol.getName();
                } else {
                    name = 'NOTFOUND';
                }
                typeDoc = { name };
                details.unions.push(typeDoc);

            });
        }

        return details;
    }

    /** Serialize a signature (call or construct) */
    serializeConstructorSignature = (signature: ts.Signature) =>
        ({
            parameters: signature.parameters.map(this.serializeConstructorSymbol),
            /*returnType: checker.typeToString(signature.getReturnType())*/
            /*documentation: ts.displayPartsToString(signature.getDocumentationComment(this.checker))*/
        })

    private getModifiers(member: ts.Symbol) {
        const modifiers: string[] = [];
        const flags = ts.getCombinedModifierFlags(member.valueDeclaration);
        const isStatic = (flags & ts.ModifierFlags.Static) !== 0; // tslint:disable-line no-bitwise

        if (isStatic) {
            modifiers.push('static');
        }

        return modifiers;
    }

    private getParameterInfo(callSignature: ts.Signature) {
        return callSignature.parameters.map(param =>
            ({
                /*description:
                  ts.displayPartsToString(
                    param.getDocumentationComment(checker)
                  ) || null,*/
                name: param.getName()
            }));
    }

    private syntaxKindToName(kind: ts.SyntaxKind) {
        return (<any>ts).SyntaxKind[kind];
    }

    private getCallSignature(symbol: ts.Symbol) {
        const symbolType = this.checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!
        );

        return symbolType.getCallSignatures()[0];
    }

    private addMemberDoc(details: DocEntry, symbol: ts.Symbol) {

        const memberDeclarations: ts.Declaration[] = symbol.getDeclarations();
        if (memberDeclarations.length > 0) {
            const memberDoc: DocEntry = {};
            memberDoc.documentation = ts.displayPartsToString(symbol.getDocumentationComment(this.checker));
            memberDoc.name = symbol.name;

            const callSignature = this.getCallSignature(symbol);
            if (callSignature) {
                memberDoc.parameters = this.getParameterInfo(callSignature);
                memberDoc.modifiers = this.getModifiers(symbol);
            }

            // syntax kind
            memberDoc.type = this.syntaxKindToName(memberDeclarations[0].kind);

            memberDoc.return = this.checker.typeToString(this.checker.getTypeAtLocation(memberDeclarations[0]));
            details.members.push(memberDoc);
        }

    }

    public getNamespaces(): Map<string, DocEntry[]> {
        return this.namespaces;
    }

    /** Serialize a class symbol information */
    private serializeClass(symbol: ts.Symbol) {
        const details = this.serializeClassSymbol(symbol);

        // Get the construct signatures
        const constructorType = this.checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!
        );

        // static methods
        const properties = constructorType.getProperties();
        if (properties) {
            constructorType.getProperties().forEach(property => {
                // Don't add class prototype definitions
                if (property.name !== 'prototype') {

                    this.addMemberDoc(details, property);
                }
            });
        }

        if (constructorType.getSymbol()) {
            const st: ts.SymbolTable = constructorType.getSymbol().members;
            st.forEach(s => {
                if (s.name !== '__constructor') {
                    this.addMemberDoc(details, s);
                }
            });
        }
        details.constructors = constructorType
            .getConstructSignatures()
            .map(this.serializeConstructorSignature);

        return details;
    }

    private serializeClassSymbol(symbol: ts.Symbol): DocEntry {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(
                this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
            ),
            handleType: 'ClassDeclaration',
            members: []
        };
    }

    private serializeVariable(symbol: ts.Symbol) {

        const variableType = this.checker.getTypeAtLocation(symbol.declarations[0]);

        const details = {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(variableType),
            handleType: 'VariableDeclaration'
        };

        return details;
    }

    /** Generate documentation for all classes in a set of .ts files */
    generateDocumentation(...paths: string[]): void {
        // Build a program using the set of root file names in fileNames
        const program = ts.createProgram(paths, { target: ts.ScriptTarget.ES5 });

        // Get the checker, we will use it to find more about classes
        this.checker = program.getTypeChecker();

        const entry: DocEntry[] = [];

        this.namespaces.set(Parser.ROOT_NAMESPACE, entry);

        paths.forEach(path => {

            const sourceFile = program.getSourceFile(path);

            console.log(`⚙️  Analyzing ${sourceFile.fileName}...`);

            const visit = (namespace: string) => (node: ts.Node) => {

                if (ts.isClassDeclaration(node) && node.name) {
                    // This is a top level class, get its symbol
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeClass(symbol));
                    }
                    // No need to walk any further, class expressions/inner declarations
                    // cannot be exported
                } else if (ts.isInterfaceDeclaration(node) && node.name) {
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeInterface(symbol));
                    }

                } else if (ts.isFunctionDeclaration(node) && node.name) {
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeFunction(node, symbol));
                    }

                } else if (ts.isEnumDeclaration(node) && node.name) {
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeEnum(symbol));
                    }

                } else if (ts.isVariableDeclaration(node) && node.name) {
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeVariable(symbol));
                    }
                } else if (ts.isTypeAliasDeclaration(node) && node.name) {
                    const symbol = this.checker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        this.namespaces.get(namespace).push(this.serializeTypeAlias(symbol));
                    }

                } else if (ts.isModuleDeclaration(node)) {
                    let updatedNamespace = namespace;
                    if ((node.name as any).escapedText) {
                        updatedNamespace = (node.name as any).escapedText;
                        if (!this.namespaces.has(updatedNamespace)) {
                            this.namespaces.set(updatedNamespace, []);
                        }
                    }
                    // This is a namespace, visit its children
                    ts.forEachChild(node, visit(updatedNamespace));

                } else {
                    ts.forEachChild(node, visit(namespace));
                }
            };

            ts.forEachChild(sourceFile, visit(Parser.ROOT_NAMESPACE));

        });

    }

}
