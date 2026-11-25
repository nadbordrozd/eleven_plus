// A tiny DOM stand-in so the visual renderers can run in Node and produce SVG/HTML strings.
const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export class MiniNode {
  constructor(tag) { this.tag = tag; this.attributes = {}; this.children = []; this.textContent = ''; this.hidden = false; this.className = ''; this.style = { setProperty() {} }; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  append(...children) { this.children.push(...children.map((child) => (typeof child === 'string' ? new TextNode(child) : child))); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener() {}
  get classList() { const node = this; return { add: (name) => { node.className = `${node.className} ${name}`.trim(); }, toggle() {}, contains: () => false }; }
  toString() {
    const attributes = { ...this.attributes, ...(this.className ? { class: this.className } : {}) };
    const attrs = Object.entries(attributes).map(([key, value]) => ` ${key}="${escapeXml(value)}"`).join('');
    return `<${this.tag}${attrs}>${escapeXml(this.textContent)}${this.children.map(String).join('')}</${this.tag}>`;
  }
  /** Visible text, depth first. */
  text() { return `${this.textContent}${this.children.map((child) => (child.text ? child.text() : String(child))).join('')}`; }
}

class TextNode {
  constructor(text) { this.value = text; }
  toString() { return escapeXml(this.value); }
  text() { return this.value; }
}

export function installMiniDom() {
  globalThis.document = { createElementNS: (_namespace, tag) => new MiniNode(tag), createElement: (tag) => new MiniNode(tag), querySelector: () => null, querySelectorAll: () => [] };
}
