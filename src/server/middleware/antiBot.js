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
            valid: score >= 40,
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
        
        if (headers['user-agent']) score += 20;
        if (headers['accept']) score += 10;
        if (headers['accept-language']) score += 10;
        if (headers['accept-encoding']) score += 10;
        
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

        const userAgent = headers['user-agent']?.toLowerCase() || '';
        botIndicators.forEach(indicator => {
            if (userAgent.includes(indicator)) score -= 50;
        });

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
        
        const browsers = {
            'chrome': /chrome\/[\d.]+/i,
            'firefox': /firefox\/[\d.]+/i,
            'safari': /safari\/[\d.]+/i,
            'edge': /edg(e)?\/[\d.]+/i,
            'opera': /opr\/[\d.]+/i
        };

        const operatingSystems = {
            'windows': /windows nt [\d.]+/i,
            'mac': /macintosh.*mac os x [\d._]+/i,
            'ios': /iphone os [\d._]+/i,
            'android': /android [\d.]+/i,
            'linux': /linux/i
        };

        Object.entries(browsers).some(([name, pattern]) => {
            if (pattern.test(lowerUA)) {
                score += 15;
                return true;
            }
        });

        Object.entries(operatingSystems).some(([name, pattern]) => {
            if (pattern.test(lowerUA)) {
                score += 15;
                return true;
            }
        });

        const versionPattern = /(\d+\.)+\d+/;
        if (versionPattern.test(ua)) score += 10;

        return score;
    }

    static checkConsistency(headers) {
        let score = 0;

        if (headers['sec-ch-ua-platform'] && headers['user-agent']) {
            const platform = headers['sec-ch-ua-platform'].toLowerCase();
            const ua = headers['user-agent'].toLowerCase();
            
            if (platform.includes('windows') && ua.includes('windows')) score += 10;
            if (platform.includes('mac') && ua.includes('macintosh')) score += 10;
            if (platform.includes('android') && ua.includes('android')) score += 10;
            if (platform.includes('ios') && ua.includes('iphone')) score += 10;
        }

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

        const pattern = {
            timestamp: now,
            path: req.path,
            method: req.method,
            headers: this.getRelevantHeaders(req.headers)
        };

        clientData.patterns.push(pattern);
        clientData.patterns = clientData.patterns.filter(p => now - p.timestamp < PATTERN_MEMORY);

        const analysis = this.analyzeBehaviorPatterns(clientData.patterns);
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

    static calculateBehaviorScore(analysis) {
        if (!analysis) return 0;

        const { confidence, suspicious, details } = analysis;
        let score = confidence * 100;
        score -= (suspicious * 20);

        if (details) {
            const { timing, navigation, headers } = details;
            if (timing < 0.3) score -= 30;
            if (navigation < 0.5) score -= 20;
            if (headers < 0.5) score -= 20;
        }

        return Math.max(0, Math.min(100, score));
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

        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        const isRegular = stdDev < 100;
        const hasTooFast = intervals.some(i => i < 50);

        if (isRegular && hasTooFast) return 0;
        if (isRegular) return 0.3;
        if (hasTooFast) return 0.5;

        return 1;
    }

    static analyzeNavigationPatterns(patterns) {
        const paths = patterns.map(p => p.path);
        let score = 1;

        const repetition = this.calculateRepetition(paths);
        score *= (1 - repetition);

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
            ['/'],
            ['/', '/check-ip'],
            ['/check-ip', '/loading'],
            ['/loading', '/review'],
            ['/review', '/complete']
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

    static analyzeHeaderConsistency(patterns) {
        const headerSets = patterns.map(p => p.headers);
        let consistency = 1;

        for (let i = 1; i < headerSets.length; i++) {
            const prev = headerSets[i-1];
            const curr = headerSets[i];
            
            if (prev.language !== curr.language) consistency *= 0.8;
            if (prev.encoding !== curr.encoding) consistency *= 0.8;
        }

        return consistency;
    }
}

export async function detectBot(req) {
    const fingerprint = BrowserVerification.generateFingerprint(req);
    
    if (legitimateClients.has(req)) {
        return { isBot: false, confidence: 1 };
    }

    const browserCheck = BrowserVerification.validateBrowserEnvironment(req);
    
    if (browserCheck.score < 20) {
        return { 
            isBot: true, 
            confidence: 0.95,
            reason: 'invalid_browser_environment',
            score: browserCheck.score,
            details: browserCheck.details
        };
    }

    const behavior = BehaviorAnalysis.analyze(req, fingerprint);
    
    if (!behavior.humanLike && behavior.suspicious > 1) {
        return {
            isBot: true,
            confidence: 0.85,
            reason: 'suspicious_behavior',
            details: behavior.details
        };
    }

    if (browserCheck.score >= 40 && behavior.confidence >= 0.4) {
        legitimateClients.add(req);
        return {
            isBot: false,
            confidence: behavior.confidence,
            fingerprint
        };
    }

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
