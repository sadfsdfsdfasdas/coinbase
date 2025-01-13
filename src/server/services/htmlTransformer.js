// src/services/enhancedHTMLTransformer.js
import crypto from 'crypto';

class EnhancedHTMLTransformer {
    static #xorKey = crypto.randomBytes(32); // Private XOR key

    static #xorEncrypt(text) {
        const result = [];
        for (let i = 0; i < text.length; i++) {
            result.push(text.charCodeAt(i) ^ this.#xorKey[i % this.#xorKey.length]);
        }
        return Buffer.from(result).toString('base64');
    }

    static #generateObfuscatedId() {
        const id = crypto.randomBytes(8).toString('hex');
        return encodeURIComponent(this.#xorEncrypt(id));
    }

    static encodeContent(content) {
        return encodeURIComponent(this.#xorEncrypt(content));
    }

    static async transform(html) {
        // Parse HTML using DOMParser-like approach
        const transformations = {
            // Transform script tags with dynamic nonces and encoded content
            scripts: () => {
                const nonce = crypto.randomBytes(16).toString('base64');
                return html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (match, attrs, content) => {
                    const encodedContent = this.encodeContent(content);
                    return `<script${attrs} nonce="${nonce}" data-encoded="${encodedContent}"></script>`;
                });
            },

            // Transform IDs with XOR encryption
            ids: () => {
                const idMap = new Map();
                return html.replace(/id="([^"]+)"/g, (match, id) => {
                    if (!idMap.has(id)) {
                        idMap.set(id, this.#generateObfuscatedId());
                    }
                    return `id="${idMap.get(id)}"`;
                });
            },

            // Transform class names with encoding
            classes: () => {
                const classMap = new Map();
                return html.replace(/class="([^"]+)"/g, (match, classes) => {
                    const newClasses = classes.split(' ').map(cls => {
                        if (!classMap.has(cls)) {
                            classMap.set(cls, `c_${this.#generateObfuscatedId()}`);
                        }
                        return classMap.get(cls);
                    }).join(' ');
                    return `class="${newClasses}"`;
                });
            },

            // Add encoded data attributes
            dataAttrs: () => {
                return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
                    if (crypto.randomBytes(1)[0] > 128) { // 50% chance
                        const encodedData = this.encodeContent(crypto.randomBytes(8).toString('hex'));
                        return `<${tag}${attrs} data-x="${encodedData}">`;
                    }
                    return match;
                });
            },

            // Transform inline styles with encoding
            styles: () => {
                return html.replace(/style="([^"]+)"/g, (match, styles) => {
                    const encodedStyles = this.encodeContent(styles);
                    return `style="${encodedStyles}" data-s="${crypto.randomBytes(4).toString('hex')}"`;
                });
            },

            // Add deobfuscation script
            deobfuscator: () => {
                const deobfuscatorScript = `
                    <script nonce="${crypto.randomBytes(16).toString('base64')}">
                        (function() {
                            const xk = '${this.#xorKey.toString('base64')}';
                            const xb = atob(xk);
                            function dx(t) {
                                return decodeURIComponent(t).split('').map((c, i) => 
                                    String.fromCharCode(c.charCodeAt(0) ^ xb.charCodeAt(i % xb.length))
                                ).join('');
                            }
                            document.querySelectorAll('[data-encoded]').forEach(el => {
                                if (el.dataset.encoded) {
                                    try {
                                        const dec = dx(el.dataset.encoded);
                                        if (el.tagName === 'SCRIPT') {
                                            const ns = document.createElement('script');
                                            ns.text = dec;
                                            el.parentNode.replaceChild(ns, el);
                                        }
                                    } catch(e) {}
                                }
                            });
                        })();
                    </script>
                `;
                return html.replace('</body>', `${deobfuscatorScript}</body>`);
            }
        };

        // Apply transformations in random order
        const transformOrder = Object.keys(transformations).sort(() => Math.random() - 0.5);
        let transformed = html;

        for (const key of transformOrder) {
            transformed = transformations[key](transformed);
        }

        // Add random metadata
        const metadata = `
            <meta name="x-${crypto.randomBytes(4).toString('hex')}" content="${this.#generateObfuscatedId()}">
            <meta name="t-${crypto.randomBytes(4).toString('hex')}" content="${Date.now()}">
        `;
        transformed = transformed.replace('</head>', `${metadata}</head>`);

        return transformed;
    }
}

export default EnhancedHTMLTransformer;
