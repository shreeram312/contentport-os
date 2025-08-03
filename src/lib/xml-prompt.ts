export class XmlPrompt {
  private parts: string[] = []

  tag(name: string, content: string, attrs?: Record<string, string | number>): this {
    const attrStr = this.buildAttrs(attrs)
    this.parts.push(`<${name}${attrStr}>${content}</${name}>`)
    return this
  }

  open(name: string, attrs?: Record<string, string | number>): this {
    const attrStr = this.buildAttrs(attrs)
    this.parts.push(`<${name}${attrStr}>`)
    return this
  }

  close(name: string): this {
    this.parts.push(`</${name}>`)
    return this
  }

  text(content: string): this {
    this.parts.push(content)
    return this
  }

  toString(): string {
    return this.parts.join('\n')
  }

  private buildAttrs(attrs?: Record<string, string | number>): string {
    if (!attrs) return ''
    return Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('')
  }
} 