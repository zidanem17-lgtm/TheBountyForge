/**
 * @jest-environment jsdom
 */
'use strict';

const TheBountyForge = require('./thebountyforge-app');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Populate document.body with the minimum HTML the app needs so that the
 * TheBountyForge constructor can run without throwing.
 */
function setupDOM() {
    document.body.innerHTML = `
        <input id="targetInput" type="text" value="" />
        <button id="startBtn" style="display: flex;">Start</button>
        <button id="stopBtn" style="display: none;">Stop</button>
        <button id="saveBtn">Save</button>
        <span id="statusText">Ready</span>

        <div class="tab active"  data-tab="overview">Overview</div>
        <div class="tab"         data-tab="subdomains">Subdomains</div>
        <div class="tab"         data-tab="ports">Ports</div>
        <div class="tab"         data-tab="directories">Directories</div>
        <div class="tab"         data-tab="vulnerabilities">Vulnerabilities</div>

        <div class="tab-content active" id="overview-content"></div>
        <div class="tab-content"        id="subdomains-content"></div>
        <div class="tab-content"        id="ports-content"></div>
        <div class="tab-content"        id="directories-content"></div>
        <div class="tab-content"        id="vulnerabilities-content"></div>

        <div class="option-card active" data-option="subdomains">Subdomains</div>
        <div class="option-card active" data-option="ports">Ports</div>
        <div class="option-card active" data-option="directories">Directories</div>
        <div class="option-card active" data-option="vulnerabilities">Vulnerabilities</div>
    `;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('TheBountyForge', () => {
    let app;

    beforeAll(() => {
        // Mock browser APIs unavailable in jsdom
        global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        global.alert = jest.fn();
    });

    beforeEach(() => {
        setupDOM();
        jest.clearAllMocks();
        app = new TheBountyForge();
    });

    // -----------------------------------------------------------------------
    // constructor
    // -----------------------------------------------------------------------

    describe('constructor', () => {
        test('initializes scanning to false', () => {
            expect(app.scanning).toBe(false);
        });

        test('initializes all scan options to true', () => {
            expect(app.scanOptions).toEqual({
                subdomains: true,
                ports: true,
                directories: true,
                vulnerabilities: true,
            });
        });

        test('initializes all result arrays as empty', () => {
            expect(app.results).toEqual({
                subdomains: [],
                ports: [],
                directories: [],
                vulnerabilities: [],
            });
        });
    });

    // -----------------------------------------------------------------------
    // init — event-listener wiring
    // -----------------------------------------------------------------------

    describe('init', () => {
        test('toggles scanOption when an option card is clicked', () => {
            const card = document.querySelector('.option-card[data-option="subdomains"]');
            const before = app.scanOptions.subdomains;
            card.click();
            expect(app.scanOptions.subdomains).toBe(!before);
        });

        test('switches the active tab when a tab is clicked', () => {
            const tab = document.querySelector('[data-tab="ports"]');
            tab.click();
            expect(tab.classList.contains('active')).toBe(true);
        });

        test('startBtn click calls startScan', () => {
            const spy = jest.spyOn(app, 'startScan').mockResolvedValue(undefined);
            document.getElementById('startBtn').click();
            expect(spy).toHaveBeenCalled();
        });

        test('stopBtn click calls stopScan', () => {
            const spy = jest.spyOn(app, 'stopScan');
            document.getElementById('stopBtn').click();
            expect(spy).toHaveBeenCalled();
        });

        test('saveBtn click calls saveReport', () => {
            const spy = jest.spyOn(app, 'saveReport');
            document.getElementById('saveBtn').click();
            expect(spy).toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // validateTarget
    // -----------------------------------------------------------------------

    describe('validateTarget', () => {
        test('returns true for a simple valid domain', () => {
            expect(app.validateTarget('example.com')).toBe(true);
        });

        test('returns true for a subdomain', () => {
            expect(app.validateTarget('sub.example.com')).toBe(true);
        });

        test('returns true for a multi-level subdomain', () => {
            expect(app.validateTarget('a.b.example.com')).toBe(true);
        });

        test('strips http:// prefix and returns true', () => {
            const result = app.validateTarget('http://example.com');
            expect(result).toBe(true);
            expect(document.getElementById('targetInput').value).toBe('example.com');
        });

        test('strips https:// prefix and returns true', () => {
            app.validateTarget('https://example.com');
            expect(document.getElementById('targetInput').value).toBe('example.com');
        });

        test('strips trailing slash and returns true', () => {
            app.validateTarget('example.com/');
            expect(document.getElementById('targetInput').value).toBe('example.com');
        });

        test('strips both protocol and trailing slash', () => {
            app.validateTarget('https://example.com/');
            expect(document.getElementById('targetInput').value).toBe('example.com');
        });

        test('returns false and shows alert for a domain containing spaces', () => {
            const result = app.validateTarget('invalid domain');
            expect(result).toBe(false);
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining('Invalid Target')
            );
        });

        test('returns false for a domain with @ symbol', () => {
            expect(app.validateTarget('user@example.com')).toBe(false);
        });

        test('returns false for a domain with a leading hyphen', () => {
            expect(app.validateTarget('-example.com')).toBe(false);
        });

        test('updates the targetInput value with the cleaned domain', () => {
            app.validateTarget('https://example.com/');
            expect(document.getElementById('targetInput').value).toBe('example.com');
        });
    });

    // -----------------------------------------------------------------------
    // sleep
    // -----------------------------------------------------------------------

    describe('sleep', () => {
        test('returns a Promise', () => {
            expect(app.sleep(0)).toBeInstanceOf(Promise);
        });

        test('resolves after the specified number of milliseconds', async () => {
            jest.useFakeTimers();
            const p = app.sleep(500);
            jest.advanceTimersByTime(500);
            await p;
            jest.useRealTimers();
        });

        test('does not resolve before the specified delay', async () => {
            jest.useFakeTimers();
            let resolved = false;
            app.sleep(200).then(() => { resolved = true; });
            jest.advanceTimersByTime(100);
            // flush microtasks
            await Promise.resolve();
            expect(resolved).toBe(false);
            jest.useRealTimers();
        });
    });

    // -----------------------------------------------------------------------
    // clearResults
    // -----------------------------------------------------------------------

    describe('clearResults', () => {
        test('resets all result arrays to empty', () => {
            app.results.subdomains.push('www.example.com');
            app.results.ports.push({ port: '80', service: 'HTTP' });
            app.results.directories.push({ path: '/.git', severity: 'critical' });
            app.results.vulnerabilities.push({ name: 'XSS', severity: 'critical' });

            app.clearResults();

            expect(app.results.subdomains).toHaveLength(0);
            expect(app.results.ports).toHaveLength(0);
            expect(app.results.directories).toHaveLength(0);
            expect(app.results.vulnerabilities).toHaveLength(0);
        });

        test('clears DOM content for all tab panes', () => {
            document.getElementById('overview-content').innerHTML = '<div>old</div>';
            document.getElementById('subdomains-content').innerHTML = '<div>old</div>';
            document.getElementById('ports-content').innerHTML = '<div>old</div>';
            document.getElementById('directories-content').innerHTML = '<div>old</div>';
            document.getElementById('vulnerabilities-content').innerHTML = '<div>old</div>';

            app.clearResults();

            ['overview', 'subdomains', 'ports', 'directories', 'vulnerabilities'].forEach(tab => {
                expect(document.getElementById(`${tab}-content`).innerHTML).toBe('');
            });
        });
    });

    // -----------------------------------------------------------------------
    // updateUI
    // -----------------------------------------------------------------------

    describe('updateUI', () => {
        test("state='scanning' hides startBtn and shows stopBtn", () => {
            app.updateUI('scanning');
            expect(document.getElementById('startBtn').style.display).toBe('none');
            expect(document.getElementById('stopBtn').style.display).toBe('flex');
        });

        test("state='scanning' sets statusText to 'Scanning...'", () => {
            app.updateUI('scanning');
            expect(document.getElementById('statusText').textContent).toBe('Scanning...');
        });

        test("state='ready' shows startBtn and hides stopBtn", () => {
            app.updateUI('ready');
            expect(document.getElementById('startBtn').style.display).toBe('flex');
            expect(document.getElementById('stopBtn').style.display).toBe('none');
        });

        test("state='ready' sets statusText to 'Ready'", () => {
            app.updateUI('ready');
            expect(document.getElementById('statusText').textContent).toBe('Ready');
        });

        test('toggles correctly between scanning and ready states', () => {
            app.updateUI('scanning');
            expect(document.getElementById('statusText').textContent).toBe('Scanning...');
            app.updateUI('ready');
            expect(document.getElementById('statusText').textContent).toBe('Ready');
        });
    });

    // -----------------------------------------------------------------------
    // switchTab
    // -----------------------------------------------------------------------

    describe('switchTab', () => {
        test('adds "active" class to the target tab', () => {
            app.switchTab('ports');
            expect(document.querySelector('[data-tab="ports"]').classList.contains('active')).toBe(true);
        });

        test('removes "active" class from all other tabs', () => {
            app.switchTab('subdomains');
            ['overview', 'ports', 'directories', 'vulnerabilities'].forEach(name => {
                expect(
                    document.querySelector(`[data-tab="${name}"]`).classList.contains('active')
                ).toBe(false);
            });
        });

        test('adds "active" class to the target tab-content', () => {
            app.switchTab('directories');
            expect(document.getElementById('directories-content').classList.contains('active')).toBe(true);
        });

        test('removes "active" class from other tab-content elements', () => {
            app.switchTab('directories');
            ['overview', 'subdomains', 'ports', 'vulnerabilities'].forEach(name => {
                expect(
                    document.getElementById(`${name}-content`).classList.contains('active')
                ).toBe(false);
            });
        });
    });

    // -----------------------------------------------------------------------
    // addResult / addTo* helpers
    // -----------------------------------------------------------------------

    describe('addResult', () => {
        test('creates a result-item element with the provided text', () => {
            app.addResult('overview', 'Hello world', 'info');
            const item = document.getElementById('overview-content').querySelector('.result-item');
            expect(item).not.toBeNull();
            expect(item.textContent).toBe('Hello world');
        });

        test('applies the severity class to the result-item', () => {
            app.addResult('overview', 'Critical!', 'critical');
            const item = document.getElementById('overview-content').querySelector('.result-item');
            expect(item.classList.contains('critical')).toBe(true);
        });

        test('defaults severity to "info" when omitted', () => {
            app.addResult('overview', 'Default severity');
            const item = document.getElementById('overview-content').querySelector('.result-item');
            expect(item.classList.contains('info')).toBe(true);
        });

        test('removes an existing empty-state element', () => {
            const content = document.getElementById('ports-content');
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            content.appendChild(emptyState);

            app.addResult('ports', 'Some data', 'info');

            expect(content.querySelector('.empty-state')).toBeNull();
        });

        test('appends multiple items in order', () => {
            app.addResult('overview', 'First', 'info');
            app.addResult('overview', 'Second', 'warning');
            const items = document.getElementById('overview-content').querySelectorAll('.result-item');
            expect(items).toHaveLength(2);
            expect(items[0].textContent).toBe('First');
            expect(items[1].textContent).toBe('Second');
        });
    });

    describe('addTo* convenience helpers', () => {
        test('addToOverview appends to overview-content', () => {
            app.addToOverview('ov msg', 'info');
            expect(document.getElementById('overview-content').querySelector('.result-item')).not.toBeNull();
        });

        test('addToSubdomains appends to subdomains-content', () => {
            app.addToSubdomains('sub msg', 'success');
            expect(document.getElementById('subdomains-content').querySelector('.result-item')).not.toBeNull();
        });

        test('addToPorts appends to ports-content', () => {
            app.addToPorts('port msg', 'warning');
            expect(document.getElementById('ports-content').querySelector('.result-item')).not.toBeNull();
        });

        test('addToDirectories appends to directories-content', () => {
            app.addToDirectories('dir msg', 'critical');
            expect(document.getElementById('directories-content').querySelector('.result-item')).not.toBeNull();
        });

        test('addToVulnerabilities appends to vulnerabilities-content', () => {
            app.addToVulnerabilities('vuln msg', 'info');
            expect(document.getElementById('vulnerabilities-content').querySelector('.result-item')).not.toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // stopScan
    // -----------------------------------------------------------------------

    describe('stopScan', () => {
        test('sets scanning to false', () => {
            app.scanning = true;
            app.stopScan();
            expect(app.scanning).toBe(false);
        });

        test('appends a "Scan stopped by user" message to the overview', () => {
            app.stopScan();
            const items = document.getElementById('overview-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Scan stopped by user'))).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // showAlert
    // -----------------------------------------------------------------------

    describe('showAlert', () => {
        test('calls window.alert with "Title\\n\\nMessage" format', () => {
            app.showAlert('MyTitle', 'MyMessage');
            expect(global.alert).toHaveBeenCalledWith('MyTitle\n\nMyMessage');
        });
    });

    // -----------------------------------------------------------------------
    // showSummary
    // -----------------------------------------------------------------------

    describe('showSummary', () => {
        test('renders stat values matching result counts', () => {
            app.results.subdomains = ['a.example.com', 'b.example.com'];
            app.results.ports = [{ port: '80' }, { port: '443' }, { port: '22' }];
            app.results.directories = [];
            app.results.vulnerabilities = [];

            app.showSummary();

            const statValues = document.getElementById('overview-content').querySelectorAll('.stat-value');
            const values = Array.from(statValues).map(el => el.textContent.trim());
            expect(values).toContain('2'); // subdomains
            expect(values).toContain('3'); // ports
            expect(values).toContain('0'); // directories (and vulnerabilities)
        });

        test('shows critical alert when critical issues exist', () => {
            app.results.vulnerabilities = [{ name: 'XSS', severity: 'critical' }];
            app.results.directories = [{ path: '/.git', severity: 'critical' }];
            app.results.subdomains = [];
            app.results.ports = [];

            app.showSummary();

            expect(document.getElementById('overview-content').innerHTML).toContain(
                'critical issue(s) require immediate attention'
            );
        });

        test('does not show critical alert when no critical issues exist', () => {
            app.results.vulnerabilities = [{ name: 'XSS', severity: 'warning' }];
            app.results.directories = [];
            app.results.subdomains = [];
            app.results.ports = [];

            app.showSummary();

            expect(document.getElementById('overview-content').innerHTML).not.toContain(
                'critical issue(s) require immediate attention'
            );
        });

        test('shows warning alert when warning-level issues exist', () => {
            app.results.vulnerabilities = [{ name: 'CSRF', severity: 'warning' }];
            app.results.directories = [];
            app.results.subdomains = [];
            app.results.ports = [];

            app.showSummary();

            expect(document.getElementById('overview-content').innerHTML).toContain(
                "warning(s) should be addressed"
            );
        });

        test('does not show warning alert when no warnings exist', () => {
            app.results.vulnerabilities = [{ name: 'XSS', severity: 'info' }];
            app.results.directories = [];
            app.results.subdomains = [];
            app.results.ports = [];

            app.showSummary();

            expect(document.getElementById('overview-content').innerHTML).not.toContain(
                "warning(s) should be addressed"
            );
        });

        test('inserts summary card before the first existing result item', () => {
            const content = document.getElementById('overview-content');
            const existing = document.createElement('div');
            existing.className = 'result-item';
            existing.textContent = 'Existing';
            content.appendChild(existing);

            app.results.subdomains = [];
            app.results.ports = [];
            app.results.directories = [];
            app.results.vulnerabilities = [];

            app.showSummary();

            const children = Array.from(content.children);
            const summaryIdx = children.findIndex(el => el.classList.contains('summary-card'));
            const existingIdx = children.findIndex(el => el.textContent === 'Existing');
            expect(summaryIdx).toBeLessThan(existingIdx);
        });

        test('appends summary card when no prior result items exist', () => {
            app.results.subdomains = [];
            app.results.ports = [];
            app.results.directories = [];
            app.results.vulnerabilities = [];

            app.showSummary();

            expect(document.getElementById('overview-content').querySelector('.summary-card')).not.toBeNull();
        });

        test('switches active tab to overview', () => {
            app.switchTab('ports');
            app.results.subdomains = [];
            app.results.ports = [];
            app.results.directories = [];
            app.results.vulnerabilities = [];

            app.showSummary();

            expect(document.getElementById('overview-content').classList.contains('active')).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // saveReport
    // -----------------------------------------------------------------------

    describe('saveReport', () => {
        // Helper that intercepts the Blob text passed to URL.createObjectURL.
        function captureReport(callback) {
            let capturedContent = '';
            const originalBlob = global.Blob;
            global.Blob = jest.fn(parts => {
                capturedContent = parts[0];
                return new originalBlob(parts);
            });
            callback();
            global.Blob = originalBlob;
            return capturedContent;
        }

        test('shows alert and returns early when there are no results', () => {
            app.saveReport();
            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No Results'));
            expect(global.URL.createObjectURL).not.toHaveBeenCalled();
        });

        test('includes the target in the report', () => {
            document.getElementById('targetInput').value = 'test.com';
            app.results.ports = [{ port: '80', service: 'HTTP' }];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('Target: test.com');
        });

        test('includes a SUBDOMAINS section when subdomains are present', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.subdomains = ['www.example.com', 'api.example.com'];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('SUBDOMAINS');
            expect(content).toContain('www.example.com');
            expect(content).toContain('api.example.com');
        });

        test('includes an OPEN PORTS section when ports are present', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.ports = [{ port: '443', service: 'HTTPS' }];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('OPEN PORTS');
            expect(content).toContain('Port 443: HTTPS');
        });

        test('includes an ACCESSIBLE PATHS section when directories are present', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.directories = [{ url: 'https://example.com/.git', severity: 'critical' }];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('ACCESSIBLE PATHS');
            expect(content).toContain('https://example.com/.git');
            expect(content).toContain('[CRITICAL]');
        });

        test('includes a VULNERABILITIES section when vulnerabilities are present', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.vulnerabilities = [{ name: 'SQL Injection', severity: 'critical' }];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('VULNERABILITIES');
            expect(content).toContain('SQL Injection [CRITICAL]');
        });

        test('includes summary counts in the report', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.subdomains = ['www.example.com'];
            app.results.ports = [{ port: '80', service: 'HTTP' }];
            app.results.directories = [];
            app.results.vulnerabilities = [];
            const content = captureReport(() => app.saveReport());
            expect(content).toContain('Subdomains Found: 1');
            expect(content).toContain('Open Ports: 1');
        });

        test('shows success alert after generating the report', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.subdomains = ['www.example.com'];
            app.saveReport();
            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Success'));
        });

        test('does not include SUBDOMAINS section when subdomains are empty', () => {
            document.getElementById('targetInput').value = 'example.com';
            app.results.ports = [{ port: '80', service: 'HTTP' }];
            const content = captureReport(() => app.saveReport());
            expect(content).not.toContain('SUBDOMAINS');
        });
    });

    // -----------------------------------------------------------------------
    // startScan
    // -----------------------------------------------------------------------

    describe('startScan', () => {
        test('shows an error alert and returns early when target is empty', async () => {
            document.getElementById('targetInput').value = '';
            await app.startScan();
            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
            expect(app.scanning).toBe(false);
        });

        test('calls validateTarget with the trimmed input value', async () => {
            document.getElementById('targetInput').value = 'example.com';
            const spy = jest.spyOn(app, 'validateTarget').mockReturnValue(false);
            await app.startScan();
            expect(spy).toHaveBeenCalledWith('example.com');
        });

        test('does not start scanning when validateTarget returns false', async () => {
            document.getElementById('targetInput').value = 'bad domain!';
            await app.startScan();
            expect(app.scanning).toBe(false);
        });

        test('resets scanning to false after completing a full scan', async () => {
            document.getElementById('targetInput').value = 'example.com';
            jest.spyOn(app, 'validateTarget').mockReturnValue(true);
            jest.spyOn(app, 'scanSubdomains').mockResolvedValue(undefined);
            jest.spyOn(app, 'scanPorts').mockResolvedValue(undefined);
            jest.spyOn(app, 'scanDirectories').mockResolvedValue(undefined);
            jest.spyOn(app, 'checkVulnerabilities').mockResolvedValue(undefined);

            await app.startScan();

            expect(app.scanning).toBe(false);
            jest.restoreAllMocks();
        });

        test('skips a scan category whose option is disabled', async () => {
            document.getElementById('targetInput').value = 'example.com';
            app.scanOptions.subdomains = false;
            jest.spyOn(app, 'validateTarget').mockReturnValue(true);
            const subSpy = jest.spyOn(app, 'scanSubdomains').mockResolvedValue(undefined);
            const portsSpy = jest.spyOn(app, 'scanPorts').mockResolvedValue(undefined);
            jest.spyOn(app, 'scanDirectories').mockResolvedValue(undefined);
            jest.spyOn(app, 'checkVulnerabilities').mockResolvedValue(undefined);

            await app.startScan();

            expect(subSpy).not.toHaveBeenCalled();
            expect(portsSpy).toHaveBeenCalled();
            jest.restoreAllMocks();
        });

        test('calls clearResults before starting the scan', async () => {
            document.getElementById('targetInput').value = 'example.com';
            jest.spyOn(app, 'validateTarget').mockReturnValue(true);
            jest.spyOn(app, 'scanSubdomains').mockResolvedValue(undefined);
            jest.spyOn(app, 'scanPorts').mockResolvedValue(undefined);
            jest.spyOn(app, 'scanDirectories').mockResolvedValue(undefined);
            jest.spyOn(app, 'checkVulnerabilities').mockResolvedValue(undefined);
            const clearSpy = jest.spyOn(app, 'clearResults');

            await app.startScan();

            expect(clearSpy).toHaveBeenCalled();
            jest.restoreAllMocks();
        });

        test('catches errors thrown during a scan and appends an error message', async () => {
            document.getElementById('targetInput').value = 'example.com';
            jest.spyOn(app, 'validateTarget').mockReturnValue(true);
            jest.spyOn(app, 'scanSubdomains').mockRejectedValue(new Error('Network error'));

            await app.startScan();

            const items = document.getElementById('overview-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Network error'))).toBe(true);
            expect(app.scanning).toBe(false);
            jest.restoreAllMocks();
        });
    });

    // -----------------------------------------------------------------------
    // scanSubdomains
    // -----------------------------------------------------------------------

    describe('scanSubdomains', () => {
        beforeEach(() => {
            jest.spyOn(app, 'sleep').mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('populates results.subdomains when subdomains are "found"', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1); // always < 0.2 → always found

            await app.scanSubdomains('example.com');

            expect(app.results.subdomains.length).toBeGreaterThan(0);
            app.results.subdomains.forEach(sub => {
                expect(sub).toContain('example.com');
            });
        });

        test('finds no subdomains when Math.random is always > 0.2', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            await app.scanSubdomains('example.com');

            expect(app.results.subdomains).toHaveLength(0);
        });

        test('exits the loop early when scanning becomes false', async () => {
            app.scanning = false;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanSubdomains('example.com');

            expect(app.results.subdomains).toHaveLength(0);
        });

        test('adds an info message when no subdomains are found', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            await app.scanSubdomains('example.com');

            const items = document.getElementById('subdomains-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('No common subdomains found'))).toBe(true);
        });

        test('adds a count message when subdomains are found', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanSubdomains('example.com');

            const items = document.getElementById('subdomains-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Total found'))).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // scanPorts
    // -----------------------------------------------------------------------

    describe('scanPorts', () => {
        beforeEach(() => {
            jest.spyOn(app, 'sleep').mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('always reports port 80 as open', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0); // suppress random discoveries

            await app.scanPorts('example.com');

            const ports = app.results.ports.map(p => p.port);
            expect(ports).toContain('80');
        });

        test('always reports port 443 as open', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0);

            await app.scanPorts('example.com');

            const ports = app.results.ports.map(p => p.port);
            expect(ports).toContain('443');
        });

        test('also discovers additional ports when Math.random < 0.25', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1); // always < 0.25

            await app.scanPorts('example.com');

            expect(app.results.ports.length).toBeGreaterThan(2);
        });

        test('marks dangerous ports (e.g. 21) with warning severity in output', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanPorts('example.com');

            const items = document.getElementById('ports-content').querySelectorAll('.result-item.warning');
            expect(items.length).toBeGreaterThan(0);
        });

        test('stops early when scanning is false', async () => {
            app.scanning = false;

            await app.scanPorts('example.com');

            expect(app.results.ports).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // scanDirectories
    // -----------------------------------------------------------------------

    describe('scanDirectories', () => {
        beforeEach(() => {
            jest.spyOn(app, 'sleep').mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('populates results.directories when paths are "found"', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1); // always < 0.15

            await app.scanDirectories('example.com');

            expect(app.results.directories.length).toBeGreaterThan(0);
        });

        test('marks sensitive paths (/.git, /.env, etc.) as critical', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanDirectories('example.com');

            const criticalDirs = app.results.directories.filter(d => d.severity === 'critical');
            expect(criticalDirs.length).toBeGreaterThan(0);
        });

        test('marks non-sensitive paths as warning', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanDirectories('example.com');

            const warningDirs = app.results.directories.filter(d => d.severity === 'warning');
            expect(warningDirs.length).toBeGreaterThan(0);
        });

        test('builds the full URL for each found path', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.scanDirectories('example.com');

            app.results.directories.forEach(d => {
                expect(d.url).toMatch(/^https:\/\/example\.com\//);
            });
        });

        test('finds no directories when Math.random is always > 0.15', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            await app.scanDirectories('example.com');

            expect(app.results.directories).toHaveLength(0);
        });

        test('shows success message when no sensitive paths are accessible', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            await app.scanDirectories('example.com');

            const items = document.getElementById('directories-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('No sensitive paths found'))).toBe(true);
        });

        test('stops early when scanning is false', async () => {
            app.scanning = false;

            await app.scanDirectories('example.com');

            expect(app.results.directories).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // checkVulnerabilities
    // -----------------------------------------------------------------------

    describe('checkVulnerabilities', () => {
        beforeEach(() => {
            jest.spyOn(app, 'sleep').mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('populates results.vulnerabilities when issues are "found"', async () => {
            app.scanning = true;
            // First call to Math.random decides whether to surface a vuln (< 0.25);
            // subsequent calls pick severity. Use 0.1 to always surface an issue.
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.checkVulnerabilities('example.com');

            expect(app.results.vulnerabilities.length).toBeGreaterThan(0);
        });

        test('includes the vulnerability name in results', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.checkVulnerabilities('example.com');

            app.results.vulnerabilities.forEach(v => {
                expect(typeof v.name).toBe('string');
                expect(v.name.length).toBeGreaterThan(0);
            });
        });

        test('assigns a valid severity to each found vulnerability', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.1);

            await app.checkVulnerabilities('example.com');

            const valid = ['critical', 'warning', 'info'];
            app.results.vulnerabilities.forEach(v => {
                expect(valid).toContain(v.severity);
            });
        });

        test('finds no vulnerabilities when Math.random is always >= 0.25', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            await app.checkVulnerabilities('example.com');

            expect(app.results.vulnerabilities).toHaveLength(0);
        });

        test('stops early when scanning is false', async () => {
            app.scanning = false;

            await app.checkVulnerabilities('example.com');

            expect(app.results.vulnerabilities).toHaveLength(0);
        });

        test('logs a testing message for every vulnerability check', async () => {
            app.scanning = true;
            jest.spyOn(Math, 'random').mockReturnValue(0.9); // no findings, but still tests

            await app.checkVulnerabilities('example.com');

            const items = document.getElementById('vulnerabilities-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Testing:'))).toBe(true);
        });

        test('outputs a warning-severity message when severity is "warning"', async () => {
            app.scanning = true;
            // First Math.random call < 0.25 → vulnerability found.
            // Second call used in Math.floor(r * 3): 0.4 → index 1 → 'warning'.
            let callIdx = 0;
            jest.spyOn(Math, 'random').mockImplementation(() => {
                callIdx++;
                return callIdx % 2 === 1 ? 0.1 : 0.4;
            });

            await app.checkVulnerabilities('example.com');

            const items = document.getElementById('vulnerabilities-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Potential Issue'))).toBe(true);
        });

        test('outputs an info-severity message when severity is "info"', async () => {
            app.scanning = true;
            // Second Math.random call: 0.8 → Math.floor(0.8 * 3) = 2 → 'info'.
            let callIdx = 0;
            jest.spyOn(Math, 'random').mockImplementation(() => {
                callIdx++;
                return callIdx % 2 === 1 ? 0.1 : 0.8;
            });

            await app.checkVulnerabilities('example.com');

            const items = document.getElementById('vulnerabilities-content').querySelectorAll('.result-item');
            const texts = Array.from(items).map(el => el.textContent);
            expect(texts.some(t => t.includes('Minor Issue'))).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // setupPWA
    // -----------------------------------------------------------------------

    describe('setupPWA', () => {
        // Ensure navigator.serviceWorker is completely absent between tests so
        // that the 'serviceWorker' in navigator guard works predictably.
        afterEach(() => {
            try { delete navigator.serviceWorker; } catch (e) { /* ignore */ }
        });

        test('registers the service worker when supported and logs success', async () => {
            const registerMock = jest.fn().mockResolvedValue('registration');
            Object.defineProperty(navigator, 'serviceWorker', {
                value: { register: registerMock },
                configurable: true,
                writable: true,
            });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            setupDOM();
            const instance = new TheBountyForge();
            // Allow the resolved promise to propagate
            await Promise.resolve();
            await Promise.resolve();

            expect(registerMock).toHaveBeenCalledWith('sw.js');
            expect(consoleSpy).toHaveBeenCalledWith('Service Worker registered');

            consoleSpy.mockRestore();
        });

        test('logs an error when service worker registration fails', async () => {
            const err = new Error('SW registration failed');
            const registerMock = jest.fn().mockRejectedValue(err);
            Object.defineProperty(navigator, 'serviceWorker', {
                value: { register: registerMock },
                configurable: true,
                writable: true,
            });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            setupDOM();
            const instance = new TheBountyForge();
            await Promise.resolve();
            await Promise.resolve();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Service Worker registration failed:',
                err
            );

            consoleSpy.mockRestore();
        });

        test('calls preventDefault on the beforeinstallprompt event', () => {
            const event = new Event('beforeinstallprompt', { cancelable: true });
            event.preventDefault = jest.fn();
            window.dispatchEvent(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
});
