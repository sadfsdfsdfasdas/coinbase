import crypto from 'crypto';

// Advanced timing constants
const ANALYSIS_WINDOW = 30 * 1000;
const PATTERN_MEMORY = 5 * 60 * 1000;
const CACHE_CLEANUP_INTERVAL = 60 * 1000;

// Cache structures with TTL
const clientPatterns = new Map();
const behaviorCache = new Map();
const legitimateClients = new WeakSet();

class BrowserVerification {
    static generateFingerprint(req) {
        // Enhanced fingerprinting using more sophisticated components
        const components = [
            req.headers['user-agent'],
            req.headers['accept'],
            req.headers['accept-language'],
            req.headers['accept-encoding'],
            req.headers['connection'],
            req.headers['upgrade-insecure-requests'],
            req.headers['viewport-width'],
            req.headers['sec-ch-ua-full-version-list'],
            req.headers['sec-ch-ua-platform-version'],
            req.ip
        ].filter(Boolean);

        return crypto
            .createHash('sha256')
            .update(components.join(':|:'))
            .digest('hex');
    }

    static validateBrowserEnvironment(req) {
        const headers = req.headers;
        let score = 0;
        const maxScore = 100;

        // Smart header scoring system
        score += this.calculateHeaderScore(headers);
        score += this.analyzeUserAgent(headers['user-agent']);
        score += this.checkConsistency(headers);
        score += this.validateSpecialHeaders(headers);

        return {
            valid: score >= 40, // Lower threshold for legitimate users
            score,
            maxScore,
            details: {
                headers: headers['user-agent'],
                score: score
            }
        };
    }

    static calculateHeaderScore(headers) {
        let score = 0;
        
        // Essential browser headers
        if (headers['user-agent']) score += 20;
        if (headers['accept']) score += 10;
        if (headers['accept-language']) score += 10;
        if (headers['accept-encoding']) score += 10;
        
        // Security-related headers
        if (headers['sec-fetch-site']) score += 5;
        if (headers['sec-fetch-mode']) score += 5;
        if (headers['sec-fetch-dest']) score += 5;
        
        return score;
    }

    static validateSpecialHeaders(headers) {
        let score = 0;
        const botIndicators = [
            'selenium', 'webdriver', 'headless', 'phantom',
            'puppeteer', 'playwright', 'cypress', 'automation',
            'metamask', 'bot', 'crawler', 'spider'
        ];

        // Negative scoring for bot indicators
        const userAgent = headers['user-agent']?.toLowerCase() || '';
        botIndicators.forEach(indicator => {
            if (userAgent.includes(indicator)) score -= 50;
        });

        // JavaScript engine consistency check
        if (headers['sec-ch-ua']) {
            const ua = headers['sec-ch-ua'].toLowerCase();
            if (ua.includes('"chromium"') && !userAgent.toLowerCase().includes('chrome')) {
                score -= 30;
            }
        }

        return score;
    }

    static analyzeUserAgent(ua) {
        if (!ua) return -50;
        let score = 0;
        const lowerUA = ua.toLowerCase();
        
        // Popular legitimate browsers
        const browsers = {
            'chrome': /chrome\/[\d.]+/i,
            'firefox': /firefox\/[\d.]+/i,
            'safari': /safari\/[\d.]+/i,
            'edge': /edg(e)?\/[\d.]+/i,
            'opera': /opr\/[\d.]+/i
        };

        // OS patterns
        const operatingSystems = {
            'windows': /windows nt [\d.]+/i,
            'mac': /macintosh.*mac os x [\d._]+/i,
            'ios': /iphone os [\d._]+/i,
            'android': /android [\d.]+/i,
            'linux': /linux/i
        };

        // Score browser match
        Object.entries(browsers).some(([name, pattern]) => {
            if (pattern.test(lowerUA)) {
                score += 15;
                return true;
            }
        });

        // Score OS match
        Object.entries(operatingSystems).some(([name, pattern]) => {
            if (pattern.test(lowerUA)) {
                score += 15;
                return true;
            }
        });

        // Check for version number consistency
        const versionPattern = /(\d+\.)+\d+/;
        if (versionPattern.test(ua)) score += 10;

        return score;
    }

    static checkConsistency(headers) {
        let score = 0;

        // Platform consistency
        if (headers['sec-ch-ua-platform'] && headers['user-agent']) {
            const platform = headers['sec-ch-ua-platform'].toLowerCase();
            const ua = headers['user-agent'].toLowerCase();
            
            if (platform.includes('windows') && ua.includes('windows')) score += 10;
            if (platform.includes('mac') && ua.includes('macintosh')) score += 10;
            if (platform.includes('android') && ua.includes('android')) score += 10;
            if (platform.includes('ios') && ua.includes('iphone')) score += 10;
        }

        // Mobile consistency
        if (headers['sec-ch-ua-mobile']) {
            const isMobile = headers['sec-ch-ua-mobile'] === '?1';
            const ua = headers['user-agent']?.toLowerCase() || '';
            const uaIndicatesMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
            
            if (isMobile === uaIndicatesMobile) score += 10;
        }

        return score;
    }
}

class BehaviorAnalysis {
    static analyze(req, fingerprint) {
        const now = Date.now();
        let clientData = behaviorCache.get(fingerprint) || {
            patterns: [],
            lastSeen: now,
            score: 0,
            suspicious: 0
        };

        // Update patterns
        const pattern = {
            timestamp: now,
            path: req.path,
            method: req.method,
            headers: this.getRelevantHeaders(req.headers)
        };

        clientData.patterns.push(pattern);
        clientData.patterns = clientData.patterns.filter(p => now - p.timestamp < PATTERN_MEMORY);

        const analysis = this.analyzeBehaviorPatterns(clientData.patterns);
        
        // Update client data
        clientData.score = this.calculateBehaviorScore(analysis);
        clientData.lastSeen = now;
        clientData.suspicious = analysis.suspicious;
        
        behaviorCache.set(fingerprint, clientData);
        
        return {
            humanLike: analysis.confidence >= 0.4,
            confidence: analysis.confidence,
            details: analysis.details,
            suspicious: clientData.suspicious
        };
    }

    static getRelevantHeaders(headers) {
        return {
            encoding: headers['accept-encoding'],
            language: headers['accept-language'],
            cache: headers['cache-control'],
            connection: headers['connection'],
            platform: headers['sec-ch-ua-platform']
        };
    }

    static analyzeBehaviorPatterns(patterns) {
        if (patterns.length < 2) {
            return { 
                confidence: 0.7,
                suspicious: 0,
                details: { timing: 1, navigation: 1, headers: 1 }
            };
        }

        const timing = this.analyzeTimingPatterns(patterns);
        const navigation = this.analyzeNavigationPatterns(patterns);
        const headers = this.analyzeHeaderConsistency(patterns);

        // Weight the factors based on importance
        const confidence = timing * 0.3 + navigation * 0.4 + headers * 0.3;
        const suspicious = this.calculateSuspiciousScore(timing, navigation, headers);

        return {
            confidence,
            suspicious,
            details: { timing, navigation, headers }
        };
    }

    static calculateSuspiciousScore(timing, navigation, headers) {
        let score = 0;
        if (timing < 0.3) score++;
        if (navigation < 0.3) score++;
        if (headers < 0.3) score++;
        return score;
    }

    static analyzeTimingPatterns(patterns) {
        const intervals = [];
        for (let i = 1; i < patterns.length; i++) {
            intervals.push(patterns[i].timestamp - patterns[i-1].timestamp);
        }

        if (intervals.length === 0) return 1;

        // Calculate mean and standard deviation
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // Check for too-regular patterns (bot-like)
        const isRegular = stdDev < 100; // Less than 100ms variation
        
        // Check for impossible speeds
        const hasTooFast = intervals.some(i => i < 50); // Faster than 50ms

        if (isRegular && hasTooFast) return 0;
        if (isRegular) return 0.3;
        if (hasTooFast) return 0.5;

        return 1;
    }

    static analyzeNavigationPatterns(patterns) {
        const paths = patterns.map(p => p.path);
        let score = 1;

        // Penalize for highly repetitive patterns
        const repetition = this.calculateRepetition(paths);
        score *= (1 - repetition);

        // Check if navigation follows logical flow
        if (!this.hasLogicalFlow(paths)) {
            score *= 0.7;
        }

        return score;
    }

    static calculateRepetition(paths) {
        if (paths.length < 3) return 0;

        let repetitions = 0;
        for (let i = 2; i < paths.length; i++) {
            if (paths[i] === paths[i-1] && paths[i-1] === paths[i-2]) {
                repetitions++;
            }
        }

        return Math.min(repetitions / (paths.length - 2), 1);
    }

    static hasLogicalFlow(paths) {
        const validFlows = [
            ['/'], // Root
            ['/', '/check-ip'], // Initial flow
            ['/check-ip', '/loading'], // Normal progression
            ['/loading', '/review'], // Expected flow
            ['/review', '/complete'] // Completion
        ];

        for (let i = 1; i < paths.length; i++) {
            const currentPair = [paths[i-1], paths[i]];
            if (!validFlows.some(flow => 
                flow[0].includes(currentPair[0]) && 
                flow[1].includes(currentPair[1])
            )) {
                return false;
            }
        }

        return true;
    }
}

export async function detectBot(req) {
    const fingerprint = BrowserVerification.generateFingerprint(req);
    
    // Quick pass for known legitimate clients
    if (legitimateClients.has(req)) {
        return { isBot: false, confidence: 1 };
    }

    // Browser environment check
    const browserCheck = BrowserVerification.validateBrowserEnvironment(req);
    
    // Immediate fail for obvious bots
    if (browserCheck.score < 20) {
        return { 
            isBot: true, 
            confidence: 0.95,
            reason: 'invalid_browser_environment',
            score: browserCheck.score,
            details: browserCheck.details
        };
    }

    // Behavioral analysis
    const behavior = BehaviorAnalysis.analyze(req, fingerprint);
    
    // Multiple failed behavior checks
    if (!behavior.humanLike && behavior.suspicious > 1) {
        return {
            isBot: true,
            confidence: 0.85,
            reason: 'suspicious_behavior',
            details: behavior.details
        };
    }

    // Pass if behavior looks human-like
    if (browserCheck.score >= 40 && behavior.confidence >= 0.4) {
        legitimateClients.add(req);
        return {
            isBot: false,
            confidence: behavior.confidence,
            fingerprint
        };
    }

    // Default to suspicious but not definitely bot
    return {
        isBot: true,
        confidence: 0.6,
        reason: 'combined_factors',
        details: {
            browser: browserCheck.score,
            behavior: behavior.details
        }
    };
}

export const antiBotUtils = {
    BrowserVerification,
    BehaviorAnalysis
};
