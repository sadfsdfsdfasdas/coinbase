import crypto from 'crypto';

class HTMLTransformerService {
    static transformationStrategies = {
        classes: (html) => {
            const classMap = new Map();
            let classCounter = 0;
            return html.replace(/class="([^"]+)"/g, (match, classes) => {
                const newClasses = classes.split(' ').map(cls => {
                    if (!classMap.has(cls)) {
                        classMap.set(cls, `c${crypto.randomBytes(3).toString('hex')}_${classCounter++}`);
                    }
                    return classMap.get(cls);
                }).join(' ');
                return `class="${newClasses}"`;
            });
        },

        ids: (html) => {
            const idMap = new Map();
            let idCounter = 0;
            return html.replace(/id="([^"]+)"/g, (match, id) => {
                if (!idMap.has(id)) {
                    idMap.set(id, `i${crypto.randomBytes(3).toString('hex')}_${idCounter++}`);
                }
                return `id="${idMap.get(id)}"`;
            });
        },

        attributes: (html) => {
            return html.replace(/<([a-zA-Z0-9]+)([^>]+)>/g, (match, tag, attrs) => {
                const attributes = attrs.trim().split(/\s+(?=[a-zA-Z-]+=)/).filter(Boolean);
                const shuffled = attributes.sort(() => crypto.randomBytes(1)[0] / 255 - 0.5);
                return `<${tag} ${shuffled.join(' ')}>`;
            });
        },

        whitespace: (html) => {
            return html.replace(/>\s+</g, () => {
                const spaces = ' '.repeat(1 + Math.floor(crypto.randomBytes(1)[0] / 255 * 3));
                const linebreaks = '\n'.repeat(1 + Math.floor(crypto.randomBytes(1)[0] / 255));
                return `>${spaces}${linebreaks}<`;
            });
        },

        comments: (html) => {
            return html.replace(/<!--[\s\S]*?-->/g, () => {
                return `<!-- ${crypto.randomBytes(4).toString('hex')} -->`;
            });
        },

        dataAttributes: (html) => {
            return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
                if (crypto.randomBytes(1)[0] / 255 > 0.7) {
                    const randomData = `data-v${crypto.randomBytes(4).toString('hex')}="${crypto.randomBytes(4).toString('hex')}"`;
                    return `<${tag}${attrs} ${randomData}>`;
                }
                return match;
            });
        }
    };

    static async transformHTML(html) {
        const strategies = Object.values(this.transformationStrategies);
        const shuffledStrategies = strategies.sort(() => crypto.randomBytes(1)[0] / 255 - 0.5);

        let transformedHtml = html;
        for (const strategy of shuffledStrategies) {
            transformedHtml = strategy(transformedHtml);
        }

        // Add security headers and nonce for scripts
        const nonce = crypto.randomBytes(8).toString('hex');
        transformedHtml = transformedHtml.replace(/<script/g, `<script nonce="${nonce}"`);

        // Add random metadata
        const metaTags = [
            `<meta name="v${crypto.randomBytes(4).toString('hex')}" content="${crypto.randomBytes(4).toString('hex')}">`,
            `<meta name="t${crypto.randomBytes(4).toString('hex')}" content="${Date.now()}">`
        ];
        transformedHtml = transformedHtml.replace('</head>', `${metaTags.join('\n')}\n</head>`);

        return { transformedHtml, nonce };
    }

    static createSessionIdentifier() {
        return crypto.randomBytes(16).toString('hex');
    }
}

export default HTMLTransformerService;