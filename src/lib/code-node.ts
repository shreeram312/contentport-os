// /**
//  * Copyright (c) Meta Platforms, Inc. and affiliates.
//  *
//  * This source code is licensed under the MIT license found in the
//  * LICENSE file in the root directory of this source tree.
//  *
//  */

// import type { CodeHighlightNode } from "@lexical/code"
// import type {
//   DOMConversionMap,
//   DOMConversionOutput,
//   DOMExportOutput,
//   EditorConfig,
//   LexicalEditor,
//   LexicalNode,
//   LexicalUpdateJSON,
//   NodeKey,
//   ParagraphNode,
//   RangeSelection,
//   SerializedElementNode,
//   Spread,
//   TabNode,
// } from "lexical"

// import { addClassNamesToElement, isHTMLElement } from "@lexical/utils"
// import {
//   $applyNodeReplacement,
//   $createLineBreakNode,
//   $createParagraphNode,
//   $createTabNode,
//   $isTabNode,
//   $isTextNode,
//   ElementNode,
// } from "lexical"

// import { Prism } from "./code-highlighter-prism"
// import {
//   $createCodeHighlightNode,
//   $getFirstCodeNodeOfLine,
//   $isCodeHighlightNode,
// } from "./code-highlight-node"

// export type SerializedCodeNode = Spread<
//   {
//     language: string | null | undefined
//   },
//   SerializedElementNode
// >

// const isLanguageSupportedByPrism = (
//   language: string | null | undefined
// ): boolean => {
//   try {
//     // eslint-disable-next-line no-prototype-builtins
//     return language ? Prism.languages.hasOwnProperty(language) : false
//   } catch {
//     return false
//   }
// }

// function hasChildDOMNodeTag(node: Node, tagName: string) {
//   for (const child of node.childNodes) {
//     if (isHTMLElement(child) && child.tagName === tagName) {
//       return true
//     }
//     hasChildDOMNodeTag(child, tagName)
//   }
//   return false
// }

// const LANGUAGE_DATA_ATTRIBUTE = "data-language"
// const HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE = "data-highlight-language"

// /** @noInheritDoc */
// export class CodeNode extends ElementNode {
//   /** @internal */
//   __language: string | null | undefined
//   /** @internal */
//   __isSyntaxHighlightSupported: boolean

//   static getType(): string {
//     return "code"
//   }

//   static clone(node: CodeNode): CodeNode {
//     return new CodeNode(node.__language, node.__key)
//   }

//   constructor(language?: string | null | undefined, key?: NodeKey) {
//     super(key)
//     this.__language = language || undefined
//     this.__isSyntaxHighlightSupported = isLanguageSupportedByPrism(language)
//   }

//   // View
//   createDOM(config: EditorConfig): HTMLElement {
//     const element = document.createElement("code")
//     addClassNamesToElement(element, config.theme.code)
//     element.setAttribute("spellcheck", "false")
//     const language = this.getLanguage()
//     if (language) {
//       element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language)

//       if (this.getIsSyntaxHighlightSupported()) {
//         element.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language)
//       }
//     }
//     return element
//   }
//   updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
//     const language = this.__language
//     const prevLanguage = prevNode.__language

//     if (language) {
//       if (language !== prevLanguage) {
//         dom.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language)

//         if (this.__isSyntaxHighlightSupported) {
//           dom.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language)
//         }
//       }
//     } else if (prevLanguage) {
//       dom.removeAttribute(LANGUAGE_DATA_ATTRIBUTE)

//       if (prevNode.__isSyntaxHighlightSupported) {
//         dom.removeAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE)
//       }
//     }
//     return false
//   }

//   exportDOM(editor: LexicalEditor): DOMExportOutput {
//     const element = document.createElement("pre")
//     addClassNamesToElement(element, editor._config.theme.code)
//     element.setAttribute("spellcheck", "false")
//     const language = this.getLanguage()
//     if (language) {
//       element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language)

//       if (this.getIsSyntaxHighlightSupported()) {
//         element.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language)
//       }
//     }
//     return { element }
//   }

//   static importDOM(): DOMConversionMap | null {
//     return {
//       // Typically <pre> is used for code blocks, and <code> for inline code styles
//       // but if it's a multi line <code> we'll create a block. Pass through to
//       // inline format handled by TextNode otherwise.
//       code: (node: Node) => {
//         const isMultiLine =
//           node.textContent != null &&
//           (/\r?\n/.test(node.textContent) || hasChildDOMNodeTag(node, "BR"))

//         return isMultiLine
//           ? {
//               conversion: $convertPreElement,
//               priority: 1,
//             }
//           : null
//       },
//       div: () => ({
//         conversion: $convertDivElement,
//         priority: 1,
//       }),
//       pre: () => ({
//         conversion: $convertPreElement,
//         priority: 0,
//       }),
//       table: (node: Node) => {
//         const table = node
//         // domNode is a <table> since we matched it by nodeName
//         if (isGitHubCodeTable(table as HTMLTableElement)) {
//           return {
//             conversion: $convertTableElement,
//             priority: 3,
//           }
//         }
//         return null
//       },
//       td: (node: Node) => {
//         // element is a <td> since we matched it by nodeName
//         const td = node as HTMLTableCellElement
//         const table: HTMLTableElement | null = td.closest("table")

//         if (isGitHubCodeCell(td) || (table && isGitHubCodeTable(table))) {
//           // Return a no-op if it's a table cell in a code table, but not a code line.
//           // Otherwise it'll fall back to the T
//           return {
//             conversion: convertCodeNoop,
//             priority: 3,
//           }
//         }

//         return null
//       },
//       tr: (node: Node) => {
//         // element is a <tr> since we matched it by nodeName
//         const tr = node as HTMLTableCellElement
//         const table: HTMLTableElement | null = tr.closest("table")
//         if (table && isGitHubCodeTable(table)) {
//           return {
//             conversion: convertCodeNoop,
//             priority: 3,
//           }
//         }
//         return null
//       },
//     }
//   }

//   static importJSON(serializedNode: SerializedCodeNode): CodeNode {
//     return $createCodeNode().updateFromJSON(serializedNode)
//   }

//   updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedCodeNode>): this {
//     return super
//       .updateFromJSON(serializedNode)
//       .setLanguage(serializedNode.language)
//   }

//   exportJSON(): SerializedCodeNode {
//     return {
//       ...super.exportJSON(),
//       language: this.getLanguage(),
//     }
//   }

//   // Mutation
//   insertNewAfter(
//     selection: RangeSelection,
//     restoreSelection = true
//   ): null | ParagraphNode | CodeHighlightNode | TabNode {
//     const children = this.getChildren()
//     const childrenLength = children.length

//     if (
//       childrenLength >= 2 &&
//       children[childrenLength - 1]?.getTextContent() === "\n" &&
//       children[childrenLength - 2]?.getTextContent() === "\n" &&
//       selection.isCollapsed() &&
//       selection.anchor.key === this.__key &&
//       selection.anchor.offset === childrenLength
//     ) {
//       children[childrenLength - 1]?.remove()
//       children[childrenLength - 2]?.remove()
//       const newElement = $createParagraphNode()
//       this.insertAfter(newElement, restoreSelection)
//       return newElement
//     }

//     // If the selection is within the codeblock, find all leading tabs and
//     // spaces of the current line. Create a new line that has all those
//     // tabs and spaces, such that leading indentation is preserved.
//     const { anchor, focus } = selection
//     const firstPoint = anchor.isBefore(focus) ? anchor : focus
//     const firstSelectionNode = firstPoint.getNode()
//     if ($isTextNode(firstSelectionNode)) {
//       let node: null | LexicalNode = $getFirstCodeNodeOfLine(firstSelectionNode)
//       const insertNodes = []
//       // eslint-disable-next-line no-constant-condition
//       while (true) {
//         if ($isTabNode(node)) {
//           insertNodes.push($createTabNode())
//           node = node.getNextSibling()
//         } else if ($isCodeHighlightNode(node)) {
//           let spaces = 0
//           const text = node.getTextContent()
//           const textSize = node.getTextContentSize()
//           while (spaces < textSize && text[spaces] === " ") {
//             spaces++
//           }
//           if (spaces !== 0) {
//             insertNodes.push($createCodeHighlightNode(" ".repeat(spaces)))
//           }
//           if (spaces !== textSize) {
//             break
//           }
//           node = node.getNextSibling()
//         } else {
//           break
//         }
//       }
//       const split = firstSelectionNode.splitText(anchor.offset)[0]
//       const x = anchor.offset === 0 ? 0 : 1
//       const index = split.getIndexWithinParent() + x
//       const codeNode = firstSelectionNode.getParentOrThrow()
//       const nodesToInsert = [$createLineBreakNode(), ...insertNodes]
//       codeNode.splice(index, 0, nodesToInsert)
//       const last = insertNodes[insertNodes.length - 1]
//       if (last) {
//         last.select()
//       } else if (anchor.offset === 0) {
//         split.selectPrevious()
//       } else {
//         split.getNextSibling()!.selectNext(0, 0)
//       }
//     }
//     if ($isCodeNode(firstSelectionNode)) {
//       const { offset } = selection.anchor
//       firstSelectionNode.splice(offset, 0, [$createLineBreakNode()])
//       firstSelectionNode.select(offset + 1, offset + 1)
//     }

//     return null
//   }

//   canIndent(): false {
//     return false
//   }

//   collapseAtStart(): boolean {
//     const paragraph = $createParagraphNode()
//     const children = this.getChildren()
//     children.forEach((child) => paragraph.append(child))
//     this.replace(paragraph)
//     return true
//   }

//   setLanguage(language: string | null | undefined): this {
//     const writable = this.getWritable()
//     writable.__language = language || undefined
//     writable.__isSyntaxHighlightSupported = isLanguageSupportedByPrism(language)
//     return writable
//   }

//   getLanguage(): string | null | undefined {
//     return this.getLatest().__language
//   }

//   getIsSyntaxHighlightSupported(): boolean {
//     return this.getLatest().__isSyntaxHighlightSupported
//   }
// }

// export function $createCodeNode(
//   language?: string | null | undefined
// ): CodeNode {
//   return $applyNodeReplacement(new CodeNode(language))
// }

// export function $isCodeNode(
//   node: LexicalNode | null | undefined
// ): node is CodeNode {
//   return node instanceof CodeNode
// }

// function $convertPreElement(domNode: HTMLElement): DOMConversionOutput {
//   const language = domNode.getAttribute(LANGUAGE_DATA_ATTRIBUTE)
//   return { node: $createCodeNode(language) }
// }

// function $convertDivElement(domNode: Node): DOMConversionOutput {
//   // domNode is a <div> since we matched it by nodeName
//   const div = domNode as HTMLDivElement
//   const isCode = isCodeElement(div)
//   if (!isCode && !isCodeChildElement(div)) {
//     return {
//       node: null,
//     }
//   }
//   return {
//     node: isCode ? $createCodeNode() : null,
//   }
// }

// function $convertTableElement(): DOMConversionOutput {
//   return { node: $createCodeNode() }
// }

// function convertCodeNoop(): DOMConversionOutput {
//   return { node: null }
// }

// function isCodeElement(div: HTMLElement): boolean {
//   return div.style.fontFamily.match("monospace") !== null
// }

// function isCodeChildElement(node: HTMLElement): boolean {
//   let parent = node.parentElement
//   while (parent !== null) {
//     if (isCodeElement(parent)) {
//       return true
//     }
//     parent = parent.parentElement
//   }
//   return false
// }

// function isGitHubCodeCell(
//   cell: HTMLTableCellElement
// ): cell is HTMLTableCellElement {
//   return cell.classList.contains("js-file-line")
// }

// function isGitHubCodeTable(table: HTMLTableElement): table is HTMLTableElement {
//   return table.classList.contains("js-file-line-container")
// }
