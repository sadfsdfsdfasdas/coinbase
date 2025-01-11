import crypto from 'crypto';

// Advanced timing constants
const ANALYSIS_WINDOW = 30 * 1000; // 30 seconds
const PATTERN_MEMORY = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// Cache structures
const clientPatterns = new Map();
const behaviorCache = new Map();
const legitimateClients = new WeakSet();

/**
 * Advanced Browser Fingerprinting and Verification System
 * Sophisticated browser environment validation
 */
class BrowserVerification {
    static generateFingerprint(req) {
        const browserComponents = [
            req.headers['user-agent'],
            req.headers['accept'],
            req.headers['accept-language'],
            req.headers['accept-encoding'],
            req.headers['sec-ch-ua'],
            req.headers['sec-ch-ua-platform'],
            req.headers['sec-fetch-dest'],
            req.headers['sec-fetch-mode'],
            req.headers['sec-fetch-site']
        ].filter(Boolean);

        return crypto
            .createHash('sha256')
            .update(browserComponents.join(':|:'))
            .digest('hex');
    }

    static validateBrowserEnvironment(req) {
        const headers = req.headers;
        let score = 0;
        const maxScore = 100;

        // Required modern browser headers
        const requiredHeaders = [
            'sec-ch-ua',
            'sec-ch-ua-platform',
            'sec-ch-ua-mobile',
            'sec-fetch-site',
            'sec-fetch-mode',
            'sec-fetch-dest',
            'accept',
            'accept-encoding',
            'accept-language'
        ];

        // Score header presence and validity
        for (const header of requiredHeaders) {
            if (headers[header]) {
                score += 10;
                // Additional points for correct format
                if (this.validateHeaderFormat(header, headers[header])) {
                    score += 5;
                }
            }
        }

        // User-Agent analysis
        if (headers['user-agent']) {
            score += this.analyzeUserAgent(headers['user-agent']);
        }

        return {
            valid: score >= 70,
            score,
            maxScore
        };
    }

    static validateHeaderFormat(header, value) {
        const patterns = {
            'sec-ch-ua': /"[^"]*"|v="[^"]*"/,
            'sec-ch-ua-mobile': /^\?[01]$/,
            'sec-ch-ua-platform': /"[^"]*"/,
            'sec-fetch-site': /^(none|same-origin|same-site|cross-site)$/,
            'sec-fetch-mode': /^(navigate|same-origin|no-cors|cors)$/,
            'sec-fetch-dest': /^(document|script|style|image|font)$/
        };

        return !patterns[header] || patterns[header].test(value);
    }

    static analyzeUserAgent(ua) {
        let score = 0;
        
        // Check for standard browser patterns
        if (/Chrome\/[\d.]+/.test(ua)) score += 5;
        if (/Firefox\/[\d.]+/.test(ua)) score += 5;
        if (/Safari\/[\d.]+/.test(ua)) score += 5;
        if (/Edge\/[\d.]+/.test(ua)) score += 5;
        if (/Mobile/.test(ua)) score += 5;

        // Check for OS patterns
        if (/Windows NT [\d.]+/.test(ua)) score += 5;
        if (/Macintosh.*Mac OS X [\d_]+/.test(ua)) score += 5;
        if (/Linux/.test(ua)) score += 5;
        if (/Android [\d.]+/.test(ua)) score += 5;
        if (/iPhone OS [\d_]+/.test(ua)) score += 5;

        return score;
    }
}

/**
 * Advanced Behavioral Analysis
 * Sophisticated pattern recognition for human-like behavior
 */
class BehaviorAnalysis {
    static analyze(req, fingerprint) {
        const now = Date.now();
        let clientData = behaviorCache.get(fingerprint) || {
            patterns: [],
            lastSeen: now,
            score: 0
        };

        // Update patterns
        clientData.patterns.push({
            timestamp: now,
            path: req.path,
            method: req.method,
            headers: this.getRelevantHeaders(req.headers)
        });

        // Maintain pattern window
        clientData.patterns = clientData.patterns.filter(p => 
            now - p.timestamp < PATTERN_MEMORY
        );

        // Analyze behavior
        const analysis = this.analyzeBehaviorPatterns(clientData.patterns);
        clientData.score = this.calculateBehaviorScore(analysis);
        clientData.lastSeen = now;

        behaviorCache.set(fingerprint, clientData);
        return analysis;
    }

    static getRelevantHeaders(headers) {
        return {
            encoding: headers['accept-encoding'],
            language: headers['accept-language'],
            cache: headers['cache-control'],
            connection: headers['connection']
        };
    }

    static analyzeBehaviorPatterns(patterns) {
        if (patterns.length < 2) return { humanLike: true, confidence: 0.5 };

        const timing = this.analyzeTimingPatterns(patterns);
        const navigation = this.analyzeNavigationPatterns(patterns);
        const headers = this.analyzeHeaderConsistency(patterns);

        const confidence = (timing + navigation + headers) / 3;
        return {
            humanLike: confidence >= 0.7,
            confidence,
            details: { timing, navigation, headers }
        };
    }

    static analyzeTimingPatterns(patterns) {
        const intervals = [];
        for (let i = 1; i < patterns.length; i++) {
            intervals.push(patterns[i].timestamp - patterns[i-1].timestamp);
        }

        // Human-like characteristics:
        // - Variable intervals (not too regular)
        // - Natural pauses
        // - No impossible speeds
        
        const avgInterval = intervals.reduce((a,b) => a + b, 0) / intervals.length;
        const variability = intervals.reduce((acc, interval) => 
            acc + Math.abs(interval - avgInterval), 0) / intervals.length;

        // Score based on natural timing patterns
        return Math.min(variability / 1000, 1);
    }

    static analyzeNavigationPatterns(patterns) {
        // Analyze typical user navigation flows
        const flows = patterns.map(p => p.path);
        let score = 1;

        // Penalize repetitive patterns
        const uniquePaths = new Set(flows).size;
        if (uniquePaths === 1 && patterns.length > 3) {
            score *= 0.5;
        }

        // Penalize non-standard navigation
        if (!this.hasNormalNavigationFlow(flows)) {
            score *= 0.7;
        }

        return score;
    }

    static hasNormalNavigationFlow(paths) {
        // Check for logical page progression
        const validSequences = [
            /^\/$/,
            /^\/check-ip$/,
            /^\/loading/,
            /^\/review/
        ];

        let matchCount = 0;
        paths.forEach(path => {
            validSequences.some(pattern => {
                if (pattern.test(path)) matchCount++;
                return pattern.test(path);
            });
        });

        return matchCount / paths.length >= 0.7;
    }

    static analyzeHeaderConsistency(patterns) {
        // Check for consistent but not identical headers
        const headerSets = patterns.map(p => p.headers);
        let consistency = 1;

        // Headers should be similar but not identical
        for (let i = 1; i < headerSets.length; i++) {
            const prev = headerSets[i-1];
            const curr = headerSets[i];
            
            // Compare essential headers
            if (prev.language !== curr.language) consistency *= 0.8;
            if (prev.encoding !== curr.encoding) consistency *= 0.8;
        }

        return consistency;
    }

    static calculateBehaviorScore(analysis) {
        return analysis.confidence * 100;
    }
}

/**
 * Main Bot Detection Function
 */
export async function detectBot(req) {
    const fingerprint = BrowserVerification.generateFingerprint(req);
    
    // Quick return for known legitimate clients
    if (legitimateClients.has(req)) {
        return { isBot: false, confidence: 1 };
    }

    // Browser environment verification
    const browserCheck = BrowserVerification.validateBrowserEnvironment(req);
    if (!browserCheck.valid) {
        return { 
            isBot: true, 
            confidence: 0.9,
            reason: 'invalid_browser_environment',
            score: browserCheck.score
        };
    }

    // Behavioral analysis
    const behavior = BehaviorAnalysis.analyze(req, fingerprint);
    if (!behavior.humanLike) {
        return {
            isBot: true,
            confidence: behavior.confidence,
            reason: 'suspicious_behavior',
            details: behavior.details
        };
    }

    // Mark as legitimate if passing all checks
    legitimateClients.add(req);
    
    return {
        isBot: false,
        confidence: behavior.confidence,
        fingerprint
    };
}

// Cleanup stale data
setInterval(() => {
    const now = Date.now();
    
    for (const [fingerprint, data] of behaviorCache.entries()) {
        if (now - data.lastSeen > PATTERN_MEMORY) {
            behaviorCache.delete(fingerprint);
        }
    }
}, CACHE_CLEANUP_INTERVAL);

export const antiBotUtils = {
    BrowserVerification,
    BehaviorAnalysis
};
