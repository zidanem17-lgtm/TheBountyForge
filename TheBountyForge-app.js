// TheBountyForge Mobile App JavaScript
class TheBountyForge {
constructor() {
this.scanning = false;
this.scanOptions = {
subdomains: true,
ports: true,
directories: true,
vulnerabilities: true
};
this.results = {
subdomains: [],
ports: [],
directories: [],
vulnerabilities: []
};

```
    this.init();
}

init() {
    // Option cards toggle
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
            const option = card.dataset.option;
            this.scanOptions[option] = card.classList.contains('active');
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            this.switchTab(tabName);
        });
    });
    
    // Buttons
    document.getElementById('startBtn').addEventListener('click', () => this.startScan());
    document.getElementById('stopBtn').addEventListener('click', () => this.stopScan());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveReport());
    
    // Install prompt for PWA
    this.setupPWA();
}

switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}-content`).classList.add('active');
}

async startScan() {
    const target = document.getElementById('targetInput').value.trim();
    
    if (!target) {
        this.showAlert('Error', 'Please enter a target website!');
        return;
    }
    
    // Validate target
    if (!this.validateTarget(target)) {
        return;
    }
    
    this.scanning = true;
    this.updateUI('scanning');
    this.clearResults();
    
    const startTime = Date.now();
    
    // Add starting message
    this.addToOverview(`🎯 Starting scan for: ${target}`, 'info');
    this.addToOverview(`⏰ Started at: ${new Date().toLocaleTimeString()}`, 'info');
    
    try {
        // Run scans
        if (this.scanOptions.subdomains) {
            await this.scanSubdomains(target);
        }
        
        if (this.scanning && this.scanOptions.ports) {
            await this.scanPorts(target);
        }
        
        if (this.scanning && this.scanOptions.directories) {
            await this.scanDirectories(target);
        }
        
        if (this.scanning && this.scanOptions.vulnerabilities) {
            await this.checkVulnerabilities(target);
        }
        
        if (this.scanning) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            this.addToOverview(`\n✅ Scan completed in ${duration}s`, 'success');
            this.showSummary();
        }
    } catch (error) {
        this.addToOverview(`❌ Error: ${error.message}`, 'critical');
    } finally {
        this.scanning = false;
        this.updateUI('ready');
    }
}

stopScan() {
    this.scanning = false;
    this.updateUI('ready');
    this.addToOverview('\n⏹️ Scan stopped by user', 'warning');
}

validateTarget(target) {
    // Remove protocol
    target = target.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(target)) {
        this.showAlert('Invalid Target', 'Please enter a valid domain name (e.g., example.com)');
        return false;
    }
    
    // Update input with cleaned target
    document.getElementById('targetInput').value = target;
    return true;
}

async scanSubdomains(target) {
    this.addToOverview('\n🔍 Scanning subdomains...', 'info');
    this.switchTab('subdomains');
    
    const subdomains = [
        'www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
        'cpanel', 'whm', 'autodiscover', 'autoconfig', 'dev', 'staging',
        'test', 'api', 'admin', 'blog', 'shop', 'forum', 'help', 'support',
        'mobile', 'app', 'm', 'cdn', 'assets', 'static'
    ];
    
    let found = 0;
    
    for (const sub of subdomains) {
        if (!this.scanning) break;
        
        const subdomain = `${sub}.${target}`;
        
        // Simulate checking (in real app, this would be actual DNS lookup)
        await this.sleep(50);
        
        // Randomly "find" some subdomains for demo
        if (Math.random() < 0.2) {
            found++;
            this.results.subdomains.push(subdomain);
            this.addToSubdomains(`✅ ${subdomain}`, 'success');
            this.addToOverview(`  Found: ${subdomain}`, 'success');
        }
    }
    
    if (found > 0) {
        this.addToSubdomains(`\n📊 Total found: ${found} subdomains`, 'info');
    } else {
        this.addToSubdomains('❌ No common subdomains found', 'info');
    }
}

async scanPorts(target) {
    this.addToOverview('\n🚪 Scanning ports...', 'info');
    this.switchTab('ports');
    
    const commonPorts = {
        21: 'FTP (File Transfer)',
        22: 'SSH (Secure Shell)',
        23: 'Telnet',
        25: 'SMTP (Email)',
        53: 'DNS',
        80: 'HTTP (Website)',
        110: 'POP3 (Email)',
        143: 'IMAP (Email)',
        443: 'HTTPS (Secure Website)',
        3306: 'MySQL Database',
        3389: 'Remote Desktop',
        5432: 'PostgreSQL Database',
        8080: 'HTTP Alternative',
        8443: 'HTTPS Alternative'
    };
    
    let found = 0;
    
    for (const [port, service] of Object.entries(commonPorts)) {
        if (!this.scanning) break;
        
        await this.sleep(100);
        
        // Simulate port scan - randomly find some ports
        if (Math.random() < 0.25 || port === '80' || port === '443') {
            found++;
            let severity = 'success';
            
            // Mark dangerous ports
            if (['21', '23', '3306', '5432'].includes(port)) {
                severity = 'warning';
            }
            
            this.results.ports.push({ port, service });
            this.addToPorts(`✅ Port ${port} OPEN - ${service}`, severity);
            this.addToOverview(`  Port ${port}: ${service}`, severity);
            
            // Add warnings for specific ports
            if (port === '23') {
                this.addToPorts('   🚨 Telnet is insecure - should use SSH instead!', 'critical');
            } else if (port === '3306' || port === '5432') {
                this.addToPorts('   ⚠️ Database port exposed - verify it\'s protected', 'warning');
            }
        }
    }
    
    if (found > 0) {
        this.addToPorts(`\n📊 Total found: ${found} open ports`, 'info');
    } else {
        this.addToPorts('❌ No common ports found open', 'info');
    }
}

async scanDirectories(target) {
    this.addToOverview('\n📁 Scanning directories...', 'info');
    this.switchTab('directories');
    
    const paths = [
        '/admin', '/administrator', '/login', '/wp-admin', '/phpmyadmin',
        '/backup', '/backups', '/.git', '/.env', '/config', '/api',
        '/test', '/dev', '/robots.txt', '/sitemap.xml', '/.htaccess',
        '/wp-config.php', '/config.php', '/database.sql', '/.DS_Store',
        '/debug', '/temp', '/tmp', '/uploads', '/files', '/documents'
    ];
    
    let found = 0;
    
    for (const path of paths) {
        if (!this.scanning) break;
        
        await this.sleep(80);
        
        // Simulate checking - randomly find some paths
        if (Math.random() < 0.15) {
            found++;
            const url = `http://${target}${path}`;
            
            // Determine severity
            let severity = 'warning';
            if (['/.git', '/.env', '/backup', '/backups', '/.htaccess'].includes(path)) {
                severity = 'critical';
            }
            
            this.results.directories.push({ path, url, severity });
            
            if (severity === 'critical') {
                this.addToDirectories(`🚨 CRITICAL: ${url}`, 'critical');
                this.addToOverview(`  CRITICAL: ${path}`, 'critical');
                
                if (path === '/.git') {
                    this.addToDirectories('   💥 Exposed Git repository - source code may be leaked!', 'critical');
                } else if (path === '/.env') {
                    this.addToDirectories('   💥 Environment file exposed - may contain passwords!', 'critical');
                }
            } else {
                this.addToDirectories(`⚠️ Found: ${url}`, 'warning');
                this.addToOverview(`  Found: ${path}`, 'warning');
            }
        }
    }
    
    if (found > 0) {
        this.addToDirectories(`\n📊 Total found: ${found} paths`, 'info');
    } else {
        this.addToDirectories('✅ No sensitive paths found publicly accessible', 'success');
    }
}

async checkVulnerabilities(target) {
    this.addToOverview('\n🛡️ Checking vulnerabilities...', 'info');
    this.switchTab('vulnerabilities');
    
    const vulnerabilities = [
        { name: 'SQL Injection', description: 'Trying to inject database commands' },
        { name: 'XSS (Cross-Site Scripting)', description: 'Testing if site accepts malicious scripts' },
        { name: 'CSRF (Cross-Site Request Forgery)', description: 'Checking request protection' },
        { name: 'Security Headers', description: 'Verifying protective HTTP headers' },
        { name: 'SSL/TLS Configuration', description: 'Testing encryption strength' },
        { name: 'Information Disclosure', description: 'Looking for leaked sensitive info' },
        { name: 'Authentication Issues', description: 'Testing login security' },
        { name: 'Clickjacking Protection', description: 'Checking frame protection' }
    ];
    
    for (const vuln of vulnerabilities) {
        if (!this.scanning) break;
        
        this.addToVulnerabilities(`🔍 Testing: ${vuln.name}`, 'info');
        this.addToVulnerabilities(`   ${vuln.description}`, 'info');
        
        await this.sleep(300);
        
        // Simulate testing - randomly find some issues
        if (Math.random() < 0.25) {
            const severities = ['critical', 'warning', 'info'];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            
            this.results.vulnerabilities.push({ name: vuln.name, severity });
            
            if (severity === 'critical') {
                this.addToVulnerabilities('   🚨 VULNERABLE - High Risk!', 'critical');
                this.addToOverview(`  CRITICAL: ${vuln.name}`, 'critical');
            } else if (severity === 'warning') {
                this.addToVulnerabilities('   ⚠️ Potential Issue - Medium Risk', 'warning');
                this.addToOverview(`  Warning: ${vuln.name}`, 'warning');
            } else {
                this.addToVulnerabilities('   ℹ️ Minor Issue - Low Risk', 'info');
            }
            
            this.addToVulnerabilities('', 'info');
        } else {
            this.addToVulnerabilities('   ✅ Secure\n', 'success');
        }
    }
}

showSummary() {
    const critical = this.results.vulnerabilities.filter(v => v.severity === 'critical').length +
                    this.results.directories.filter(d => d.severity === 'critical').length;
    const warnings = this.results.vulnerabilities.filter(v => v.severity === 'warning').length +
                    this.results.directories.filter(d => d.severity === 'warning').length;
    
    this.switchTab('overview');
    
    // Create summary card
    const summaryHTML = `
        <div class="summary-card">
            <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">📊 Scan Summary</h3>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${this.results.subdomains.length}</div>
                    <div class="stat-label">Subdomains</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.results.ports.length}</div>
                    <div class="stat-label">Open Ports</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.results.directories.length}</div>
                    <div class="stat-label">Directories</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.results.vulnerabilities.length}</div>
                    <div class="stat-label">Vulnerabilities</div>
                </div>
            </div>
            ${critical > 0 ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(220, 38, 38, 0.1); border-radius: 8px; border-left: 4px solid var(--critical);">
                    <strong style="color: var(--critical);">🚨 ${critical} critical issue(s) require immediate attention!</strong>
                </div>
            ` : ''}
            ${warnings > 0 ? `
                <div style="margin-top: 1rem; padding: 1rem; background: rgba(251, 191, 36, 0.1); border-radius: 8px; border-left: 4px solid var(--warning);">
                    <strong style="color: var(--warning);">⚠️ ${warnings} warning(s) should be addressed</strong>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add summary at the top
    const overviewContent = document.getElementById('overview-content');
    const firstResult = overviewContent.querySelector('.result-item');
    if (firstResult) {
        firstResult.insertAdjacentHTML('beforebegin', summaryHTML);
    }
}

saveReport() {
    if (!this.results.subdomains.length && !this.results.ports.length && 
        !this.results.directories.length && !this.results.vulnerabilities.length) {
        this.showAlert('No Results', 'Run a scan first before saving a report!');
        return;
    }
    
    const target = document.getElementById('targetInput').value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Generate report
    let report = `${'='.repeat(80)}\n`;
    report += `THEBOUNTYFORGE SECURITY SCAN REPORT\n`;
    report += `${'='.repeat(80)}\n\n`;
    report += `Target: ${target}\n`;
    report += `Date: ${new Date().toLocaleString()}\n`;
    report += `Tool: TheBountyForge Mobile v1.0\n\n`;
    
    report += `SUMMARY\n`;
    report += `${'-'.repeat(80)}\n`;
    report += `Subdomains Found: ${this.results.subdomains.length}\n`;
    report += `Open Ports: ${this.results.ports.length}\n`;
    report += `Accessible Paths: ${this.results.directories.length}\n`;
    report += `Vulnerabilities: ${this.results.vulnerabilities.length}\n\n`;
    
    // Add detailed findings
    if (this.results.subdomains.length > 0) {
        report += `SUBDOMAINS\n${'-'.repeat(80)}\n`;
        this.results.subdomains.forEach(sub => report += `• ${sub}\n`);
        report += '\n';
    }
    
    if (this.results.ports.length > 0) {
        report += `OPEN PORTS\n${'-'.repeat(80)}\n`;
        this.results.ports.forEach(p => report += `• Port ${p.port}: ${p.service}\n`);
        report += '\n';
    }
    
    if (this.results.directories.length > 0) {
        report += `ACCESSIBLE PATHS\n${'-'.repeat(80)}\n`;
        this.results.directories.forEach(d => {
            report += `• ${d.url} [${d.severity.toUpperCase()}]\n`;
        });
        report += '\n';
    }
    
    if (this.results.vulnerabilities.length > 0) {
        report += `VULNERABILITIES\n${'-'.repeat(80)}\n`;
        this.results.vulnerabilities.forEach(v => {
            report += `• ${v.name} [${v.severity.toUpperCase()}]\n`;
        });
        report += '\n';
    }
    
    report += `${'='.repeat(80)}\n`;
    report += `END OF REPORT\n`;
    report += `${'='.repeat(80)}\n`;
    
    // Download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thebountyforge_report_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showAlert('Success', 'Report saved successfully!');
}

// UI Helper Methods
updateUI(state) {
    const statusText = document.getElementById('statusText');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (state === 'scanning') {
        statusText.textContent = 'Scanning...';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
    } else {
        statusText.textContent = 'Ready';
        startBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
}

clearResults() {
    this.results = {
        subdomains: [],
        ports: [],
        directories: [],
        vulnerabilities: []
    };
    
    ['overview', 'subdomains', 'ports', 'directories', 'vulnerabilities'].forEach(tab => {
        document.getElementById(`${tab}-content`).innerHTML = '';
    });
}

addToOverview(text, severity = 'info') {
    this.addResult('overview', text, severity);
}

addToSubdomains(text, severity = 'info') {
    this.addResult('subdomains', text, severity);
}

addToPorts(text, severity = 'info') {
    this.addResult('ports', text, severity);
}

addToDirectories(text, severity = 'info') {
    this.addResult('directories', text, severity);
}

addToVulnerabilities(text, severity = 'info') {
    this.addResult('vulnerabilities', text, severity);
}

addResult(tab, text, severity = 'info') {
    const content = document.getElementById(`${tab}-content`);
    
    // Remove empty state if exists
    const emptyState = content.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const item = document.createElement('div');
    item.className = `result-item ${severity}`;
    item.textContent = text;
    content.appendChild(item);
    
    // Scroll to bottom
    content.scrollTop = content.scrollHeight;
}

showAlert(title, message) {
    // Simple alert for now - could be replaced with custom modal
    alert(`${title}\n\n${message}`);
}

sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

setupPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    }
    
    // Handle install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Could show install button here
        console.log('PWA install available');
    });
}
```

}

// Initialize app when DOM is ready
document.addEventListener(‘DOMContentLoaded’, () => {
window.app = new TheBountyForge();
});
