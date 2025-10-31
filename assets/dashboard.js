// Mobile sidebar toggle and scroll reveal enhancements
(function () {
	const menuToggle = document.querySelector('.menu-toggle');
	const sidebar = document.querySelector('.sidebar');
	if (menuToggle && sidebar) {
		menuToggle.addEventListener('click', function () {
			sidebar.classList.toggle('active');
		});

		// Close sidebar when a nav item is clicked on small screens
		sidebar.addEventListener('click', function (e) {
			const clickedNavItem = e.target.closest('.nav-item');
			if (clickedNavItem && window.matchMedia('(max-width: 1024px)').matches) {
				sidebar.classList.remove('active');
			}
		});

		// Click outside to close on small screens
		document.addEventListener('click', function (e) {
			if (window.matchMedia('(max-width: 1024px)').matches) {
				if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
					sidebar.classList.remove('active');
				}
			}
		});
	}

	// Scroll reveal (skips when user prefers reduced motion)
	const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!prefersReduced && 'IntersectionObserver' in window) {
		const revealSelector = [
			'.kpi-card',
			'.chart-card',
			'.stat-card',
			'.usage-card',
			'.status-card',
			'.insight-card',
			'.gap-item',
			'.product-item',
			'.summary-card',
			'.activity-item',
			'.segment-card',
			'.realtime-card',
			'.metric-item',
			'.doc-section',
			'.example-card',
			'.support-item'
		].join(', ');

		const elements = Array.prototype.slice.call(document.querySelectorAll(revealSelector));
		elements.forEach(function (el) { el.classList.add('reveal'); });

		const io = new IntersectionObserver(function (entries, obs) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('in-view');
					obs.unobserve(entry.target);
				}
			});
		}, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

		elements.forEach(function (el) { io.observe(el); });
	}
})();
// Dashboard JavaScript with Backend API Integration, Date Range Selection, and Chart Rendering

// API Configuration
const API_BASE_URL = 'http://localhost:5001';
const API_TIMEOUT = 10000; // 10 seconds timeout for charts

// Global state
let currentDateRange = '30d'; // Default to 30 days
const chartInstances = {}; // Store chart instances for updates

// Date Range Configuration
const dateRangeOptions = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last 1 Year'
};

// Loading state manager
const loadingState = {
    isLoading: false,
    activeLoaders: new Set(),
    
    setLoading(element, isLoading) {
        if (isLoading) {
            this.activeLoaders.add(element);
            element.classList.add('loading-state');
        } else {
            this.activeLoaders.delete(element);
            element.classList.remove('loading-state');
        }
    },
    
    showLoader(element) {
        element.innerHTML = '<div class="loader"><div class="spinner"></div><span>Loading...</span></div>';
        this.setLoading(element, true);
    },
    
    hideLoader(element) {
        this.setLoading(element, false);
    }
};

// API Helper Functions
async function fetchAPI(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
        // Add date range parameter to all requests with cache busting
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        // Only add period if endpoint doesn't already have query params
        if (!url.search || !url.searchParams.has('period')) {
            url.searchParams.set('period', currentDateRange);
        }
        // Add cache-busting timestamp to prevent browser caching
        url.searchParams.set('_t', Date.now().toString());
        
        console.log(`[API] Fetching ${url.toString()} with period=${currentDateRange}`);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[API] Response for ${endpoint}:`, data.success ? 'SUCCESS' : 'FAILED');
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Backend server is not running. Please start the Flask server.');
        }
        throw error;
    }
}

// Check if backend is available
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        return false;
    }
}

// Show loading state on elements
function showLoadingState(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        el.dataset.originalContent = el.innerHTML;
        loadingState.showLoader(el);
    });
}

// Restore original content on error
function restoreContent(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        if (el.dataset.originalContent) {
            el.innerHTML = el.dataset.originalContent;
        }
    });
}

// ============================================================
// Date Range Selector Functionality
// ============================================================

function initializeDateRangeSelector() {
    const dateRangeEl = document.getElementById('dateRange');
    const dateRangeContainer = dateRangeEl?.closest('.date-range-selector');
    if (!dateRangeEl || !dateRangeContainer) return;
    
    // Set initial text
    dateRangeEl.textContent = dateRangeOptions[currentDateRange];
    
    // Define the order for cycling through periods
    const periodOrder = ['7d', '30d', '90d', '1y'];
    
    // Cycle through periods on click
    dateRangeContainer.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Find current index in the order
        const currentIndex = periodOrder.indexOf(currentDateRange);
        // Get next period (loop back to 0 if at the end)
        const nextIndex = (currentIndex + 1) % periodOrder.length;
        const nextPeriod = periodOrder[nextIndex];
        const nextLabel = dateRangeOptions[nextPeriod];
        
        // Update period
        currentDateRange = nextPeriod;
        dateRangeEl.textContent = nextLabel;
        
        console.log(`[DateRange] Changed to ${currentDateRange} (${nextLabel})`);
        console.log(`[DateRange] Clearing all cached data and charts...`);
        
        // Clear all KPI values to show loading
        document.querySelectorAll('[data-kpi] .kpi-value').forEach(el => {
            el.textContent = 'Loading...';
        });
        
        // Destroy all chart instances
        Object.keys(chartInstances).forEach(key => {
            try {
                chartInstances[key].destroy();
            } catch(e) {
                console.warn(`[DateRange] Error destroying chart ${key}:`, e);
            }
            delete chartInstances[key];
        });
        
        // Clear all chart containers
        document.querySelectorAll('#conversionFunnel, #interactionChart, #segmentationChart, #revenueChart, #aiPerformanceChart, #conversionTrendChart, #satisfactionChart').forEach(el => {
            if (el) el.innerHTML = '';
        });
        
        // Reload all data with new date range
        console.log(`[DateRange] Loading fresh data for ${currentDateRange}...`);
        // Realtime charts should be period-agnostic. Reset buffers so we fetch latest snapshot immediately
        try { window.__rt_lastTs = null; window.__rt_buffer = []; } catch {}
        loadAllData();
        // Immediately refresh realtime to avoid blank state after period change
        fetchRealtimeCharts();
    });
}

function initializeFunnelPeriodButtons() {
    // Find the funnel chart buttons
    const funnelChartCard = document.querySelector('#conversionFunnel')?.closest('.chart-card');
    if (!funnelChartCard) return;
    
    const buttons = funnelChartCard.querySelectorAll('.chart-actions .chart-btn');
    if (buttons.length === 0) return;
    
    // Map button text to period
    const buttonToPeriod = {
        'Weekly': '7d',
        'Monthly': '30d',
        'Yearly': '1y'
    };
    
    // Update active button based on current date range
    function updateActiveButton() {
        buttons.forEach(btn => {
            btn.classList.remove('active');
            const btnText = btn.textContent.trim();
            const period = buttonToPeriod[btnText];
            if (period === currentDateRange) {
                btn.classList.add('active');
            }
        });
    }
    
    // Set initial active state
    updateActiveButton();
    
    // Add click handlers
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const btnText = btn.textContent.trim();
            const period = buttonToPeriod[btnText];
            
            if (!period) {
                console.warn(`[FunnelButtons] Unknown button text: ${btnText}`);
                return;
            }
            
            // Update current date range
            currentDateRange = period;
            
            // Update the main date range selector text
            const dateRangeEl = document.getElementById('dateRange');
            if (dateRangeEl) {
                dateRangeEl.textContent = dateRangeOptions[period];
            }
            
            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            console.log(`[FunnelButtons] Changed to ${period} (${dateRangeOptions[period]})`);
            
            // Clear and reload funnel data
            const chartContainer = document.querySelector('#conversionFunnel');
            if (chartContainer) {
                chartContainer.innerHTML = '';
            }
            
            // Destroy funnel chart instance
            if (chartInstances['funnel']) {
                try {
                    chartInstances['funnel'].destroy();
                } catch(e) {
                    console.warn('[FunnelButtons] Error destroying funnel chart:', e);
                }
                delete chartInstances['funnel'];
            }
            
            // Reload funnel data
            fetchConversionFunnel();
            
            // Also reload all other data to keep everything in sync
            loadAllData();
        });
    });
    
    // Update active button whenever date range changes from main selector
    const observer = new MutationObserver(() => {
        updateActiveButton();
    });
    
    // Watch for changes to the date range element
    const dateRangeEl = document.getElementById('dateRange');
    if (dateRangeEl) {
        observer.observe(dateRangeEl, { childList: true, characterData: true });
    }
}

// ============================================================
// API Fetch Functions
// ============================================================

async function fetchOverviewKPIs() {
    const elements = [
        '[data-kpi="total_customers"]',
        '[data-kpi="conversion_rate"]',
        '[data-kpi="ai_interactions"]',
        '[data-kpi="revenue_impact"]'
    ];
    
    showLoadingState(elements.join(','));
    
    try {
        console.log(`[KPI] Fetching with period=${currentDateRange}`);
        const response = await fetchAPI('/api/overview/kpis');
        
        if (response.success && response.data) {
            console.log(`[KPI] Data received for period=${currentDateRange}:`, JSON.stringify({
                total_customers: response.data.total_customers,
                ai_interactions: response.data.ai_interactions,
                revenue_impact: response.data.revenue_impact,
                conversion_rate: response.data.conversion_rate,
                _debug: response.data._debug
            }, null, 2));
            // Force update - clear any cached values first
            document.querySelectorAll('[data-kpi]').forEach(el => {
                const valEl = el.querySelector('.kpi-value');
                if (valEl) valEl.textContent = '...';
            });
            updateKPICards(response.data);
            elements.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => loadingState.hideLoader(el));
            });
        } else {
            throw new Error(response.message || 'No data returned');
        }
    } catch (error) {
        console.error('Failed to fetch KPIs:', error);
        const errorMsg = error.message.includes('not running') ? 'Server offline' : (error.message || 'Failed to load');
        elements.forEach(sel => {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
                el.innerHTML = `<div class="error" style="color: red; padding: 10px; font-size: 12px;">${errorMsg}</div>`;
                loadingState.hideLoader(el);
            });
        });
    }
}

async function fetchConversionFunnel() {
    const chartContainer = document.querySelector('#conversionFunnel');
    if (!chartContainer) return;
    
    showLoadingState('#conversionFunnel');
    
    try {
        console.log(`[Funnel] Fetching with period=${currentDateRange}`);
        const response = await fetchAPI('/api/overview/funnel');
        
        if (response.success && response.data) {
            console.log(`[Funnel] Data received for period=${currentDateRange}:`, JSON.stringify({
                stage_count: response.data.length,
                stages: response.data.map(s => ({ name: s.stage_name, count: s.count })),
                _debug: response._debug
            }, null, 2));
            if (response._debug && response._debug.used_fallback) {
                console.warn(`[Funnel] WARNING: Using fallback data for period ${currentDateRange}`);
            }
            // Force clear before update
            chartContainer.innerHTML = '';
            updateFunnelChart(response.data);
            loadingState.hideLoader(chartContainer);
        } else {
            throw new Error(response.message || 'No funnel data');
        }
    } catch (error) {
        console.error('Failed to fetch funnel:', error);
        const errorMsg = error.message.includes('not running') ? 'Server offline' : (error.message || 'Failed to load');
        chartContainer.innerHTML = `<div class="error" style="color: red; padding: 20px;">${errorMsg}</div>`;
        loadingState.hideLoader(chartContainer);
    }
}

async function fetchInteractionTypes() {
    const chartContainer = document.querySelector('#interactionChart');
    if (!chartContainer) return;
    
    showLoadingState('#interactionChart');
    
    try {
        const response = await fetchAPI('/api/overview/interaction-types');
        
        if (response.success && response.data) {
            updateInteractionTypesChart(response.data);
            loadingState.hideLoader(chartContainer);
        }
    } catch (error) {
        console.error('Failed to fetch interaction types:', error);
        chartContainer.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(chartContainer);
    }
}

async function fetchCustomerSegments() {
    const container = document.querySelector('#segmentationChart');
    if (!container) return;
    
    showLoadingState('#segmentationChart');
    
    try {
        console.log(`[Segments] Fetching with period=${currentDateRange}`);
        const response = await fetchAPI('/api/customers/segments');
        
        if (response.success && response.data) {
            console.log(`[Segments] Data received for period=${currentDateRange}:`, response.data.length, 'segments');
            updateCustomerSegmentsChart(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch customer segments:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchBehavioralPatterns() {
    const container = document.querySelector('#behavioralPatterns');
    if (!container) return;
    
    try {
        console.log(`[Behavioral] Fetching with period=${currentDateRange}`);
        const response = await fetchAPI('/api/customers/behavioral-patterns');
        
        if (response.success && response.data) {
            console.log(`[Behavioral] Data received for period=${currentDateRange}:`, response.data);
            updateBehavioralPatterns(response.data);
        }
    } catch (error) {
        console.error('Failed to fetch behavioral patterns:', error);
    }
}

function updateBehavioralPatterns(data) {
    if (!data || data.length === 0) return;
    
    // Map pattern types to their display elements
    const patternMap = {
        'peak_activity': {
            text: data.find(p => p.pattern_type === 'peak_activity')?.pattern_name || 'N/A',
            value: Math.round(data.find(p => p.pattern_type === 'peak_activity')?.value || 0)
        },
        'preference_match': {
            text: `${Math.round(data.find(p => p.pattern_type === 'preference_match')?.value || 0)}% accuracy`,
            value: Math.round(data.find(p => p.pattern_type === 'preference_match')?.value || 0)
        },
        'return_rate': {
            text: `${Math.round(data.find(p => p.pattern_type === 'return_rate')?.value || 0)}% within 30 days`,
            value: Math.round(data.find(p => p.pattern_type === 'return_rate')?.value || 0)
        }
    };
    
    // Update each pattern
    Object.keys(patternMap).forEach(patternType => {
        const textEl = document.querySelector(`[data-behavioral="${patternType}"]`);
        const barEl = document.querySelector(`[data-behavioral-bar="${patternType}"]`);
        
        if (textEl) {
            textEl.textContent = patternMap[patternType].text;
        }
        if (barEl) {
            const value = patternMap[patternType].value;
            barEl.style.width = `${Math.min(value, 100)}%`;
        }
    });
}

async function fetchCustomerInteractions() {
    const container = document.querySelector('.activity-feed');
    if (!container) return;
    
    showLoadingState('.activity-feed');
    
    try {
        const response = await fetchAPI('/api/customers/interactions?limit=10');
        
        if (response.success && response.data) {
            updateActivityFeed(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch interactions:', error);
        container.innerHTML = '<div class="no-data">Failed to load activity</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchCustomerConcerns() {
    const container = document.querySelector('#concernsChart');
    if (!container) return;
    
    showLoadingState('#concernsChart');
    
    try {
        const response = await fetchAPI('/api/customers/concerns');
        
        if (response.success && response.data) {
            updateConcernsChart(response.data);
            loadingState.hideLoader(container);
        } else {
            container.innerHTML = '<div class="no-data">No concerns data available</div>';
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch customer concerns:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchCustomerLifetimeValue() {
    const container = document.querySelector('#clvChart');
    if (!container) return;
    
    showLoadingState('#clvChart');
    
    try {
        console.log(`[CLV] Fetching with period=${currentDateRange}`);
        const response = await fetchAPI('/api/customers/lifetime-value');
        
        if (response.success && response.data) {
            console.log(`[CLV] Data received for period=${currentDateRange}:`, response.data.length, 'segments');
            console.log(`[CLV] Sample values:`, response.data.slice(0, 3).map(d => ({ 
                segment: d.segment_name, 
                current: d.current_clv, 
                predicted: d.predicted_clv 
            })));
            updateCLVChart(response.data);
            loadingState.hideLoader(container);
        } else {
            container.innerHTML = '<div class="no-data">No lifetime value data available</div>';
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch customer lifetime value:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchProductAnalytics() {
    const container = document.querySelector('[data-product-analytics]');
    if (!container) return;
    
    showLoadingState('[data-product-analytics]');
    
    try {
        const response = await fetchAPI('/api/products/analytics');
        
        if (response.success && response.data) {
            updateProductAnalytics(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch product analytics:', error);
        if (container) {
            container.innerHTML = '<div class="no-data">Failed to load data</div>';
            loadingState.hideLoader(container);
        }
    }
}

async function fetchRevenueSummary() {
    const container = document.querySelector('[data-revenue-summary]');
    if (!container) return;
    
    showLoadingState('[data-revenue-summary]');
    
    try {
        const [summary, attribution] = await Promise.all([
            fetchAPI('/api/revenue/summary'),
            fetchAPI('/api/revenue/attribution')
        ]);
        
        if (summary.success && summary.data) {
            // If attribution returns data, reconcile total with sum of features for visual consistency
            if (attribution && attribution.success && Array.isArray(attribution.data)) {
                const total = attribution.data.reduce((s, r) => s + Number(r.revenue_amount || 0), 0);
                summary.data.total_revenue = total;
            }
            updateRevenueSummary(summary.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch revenue summary:', error);
        if (container) {
            container.innerHTML = '<div class="no-data">Failed to load data</div>';
            loadingState.hideLoader(container);
        }
    }
}

async function fetchRevenueAttribution() {
    const container = document.querySelector('#revenueChart');
    if (!container) return;
    
    showLoadingState('#revenueChart');
    
    try {
        const response = await fetchAPI('/api/revenue/attribution');
        
        if (response.success && response.data) {
            updateRevenueAttribution(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch revenue attribution:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchAIModelPerformance() {
    const container = document.querySelector('#aiPerformanceChart');
    if (!container) return;
    
    showLoadingState('#aiPerformanceChart');
    
    try {
        const response = await fetchAPI('/api/ai/model-performance?mode=ring');
        
        if (response.success && response.data) {
            updateAIModelPerformance(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch AI performance:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchSystemHealth() {
    const container = document.querySelector('[data-system-health]');
    if (!container) return;
    
    showLoadingState('[data-system-health]');
    
    try {
        const response = await fetchAPI('/api/realtime/system-health');
        
        if (response.success && response.data) {
            updateSystemHealth(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch system health:', error);
        if (container) {
            container.innerHTML = '<div class="no-data">Failed to load data</div>';
            loadingState.hideLoader(container);
        }
    }
}

async function fetchLiveActiveCount() {
    const liveActiveEl = document.querySelector('[data-live-active]');
    if (!liveActiveEl) return;
    
    try {
        const response = await fetchAPI('/api/realtime/system-health');
        if (response.success && response.data && response.data.length > 0) {
            const activeCount = response.data[0].active_sessions || response.data[0].current_sessions || 0;
            liveActiveEl.textContent = `${formatNumber(activeCount)} Active Now`;
        } else {
            liveActiveEl.textContent = '0 Active Now';
        }
    } catch (error) {
        console.error('Failed to fetch live active count:', error);
        liveActiveEl.textContent = 'N/A';
    }
}

async function fetchBillingSummary() {
    try {
        const response = await fetchAPI('/api/billing/summary');
        if (response.success && response.data) {
            updateBillingSummary(response.data);
        }
    } catch (error) {
        console.error('Failed to fetch billing summary:', error);
    }
}

async function fetchConversionTrends() {
    const container = document.querySelector('#conversionTrendChart');
    if (!container) return;
    
    showLoadingState('#conversionTrendChart');
    
    try {
        const response = await fetchAPI('/api/conversions/trends');
        
        if (response.success && response.data) {
            updateConversionTrendChart(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch conversion trends:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

// Conversion analytics KPIs (Conversions page)
async function fetchConversionAnalytics() {
    const page = document.getElementById('conversions');
    if (!page) return;
    try {
        const res = await fetchAPI('/api/conversions/analytics');
        const data = res && res.success ? res.data : null;
        const cards = page.querySelectorAll('.kpi-card');
        if (!cards || cards.length < 4) return;
        // Overall Conversion Rate
        const overall = data?.overall_conversion_rate;
        const overallChange = data?.conversion_rate_change;
        const overallCard = cards[0];
        if (overallCard) {
            const valEl = overallCard.querySelector('.kpi-value');
            const changeEl = overallCard.querySelector('.kpi-change');
            if (valEl && overall != null) valEl.textContent = formatPercentage(overall);
            if (changeEl && overallChange != null) {
                const isUp = Number(overallChange) >= 0;
                changeEl.innerHTML = `<i class="fas fa-arrow-${isUp?'up':'down'}"></i> ${isUp?'+':''}${parseFloat(overallChange).toFixed(1)}%`;
                changeEl.className = `kpi-change ${isUp?'positive':'negative'}`;
            }
        }
        // AI-Driven Conversions
        const aiPct = data?.ai_driven_percentage;
        const aiCard = cards[1];
        if (aiCard) {
            const valEl = aiCard.querySelector('.kpi-value');
            if (valEl && aiPct != null) valEl.textContent = formatPercentage(aiPct);
        }
        // Cart Recovery Rate
        const cartRate = data?.cart_recovery_rate;
        const cartCard = cards[2];
        if (cartCard) {
            const valEl = cartCard.querySelector('.kpi-value');
            if (valEl && cartRate != null) valEl.textContent = formatPercentage(cartRate);
        }
        // Avg. Time to Convert (minutes)
        const timeMin = data?.avg_time_to_convert;
        const timeChange = data?.avg_time_change;
        const timeCard = cards[3];
        if (timeCard) {
            const valEl = timeCard.querySelector('.kpi-value');
            const changeEl = timeCard.querySelector('.kpi-change');
            if (valEl && timeMin != null) valEl.textContent = `${parseFloat(timeMin).toFixed(1)} min`;
            if (changeEl && timeChange != null) {
                // For time metrics, show the actual trend direction
                // DOWN arrow = red, UP arrow = green (universal rule)
                const isDown = Number(timeChange) <= 0;
                changeEl.innerHTML = `<i class="fas fa-arrow-${isDown?'down':'up'}"></i> ${isDown?'':'+'}${Math.abs(parseFloat(timeChange)).toFixed(1)}%`;
                // DOWN arrow = negative (red), UP arrow = positive (green)
                changeEl.className = `kpi-change ${isDown?'negative':'positive'}`;
            }
        }
    } catch (e) {
        console.warn('conversion-analytics failed', e);
    }
}

async function fetchSatisfactionTrends() {
    const container = document.querySelector('#satisfactionChart');
    if (!container) return;
    
    showLoadingState('#satisfactionChart');
    
    try {
        const response = await fetchAPI('/api/customer/satisfaction');
        
        if (response.success && response.data) {
            updateSatisfactionChart(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch satisfaction trends:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchInteractionTimeline() {
    const container = document.querySelector('#interactionTimelineChart');
    if (!container) return;
    
    showLoadingState('#interactionTimelineChart');
    
    try {
        const response = await fetchAPI('/api/interactions/summary');
        
        if (response.success && (response.data || response.timeline)) {
            // Pass both data and timeline to the update function
            updateInteractionTimelineChart({
                ...(response.data || {}),
                timeline: response.timeline || []
            });
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch interaction timeline:', error);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
        loadingState.hideLoader(container);
    }
}

async function fetchInteractionStats() {
    const container = document.querySelector('#interactionStats');
    if (!container) return;
    
    showLoadingState('#interactionStats');
    
    try {
        const response = await fetchAPI('/api/interactions/summary');
        
        if (response.success && (response.data || response.timeline)) {
            // Prefer computing stats from the same timeline used by the chart to
            // guarantee visual and numeric correlation.
            if (Array.isArray(response.timeline) && response.timeline.length > 0) {
                const totals = response.timeline.reduce((acc, cur) => {
                    acc.questionnaire += Number(cur.questionnaire_interactions || 0);
                    acc.chat += Number(cur.chat_interactions || 0);
                    acc.image += Number(cur.image_analysis_interactions || 0);
                    acc.routine += Number(cur.routine_planner_interactions || 0);
                    return acc;
                }, { questionnaire: 0, chat: 0, image: 0, routine: 0 });
                const total_interactions = totals.questionnaire + totals.chat + totals.image + totals.routine;
                const avg_response_time = response.data?.avg_response_time || 0;
                updateInteractionStats({
                    total_interactions,
                    questionnaire_interactions: totals.questionnaire,
                    chat_interactions: totals.chat,
                    image_analysis_interactions: totals.image,
                    routine_planner_interactions: totals.routine,
                    avg_response_time
                });
            } else if (response.data) {
            updateInteractionStats(response.data);
            }
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch interaction stats:', error);
        container.innerHTML = '<div class="no-data">Failed to load stats</div>';
        loadingState.hideLoader(container);
    }
}

// ============================================================
// Update Functions
// ============================================================

function updateKPICards(data) {
    // Debug logging
    console.log('[updateKPICards] Received data:', {
        total_customers: data.total_customers,
        ai_interactions: data.ai_interactions,
        revenue_impact: data.revenue_impact,
        conversion_rate: data.conversion_rate,
        _debug: data._debug,
        period: currentDateRange
    });
    
    // Update Total Customers
    const totalCustomersEl = document.querySelector('[data-kpi="total_customers"]');
    if (totalCustomersEl && data.total_customers !== undefined) {
        const valueEl = totalCustomersEl.querySelector('.kpi-value') || totalCustomersEl;
        const changeEl = totalCustomersEl.closest('.kpi-card')?.querySelector('.kpi-change');
        const newValue = formatNumber(data.total_customers);
        console.log(`[updateKPICards] Setting total_customers to: ${newValue} (raw: ${data.total_customers})`);
        if (valueEl) valueEl.textContent = newValue;
        if (changeEl && data.total_customers_change !== undefined) {
            const sign = data.total_customers_change >= 0 ? '+' : '';
            changeEl.innerHTML = `<i class="fas fa-arrow-${data.total_customers_change >= 0 ? 'up' : 'down'}"></i> ${sign}${data.total_customers_change.toFixed(1)}% from last period`;
            changeEl.className = `kpi-change ${data.total_customers_change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    // Update Conversion Rate
    const conversionRateEl = document.querySelector('[data-kpi="conversion_rate"]');
    if (conversionRateEl && data.conversion_rate !== undefined) {
        const valueEl = conversionRateEl.querySelector('.kpi-value') || conversionRateEl;
        const changeEl = conversionRateEl.closest('.kpi-card')?.querySelector('.kpi-change');
        if (valueEl) valueEl.textContent = formatPercentage(data.conversion_rate);
        if (changeEl && data.conversion_rate_change) {
            const isUp = data.conversion_rate_change >= 0;
            changeEl.innerHTML = `<i class="fas fa-arrow-${isUp ? 'up' : 'down'}"></i> ${isUp ? '+' : ''}${Math.abs(data.conversion_rate_change).toFixed(1)}% improvement`;
            changeEl.className = `kpi-change ${isUp ? 'positive' : 'negative'}`;
        }
    }
    
    // Update AI Interactions
    const aiInteractionsEl = document.querySelector('[data-kpi="ai_interactions"]');
    if (aiInteractionsEl && data.ai_interactions !== undefined) {
        const valueEl = aiInteractionsEl.querySelector('.kpi-value') || aiInteractionsEl;
        const changeEl = aiInteractionsEl.closest('.kpi-card')?.querySelector('.kpi-change');
        const newValue = formatNumber(data.ai_interactions);
        console.log(`[updateKPICards] Setting ai_interactions to: ${newValue} (raw: ${data.ai_interactions})`);
        if (valueEl) valueEl.textContent = newValue;
        if (changeEl && data.ai_interactions_change !== undefined) {
            const sign = data.ai_interactions_change >= 0 ? '+' : '';
            changeEl.innerHTML = `<i class="fas fa-arrow-${data.ai_interactions_change >= 0 ? 'up' : 'down'}"></i> ${sign}${data.ai_interactions_change.toFixed(1)}% increase`;
            changeEl.className = `kpi-change ${data.ai_interactions_change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    // Update Revenue Impact
    const revenueImpactEl = document.querySelector('[data-kpi="revenue_impact"]');
    if (revenueImpactEl && data.revenue_impact !== undefined) {
        const valueEl = revenueImpactEl.querySelector('.kpi-value') || revenueImpactEl;
        const changeEl = revenueImpactEl.closest('.kpi-card')?.querySelector('.kpi-change');
        const newValue = formatCurrency(data.revenue_impact);
        console.log(`[updateKPICards] Setting revenue_impact to: ${newValue} (raw: ${data.revenue_impact})`);
        if (valueEl) valueEl.textContent = newValue;
        if (changeEl && data.revenue_impact_change !== undefined) {
            const sign = data.revenue_impact_change >= 0 ? '+' : '';
            changeEl.innerHTML = `<i class="fas fa-arrow-${data.revenue_impact_change >= 0 ? 'up' : 'down'}"></i> ${sign}${data.revenue_impact_change.toFixed(1)}% via AI`;
            changeEl.className = `kpi-change ${data.revenue_impact_change >= 0 ? 'positive' : 'negative'}`;
        }
    }
}

function updateFunnelChart(data) {
    const container = document.querySelector('#conversionFunnel');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No funnel data available</div>';
        return;
    }
    
    // Ensure we only have unique stages (no duplicates)
    const uniqueStages = [];
    const seenOrders = new Set();
    for (const stage of data) {
        const order = stage.stage_order;
        if (!seenOrders.has(order)) {
            seenOrders.add(order);
            uniqueStages.push(stage);
        }
    }
    
    // Sort by stage_order to ensure correct order
    uniqueStages.sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0));
    
    // Create funnel visualization
    const maxValue = Math.max(...uniqueStages.map(d => d.count || d.stage_count || 0));
    let funnelHTML = '<div class="elegant-funnel">';
    
    uniqueStages.forEach((stage, index) => {
        const stageCount = stage.count || stage.stage_count || 0;
        const percentage = maxValue > 0 ? (stageCount / maxValue) * 100 : 0;
        const width = `${Math.max(percentage * 0.8, 30)}%`;
        const prevCount = index > 0 ? (uniqueStages[index - 1].count || uniqueStages[index - 1].stage_count || 0) : 0;
        const dropoff = index > 0 && prevCount > 0 
            ? (((stageCount - prevCount) / prevCount) * 100).toFixed(1)
            : null;
        
        funnelHTML += `
            <div class="funnel-stage animated" style="width: ${width}; animation-delay: ${index * 0.1}s">
                <div class="funnel-bar" data-percentage="${percentage.toFixed(0)}">
                    <div class="funnel-content">
                        <div class="stage-info">
                            <div class="stage-title">${stage.stage_name || 'Stage ' + (index + 1)}</div>
                            <div class="stage-metrics">
                                <span class="stage-count">${formatNumber(stageCount)}</span>
                                <span class="stage-percentage">${percentage.toFixed(0)}%</span>
                            </div>
                        </div>
                        ${dropoff && parseFloat(dropoff) < 0 ? `<div class="dropoff-indicator"><span class="dropoff-rate">${dropoff}%</span></div>` : ''}
                    </div>
                    <div class="funnel-glow"></div>
                </div>
                ${index < uniqueStages.length - 1 ? '<div class="funnel-connector"></div>' : ''}
            </div>
        `;
    });
    
    funnelHTML += '</div>';
    
    // Add insights
    const totalVisitors = uniqueStages[0]?.count || uniqueStages[0]?.stage_count || 0;
    const conversions = uniqueStages[uniqueStages.length - 1]?.count || uniqueStages[uniqueStages.length - 1]?.stage_count || 0;
    const conversionRate = totalVisitors > 0 ? (conversions / totalVisitors * 100).toFixed(0) : 0;
    const aiEngagement = uniqueStages[1]?.count || uniqueStages[1]?.stage_count || 0;
    const aiEngagementPercent = totalVisitors > 0 ? ((aiEngagement / totalVisitors) * 100).toFixed(0) : 0;
    
    funnelHTML += `
        <div class="funnel-insights">
            <div class="insight-card">
                <div class="insight-icon"><i class="fas fa-users"></i></div>
                <div class="insight-content">
                    <div class="insight-value">${formatNumber(totalVisitors)}</div>
                    <div class="insight-label">Total Visitors</div>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon"><i class="fas fa-shopping-cart"></i></div>
                <div class="insight-content">
                    <div class="insight-value">${conversionRate}%</div>
                    <div class="insight-label">Conversion Rate</div>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon"><i class="fas fa-robot"></i></div>
                <div class="insight-content">
                    <div class="insight-value">${aiEngagementPercent}%</div>
                    <div class="insight-label">AI Engagement</div>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon"><i class="fas fa-chart-line"></i></div>
                <div class="insight-content">
                    <div class="insight-value">+15%</div>
                    <div class="insight-label">vs Last Period</div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = funnelHTML;
    
    // Add animation
    container.querySelectorAll('.funnel-stage').forEach((stage, i) => {
        setTimeout(() => {
            stage.style.opacity = '0';
            stage.style.transform = 'translateY(-20px)';
            stage.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                stage.style.opacity = '1';
                stage.style.transform = 'translateY(0)';
            }, 50);
        }, i * 100);
    });
}

function updateInteractionTypesChart(data) {
    const container = document.querySelector('#interactionChart');
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="no-data">No interaction data available</div>';
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['interactionTypes']) {
        try {
            chartInstances['interactionTypes'].destroy();
        } catch (e) {
            console.warn('Error destroying chart:', e);
        }
        delete chartInstances['interactionTypes'];
    }
    
    // Filter out duplicates and ensure unique labels
    const uniqueData = [];
    const seenNames = new Set();
    for (const d of data) {
        const name = d.interaction_name || d.interaction_type || 'Unknown';
        if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueData.push({
                name: name,
                count: parseInt(d.count || 0),
                percentage: parseFloat(d.percentage || 0)
            });
        }
    }
    
    if (uniqueData.length === 0) {
        container.innerHTML = '<div class="no-data">No interaction data available</div>';
        return;
    }
    
    const series = uniqueData.map(d => d.count);
    const labels = uniqueData.map(d => d.name);
    const total = series.reduce((a, b) => a + b, 0);

    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 350,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 50,
                dynamicAnimation: {
                    enabled: true,
                        speed: 800
                    }
                }
            }
        },
        labels: labels,
        colors: ['#407CEE', '#5b8ff5', '#7ba3f7', '#94b0fa'],
        legend: {
            position: 'bottom',
            fontSize: '14px'
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val.toFixed(1) + '%';
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Interactions',
                            formatter: function() {
                                return formatNumber(total);
                            }
                        }
                    }
                }
            }
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return formatNumber(val);
                }
            }
        }
    };
    
    chartInstances['interactionTypes'] = new ApexCharts(container, options);
    chartInstances['interactionTypes'].render();
}

function updateCustomerSegmentsChart(data) {
    const container = document.querySelector('#segmentationChart');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['customerSegments']) {
        try {
            chartInstances['customerSegments'].destroy();
        } catch (e) {
            console.warn('Error destroying customer segments chart:', e);
        }
        delete chartInstances['customerSegments'];
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No segment data available</div>';
        return;
    }
    
    // Filter out duplicates
    const uniqueData = [];
    const seenNames = new Set();
    for (const d of data) {
        const name = d.segment_name || 'Unknown';
        if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueData.push(d);
        }
    }
    
    const series = uniqueData.map(d => parseFloat(d.segment_percentage) || 0);
    const labels = uniqueData.map(d => d.segment_name || 'Unknown');
    
    const options = {
        series: series,
        chart: {
            type: 'pie',
            height: 350,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 50,
                    dynamicAnimation: {
                        enabled: true,
                        speed: 800
                    }
                }
            }
        },
        labels: labels,
        colors: ['#407CEE', '#5b8ff5', '#7ba3f7', '#94b0fa'],
        legend: {
            position: 'bottom'
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val.toFixed(1) + '%';
            }
        }
    };
    
    chartInstances['customerSegments'] = new ApexCharts(container, options);
    chartInstances['customerSegments'].render();
}

function updateConcernsChart(data) {
    const container = document.querySelector('#concernsChart');
    if (!container) return;
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['concerns']) {
        try {
            chartInstances['concerns'].destroy();
        } catch (e) {
            console.warn('Error destroying concerns chart:', e);
        }
        delete chartInstances['concerns'];
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No concerns data available</div>';
        return;
    }
    
    // Sort by query_count descending
    const sortedData = [...data].sort((a, b) => (b.query_count || 0) - (a.query_count || 0));
    
    const categories = sortedData.map(d => d.concern_name || 'Unknown');
    const queryCounts = sortedData.map(d => parseInt(d.query_count || 0));
    const successRates = sortedData.map(d => parseFloat(d.ai_success_rate || 0));
    
    // Calculate max for Y-axis scaling
    const maxQueryCount = Math.max(...queryCounts, 100);
    const maxSuccessRate = Math.max(...successRates, 100);
    
    const options = {
        series: [
            {
                name: 'Query Count',
                type: 'column',
                data: queryCounts
            },
            {
                name: 'AI Success Rate',
                type: 'line',
                data: successRates
            }
        ],
        chart: {
            height: 350,
            type: 'line',
            stacked: false,
            animations: {
                enabled: true,
                animateGradually: {
                    enabled: true,
                    delay: 200
                }
            },
            toolbar: {
                show: true
            }
        },
        stroke: {
            width: [0, 3],
            curve: 'smooth'
        },
        plotOptions: {
            bar: {
                columnWidth: '60%',
                borderRadius: 4
            }
        },
        colors: ['#407CEE', '#52c41a'],
        dataLabels: {
            enabled: true,
            enabledOnSeries: [0],
            formatter: function(val) {
                return formatNumber(Math.round(val));
            }
        },
        labels: categories,
        xaxis: {
            type: 'category',
            labels: {
                rotate: -45,
                rotateAlways: false,
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: [
            {
                title: {
                    text: 'Query Count',
                    style: {
                        color: '#407CEE'
                    }
                },
                min: 0,
                max: Math.max(maxQueryCount * 1.1, 100),
                tickAmount: 6,
                labels: {
                    formatter: function(val) {
                        return formatNumber(Math.round(val));
                    }
                }
            },
            {
                opposite: true,
                title: {
                    text: 'Success Rate (%)',
                    style: {
                        color: '#52c41a'
                    }
                },
                min: 0,
                max: 100,
                labels: {
                    formatter: function(val) {
                        return val.toFixed(0) + '%';
                    }
                }
            }
        ],
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function(val, opts) {
                    if (opts.seriesIndex === 0) {
                        return formatNumber(Math.round(val));
                    }
                    return val.toFixed(1) + '%';
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center'
        }
    };
    
    chartInstances['concerns'] = new ApexCharts(container, options);
    chartInstances['concerns'].render();
}

function updateCLVChart(data) {
    const container = document.querySelector('#clvChart');
    if (!container) return;
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['clv']) {
        try {
            chartInstances['clv'].destroy();
        } catch (e) {
            console.warn('Error destroying CLV chart:', e);
        }
        delete chartInstances['clv'];
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No lifetime value data available</div>';
        return;
    }
    
    // Sort data by segment order
    const segmentOrder = ['0-30d', '31-60d', '61-90d', '91-180d', '181-365d', '1-2y', '2y+'];
    const sortedData = [...data].sort((a, b) => {
        const indexA = segmentOrder.indexOf(a.segment_name || '');
        const indexB = segmentOrder.indexOf(b.segment_name || '');
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    
    const categories = sortedData.map(d => d.segment_name || 'Unknown');
    const currentCLV = sortedData.map(d => parseFloat(d.current_clv || 0) / 1000); // Convert to thousands
    const predictedCLV = sortedData.map(d => parseFloat(d.predicted_clv || 0) / 1000); // Convert to thousands
    
    const options = {
        series: [
            {
                name: 'Current CLV',
                data: currentCLV
            },
            {
                name: 'Predicted CLV',
                data: predictedCLV
            }
        ],
        chart: {
            type: 'bar',
            height: 350,
            stacked: false,
            animations: {
                enabled: true,
                animateGradually: {
                    enabled: true,
                    delay: 200
                }
            },
            toolbar: {
                show: true
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4,
                dataLabels: {
                    position: 'top'
                }
            }
        },
        colors: ['#407CEE', '#5b8ff5'],
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return '₹' + val.toFixed(0) + 'K';
            },
            offsetY: -20,
            style: {
                fontSize: '12px',
                colors: ['#373d3f']
            }
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            title: {
                text: 'CLV (€ thousands)'
            },
            labels: {
                formatter: function(val) {
                    return '₹' + val.toFixed(0) + 'K';
                }
            }
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return '₹' + val.toFixed(0) + ',000';
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center'
        }
    };
    
    chartInstances['clv'] = new ApexCharts(container, options);
    chartInstances['clv'].render();
}

function updateActivityFeed(data) {
    const container = document.querySelector('.activity-feed');
    if (!container) return;
    
    if (Array.isArray(data) && data.length > 0) {
        container.innerHTML = data.map(item => createActivityItem(item)).join('');
        
        // Add fade-in animation
        container.querySelectorAll('.activity-item').forEach((item, i) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, i * 100);
        });
    } else {
        container.innerHTML = '<div class="no-data">No recent activity</div>';
    }
}

function createActivityItem(item) {
    const iconMap = {
        'questionnaire': 'fa-clipboard-list',
        'chat': 'fa-comments',
        'image': 'fa-image',
        'routine': 'fa-calendar-check'
    };
    const icon = iconMap[item.interaction_type?.toLowerCase()] || 'fa-comments';
    
    return `
        <div class="activity-item">
            <div class="activity-icon ${item.interaction_type?.toLowerCase() || 'default'}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <strong>${item.customer_name || 'Customer'}</strong>
                <span>${item.activity_description || item.interaction_type || 'Activity'}</span>
                <span class="activity-time">${formatTime(item.interaction_date || item.created_at)}</span>
            </div>
            <div class="activity-badge ${item.status_badge || 'success'}">${item.status_badge || 'Active'}</div>
        </div>
    `;
}

function updateProductAnalytics(data) {
    const container = document.querySelector('[data-product-analytics]');
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="no-data">No product analytics available</div>';
        return;
    }
    
    // Implementation for product analytics - could be a table or chart
    console.log('Product analytics data:', data);
}

// Top recommended products
async function fetchTopRecommendedProducts() {
    const list = document.getElementById('topProducts');
    if (!list) return;
    try {
        const res = await fetchAPI('/api/products/recommended');
        if (res.success && res.data) {
            updateTopProducts(res.data);
        }
    } catch (e) {
        console.error('Failed to fetch top recommended products', e);
    }
}

function updateTopProducts(items) {
    const list = document.getElementById('topProducts');
    if (!list) return;
    list.innerHTML = '';
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="no-data">No products</div>';
        return;
    }
    items.slice(0,5).forEach((item, idx) => {
        const html = `
            <div class="product-item">
                <span class="rank">${idx + 1}</span>
                <div class="product-info">
                    <strong>${item.product_name}</strong>
                    <span>${formatNumber(item.recommendations)} recommendations</span>
                </div>
                <div class="product-metrics">
                    <span class="conversion-rate">${Math.round(item.conversion_rate)}% conv.</span>
                    <span class="revenue">${formatCurrency(item.revenue)}</span>
                </div>
            </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// Product gaps
async function fetchProductGaps() {
    const container = document.querySelector('.product-gaps');
    if (!container) return;
    try {
        const response = await fetchAPI('/api/customers/product-gaps');
        if (response.success && response.data) {
            updateProductGaps(response.data);
        }
    } catch (e) {
        console.error('Failed to fetch product gaps:', e);
    }
}

function updateProductGaps(data) {
    const container = document.querySelector('.product-gaps');
    if (!container) return;
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No product gaps found</div>';
        return;
    }
    container.innerHTML = '';
    data.slice(0, 10).forEach((item, idx) => {
        const rank = item.gap_rank || idx + 1;
        const requests = item.demand_score || 0;
        const potential = item.potential_revenue || 0;
        const html = `
            <div class="gap-item">
                <div class="gap-rank">${rank}</div>
                <div class="gap-content">
                    <div class="gap-product">${item.product_name || 'Product'}</div>
                    <div class="gap-stats">
                        <span class="requests"><i class="fas fa-users"></i> ${formatNumber(requests)} requests</span>
                        <span class="revenue">${formatCurrency(potential)}</span>
                    </div>
                </div>
                <div class="gap-action">Add Product</div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function updateRevenueSummary(data) {
    const container = document.querySelector('[data-revenue-summary]');
    if (!container || !data) {
        if (container) container.innerHTML = '<div class="no-data">No revenue data available</div>';
        return;
    }
    
    // Map backend keys to UI expectations, with graceful fallbacks
    const totalRevenue = data.total_revenue || data.total_revenue_impact || 0;
    const avgOrderValue = data.average_order_value || data.avg_order_value || 0;
    const orderValueImprovement = (data.order_value_change !== undefined ? data.order_value_change : (data.avg_order_value_improvement !== undefined ? data.avg_order_value_improvement : 0));
    // Period-aware ROI calculation to avoid unrealistic values
    const baseMonthlyInvestment = 25000; // €25k baseline per month
    const months = (function(){
        if (currentDateRange === '7d') return 7/30;
        if (currentDateRange === '30d') return 1;
        if (currentDateRange === '90d') return 3;
        if (currentDateRange === '1y') return 12;
        return 1;
    })();
    const monthlyInvestment = data.monthly_investment || (baseMonthlyInvestment * months);
    const monthlyReturn = data.monthly_return || totalRevenue; // treat total in period as return over the period
    const roiDecimal = (monthlyInvestment > 0) ? ((monthlyReturn - monthlyInvestment) / monthlyInvestment) : 0;
    
    const html = `
        <div class="summary-card">
            <h3>Total Revenue Impact</h3>
            <div class="revenue-value">${formatCurrency(totalRevenue)}</div>
            <p>Directly attributed to AI recommendations</p>
        </div>
        <div class="summary-card">
            <h3>Average Order Value</h3>
            <div class="revenue-value">${formatCurrency(avgOrderValue)}</div>
            <p class="increase">${orderValueImprovement > 0 ? '+' : ''}${(orderValueImprovement).toFixed(1)}% with AI assistance</p>
        </div>
        <div class="summary-card">
            <h3>ROI Calculator</h3>
            <div class="roi-calc">
                <div class="roi-item">
                    <span>Investment:</span>
                    <span>${formatCurrency(monthlyInvestment)}/mo</span>
                </div>
                <div class="roi-item">
                    <span>Return:</span>
                    <span>${formatCurrency(monthlyReturn)}/mo</span>
                </div>
                <div class="roi-result">
                    <span>ROI:</span>
                    <span class="roi-value">${(roiDecimal * 100).toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add fade-in animation
    container.querySelectorAll('.summary-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 150);
    });
}

function updateRevenueAttribution(data) {
    const container = document.querySelector('#revenueChart');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['revenueAttribution']) {
        try {
            chartInstances['revenueAttribution'].destroy();
        } catch (e) {
            console.warn('Error destroying revenue chart:', e);
        }
        delete chartInstances['revenueAttribution'];
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No revenue attribution data available</div>';
        return;
    }
    
    // Group by feature and calculate totals - ensure no duplicates
    const featureMap = {};
    data.forEach(item => {
        const feature = item.ai_feature || item.revenue_source || 'Unknown';
        if (!featureMap[feature]) {
            featureMap[feature] = 0;
        }
        featureMap[feature] += parseFloat(item.revenue_amount || 0);
    });
    
    // Group by date and feature for timeline trend - respect current date range
    const dateFeatureMap = {};
    const dateSet = new Set();
    
    data.forEach(item => {
        const date = item.record_date || item.attribution_date || item.date;
        if (!date) return;
        dateSet.add(date);
        const feature = item.ai_feature || item.revenue_source || 'Unknown';
        
        if (!dateFeatureMap[date]) {
            dateFeatureMap[date] = {
                'Direct Sales': 0,
                'AI Recommendations': 0,
                'Bundle Sales': 0
            };
        }
        
        // Map features to series
        if (feature.includes('Chat') || feature.includes('Recommendation')) {
            dateFeatureMap[date]['AI Recommendations'] += parseFloat(item.revenue_amount || 0);
        } else if (feature.includes('Bundle')) {
            dateFeatureMap[date]['Bundle Sales'] += parseFloat(item.revenue_amount || 0);
        } else {
            dateFeatureMap[date]['Direct Sales'] += parseFloat(item.revenue_amount || 0);
        }
    });
    
    // Generate date labels based on current date range
    let dateLabels = [];
    if (currentDateRange === '7d' || currentDateRange === '30d') {
        // Daily labels for short periods
        const sortedDates = Array.from(dateSet).sort();
        dateLabels = sortedDates.map(dateStr => {
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch {
                return dateStr;
            }
        });
    } else if (currentDateRange === '90d') {
        // Weekly labels
        const sortedDates = Array.from(dateSet).sort();
        dateLabels = sortedDates.map(dateStr => {
            try {
                const d = new Date(dateStr);
                return 'Week ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch {
                return dateStr;
            }
        });
    } else { // 1y
        // Monthly labels
        const sortedDates = Array.from(dateSet).sort();
        dateLabels = sortedDates.map(dateStr => {
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-US', { month: 'short' });
            } catch {
                return dateStr;
            }
        });
    }
    
    // If no data, use empty array
    if (dateLabels.length === 0) {
        dateLabels = ['No data'];
    }
    
    // Create data arrays matching the date labels order
    const directSales = dateLabels.map((label, idx) => {
        const dateKey = Array.from(dateSet).sort()[idx];
        return dateFeatureMap[dateKey]?.['Direct Sales'] || 0;
    });
    const aiRecommendations = dateLabels.map((label, idx) => {
        const dateKey = Array.from(dateSet).sort()[idx];
        return dateFeatureMap[dateKey]?.['AI Recommendations'] || 0;
    });
    const bundleSales = dateLabels.map((label, idx) => {
        const dateKey = Array.from(dateSet).sort()[idx];
        return dateFeatureMap[dateKey]?.['Bundle Sales'] || 0;
    });

    // If we have fewer than 3 time points or essentially no values, fallback to a totals bar view
    const numDates = dateLabels.filter(l => l !== 'No data').length;
    const allSums = [directSales, aiRecommendations, bundleSales].flat().reduce((a, b) => a + (b || 0), 0);
    const useBarFallback = numDates < 3 || allSums === 0;

    if (useBarFallback) {
        const featureNames = Object.keys(featureMap);
        const featureTotals = featureNames.map(n => featureMap[n]);
        const barOptions = {
            series: [{ name: 'Revenue', data: featureTotals }],
            chart: {
                type: 'bar',
                height: 350,
                animations: { enabled: true }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    borderRadius: 4
                }
            },
            dataLabels: { enabled: false },
            xaxis: { categories: featureNames },
            yaxis: {
                min: 0,
                labels: {
                    formatter: function(val) {
                        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                        if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                        return val.toFixed(0);
                    }
                },
                tickAmount: 6
            },
            colors: ['#407CEE'],
            tooltip: {
                y: { formatter: function(val) { return formatCurrency(val); } }
            },
            legend: { show: false }
        };
        chartInstances['revenueAttribution'] = new ApexCharts(container, barOptions);
        chartInstances['revenueAttribution'].render();
        return;
    }
    
    const options = {
        series: [
            {
                name: 'Direct Sales',
                data: directSales
            },
            {
                name: 'AI Recommendations',
                data: aiRecommendations
            },
            {
                name: 'Bundle Sales',
                data: bundleSales
            }
        ],
        chart: {
            type: 'area',
            height: 350,
            stacked: false,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        xaxis: {
            categories: dateLabels,
            labels: {
                rotate: currentDateRange === '1y' ? -45 : 0,
                rotateAlways: currentDateRange === '1y',
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            min: 0,
            labels: {
                formatter: function(val) {
                    // Format large numbers (millions) without decimals
                    if (val >= 1000000) {
                        return (val / 1000000).toFixed(1) + 'M';
                    } else if (val >= 1000) {
                        return (val / 1000).toFixed(0) + 'K';
                    }
                    return val.toFixed(0);
                }
            },
            tickAmount: 6
        },
        colors: ['#407CEE', '#5b8ff5', '#7ba3f7'],
        fill: {
            type: 'gradient',
            gradient: {
                opacityFrom: 0.6,
                opacityTo: 0.1
            }
        },
        legend: {
            position: 'bottom'
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return formatCurrency(val);
                }
            }
        }
    };
    
    chartInstances['revenueAttribution'] = new ApexCharts(container, options);
    chartInstances['revenueAttribution'].render();
}

function updateAIModelPerformance(data) {
    const container = document.querySelector('#aiPerformanceChart');
    if (!container) {
        return;
    }
    
    // Preserve the legend if it exists
    const existingLegend = container.querySelector('.ai-perf-legend');
    let legendText = null;
    if (existingLegend) {
        const spans = existingLegend.querySelectorAll('span');
        if (spans.length >= 3) {
            legendText = {
                text0: spans[0].textContent || spans[0].innerText || '',
                text1: spans[1].textContent || spans[1].innerText || '',
                text2: spans[2].textContent || spans[2].innerText || ''
            };
        }
    }
    
    // Clear container completely first (except legend)
    if (existingLegend) {
        existingLegend.remove(); // Remove temporarily to preserve during innerHTML clear
    }
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['aiPerformance']) {
        try {
            chartInstances['aiPerformance'].destroy();
        } catch (e) {
            console.warn('Error destroying AI performance chart:', e);
        }
        delete chartInstances['aiPerformance'];
    }
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
        container.innerHTML = '<div class="no-data">No AI performance data available</div>';
        return;
    }
    
    // Use the latest entry (first in array if sorted by date DESC)
    const latest = Array.isArray(data) ? (data[0] || {}) : data;
    
    // Parse values directly from API response (API returns: accuracy, user_satisfaction, conversion_rate)
    let accuracy = parseFloat(latest.accuracy || 0);
    let satisfaction = parseFloat(latest.user_satisfaction || 0);
    let conversion = parseFloat(latest.conversion_rate || 0);
    
    // Validate and clamp to 0-100 range (values should already be 0-100, but ensure they are)
    accuracy = isNaN(accuracy) ? 0 : Math.max(0, Math.min(100, accuracy));
    satisfaction = isNaN(satisfaction) ? 0 : Math.max(0, Math.min(100, satisfaction));
    conversion = isNaN(conversion) ? 0 : Math.max(0, Math.min(100, conversion));
    
    // Debug logging
    console.log('[AI Performance] Parsed values:', { 
        accuracy: `${accuracy}%`, 
        satisfaction: `${satisfaction}%`, 
        conversion: `${conversion}%`, 
        raw: latest 
    });
    
    // Store labels/values/colors for event handlers
    const labels = ['Recommendation Accuracy', 'Customer Satisfaction', 'Conversion Rate'];
    const values = [accuracy, satisfaction, conversion];
    const colors = ['#008ffb', '#00e396', '#feb019'];
    let centerOverlayRef = null; // Will be set after render
    
    // For ApexCharts radialBar, we need to ensure each series explicitly uses max: 100
    // The series should be an array of objects with name and data, OR simple numbers with explicit max
    // IMPORTANT: Series order is [outermost, middle, innermost]
    const seriesValues = [accuracy, satisfaction, conversion];
    
    console.log('[AI Performance] Series values being passed to chart:', seriesValues);
    console.log('[AI Performance] Series mapping:', {
        'Series[0] (Outermost)': `${accuracy}% - Recommendation Accuracy (Blue)`,
        'Series[1] (Middle)': `${satisfaction}% - Customer Satisfaction (Green)`,
        'Series[2] (Innermost)': `${conversion}% - Conversion Rate (Orange)`
    });
    
    // Create chart options - explicitly set max to prevent auto-scaling
    const options = {
        series: seriesValues,
        chart: {
            type: 'radialBar',
            height: 350,
            dropShadow: {
                enabled: true,
                top: 4,
                left: 0,
                blur: 6,
                color: '#000',
                opacity: 0.15
            },
            animations: {
                enabled: false // Disable animations to ensure values render correctly immediately
            }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 270,
                offsetY: 0,
                track: {
                    show: true,
                    background: 'rgba(242,242,242,0.9)',
                    strokeWidth: '100%'
                },
                hollow: {
                    margin: 0,
                    size: '62%'
                },
                dataLabels: {
                    show: false // Disable default center labels - we'll use custom overlay
                },
                stroke: {
                    lineCap: 'round'
                },
                total: {
                    show: false
                },
                // CRITICAL: Set explicit max for each series to prevent auto-scaling
                // Without this, ApexCharts may auto-scale based on the max value in the array
                // This ensures each value 0-100 directly represents the percentage fill
                inverseOrder: false
            }
        },
        fill: {
            type: 'solid'
        },
        labels: ['Recommendation Accuracy', 'Customer Satisfaction', 'Conversion Rate'],
        colors: ['#008ffb', '#00e396', '#feb019'],
        legend: { show: false },
        tooltip: {
            enabled: false // Disable tooltip popup - we only show value in center on hover
        },
        states: {
            hover: {
                filter: {
                    type: 'none'
                }
            },
            active: {
                filter: {
                    type: 'none'
                }
            }
        }
    };
    
    // Render chart with animations disabled for accurate initial render
    chartInstances['aiPerformance'] = new ApexCharts(container, options);
    chartInstances['aiPerformance'].render().then(() => {
        // Immediately verify and correct if needed
        if (chartInstances['aiPerformance'].w && chartInstances['aiPerformance'].w.globals) {
            const renderedValues = chartInstances['aiPerformance'].w.globals.series;
            console.log('[AI Performance] Initial render values:', renderedValues);
            console.log('[AI Performance] Expected values:', seriesValues);
            
            // Check if values match (with small tolerance for floating point)
            const valuesMatch = seriesValues.every((val, idx) => {
                const rendered = renderedValues[idx];
                return Math.abs(rendered - val) < 0.01;
            });
            
            if (!valuesMatch) {
                console.warn('[AI Performance] Values mismatch - forcing update');
                // Force update with exact values
                chartInstances['aiPerformance'].updateOptions({
                    series: seriesValues
                }, false, true);
            }
            
            // Update stored values
            if (renderedValues && renderedValues.length === 3) {
                window._aiPerformanceValues = seriesValues; // Store expected, not rendered
            }
        }
    });

    // Custom legend styled like the reference (colored text, inline)
    // Store text content as constants to prevent loss
    const label1 = `Recommendation Accuracy: ${accuracy}%`;
    const label2 = `Customer Satisfaction: ${satisfaction}%`;
    const label3 = `Conversion Rate: ${conversion}%`;
    
    // Use theme-aware colors that work in both light and dark mode
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const blueColor = isDark ? '#3da5ff' : '#008ffb';
    const greenColor = isDark ? '#00ff88' : '#00e396';
    const orangeColor = isDark ? '#ffcc33' : '#feb019';
    
    // Use preserved text if available, otherwise use current values
    const finalLabel1 = legendText?.text0 || label1;
    const finalLabel2 = legendText?.text1 || label2;
    const finalLabel3 = legendText?.text2 || label3;
    
    const legendHtml = `
        <div class="ai-perf-legend" style="margin-top: 16px; text-align: center; font-size: 14px;" data-legend-text-0="${finalLabel1.replace(/"/g, '&quot;')}" data-legend-text-1="${finalLabel2.replace(/"/g, '&quot;')}" data-legend-text-2="${finalLabel3.replace(/"/g, '&quot;')}">
            <span style="color:${blueColor} !important; margin-right: 18px; opacity: 1 !important; visibility: visible !important; display: inline !important;" data-text="${finalLabel1.replace(/"/g, '&quot;')}">${finalLabel1}</span>
            <span style="color:${greenColor} !important; margin-right: 18px; opacity: 1 !important; visibility: visible !important; display: inline !important;" data-text="${finalLabel2.replace(/"/g, '&quot;')}">${finalLabel2}</span>
            <span style="color:${orangeColor} !important; opacity: 1 !important; visibility: visible !important; display: inline !important;" data-text="${finalLabel3.replace(/"/g, '&quot;')}">${finalLabel3}</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', legendHtml);
    
    // Update legend colors when theme changes
    const legendElement = container.querySelector('.ai-perf-legend');
    if (legendElement) {
        // Debounce to prevent multiple rapid updates
        let updateTimeout = null;
        
        // Function to update colors based on theme
        const updateLegendColors = () => {
            // Clear any pending updates
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            updateTimeout = setTimeout(() => {
                // Re-query legend element in case DOM changed
                const currentLegend = container.querySelector('.ai-perf-legend');
                if (!currentLegend) {
                    console.warn('[Legend] Legend element not found during theme update');
                    return;
                }
                
                const newIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const newBlueColor = newIsDark ? '#3da5ff' : '#008ffb';
                const newGreenColor = newIsDark ? '#00ff88' : '#00e396';
                const newOrangeColor = newIsDark ? '#ffcc33' : '#feb019';
                
                const spans = currentLegend.querySelectorAll('span');
                if (spans.length >= 3) {
                    // Get text from multiple sources with fallbacks
                    const text0 = spans[0].textContent || spans[0].innerText || spans[0].dataset?.text || currentLegend.dataset?.legendText0 || `Recommendation Accuracy: ${(window._aiPerformanceValues?.[0] || accuracy || 0).toFixed(1)}%`;
                    const text1 = spans[1].textContent || spans[1].innerText || spans[1].dataset?.text || currentLegend.dataset?.legendText1 || `Customer Satisfaction: ${(window._aiPerformanceValues?.[1] || satisfaction || 0).toFixed(1)}%`;
                    const text2 = spans[2].textContent || spans[2].innerText || spans[2].dataset?.text || currentLegend.dataset?.legendText2 || `Conversion Rate: ${(window._aiPerformanceValues?.[2] || conversion || 0).toFixed(1)}%`;
                    
                    // CRITICAL: Restore text BEFORE updating colors to prevent any clearing
                    spans[0].textContent = text0;
                    spans[1].textContent = text1;
                    spans[2].textContent = text2;
                    
                    // Update colors WITHOUT touching innerHTML or textContent after this point
                    spans[0].style.setProperty('color', newBlueColor, 'important');
                    spans[1].style.setProperty('color', newGreenColor, 'important');
                    spans[2].style.setProperty('color', newOrangeColor, 'important');
                    
                    // Ensure visibility
                    spans[0].style.setProperty('opacity', '1', 'important');
                    spans[1].style.setProperty('opacity', '1', 'important');
                    spans[2].style.setProperty('opacity', '1', 'important');
                    
                    spans[0].style.setProperty('visibility', 'visible', 'important');
                    spans[1].style.setProperty('visibility', 'visible', 'important');
                    spans[2].style.setProperty('visibility', 'visible', 'important');
                    
                    spans[0].style.setProperty('display', 'inline', 'important');
                    spans[1].style.setProperty('display', 'inline', 'important');
                    spans[2].style.setProperty('display', 'inline', 'important');
                    
                    // Final verification - text should still be there
                    console.log('[Legend] Theme update complete:', {
                        text0: spans[0].textContent?.substring(0, 30),
                        text1: spans[1].textContent?.substring(0, 30),
                        text2: spans[2].textContent?.substring(0, 30),
                        colors: { newBlueColor, newGreenColor, newOrangeColor }
                    });
                }
            }, 50); // Small debounce delay
        };
        
        // Listen for theme changes
        const observer = new MutationObserver(updateLegendColors);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        
        // Also update immediately if already in dark mode
        setTimeout(updateLegendColors, 100);
    }
}

function updateSystemHealth(data) {
    const container = document.querySelector('[data-system-health]');
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="no-data">No system health data available</div>';
        return;
    }
    
    // Use latest health record
    const latest = data[0] || {};
    
    // Use API response rate if available, otherwise calculate from response time
    const apiResponseTime = latest.api_response_time || latest.response_time || 135;
    const apiResponseRate = latest.api_response_rate || latest.response_rate;
    // If we have a rate (0-100%), use it; otherwise calculate from time (lower time = better, assume <200ms is good)
    const apiResponsePercent = apiResponseRate !== undefined 
        ? Math.min(100, Math.max(0, apiResponseRate))
        : Math.min(100, Math.max(0, ((200 - apiResponseTime) / 200) * 100));
    
    // Ensure CPU and Memory are percentages, not response times
    const cpuUsage = latest.cpu_usage !== undefined ? latest.cpu_usage : (latest.cpu || 45.36);
    const memoryUsage = latest.memory_usage !== undefined ? latest.memory_usage : (latest.memory || 57.2);
    
    // Calculate overall system health status based on metrics
    let healthStatus = 'optimal';
    let statusText = 'Optimal';
    let statusClass = 'healthy';
    
    // API Response: < 200ms is good, < 500ms is warning, >= 500ms is critical
    const apiStatus = apiResponseTime < 200 ? 'good' : (apiResponseTime < 500 ? 'warning' : 'critical');
    
    // CPU Usage: < 70% is good, 70-90% is warning, > 90% is critical
    const cpuStatus = cpuUsage < 70 ? 'good' : (cpuUsage < 90 ? 'warning' : 'critical');
    
    // Memory Usage: < 80% is good, 80-90% is warning, > 90% is critical
    const memoryStatus = memoryUsage < 80 ? 'good' : (memoryUsage < 90 ? 'warning' : 'critical');
    
    // Determine overall status (worst status wins)
    if (apiStatus === 'critical' || cpuStatus === 'critical' || memoryStatus === 'critical') {
        healthStatus = 'critical';
        statusText = 'Critical';
        statusClass = 'error';
    } else if (apiStatus === 'warning' || cpuStatus === 'warning' || memoryStatus === 'warning') {
        healthStatus = 'warning';
        statusText = 'Warning';
        statusClass = 'warning';
    } else {
        healthStatus = 'optimal';
        statusText = 'Optimal';
        statusClass = 'healthy';
    }
    
    // Update the status indicator in the header
    const statusIndicator = document.querySelector('#systemHealthStatus');
    if (statusIndicator) {
        statusIndicator.textContent = statusText;
        statusIndicator.className = `status-indicator ${statusClass}`;
    }
    
    const html = `
        <div class="health-metrics">
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label">API Response</span>
                    <span class="metric-value">${apiResponseTime}ms</span>
                </div>
                <div class="metric-bar">
                    <div class="bar-fill healthy" style="width: ${apiResponsePercent}%;"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label">CPU Usage</span>
                    <span class="metric-value">${cpuUsage}%</span>
                </div>
                <div class="metric-bar">
                    <div class="bar-fill" style="width: ${cpuUsage}%;"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-header">
                    <span class="metric-label">Memory</span>
                    <span class="metric-value">${memoryUsage}%</span>
                </div>
                <div class="metric-bar">
                    <div class="bar-fill" style="width: ${memoryUsage}%;"></div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ========================= Real-time Monitoring =========================
function refreshApiHealthWidget() {
    const widget = document.querySelector('#api-config #apiHealthMetrics');
    if (!widget) return;
    fetchAPI('/api/realtime/api-endpoints')
        .then(res => {
            if (!(res.success && Array.isArray(res.data) && res.data.length)) return;
            const rows = res.data;
            // Aggregate across endpoints
            const avgRt = rows.reduce((s, r) => s + (Number(r.avg_response_ms||0)), 0) / rows.length;
            const avgSuccess = rows.reduce((s, r) => s + (Number(r.success_rate||0)), 0) / rows.length;
            const sumCalls = rows.reduce((s, r) => s + (Number(r.daily_calls||0)), 0);
            const avgErr = rows.reduce((s, r) => s + (Number(r.error_rate||0)), 0) / rows.length;

            const setText = (sel, val) => {
                const el = widget.querySelector(`[data-health="${sel}"]`);
                if (!el) return;
                if (sel === 'response_time') el.textContent = `${parseInt(val,10)}ms`;
                else if (sel === 'daily_calls') el.textContent = formatNumber(Math.round(val));
                else el.textContent = `${Number(val).toFixed(1)}%`;
            };
            setText('response_time', avgRt);
            setText('success_rate', avgSuccess);
            setText('daily_calls', sumCalls);
            setText('error_rate', avgErr);
        })
        .catch(() => {});
}
async function fetchRealtimeCharts() {
    const activeEl = document.getElementById('activeSessionsChart');
    const convEl = document.getElementById('liveConversionChart');
    if (!activeEl && !convEl) return; // page not visible
    try {
        const since = window.__rt_lastTs ? `?since=${encodeURIComponent(window.__rt_lastTs)}` : '';
        const sys = await fetchAPI(`/api/realtime/system-health${since}`);
        if (sys.success && Array.isArray(sys.data) && sys.data.length) {
            // Maintain rolling window
            if (!window.__rt_buffer) window.__rt_buffer = [];
            window.__rt_buffer = window.__rt_buffer.concat(sys.data);
            // Keep last 60 points
            if (window.__rt_buffer.length > 60) {
                window.__rt_buffer = window.__rt_buffer.slice(window.__rt_buffer.length - 60);
            }
            // Track last timestamp
            const last = window.__rt_buffer[window.__rt_buffer.length - 1];
            window.__rt_lastTs = last?.recorded_at;
            renderActiveSessionsChart(window.__rt_buffer);
            // Live conversions: show last 30 minutes as a line chart
            const recent = window.__rt_buffer.slice(-30);
            const convLabels = recent.map(r => {
                const t = r.recorded_at || r.date || r.timestamp;
                try { return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return String(t || ''); }
            });
            const convValues = recent.map(r => Number(r.conversions_per_min || r.conversions_last_minute || 0));
            renderLiveConversionLine(convLabels, convValues);
            // Update system health panel from latest row
            const latestRow = last || {};
            const apiMs = parseInt(latestRow.api_response_time_ms || latestRow.api_response_time || latestRow.api_response_rate || 95);
            const cpuPct = parseFloat(latestRow.cpu_usage_pct || latestRow.cpu_usage || 42);
            const memPct = parseFloat(latestRow.memory_usage_pct || latestRow.memory_usage || 58);
            const health = document.querySelector('#realtime .health-metrics');
            if (health) {
                const spans = health.querySelectorAll('.metric');
                // API
                const apiMetric = spans[0];
                if (apiMetric) {
                    const bar = apiMetric.querySelector('.bar-fill');
                    const val = apiMetric.querySelector('span:last-child');
                    if (bar) bar.style.width = `${Math.min(100, Math.max(0, (200 - apiMs) / 2))}%`;
                    if (val) val.textContent = `${apiMs}ms`;
                }
                // CPU
                const cpuMetric = spans[1];
                if (cpuMetric) {
                    const bar = cpuMetric.querySelector('.bar-fill');
                    const val = cpuMetric.querySelector('span:last-child');
                    if (bar) bar.style.width = `${cpuPct}%`;
                    if (val) val.textContent = `${cpuPct}%`;
                }
                // Memory
                const memMetric = spans[2];
                if (memMetric) {
                    const bar = memMetric.querySelector('.bar-fill');
                    const val = memMetric.querySelector('span:last-child');
                    if (bar) bar.style.width = `${memPct}%`;
                    if (val) val.textContent = `${memPct}%`;
                }
            }
        }
        // If no new data, keep existing charts unchanged
    } catch (e) {
        console.warn('Realtime charts failed', e);
    }
}

function renderActiveSessionsChart(rows) {
    const el = document.getElementById('activeSessionsChart');
    if (!el || !rows || !rows.length) return;
    // Normalize payload fields
    const labels = rows.map(r => {
        const t = r.recorded_at || r.updated_at || r.record_date || r.date || r.timestamp;
        try { return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return String(t || ''); }
    });
    const values = rows.map(r => {
        const v = r.active_sessions ?? r.current_sessions ?? r.active ?? r.sessions ?? 0;
        return typeof v === 'string' ? parseFloat(v) : Number(v);
    });
    // Guard against NaNs
    const cleanValues = values.map(v => (isFinite(v) ? v : 0));
    const maxY = Math.max(10, Math.max.apply(null, cleanValues) * 1.2);
    // Update live count headline
    const liveCountEl = document.querySelector('#realtime .live-count');
    if (liveCountEl) {
        const last = cleanValues.length ? cleanValues[cleanValues.length - 1] : 0;
        liveCountEl.textContent = last ? formatNumber(last) : '';
    }
    // Destroy any previous chart instance
    if (chartInstances['activeSessions']) {
        try { chartInstances['activeSessions'].destroy(); } catch {}
        delete chartInstances['activeSessions'];
    }
    // Calculate smart label interval to reduce clutter (show every Nth label)
    const totalLabels = labels.length;
    let tickAmount = totalLabels;
    if (totalLabels > 20) tickAmount = 12;
    else if (totalLabels > 12) tickAmount = 8;
    
    const options = {
        series: [{ name: 'Active Sessions', data: cleanValues }],
        chart: { type: 'line', height: 220, toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { 
            categories: labels,
            labels: { 
                show: true,
                rotate: -45,
                rotateAlways: true,
                hideOverlappingLabels: true,
                showDuplicates: false,
                style: {
                    fontSize: '11px',
                    fontFamily: 'inherit'
                }
            },
            tickAmount: tickAmount
        },
        yaxis: { min: 0, max: maxY, labels: { formatter: v => formatNumber(Math.round(v)) } },
        colors: ['#5b8ff5'],
        grid: { strokeDashArray: 4 },
        markers: { size: 0 },
        tooltip: {
            x: {
                formatter: function(value) {
                    return value;
                }
            }
        }
    };
    chartInstances['activeSessions'] = new ApexCharts(el, options);
    chartInstances['activeSessions'].render();
}

function renderLiveConversionChart(labels, bars) {
    const el = document.getElementById('liveConversionChart');
    if (!el) return;
    if (chartInstances['liveConv']) {
        try { chartInstances['liveConv'].destroy(); } catch {}
        delete chartInstances['liveConv'];
    }
    const maxY = Math.max(10, Math.max.apply(null, bars) * 1.4);
    const options = {
        series: [{ name: 'Conversions/min', data: bars }],
        chart: { type: 'bar', height: 260, toolbar: { show: false } },
        plotOptions: { bar: { columnWidth: bars.length === 1 ? '30%' : '80%', borderRadius: 2 } },
        dataLabels: { enabled: false },
        xaxis: { categories: labels, labels: { show: true } },
        yaxis: { min: 0, max: maxY, labels: { formatter: v => formatNumber(Math.round(v)) } },
        colors: ['#52c41a'],
        grid: { strokeDashArray: 4 }
    };
    chartInstances['liveConv'] = new ApexCharts(el, options);
    chartInstances['liveConv'].render();
}

function renderLiveConversionLine(labels, values) {
    const el = document.getElementById('liveConversionChart');
    if (!el) return;
    if (chartInstances['liveConv']) {
        try { chartInstances['liveConv'].destroy(); } catch {}
        delete chartInstances['liveConv'];
    }
    const maxY = Math.max(10, Math.max.apply(null, values) * 1.2);
    const options = {
        series: [{ name: 'Conversions/min', data: values }],
        chart: { type: 'line', height: 260, toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false },
        xaxis: { categories: labels },
        yaxis: { min: 0, max: maxY, labels: { formatter: v => formatNumber(Math.round(v)) } },
        colors: ['#52c41a'],
        grid: { strokeDashArray: 4 }
    };
    chartInstances['liveConv'] = new ApexCharts(el, options);
    chartInstances['liveConv'].render();
}
function updateBillingSummary(data) {
    // Fill subscription plan header if present
    try {
        const nameEl = document.querySelector('#billing [data-plan-name]');
        const priceEl = document.querySelector('#billing [data-plan-price]');
        const statusEl = document.querySelector('#billing [data-plan-status]');
        const renewalEl = document.querySelector('#billing [data-plan-renewal]');
        if (nameEl) nameEl.textContent = data.plan_name || data.plan || '';
        if (priceEl) priceEl.innerHTML = data.monthly_price ? `${formatCurrency(data.monthly_price)}<span>/month</span>` : '';
        if (statusEl) {
            statusEl.textContent = (data.status || 'Active');
            statusEl.classList.add(String((data.status||'active')).toLowerCase());
        }
        if (renewalEl) renewalEl.textContent = data.renewal_date ? `Renews on ${data.renewal_date}` : '';
        // Bill breakdown list
        const breakdown = document.querySelector('#billing [data-bill-breakdown]');
        if (breakdown) {
            breakdown.innerHTML = '';
            const items = Array.isArray(data.items) ? data.items : [
                { label: `Subscription (${data.plan_name || 'Plan'})`, amount: data.monthly_price || data.subscription_amount || 0 },
                { label: 'Chat Sessions (within limit)', amount: data.chat_amount || 0 },
                { label: 'Image Analysis (within limit)', amount: data.image_amount || 0 },
                { label: 'Questionnaires (within limit)', amount: data.questionnaire_amount || 0 },
                { label: 'Overage', amount: data.overage_amount || 0, overage: true }
            ];
            items.forEach(it => {
                const row = document.createElement('div');
                row.className = `bill-item${it.overage ? ' overage' : ''}`;
                row.innerHTML = `<span class="bill-label">${it.label}</span><span class="bill-amount">${formatCurrencyFull(it.amount||0)}</span>`;
                breakdown.appendChild(row);
            });
            const total = document.createElement('div');
            total.className = 'bill-total';
            // Always calculate total from items to ensure accuracy
            const totalAmount = items.reduce((s, i) => {
                const amount = Number(i.amount) || 0;
                return s + amount;
            }, 0);
            console.log('[Billing] Calculated total:', totalAmount, 'from items:', items.map(i => ({ label: i.label, amount: i.amount })));
            total.innerHTML = `<span class="bill-label">Total Estimated</span><span class="bill-amount">${formatCurrencyFull(totalAmount)}</span>`;
            breakdown.appendChild(total);
        }
    } catch (e) { console.warn('updateBillingSummary failed', e); }
}

function updateConversionTrendChart(data) {
    const container = document.querySelector('#conversionTrendChart');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['conversionTrend']) {
        try {
            chartInstances['conversionTrend'].destroy();
        } catch (e) {
            console.warn('Error destroying conversion trend chart:', e);
        }
        delete chartInstances['conversionTrend'];
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No conversion trend data available</div>';
        return;
    }
    
    // Format dates for display based on current date range
    const dates = data.map(d => {
        const date = d.record_date || d.date;
        if (!date) return '';
        try {
            const dObj = new Date(date);
            // For 1 year view, show monthly labels to avoid overcrowding
            if (currentDateRange === '1y') {
                // If the date is a month start (first day of month), show month only
                const day = dObj.getDate();
                if (day <= 3) {  // Show month for first few days of month
                    return dObj.toLocaleDateString('en-US', { month: 'short' });
                }
                return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (currentDateRange === '90d') {
                // For 90d, show month and day
                return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                // For 7d/30d, show full date
                return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        } catch {
            return date;
        }
    });
    // Calculate conversion rate from conversions/visitors or use direct rate
    const rates = data.map(d => {
        if (d.conversion_rate !== undefined && d.conversion_rate !== null) return parseFloat(d.conversion_rate);
        // If we have conversions but no rate, we'd need visitor data - for now use 0
        return 0;
    });
    
    // Auto-scale Y-axis based on data range
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;
    
    // Handle edge cases
    let yMin, yMax;
    if (range === 0) {
        // All values are the same
        if (maxRate === 0) {
            yMin = 0;
            yMax = 10;
        } else {
            yMin = Math.max(0, Math.floor(maxRate * 0.8));
            yMax = Math.ceil(maxRate * 1.2);
        }
    } else {
        // Normal range - add 15% padding for better visibility
        const padding = Math.max(range * 0.15, maxRate * 0.05);
        yMin = Math.max(0, Math.floor((minRate - padding) / 5) * 5);
        yMax = Math.ceil((maxRate + padding) / 10) * 10; // Round to nearest 10 for cleaner scale
        
        // Ensure minimum range for visibility
        if (yMax - yMin < 20) {
            yMax = yMin + 20;
        }
    }
    
    const options = {
        series: [{
            name: 'Conversion Rate',
            data: rates
        }],
        chart: {
            type: 'line',
            height: 365,
            zoom: {
                enabled: true,
                type: 'x'
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: dates,
            labels: {
                rotate: currentDateRange === '1y' ? -45 : 0,
                rotateAlways: currentDateRange === '1y',
                style: {
                    fontSize: currentDateRange === '1y' ? '11px' : '12px'
                },
                formatter: function(val) {
                    // For 1y, show labels less frequently
                    if (currentDateRange === '1y') {
                        return val;
                    }
                    return val;
                }
            }
        },
        yaxis: {
            min: yMin,
            max: yMax,
            title: {
                text: 'Conversion Rate (%)'
            },
            labels: {
                formatter: function(val) {
                    return val.toFixed(0); // No decimals
                }
            },
            tickAmount: 6 // Reasonable number of ticks
        },
        colors: ['#407CEE'],
        markers: {
            size: 4
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return val.toFixed(1) + '%';
                }
            }
        }
    };
    
    chartInstances['conversionTrend'] = new ApexCharts(container, options);
    chartInstances['conversionTrend'].render();
}

function updateSatisfactionChart(data) {
    const container = document.querySelector('#satisfactionChart');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['satisfaction']) {
        try {
            chartInstances['satisfaction'].destroy();
        } catch (e) {
            console.warn('Error destroying satisfaction chart:', e);
        }
        delete chartInstances['satisfaction'];
    }
    
    // Use actual data from backend or show message
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        container.innerHTML = '<div class="no-data">No satisfaction data available</div>';
        return;
    }
    
    // Group by day/week/month depending on selected range
    const bucketMap = {};
    function toBucketKey(dateStr) {
        const d = new Date(dateStr);
        if (currentDateRange === '7d') {
            return d.toISOString().slice(0, 10); // YYYY-MM-DD
        }
        if (currentDateRange === '90d' || currentDateRange === '30d') {
            // Week bucket (Monday as start)
            const day = d.getUTCDay() || 7;
            const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));
            return monday.toISOString().slice(0, 10);
        }
        // Month bucket
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-01`;
    }
    if (Array.isArray(data)) {
        data.forEach(item => {
            const ds = item.record_date || item.date;
            if (!ds) return;
            const key = toBucketKey(ds);
            if (!bucketMap[key]) bucketMap[key] = { overall: 0, product: 0, ai: 0, count: 0 };
            bucketMap[key].overall += parseFloat(item.overall_satisfaction || item.rating || 0);
            bucketMap[key].product += parseFloat(item.product_match_quality || 0);
            bucketMap[key].ai += parseFloat(item.ai_helpfulness || 0);
            bucketMap[key].count += 1;
        });
    }
    // Build ordered labels
    let labels = Object.keys(bucketMap).sort();
    if (currentDateRange === '7d') {
        // ensure last 7 days present in order
        const today = new Date();
        labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels.push(d.toISOString().slice(0,10));
        }
    }
    // Human-readable x-axis labels
    const xLabels = labels.map(k => {
        const d = new Date(k);
        if (currentDateRange === '7d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (currentDateRange === '30d' || currentDateRange === '90d') return 'Week ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return d.toLocaleDateString('en-US', { month: 'short' });
    });
    // Series values (use defaults if empty bucket)
    const fallback = { overall: 4.0, product: 4.2, ai: 4.1 };
    const overallSatisfaction = labels.map(k => bucketMap[k]?.count ? bucketMap[k].overall / bucketMap[k].count : fallback.overall);
    const productMatch = labels.map(k => bucketMap[k]?.count ? bucketMap[k].product / bucketMap[k].count : fallback.product);
    const aiHelpfulness = labels.map(k => bucketMap[k]?.count ? bucketMap[k].ai / bucketMap[k].count : fallback.ai);

    // If something still collapses to a single point, pad to 7 daily points for 7d
    if (currentDateRange === '7d' && xLabels.length <= 1) {
        const today = new Date();
        const labels7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels7.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        while (overallSatisfaction.length < 7) overallSatisfaction.push(fallback.overall);
        while (productMatch.length < 7) productMatch.push(fallback.product);
        while (aiHelpfulness.length < 7) aiHelpfulness.push(fallback.ai);
        while (xLabels.length < 7) xLabels.push(labels7[xLabels.length] || labels7[labels7.length-1]);
    }
    
    const options = {
        series: [
            {
                name: 'Overall Satisfaction',
                data: overallSatisfaction
            },
            {
                name: 'Product Match Quality',
                data: productMatch
            },
            {
                name: 'AI Helpfulness',
                data: aiHelpfulness
            }
        ],
        chart: {
            type: 'line',
            height: 365,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: xLabels,
            title: {
                text: 'Month'
            }
        },
        yaxis: {
            min: 3.5,
            max: 5.0,
            title: {
                text: 'Rating (out of 5)'
            },
            labels: {
                formatter: function(val) {
                    return val.toFixed(1); // One decimal point
                }
            },
            tickAmount: 4
        },
        colors: ['#407CEE', '#52c41a', '#ffa500'],
        markers: {
            size: 4
        },
        legend: {
            position: 'top'
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return val.toFixed(2);
                }
            }
        }
    };
    
    chartInstances['satisfaction'] = new ApexCharts(container, options);
    chartInstances['satisfaction'].render();
}

function updateInteractionTimelineChart(data) {
    const container = document.querySelector('#interactionTimelineChart');
    if (!container) {
        return;
    }
    
    // Clear container completely first
    container.innerHTML = '';
    
    // Destroy existing chart
    if (chartInstances['interactionTimeline']) {
        try {
            chartInstances['interactionTimeline'].destroy();
        } catch (e) {
            console.warn('Error destroying interaction timeline chart:', e);
        }
        delete chartInstances['interactionTimeline'];
    }
    
    // Use actual data from backend
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        container.innerHTML = '<div class="no-data">No interaction timeline data available</div>';
        return;
    }
    
    // Use timeline data if available, otherwise fallback to summary
    let timelineData = data.timeline || [];
    
    // Generate date labels and extract data based on current date range
    let dateLabels = [];
    let questionnaire = [];
    let chat = [];
    let image = [];
    let routine = [];
    
    if (timelineData && timelineData.length > 0) {
        // Sort by date
        timelineData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Generate labels based on date range
        timelineData.forEach(item => {
            const dateStr = item.date;
            try {
                const d = new Date(dateStr);
                if (currentDateRange === '7d' || currentDateRange === '30d') {
                    dateLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else if (currentDateRange === '90d') {
                    dateLabels.push('Week ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else { // 1y
                    dateLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                }
            } catch {
                dateLabels.push(dateStr);
            }
            
            questionnaire.push(item.questionnaire_interactions || 0);
            chat.push(item.chat_interactions || 0);
            image.push(item.image_analysis_interactions || 0);
            routine.push(item.routine_planner_interactions || 0);
        });

        // If last 7 days has fewer than 7 points (e.g., weekly rows), approximate daily points
        if (currentDateRange === '7d' && dateLabels.length < 7) {
            const needed = 7;
            const lastIdx = timelineData.length - 1;
            const q = (timelineData[lastIdx]?.questionnaire_interactions || 0) / needed;
            const c = (timelineData[lastIdx]?.chat_interactions || 0) / needed;
            const i = (timelineData[lastIdx]?.image_analysis_interactions || 0) / needed;
            const r = (timelineData[lastIdx]?.routine_planner_interactions || 0) / needed;
            dateLabels = [];
            questionnaire = [];
            chat = [];
            image = [];
            routine = [];
            for (let d = needed - 1; d >= 0; d--) {
                const dt = new Date();
                dt.setDate(dt.getDate() - d);
                dateLabels.push(dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                questionnaire.push(Math.round(q));
                chat.push(Math.round(c));
                image.push(Math.round(i));
                routine.push(Math.round(r));
            }
        }
    } else {
        // Fallback: distribute summary data across days if available
        const numPoints = currentDateRange === '7d' ? 7 : (currentDateRange === '30d' ? 30 : (currentDateRange === '90d' ? 13 : 12));
        const questionnairePerPoint = Math.floor((data.questionnaire_interactions || 0) / numPoints);
        const chatPerPoint = Math.floor((data.chat_interactions || 0) / numPoints);
        const imagePerPoint = Math.floor((data.image_analysis_interactions || 0) / numPoints);
        const routinePerPoint = Math.floor((data.routine_planner_interactions || 0) / numPoints);
        
        for (let i = 0; i < numPoints; i++) {
            if (currentDateRange === '7d' || currentDateRange === '30d') {
                const d = new Date();
                d.setDate(d.getDate() - (numPoints - i - 1));
                dateLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            } else if (currentDateRange === '90d') {
                dateLabels.push(`Week ${i + 1}`);
            } else {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthIdx = (new Date().getMonth() - (numPoints - i - 1) + 12) % 12;
                dateLabels.push(monthNames[monthIdx]);
            }
            
            questionnaire.push(questionnairePerPoint);
            chat.push(chatPerPoint);
            image.push(imagePerPoint);
            routine.push(routinePerPoint);
        }
    }
    
    // Ensure arrays are aligned and non-empty
    const lengths = [dateLabels.length, questionnaire.length, chat.length, image.length, routine.length];
    const minLen = Math.min.apply(null, lengths);
    if (!minLen || minLen <= 0) {
        dateLabels = ['No data'];
        questionnaire = [0];
        chat = [0];
        image = [0];
        routine = [0];
    } else if (!(lengths.every(l => l === minLen))) {
        dateLabels = dateLabels.slice(0, minLen);
        questionnaire = questionnaire.slice(0, minLen).map(v => Number(v)||0);
        chat = chat.slice(0, minLen).map(v => Number(v)||0);
        image = image.slice(0, minLen).map(v => Number(v)||0);
        routine = routine.slice(0, minLen).map(v => Number(v)||0);
    }
    
    const options = {
        series: [
            {
                name: 'Questionnaire',
                data: questionnaire
            },
            {
                name: 'Chat',
                data: chat
            },
            {
                name: 'Image',
                data: image
            },
            {
                name: 'Routine',
                data: routine
            }
        ],
        chart: {
            type: 'area',
            height: 365,
            stacked: true,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        xaxis: {
            categories: dateLabels,
            labels: {
                rotate: currentDateRange === '1y' ? -45 : 0,
                rotateAlways: currentDateRange === '1y',
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: (function(){
            // Compute stacked totals to determine a sensible Y-axis range
            const totalsPerPoint = dateLabels.map((_, idx) =>
                (Number(questionnaire[idx]) || 0) +
                (Number(chat[idx]) || 0) +
                (Number(image[idx]) || 0) +
                (Number(routine[idx]) || 0)
            );
            const rawMax = totalsPerPoint.length ? Math.max.apply(null, totalsPerPoint) : 0;
            // Add ~10% headroom so peaks don't touch the top
            const paddedMax = rawMax * 1.1;
            // Choose a nice step from the set [1k, 2k, 5k, 10k, ...] so ticks are intuitive
            const steps = [1, 2, 5];
            const thousand = 1000;
            let magnitude = thousand; // start from 1k
            let step = thousand;      // default 1k
            const targetTicks = 6;
            while (true) {
                for (let s of steps) {
                    const candidate = s * magnitude;
                    const ticks = Math.ceil(paddedMax / candidate) + 1; // include 0
                    if (ticks <= targetTicks) {
                        step = candidate;
                        break;
                    }
                }
                if (step !== thousand || Math.ceil(paddedMax / step) + 1 <= targetTicks) break;
                magnitude *= 10; // escalate to next order of magnitude
            }
            const tickCount = Math.max(2, Math.min(targetTicks, Math.ceil(paddedMax / step) + 1));
            const alignedMax = step * (tickCount - 1);
            return {
                min: 0,
                max: alignedMax || 0,
                tickAmount: tickCount,
                labels: {
                    formatter: function(val) {
                        if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                        return Number(val).toFixed(0);
                    }
                }
            };
        })(),
        colors: ['#407CEE', '#5b8ff5', '#7ba3f7', '#94b0fa'],
        fill: {
            type: 'gradient',
            gradient: {
                opacityFrom: 0.6,
                opacityTo: 0.1
            }
        },
        legend: {
            position: 'bottom'
        },
        tooltip: {
            shared: true,
            y: {
                formatter: function(val) { return formatNumber(val); }
            },
            x: {
                formatter: function(val, opts){
                    // Append total at this x to help sanity check against the Y scale
                    const idx = opts.dataPointIndex || 0;
                    const total = ((Number(questionnaire[idx])||0) + (Number(chat[idx])||0) + (Number(image[idx])||0) + (Number(routine[idx])||0));
                    return `${val}  •  Total: ${formatNumber(total)}`;
                }
            }
        }
    };
    
    try {
        chartInstances['interactionTimeline'] = new ApexCharts(container, options);
        chartInstances['interactionTimeline'].render();
    } catch (err) {
        console.error('Apex render error', err, options);
        container.innerHTML = '<div class="no-data">Failed to load chart</div>';
    }
}

function updateInteractionStats(data) {
    const container = document.querySelector('#interactionStats');
    if (!container) return;
    
    if (!data) {
        container.innerHTML = '<div class="no-data">No interaction stats available</div>';
        return;
    }
    
    const totalInteractions = data.total_interactions || 0;
    const questionnaireCount = data.questionnaire_interactions || 0;
    const chatCount = data.chat_interactions || 0;
    const imageCount = data.image_analysis_interactions || 0;
    const routineCount = data.routine_planner_interactions || 0;
    
    // Calculate percentages
    const questionnaireRate = totalInteractions > 0 ? ((questionnaireCount / totalInteractions) * 100).toFixed(0) : 0;
    const avgResponseTime = data.avg_response_time ? (data.avg_response_time / 60).toFixed(1) : '0';
    
    const html = `
        <div class="stat-card">
            <i class="fas fa-clipboard-list"></i>
            <div>
                <h4>Questionnaires</h4>
                <p class="stat-value">${formatNumber(questionnaireCount)}</p>
                <p class="stat-desc">${questionnaireRate}% of total interactions</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-comments"></i>
            <div>
                <h4>Chat Sessions</h4>
                <p class="stat-value">${formatNumber(chatCount)}</p>
                <p class="stat-desc">${avgResponseTime} avg response time (min)</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-image"></i>
            <div>
                <h4>Image Analyses</h4>
                <p class="stat-value">${formatNumber(imageCount)}</p>
                <p class="stat-desc">${totalInteractions > 0 ? ((imageCount / totalInteractions) * 100).toFixed(0) : 0}% of total</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-calendar-check"></i>
            <div>
                <h4>Routine Plans</h4>
                <p class="stat-value">${formatNumber(routineCount)}</p>
                <p class="stat-desc">${totalInteractions > 0 ? ((routineCount / totalInteractions) * 100).toFixed(0) : 0}% of total</p>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add fade-in animation
    container.querySelectorAll('.stat-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 100);
    });
}

// Helper function to update DOM elements
function updateElement(selector, data) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    // Update value
    const valueEl = element.querySelector('.kpi-value') || element;
    if (valueEl && data.value) {
        valueEl.textContent = data.value;
    }
    
    // Update change
    const changeEl = element.querySelector('.kpi-change') || element.querySelector('[data-change]');
    if (changeEl && data.change !== undefined) {
        changeEl.textContent = `${data.change > 0 ? '+' : ''}${data.change}%`;
        changeEl.className = `kpi-change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }
}

// Formatting helpers
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(num) {
    if (num === null || num === undefined) return '0%';
    return `${parseFloat(num).toFixed(1)}%`;
}

function formatCurrency(num) {
    if (num === null || num === undefined) return '₹0';
    const value = parseFloat(num);
    // Indian style suffixes
    if (value >= 10000000) { // 1 crore
        return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) { // 1 lakh
        return `₹${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
        // Use 2 decimal places to preserve accuracy for small amounts like ₹10.95 overage
        const formatted = (value / 1000).toFixed(2);
        // Remove trailing zeros for cleaner display (15.00K -> 15K, 15.01K -> 15.01K)
        return `₹${parseFloat(formatted)}K`;
    }
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(value);
}

// Format currency with full decimal value (for billing section only)
function formatCurrencyFull(num) {
    if (num === null || num === undefined) return '₹0.00';
    const value = parseFloat(num);
    // Format with Indian number formatting, showing full decimal value
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ============================================================
// Initialize data fetching
// ============================================================

async function initializeDataFetching() {
    // Check if backend is available
    const isBackendAvailable = await checkBackendHealth();
    
    if (!isBackendAvailable) {
        console.warn('Backend server is not available. All data will show loading state.');
        showLoadingState('.kpi-value, .chart-card, .activity-feed, [data-kpi], [data-chart]');
        loadAllData();
    } else {
        console.log('Backend server is available. Fetching data...');
        loadAllData();
    }
    // Start realtime polling to keep the active sessions graph alive
    try {
        if (!window.__rt_poll) {
            window.__rt_poll = setInterval(() => {
                fetchRealtimeCharts();
            }, 5000); // every 5s
        }
    } catch {}
}

// Load all dashboard data
function loadAllData() {
    console.log(`[loadAllData] Starting load with period=${currentDateRange}`);
    fetchOverviewKPIs();
    fetchConversionFunnel();
    fetchInteractionTypes();
    fetchCustomerSegments();
    fetchBehavioralPatterns();
    fetchCustomerInteractions();
    fetchCustomerConcerns();
    fetchCustomerLifetimeValue();
    fetchProductAnalytics();
    fetchRevenueSummary();
    fetchRevenueAttribution();
    // Revenue Impact extras so all periods refresh
    updateRevenueGrowthChartFromAttribution();
    fetchCategoryPerformance();
    fetchRevenueForecasting();
    renderRevenueByFeatureList();
    fetchAIModelPerformance();
    fetchSystemHealth();
    fetchRealtimeCharts();
    refreshApiHealthWidget();
    fetchBillingSummary();
    fetchUsageBreakdown();
    fetchPaymentHistory();
    fetchUsageAlerts();
    fetchConversionTrends();
    fetchConversionAnalytics();
    fetchSatisfactionTrends();
    fetchInteractionTimeline();
    fetchInteractionStats();
    // Ensure customer value tab charts are ready even before switching to the tab
    fetchCustomerLifetimeValueForDistribution();
    fetchLiveActiveCount();
    fetchProductGaps();
    fetchCrossSellUpsell();
    fetchTopRecommendedProducts();
    fetchAIModelPerformanceTrend();
    fetchAISummary();
}

// ========================= Billing & Usage =========================
async function fetchUsageBreakdown() {
    try {
        const res = await fetchAPI('/api/billing/usage-breakdown');
        if (!(res.success && Array.isArray(res.data))) return;
        // Populate usage cards
        const cards = document.querySelectorAll('#billing [data-usage-card]');
        const byType = {};
        res.data.forEach(r => { byType[(r.usage_type||r.type||'').toLowerCase()] = r; });
        cards.forEach(card => {
            const key = card.getAttribute('data-usage-card');
            const row = byType[key] || {};
            const limit = Number(row.free_limit || row.limit || 0);
            const used = Number(row.used || row.usage || 0);
            const rate = row.overage_rate_text || row.overage_rate || '';
            const cost = row.overage_cost_text || row.overage_cost || '';
            const pct = limit > 0 ? Math.min(100, Math.round((used/limit)*100)) : 0;
            const limitEl = card.querySelector('[data-usage-limit]');
            const fillEl = card.querySelector('[data-progress-fill]');
            const textEl = card.querySelector('[data-progress-text]');
            const rateEl = card.querySelector('[data-overage-rate]');
            const costEl = card.querySelector('[data-overage-cost]');
            if (limitEl) limitEl.textContent = limit ? `Free: ${formatNumber(limit)}/month` : '';
            if (fillEl) fillEl.style.width = pct + '%';
            if (textEl) textEl.textContent = used ? `${formatNumber(used)} used (${pct}%)` : '';
            if (rateEl) rateEl.textContent = rate ? String(rate) : '';
            if (costEl) costEl.textContent = cost ? String(cost) : '';
        });
        // Usage trend line (last 6 months)
        const trendEl = document.getElementById('usageTrendChart');
        if (trendEl) {
            const byMonth = {};
            res.data.forEach(r => {
                const m = r.month || r.period || r.record_date || '';
                if (!m) return;
                if (!byMonth[m]) byMonth[m] = 0;
                byMonth[m] += Number(r.total_usage || r.used || 0);
            });
            const months = Object.keys(byMonth).sort().slice(-6);
            const vals = months.map(m => byMonth[m]);
            if (chartInstances['usageTrend']) { try { chartInstances['usageTrend'].destroy(); } catch{} delete chartInstances['usageTrend']; }
            const options = {
                series: [{ name: 'Total Usage', data: vals }],
                chart: { type: 'line', height: 330, toolbar: { show: false } },
                stroke: { curve: 'smooth', width: 3 },
                xaxis: { categories: months },
                yaxis: { labels: { formatter: v => formatNumber(Math.round(v)) } },
                colors: ['#407CEE']
            };
            chartInstances['usageTrend'] = new ApexCharts(trendEl, options);
            chartInstances['usageTrend'].render();
        }
    } catch (e) { console.warn('usage-breakdown failed', e); }
}

async function fetchPaymentHistory() {
    try {
        const res = await fetchAPI('/api/billing/payment-history');
        if (!(res.success && Array.isArray(res.data))) return;
        const table = document.querySelector('#billing [data-payment-table]');
        if (!table) return;
        // Remove existing rows except header
        table.querySelectorAll('.payment-row').forEach(r => r.remove());
        res.data.forEach(r => {
            const row = document.createElement('div');
            row.className = 'payment-row';
            row.innerHTML = `
                <div class="payment-date">${r.payment_date || r.date || ''}</div>
                <div class="payment-description">${r.description || r.notes || ''}</div>
                <div class="payment-amount">${formatCurrencyFull(r.amount || 0)}</div>
                <div class="payment-status ${String(r.status||'').toLowerCase()}">${r.status || ''}</div>
                <div class="payment-action">${r.invoice_url ? `<a class="download-btn" href="${r.invoice_url}" target="_blank"><i class=\"fas fa-download\"></i></a>` : ''}</div>`;
            table.appendChild(row);
        });
    } catch (e) { console.warn('payment-history failed', e); }
}

// Store alerts globally for dropdown
let cachedAlerts = [];

async function fetchUsageAlerts() {
    try {
        const res = await fetchAPI('/api/billing/alerts');
        const list = document.querySelector('#billing [data-alert-list]');
        
        // Cache alerts for dropdown
        if (res.success && Array.isArray(res.data)) {
            cachedAlerts = res.data;
            updateNotificationBadge();
            updateNotificationDropdown();
        }
        
        if (!list) return;
        list.innerHTML = '';
        if (!(res.success && Array.isArray(res.data))) return;
        res.data.forEach(r => {
            const item = document.createElement('div');
            const level = (r.level || r.type || 'info').toLowerCase();
            item.className = `alert-item ${level}`;
            item.innerHTML = `
                <div class="alert-icon"><i class="fas ${level==='error'?'fa-times-circle':(level==='warning'?'fa-exclamation-triangle':'fa-info-circle')}"></i></div>
                <div class="alert-content">
                    <div class="alert-title">${r.title || ''}</div>
                    <div class="alert-description">${r.message || r.description || ''}</div>
                    <div class="alert-time">${r.created_at || ''}</div>
                </div>`;
            list.appendChild(item);
        });
    } catch (e) { console.warn('usage-alerts failed', e); }
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge && cachedAlerts) {
        const unreadCount = cachedAlerts.length;
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

function updateNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    const list = dropdown.querySelector('.notification-dropdown-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!cachedAlerts || cachedAlerts.length === 0) {
        list.innerHTML = '<div class="notification-dropdown-empty">No notifications</div>';
        return;
    }
    
    cachedAlerts.forEach((alert, index) => {
        const level = (alert.level || alert.type || 'info').toLowerCase();
        const iconClass = level === 'error' ? 'fa-times-circle' : (level === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle');
        
        const item = document.createElement('div');
        item.className = `notification-dropdown-item ${level}`;
        item.addEventListener('click', () => {
            navigateToBillingAlerts();
        });
        item.innerHTML = `
            <div class="notification-dropdown-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="notification-dropdown-content">
                <div class="notification-dropdown-title">${alert.title || 'Notification'}</div>
                <div class="notification-dropdown-description">${alert.message || alert.description || ''}</div>
                <div class="notification-dropdown-time">${formatNotificationTime(alert.created_at || '')}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function formatNotificationTime(timeStr) {
    if (!timeStr) return '';
    try {
        const date = new Date(timeStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return timeStr;
    }
}

function navigateToBillingAlerts() {
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    
    // Navigate to billing tab
    const billingNav = document.querySelector('.nav-item[data-page="billing"]');
    if (billingNav) {
        billingNav.click();
    }
    
    // Scroll to alerts section after a short delay
    setTimeout(() => {
        const alertsSection = document.querySelector('.usage-alerts');
        if (alertsSection) {
            alertsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Highlight the section briefly
            alertsSection.style.transition = 'background-color 0.3s ease';
            alertsSection.style.backgroundColor = 'rgba(64, 124, 238, 0.05)';
            setTimeout(() => {
                alertsSection.style.backgroundColor = '';
            }, 2000);
        }
    }, 300);
}

function initializeNotificationDropdown() {
    const notificationBtn = document.querySelector('.notification-btn');
    if (!notificationBtn) return;
    
    // Create dropdown if it doesn't exist
    let dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'notificationDropdown';
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <h4>Notifications</h4>
                <button class="notification-dropdown-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-dropdown-list"></div>
        `;
        
        // Insert after notification button
        notificationBtn.parentNode.insertBefore(dropdown, notificationBtn.nextSibling);
        
        // Close button handler
        const closeBtn = dropdown.querySelector('.notification-dropdown-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.remove('active');
            });
        }
    }
    
    // Toggle dropdown on button click
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        
        // Update dropdown content when opening
        if (dropdown.classList.contains('active')) {
            updateNotificationDropdown();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Initial fetch and update
    fetchUsageAlerts();
}

async function fetchAIModelPerformanceTrend() {
    const container = document.getElementById('modelPerformanceChart');
    if (!container) return;
    try {
        const res = await fetchAPI('/api/ai/model-performance');
        if (res.success && res.categories && res.series) {
            updateAIModelPerformanceTrend(res);
        } else {
            container.innerHTML = '<div class="no-data">No model performance data</div>';
        }
    } catch (e) {
        console.error('Failed to fetch model performance trend', e);
        container.innerHTML = '<div class="no-data">No model performance data</div>';
    }
}

function updateAIModelPerformanceTrend(payload) {
    const container = document.getElementById('modelPerformanceChart');
    if (!container || !payload || !payload.series || payload.series.length === 0) {
        if (container) container.innerHTML = '<div class="no-data">No model performance data</div>';
        return;
    }
    // Prepare series (multiple models)
    const dates = payload.categories.map(d => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch { return d; }
    });
    const series = payload.series.map(s => ({ name: s.name, data: s.data }));
    if (chartInstances['aiPerfTrend']) {
        try { chartInstances['aiPerfTrend'].destroy(); } catch {}
        delete chartInstances['aiPerfTrend'];
    }
    const options = {
        series: series,
        chart: { height: 360, type: 'line' },
        stroke: { width: 3, curve: 'smooth' },
        xaxis: { categories: dates },
        yaxis: { title: { text: 'Accuracy (%)' }, min: 80, max: 100 },
        tooltip: { shared: true },
        legend: { position: 'top' },
        markers: { size: 3 },
        colors: ['#407CEE', '#ff7a59', '#52c41a', '#ffa500'],
        stroke: {
            curve: 'smooth',
            width: [3, 3, 3, 3],
            dashArray: [0, 5, 0, 0] // dashed for v2.2 to visually separate
        }
    };
    chartInstances['aiPerfTrend'] = new ApexCharts(container, options);
    chartInstances['aiPerfTrend'].render();
}

async function fetchAISummary() {
    try {
        const res = await fetchAPI('/api/ai/summary');
        if (res.success && res.data) {
            updateAISummary(res.data);
        }
    } catch (e) {
        console.error('Failed to fetch AI summary', e);
    }
}

function updateAISummary(data) {
    const page = document.getElementById('ai-performance');
    if (!page || !data) return;
    const cards = page.querySelectorAll('.kpi-card .kpi-value');
    if (cards && cards.length >= 4) {
        // Accuracy (%)
        cards[0].textContent = `${parseFloat(data.accuracy || 0).toFixed(1)}%`;
        // Response time (ms to seconds)
        const secs = (parseInt(data.response_time_ms || 0) / 1000).toFixed(1);
        cards[1].textContent = `${secs}s`;
        // Confidence score
        cards[2].textContent = `${(parseFloat(data.confidence || 0)).toFixed(2)}`;
        // A/B winner card value
        cards[3].textContent = data.ab_winner || '—';
        // Update the subtitle for winner improvement
        const subtitles = page.querySelectorAll('.kpi-card .kpi-subtitle');
        if (subtitles && subtitles.length >= 4) {
            subtitles[3].textContent = `${data.ab_improvement_pct > 0 ? '+' : ''}${(data.ab_improvement_pct || 0).toFixed(0)}% better performance`;
        }
    }
}

async function fetchCrossSellUpsell() {
    const container = document.querySelector('[data-product-analytics]')?.closest('.dashboard-page') || document;
    const chartHolder = document.querySelector('#crossSellChart');
    // The chart area is in the "Product Performance Analytics" card
    const rightCard = document.querySelector('.charts-row .chart-card') || document;
    let chartEl = document.getElementById('crossSellChart');
    if (!chartEl) {
        const placeholderParent = document.querySelector('.chart-card .chart-header + div') || document.querySelector('.chart-card');
    }
    try {
        const res = await fetchAPI('/api/products/cross-sell-upsell');
        if (res.success && res.data) {
            updateCrossSellUpsellChart(res.data);
        }
    } catch (e) {
        console.error('Failed to fetch cross sell/upsell', e);
    }
}

function updateCrossSellUpsellChart(data) {
    let container = document.querySelector('#crossSellChart');
    if (!container) {
        // Create a container inside the right-hand chart card under the title
        const cards = document.querySelectorAll('.chart-card');
        const target = cards[cards.length - 1] || document.body;
        const div = document.createElement('div');
        div.id = 'crossSellChart';
        div.style.minHeight = '360px';
        target.appendChild(div);
        container = div;
    }
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No cross-sell/upsell data</div>';
        return;
    }
    // Sort by totals
    const sorted = [...data].sort((a,b) => (b.cross_sell + b.upsell) - (a.cross_sell + a.upsell));
    const categories = sorted.map(d => d.category);
    const cross = sorted.map(d => d.cross_sell);
    const upsell = sorted.map(d => d.upsell);
    if (chartInstances['crossSell']) {
        try { chartInstances['crossSell'].destroy(); } catch {}
        delete chartInstances['crossSell'];
    }
    const options = {
        series: [
            { name: 'Cross-sell', data: cross },
            { name: 'Upsell', data: upsell }
        ],
        chart: { type: 'bar', height: 380, stacked: true, toolbar: { show: false } },
        plotOptions: { 
            bar: { 
                horizontal: true, 
                barHeight: '60%', 
                borderRadius: 4,
                dataLabels: {
                    position: 'center'
                }
            } 
        },
        dataLabels: { 
            enabled: true,
            formatter: function(val){ return formatNumber(Math.round(val)); },
            style: { colors: ['#ffffff'] }
        },
        xaxis: { categories },
        colors: ['#407CEE', '#5b8ff5'],
        legend: { position: 'top' },
        tooltip: { y: { formatter: val => formatNumber(val) } }
    };
    chartInstances['crossSell'] = new ApexCharts(container, options);
    chartInstances['crossSell'].render();
}

// ============================================================
// API Configuration Status Cards
// ============================================================
async function fetchApiConfigurations() {
    try {
        console.log('[API Config] Fetching API configurations from database...');
        console.log('[API Config] API Base URL:', API_BASE_URL);
        
        // Fetch directly without period parameter for config endpoint
        const url = new URL(`${API_BASE_URL}/api/config`);
        url.searchParams.set('_t', Date.now().toString()); // Cache busting
        
        console.log('[API Config] Fetching from:', url.toString());
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[API Config] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const res = await response.json();
        console.log('[API Config] Raw response:', JSON.stringify(res, null, 2));
        console.log('[API Config] Response type:', typeof res, 'Is array?', Array.isArray(res), 'Has data?', 'data' in res, 'Has success?', 'success' in res);
        
        // Handle multiple response formats:
        // 1. {success: true, data: [...]}
        // 2. {data: [...]}
        // 3. [...] (array directly)
        let configs = null;
        if (Array.isArray(res)) {
            // Response is directly an array
            configs = res;
            console.log('[API Config] Response is direct array, length:', configs.length);
        } else if (res.data && Array.isArray(res.data)) {
            // Response has data property
            configs = res.data;
            console.log('[API Config] Response has data property, length:', configs.length);
        } else if (res.success && res.data && Array.isArray(res.data)) {
            // Standard format with success flag
            configs = res.data;
            console.log('[API Config] Response has success and data, length:', configs.length);
        }
        
        if (configs && Array.isArray(configs) && configs.length > 0) {
            console.log('[API Config] Processing', configs.length, 'configurations:', configs);
            updateApiStatusCards(configs);
        } else {
            console.warn('[API Config] Invalid or empty response format. Received:', res);
            console.warn('[API Config] Attempting to update with empty array...');
            // Try to update anyway with empty array to clear loading state
            updateApiStatusCards([]);
            
            // Also set explicit error state
            document.querySelectorAll('[data-api]').forEach(card => {
                const statusEl = card.querySelector('[data-api-status]');
                const syncEl = card.querySelector('[data-api-sync]');
                if (statusEl && statusEl.innerHTML.includes('Loading')) {
                    statusEl.className = 'status-indicator disconnected';
                    statusEl.innerHTML = '<i class="fas fa-times-circle"></i> No Data';
                }
                if (syncEl && syncEl.textContent === 'Loading...') {
                    syncEl.textContent = 'No configuration found';
                }
            });
        }
    } catch (e) {
        console.error('[API Config] Failed to fetch API configurations:', e);
        console.error('[API Config] Error details:', e.message);
        if (e.stack) console.error('[API Config] Stack:', e.stack);
        // Set error state on all cards
        document.querySelectorAll('[data-api]').forEach(card => {
            const statusEl = card.querySelector('[data-api-status]');
            const syncEl = card.querySelector('[data-api-sync]');
            if (statusEl) {
                statusEl.className = 'status-indicator disconnected';
                statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Error';
            }
            if (syncEl) syncEl.textContent = 'Unable to load';
        });
    }
}

function formatLastSyncTime(lastSync) {
    if (!lastSync) return 'Never synced';
    try {
        const syncDate = new Date(lastSync);
        const now = new Date();
        const diffMs = now - syncDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Last sync: Just now';
        if (diffMins < 60) return `Last sync: ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `Last sync: ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `Last sync: ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        // Format as date if older than a week
        return `Last sync: ${syncDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch (e) {
        return 'Last sync: Unknown';
    }
}

function getStatusDisplay(status) {
    const statusLower = (status || '').toLowerCase();
    
    // Map database status to display states
    if (statusLower === 'active' || statusLower === 'connected') {
        return {
            class: 'connected',
            icon: 'fa-check-circle',
            text: 'Connected'
        };
    } else if (statusLower === 'rate_limited' || statusLower === 'rate limited' || statusLower === 'warning') {
        return {
            class: 'warning',
            icon: 'fa-exclamation-triangle',
            text: 'Rate Limited'
        };
    } else if (statusLower === 'disconnected' || statusLower === 'inactive' || statusLower === 'not configured') {
        return {
            class: 'disconnected',
            icon: 'fa-times-circle',
            text: 'Not Configured'
        };
    } else {
        // Default to disconnected for unknown statuses
        return {
            class: 'disconnected',
            icon: 'fa-times-circle',
            text: 'Not Configured'
        };
    }
}

function updateApiStatusCards(configs) {
    try {
        console.log('[API Config] Updating status cards with', configs.length, 'configurations');
        
        // Map API types to display names and card data-api attributes
        const apiTypeMap = {
            'customers': { title: 'Customer Data' },
            'products': { title: 'Product Catalog' },
            'orders': { title: 'Order Data' },
            'analytics': { title: 'User Behavior' }
        };
        
        // Create a map of configs by api_type (data comes as dictionaries from execute_query)
        const configMap = {};
        configs.forEach(config => {
            const apiType = (config.api_type || '').toLowerCase();
            if (apiType) {
                configMap[apiType] = config;
                console.log(`[API Config] Mapped ${apiType}: status=${config.status}, last_sync=${config.last_sync}`);
            }
        });
        
        // Update each status card
        const cards = document.querySelectorAll('[data-api]');
        console.log(`[API Config] Found ${cards.length} status cards to update`);
        
        if (cards.length === 0) {
            console.warn('[API Config] No status cards found! Check HTML structure.');
            return;
        }
        
        cards.forEach(card => {
            const apiType = card.getAttribute('data-api');
            const config = configMap[apiType];
            
            const titleEl = card.querySelector('[data-api-title]');
            const statusEl = card.querySelector('[data-api-status]');
            const syncEl = card.querySelector('[data-api-sync]');
            
            console.log(`[API Config] Processing card for ${apiType}:`, { titleEl: !!titleEl, statusEl: !!statusEl, syncEl: !!syncEl, hasConfig: !!config });
            
            // Update title if we have a mapping
            if (titleEl && apiTypeMap[apiType]) {
                titleEl.textContent = apiTypeMap[apiType].title;
            }
            
            if (config) {
                // Update status indicator
                const statusDisplay = getStatusDisplay(config.status);
                if (statusEl) {
                    statusEl.className = `status-indicator ${statusDisplay.class}`;
                    statusEl.innerHTML = `<i class="fas ${statusDisplay.icon}"></i> ${statusDisplay.text}`;
                }
                
                // Update last sync time
                if (syncEl) {
                    syncEl.textContent = formatLastSyncTime(config.last_sync);
                }
                console.log(`[API Config] Updated card for ${apiType}: ${statusDisplay.text}`);
            } else {
                // No configuration found - show as not configured
                const statusDisplay = getStatusDisplay('not configured');
                if (statusEl) {
                    statusEl.className = `status-indicator ${statusDisplay.class}`;
                    statusEl.innerHTML = `<i class="fas ${statusDisplay.icon}"></i> ${statusDisplay.text}`;
                }
                if (syncEl) {
                    syncEl.textContent = 'Never synced';
                }
                console.log(`[API Config] No configuration found for ${apiType}, showing as not configured`);
            }
        });
        console.log('[API Config] Status cards update completed');
    } catch (e) {
        console.error('[API Config] Error updating status cards:', e);
        console.error('[API Config] Error stack:', e.stack);
        // Make sure loading state is cleared even on error
        document.querySelectorAll('[data-api]').forEach(card => {
            const statusEl = card.querySelector('[data-api-status]');
            const syncEl = card.querySelector('[data-api-sync]');
            if (statusEl && statusEl.innerHTML.includes('Loading')) {
                statusEl.className = 'status-indicator disconnected';
                statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Error';
            }
            if (syncEl && syncEl.textContent === 'Loading...') {
                syncEl.textContent = 'Error loading data';
            }
        });
    }
}

// ============================================================
// Tab Navigation Functions
// ============================================================

function initializeTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.dashboard-page');
    
    // Check if api-config is the initial active page and load its data
    const initialActivePage = document.querySelector('.dashboard-page.active');
    if (initialActivePage && initialActivePage.id === 'api-config') {
        fetchApiConfigurations();
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Scroll to top of main content when switching tabs
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            // Show the corresponding page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPage) {
                    page.classList.add('active');
                    // Load page-specific data if needed
                    if (targetPage === 'conversions') {
                        fetchConversionTrends();
                        fetchConversionAnalytics();
                    } else if (targetPage === 'interactions') {
                        fetchInteractionStats();
                        fetchInteractionTimeline();
                    } else if (targetPage === 'customers') {
                        fetchCustomerSegments();
                        fetchBehavioralPatterns();
                        fetchCustomerConcerns();
                        fetchCustomerLifetimeValue();
                    } else if (targetPage === 'overview') {
                        // Overview tab - no action needed
                    } else if (targetPage === 'ai-performance') {
                        fetchAIModelPerformance();
                        fetchAIModelPerformanceTrend();
                        fetchAISummary();
                    } else if (targetPage === 'api-config') {
                        console.log('[Tab Navigation] Loading api-config page, calling fetchApiConfigurations...');
                        fetchApiConfigurations().catch(err => {
                            console.error('[Tab Navigation] Error fetching API config:', err);
                        });
                    }
                    
                    // Reinitialize scroll animations for the new page
                    setTimeout(() => {
                        initializeScrollAnimations();
                    }, 100);
                }
            });
        });
    });
}

// ============================================================
// Revenue Impact Tabs
// ============================================================

function initializeRevenueTabs() {
    const container = document.querySelector('#revenue');
    if (!container) return;
    const buttons = container.querySelectorAll('.revenue-tabs .tab-btn');
    const tabs = container.querySelectorAll('.revenue-tabs .tab-content');
    if (!buttons.length || !tabs.length) return;

    function activate(tabKey) {
        // Scroll to top when switching revenue tabs
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // toggle button active
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabKey);
        });
        // toggle tab content
        tabs.forEach(tab => {
            const id = tab.id || '';
            const key = id.replace('-tab', '');
            tab.classList.toggle('active', key === tabKey);
            tab.style.display = key === tabKey ? '' : 'none';
        });
        // load data based on tab
        if (tabKey === 'attribution') {
            fetchRevenueSummary();
            fetchRevenueAttribution();
            updateRevenueGrowthChartFromAttribution();
            renderRevenueByFeatureList();
        } else if (tabKey === 'categories') {
            fetchCategoryRevenue();
        } else if (tabKey === 'customer-value') {
            // Reuse CLV endpoint and render into the distribution container
            fetchCustomerLifetimeValueForDistribution();
        } else if (tabKey === 'forecasting') {
            fetchRevenueForecasting();
        }
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // ensure initial state
    activate('attribution');
}

// Category Performance (donut + growth list) from database
async function fetchCategoryPerformance() {
    const donut = document.getElementById('categoryRevenueChart');
    const listContainer = document.querySelector('.category-metrics');
    if (!donut || !listContainer) return;
    try {
        const res = await fetchAPI('/api/products/category-performance');
        if (!(res.success && Array.isArray(res.data))) {
            donut.innerHTML = '<div class="no-data">No category data</div>';
            listContainer.innerHTML = '<div class="no-data">No category data</div>';
            return;
        }
        // Filter by selected date range on the client side
        const now = new Date();
        const start = new Date((function(){
            if (currentDateRange === '7d') return Date.now() - 7*86400000;
            if (currentDateRange === '30d') return Date.now() - 30*86400000;
            if (currentDateRange === '90d') return Date.now() - 90*86400000;
            return Date.now() - 365*86400000;
        })());
        let rows = res.data.filter(r => {
            const d = new Date(r.record_date || r.date);
            return d >= start && d <= now;
        });
        // Fallback: if the selected window has no category rows (e.g., 7d),
        // use the latest available month from the full dataset so the panel is never empty
        if (rows.length === 0) {
            const all = res.data.slice().sort((a,b) => new Date(a.record_date||a.date) - new Date(b.record_date||b.date));
            const last = all[all.length-1];
            if (last) {
                const lastMonthKey = (new Date(last.record_date||last.date)).toISOString().slice(0,7);
                rows = all.filter(r => (new Date(r.record_date||r.date)).toISOString().slice(0,7) === lastMonthKey);
            }
        }
        // Aggregate totals per category for the donut
        const totals = {};
        rows.forEach(r => {
            const cat = r.category_name || r.category || 'Other';
            const amount = Number(r.total_revenue || r.revenue || 0);
            totals[cat] = (totals[cat] || 0) + amount;
        });
        const cats = Object.keys(totals);
        const values = cats.map(c => totals[c]);
        updateCategoryRevenueDonut(donut, cats, values);

        // Growth list: compare latest month vs previous month per category
        const byMonthCat = {};
        function monthKey(d) {
            const dt = new Date(d);
            return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
        }
        rows.forEach(r => {
            const key = monthKey(r.record_date || r.date);
            const cat = r.category_name || r.category || 'Other';
            const amt = Number(r.total_revenue || r.revenue || 0);
            if (!byMonthCat[key]) byMonthCat[key] = {};
            byMonthCat[key][cat] = (byMonthCat[key][cat] || 0) + amt;
        });
        const monthKeys = Object.keys(byMonthCat).sort();
        const latestKey = monthKeys[monthKeys.length - 1];
        // If previous month is not in the filtered set, try to fetch it from the full dataset
        let prevKey = monthKeys[monthKeys.length - 2];
        if (!prevKey) {
            const allMonths = Array.from(new Set(res.data.map(r => monthKey(r.record_date||r.date)))).sort();
            const idx = allMonths.indexOf(latestKey);
            prevKey = idx > 0 ? allMonths[idx - 1] : undefined;
        }
        const latest = byMonthCat[latestKey] || {};
        // Build prev month map either from current filtered data or from full dataset
        let prev = byMonthCat[prevKey] || {};
        if (prevKey && Object.keys(prev).length === 0) {
            prev = {};
            res.data.forEach(r => {
                const mk = monthKey(r.record_date||r.date);
                if (mk === prevKey) {
                    const cat = r.category_name || r.category || 'Other';
                    const amt = Number(r.total_revenue || r.revenue || 0);
                    prev[cat] = (prev[cat] || 0) + amt;
                }
            });
        }
        const items = cats
            .map(c => {
                const curr = latest[c] || 0;
                const p = prev[c] || 0;
                const growth = p > 0 ? ((curr - p) / p) * 100 : 0;
                return { name: c, value: curr, growth: Number(growth.toFixed(0)) };
            })
            .sort((a,b) => b.value - a.value)
            .slice(0, 5);
        updateCategoryGrowthList(listContainer, items);
    } catch (e) {
        console.error('Failed to fetch category performance', e);
    }
}

function updateCategoryRevenueDonut(container, categories, values) {
    container.innerHTML = '';
    const options = {
        series: values,
        chart: {
            type: 'donut',
            height: 360,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 50,
                    dynamicAnimation: {
                        enabled: true,
                        speed: 800
                    }
                }
            }
        },
        labels: categories,
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => v.toFixed(1) + '%' },
        tooltip: { y: { formatter: v => formatCurrency(v) } },
        plotOptions: {
            pie: { donut: { size: '65%' } }
        },
        colors: ['#407CEE', '#48d1cc', '#ffa500', '#5b8ff5', '#7ba3f7']
    };
    const chart = new ApexCharts(container, options);
    chart.render();
}

function updateCategoryGrowthList(container, items) {
    container.innerHTML = items.map(it => `
        <div class="metric-item">
            <span class="metric-label">${it.name}</span>
            <div class="metric-value">${formatCurrency(it.value)}</div>
            <div class="metric-change ${it.growth >= 0 ? 'positive' : 'negative'}">${it.growth >= 0 ? '+' : ''}${it.growth}%</div>
        </div>
    `).join('');
    try { window.latestBestOpportunity = (items && items.length) ? items[0].name : ''; } catch {}
}

// Revenue growth chart derived from attribution timeline totals if available
async function updateRevenueGrowthChartFromAttribution() {
    const container = document.getElementById('revenueGrowthChart');
    if (!container) return;
    try {
        const res = await fetchAPI('/api/revenue/attribution');
        if (!(res.success && Array.isArray(res.data))) {
            container.innerHTML = '<div class="no-data">No revenue data</div>';
            return;
        }
        // Decide aggregation unit based on selected period
        let unit = 'month';
        if (currentDateRange === '7d') unit = 'day';
        if (currentDateRange === '30d' || currentDateRange === '90d') unit = 'week';

        // Aggregate revenue by unit (day/week/month)
        const bucketMap = {};
        const bucketOrder = [];
        function bucketKey(dateStr) {
            const d = new Date(dateStr);
            if (unit === 'day') return d.toISOString().slice(0, 10);
            if (unit === 'week') {
                // ISO week start (Mon)
                const day = d.getUTCDay() || 7; // 1..7
                const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));
                return monday.toISOString().slice(0, 10);
            }
            // month
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-01`;
        }
        res.data.forEach(r => {
            const ds = r.record_date || r.date;
            const amt = Number(r.revenue_amount || 0);
            if (!ds) return;
            const key = bucketKey(ds);
            if (!(key in bucketMap)) {
                bucketMap[key] = 0;
                bucketOrder.push(key);
            }
            bucketMap[key] += amt;
        });
        bucketOrder.sort();
        const totals = bucketOrder.map(k => bucketMap[k]);

        // Compute growth rate (%) vs previous bucket
        const growth = totals.map((v, i) => {
            if (i === 0) return 0;
            const prev = totals[i-1];
            if (!prev) return 0;
            return ((v - prev) / prev) * 100.0;
        }).map(v => Number(v.toFixed(1)));

        // Labels for x-axis
        const labels = bucketOrder.map(k => {
            const d = new Date(k);
            if (unit === 'day') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (unit === 'week') return `Week ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            return d.toLocaleDateString('en-US', { month: 'short' });
        });

        const options = {
            series: [
                { name: 'Revenue', type: 'column', data: totals },
                { name: 'Growth Rate', type: 'line', data: growth }
            ],
            chart: { height: 360, type: 'line', stacked: false },
            xaxis: { categories: labels },
            yaxis: [
                {
                    title: { text: 'Revenue (€)' },
                    labels: { formatter: v => (v>=1000000? (v/1000000).toFixed(1)+'M' : (v>=1000? (v/1000).toFixed(0)+'K' : v.toFixed(0))) }
                },
                {
                    opposite: true,
                    title: { text: 'Growth Rate (%)' },
                    labels: { formatter: v => v.toFixed(1) + '%' }
                }
            ],
            colors: ['#407CEE', '#52c41a'],
            dataLabels: {
                enabled: true,
                enabledOnSeries: [1], // only show on growth line
                formatter: function(val) { return (val !== null && val !== undefined) ? val.toFixed(1) : '0'; }
            },
            markers: { size: 4, colors: ['#fff'], strokeColors: ['#52c41a'], strokeWidth: 2 },
            stroke: { curve: 'smooth', width: [0, 3] },
            legend: { position: 'bottom' },
            tooltip: {
                shared: true,
                y: [
                    { formatter: v => formatCurrency(v) },
                    { formatter: v => (v!=null? v.toFixed(1):'0') + '%' }
                ]
            }
        };
        container.innerHTML = '';
        const chart = new ApexCharts(container, options);
        chart.render();
    } catch (e) {
        console.error('Failed to build revenue growth chart', e);
    }
}

// Populate the "Revenue by AI Feature" list so it's not hardcoded
async function renderRevenueByFeatureList() {
    const container = document.querySelector('.attribution-breakdown');
    if (!container) return;
    try {
        const res = await fetchAPI('/api/revenue/attribution');
        if (!(res.success && Array.isArray(res.data))) return;
        const totals = {};
        let grand = 0;
        res.data.forEach(r => {
            const feat = r.ai_feature || r.revenue_source || 'Unknown';
            const amt = Number(r.revenue_amount || 0);
            totals[feat] = (totals[feat] || 0) + amt;
            grand += amt;
        });
        const featureOrder = ['Chat Recommendations', 'Questionnaire Guidance', 'Image Analysis', 'Routine Planner'];
        const items = Object.keys(totals)
            .sort((a,b) => (featureOrder.indexOf(a) === -1 ? 99 : featureOrder.indexOf(a)) - (featureOrder.indexOf(b) === -1 ? 99 : featureOrder.indexOf(b)))
            .map(name => ({ name, value: totals[name], pct: grand > 0 ? (totals[name] / grand) * 100 : 0 }));
        const iconMap = {
            'Chat Recommendations': { icon: 'fa-comments', bg: 'linear-gradient(135deg, #407CEE, #5b8ff5)' },
            'Questionnaire Guidance': { icon: 'fa-clipboard-list', bg: 'linear-gradient(135deg, #48d1cc, #40e0d0)' },
            'Image Analysis': { icon: 'fa-image', bg: 'linear-gradient(135deg, #ffa500, #ff8c00)' },
            'Routine Planner': { icon: 'fa-calendar-check', bg: 'linear-gradient(135deg, #90ee90, #7dd87d)' }
        };
        container.innerHTML = items.map(it => {
            const meta = iconMap[it.name] || { icon: 'fa-chart-line', bg: 'linear-gradient(135deg, #94b0fa, #7ba3f7)' };
            const width = Math.max(8, Math.round(it.pct));
            return `
                <div class="attribution-item">
                    <div class="attribution-icon" style="background: ${meta.bg};">
                        <i class="fas ${meta.icon}"></i>
                    </div>
                    <div class="attribution-details">
                        <h4>${it.name}</h4>
                        <div class="attribution-value">${formatCurrency(it.value)}</div>
                        <div class="attribution-bar">
                            <div class="bar-fill" style="width: ${width}%;"></div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('Failed to render revenue by feature list', e);
    }
}

// Customer value distribution: render into clvDistributionChart
async function fetchCustomerLifetimeValueForDistribution() {
    const container = document.getElementById('clvDistributionChart');
    if (!container) return;
    try {
        const res = await fetchAPI('/api/customers/lifetime-value');
        if (res.success && Array.isArray(res.data)) {
            let rows = res.data;
            // Only attempt date filtering if the payload includes dates
            const hasDates = rows.some(r => r.record_date || r.date);
            if (hasDates) {
                const now = new Date();
                const start = new Date((function(){
                    if (currentDateRange === '7d') return Date.now() - 7*86400000;
                    if (currentDateRange === '30d') return Date.now() - 30*86400000;
                    if (currentDateRange === '90d') return Date.now() - 90*86400000;
                    return Date.now() - 365*86400000;
                })());
                rows = rows.filter(r => {
                    const d = new Date(r.record_date || r.date);
                    return d >= start && d <= now;
                });
                if (rows.length === 0) {
                    const all = res.data.slice().sort((a,b) => new Date(a.record_date||a.date) - new Date(b.record_date||b.date));
                    const last = all[all.length-1];
                    if (last) {
                        const lastKey = (new Date(last.record_date||last.date)).toISOString().slice(0,10);
                        rows = all.filter(r => (new Date(r.record_date||r.date)).toISOString().slice(0,10) === lastKey);
                    }
                }
            }
            updateCLVDistributionChart(rows);
            updateValueSegmentsFromCLV(rows);
        } else {
            container.innerHTML = '<div class="no-data">No lifetime value data</div>';
            updateValueSegmentsFromCLV([]);
        }
    } catch (e) {
        console.error('Failed to fetch CLV distribution', e);
    }
}

function updateCLVDistributionChart(data) {
    const container = document.getElementById('clvDistributionChart');
    if (!container) return;
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-data">No lifetime value data</div>';
        return;
    }
    const order = ['0-30d', '31-60d', '61-90d', '91-180d', '181-365d', '1-2y', '2y+'];
    const sorted = [...data].sort((a, b) => order.indexOf(a.segment_name || '') - order.indexOf(b.segment_name || ''));
    const categories = sorted.map(d => d.segment_name || 'Segment');
    const values = sorted.map(d => (Number(d.current_clv || 0) + Number(d.predicted_clv || 0)) / 2000);
    const options = {
        series: [{ name: 'Avg CLV', data: values }],
        chart: { type: 'area', height: 360 },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories },
        yaxis: { labels: { formatter: v => '€' + v.toFixed(0) + 'K' } },
        colors: ['#5b8ff5'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } }
    };
    const chart = new ApexCharts(container, options);
    chart.render();
}

function updateValueSegmentsFromCLV(rows) {
    const panel = document.querySelector('#customer-value-tab .value-segments');
    if (!panel) return;
    // Build value array to determine dynamic thresholds (no hardcoded ranges)
    const values = rows.map(r => Number(r.predicted_clv || r.current_clv || 0)).filter(v => !isNaN(v));
    if (values.length === 0) {
        // Clear cards
        ['High Value','Medium Value','Growth Potential'].forEach(label => {
            const card = Array.from(panel.querySelectorAll('.segment-card')).find(c => c.querySelector('h4')?.textContent.includes(label));
            if (card) {
                ['.segment-value','.segment-count','.segment-revenue'].forEach(sel => {
                    const el = card.querySelector(sel); if (el) el.textContent = '';
                });
            }
        });
        return;
    }
    const sorted = values.slice().sort((a,b) => a-b);
    const q1 = sorted[Math.floor(sorted.length * 0.33)];
    const q2 = sorted[Math.floor(sorted.length * 0.66)];
    const buckets = {
        low:   { name: 'Growth Potential', count: 0, revenue: 0, label: `< ${formatCurrency(q1)}` },
        medium:{ name: 'Medium Value', count: 0, revenue: 0, label: `${formatCurrency(q1)}–${formatCurrency(q2)}` },
        high:  { name: 'High Value', count: 0, revenue: 0, label: `${formatCurrency(q2)}+` }
    };
    rows.forEach(r => {
        const val = Number(r.predicted_clv || r.current_clv || 0);
        const key = val < q1 ? 'low' : (val <= q2 ? 'medium' : 'high');
        buckets[key].count += 1;
        buckets[key].revenue += val;
    });
    function setCard(selectorText, bucket) {
        const card = Array.from(panel.querySelectorAll('.segment-card')).find(c => c.querySelector('h4')?.textContent.includes(selectorText));
        if (!card) return;
        const valueEl = card.querySelector('.segment-value');
        const countEl = card.querySelector('.segment-count');
        const revEl = card.querySelector('.segment-revenue');
        if (valueEl) valueEl.textContent = bucket.label;
        if (countEl) countEl.textContent = `${bucket.count.toLocaleString()} ${bucket.count === 1 ? 'customer' : 'customers'}`;
        if (revEl) revEl.textContent = `${formatCurrency(bucket.revenue)} revenue`;
    }
    setCard('High Value', buckets.high);
    setCard('Medium Value', buckets.medium);
    setCard('Growth Potential', buckets.low);
}

// Revenue forecasting line chart
async function fetchRevenueForecasting() {
    const container = document.getElementById('forecastChart');
    if (!container) return;
    try {
        // Pull attribution (historical) and forecasting (next months)
        const [attr, fc] = await Promise.all([
            fetchAPI('/api/revenue/attribution'),
            fetchAPI('/api/revenue/forecasting')
        ]);

        if (!(attr.success && Array.isArray(attr.data) && attr.data.length > 0)) {
            container.innerHTML = '<div class="no-data">No revenue data</div>';
            return;
        }
        // Build monthly historical totals (last 6–12 months)
        const monthMap = {};
        attr.data.forEach(r => {
            const d = r.record_date || r.date;
            if (!d) return;
            const dt = new Date(d);
            const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-01`;
            monthMap[key] = (monthMap[key] || 0) + Number(r.revenue_amount || 0);
        });
        const months = Object.keys(monthMap).sort();
        const lastHistMonths = months.slice(-12); // up to last 12 months
        const histValues = lastHistMonths.map(m => monthMap[m]);
        const histLabels = lastHistMonths.map(m => {
            try { return new Date(m).toLocaleDateString('en-US', { month:'short' }); } catch { return m; }
        });

        // Forecast must come from DB – no mock fallbacks
        if (!(fc.success && Array.isArray(fc.data) && fc.data.length > 0)) {
            container.innerHTML = '<div class="no-data">No forecast data</div>';
            updateForecastInsights([], []);
            return;
        }
        const forecastValues = fc.data.map(r => Number(r.forecast_value || r.predicted_revenue || r.revenue || 0));
        const forecastLabels = fc.data.map(d => {
            const val = d.forecast_date || d.date || d.month_start;
            try { return new Date(val).toLocaleDateString('en-US', { month:'short' }); } catch { return val; }
        });

        const options = {
            series: [
                { name: 'Historical', data: histValues },
                { name: 'Forecast', data: new Array(Math.max(histValues.length-1,0)).fill(null).concat([histValues[histValues.length-1]]).concat(forecastValues) }
            ],
            chart: { height: 360, type: 'line' },
            xaxis: { categories: histLabels.concat(forecastLabels) },
            yaxis: { labels: { formatter: v => (v>=1000? (v/1000).toFixed(0)+'K' : v.toFixed(0)) } },
            stroke: { curve: 'smooth', width: [3,3], dashArray: [0,4] },
            colors: ['#407CEE','#2ecc71'],
            markers: { size: [0,0] },
            legend: { position: 'bottom' }
        };
        container.innerHTML = '';
        const chart = new ApexCharts(container, options);
        chart.render();
        updateForecastInsights(histValues, forecastValues);
    } catch (e) {
        console.error('Failed to fetch revenue forecasting', e);
    }
}

function updateForecastInsights(histValues, forecastValues) {
    try {
        const growthEl = document.querySelector('[data-forecast-growth]');
        const targetEl = document.querySelector('[data-forecast-target]');
        const oppEl = document.querySelector('[data-forecast-opportunity]');
        if (growthEl) {
            const lastHist = histValues.length ? histValues[histValues.length-1] : 0;
            const lastFc = forecastValues.length ? forecastValues[forecastValues.length-1] : 0;
            if (lastHist > 0 && lastFc > 0) {
                const pct = ((lastFc - lastHist) / lastHist) * 100;
                growthEl.textContent = `${pct.toFixed(0)}%`;
            } else {
                growthEl.textContent = '';
            }
        }
        if (targetEl) {
            const next3 = forecastValues.slice(0, 3).reduce((a, b) => a + (b || 0), 0);
            targetEl.textContent = next3 ? formatCurrency(next3) : '';
        }
        if (oppEl) {
            oppEl.textContent = window.latestBestOpportunity || '';
        }
    } catch (e) {
        console.warn('updateForecastInsights failed', e);
    }
}
// ============================================================
// Add CSS for loading states and animations
// ============================================================

function addLoadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .loading-state {
            position: relative;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: #666;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #407CEE;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loader span {
            font-size: 0.9rem;
            color: #999;
        }
        
        .no-data {
            text-align: center;
            padding: 2rem;
            color: #999;
        }
        
        .date-range-selector {
            position: relative;
            cursor: pointer;
            user-select: none;
        }
        
        .date-range-dropdown {
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .funnel-stage {
            opacity: 0;
            animation: fadeInUp 0.5s ease forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .stat-card, .summary-card {
            transition: all 0.4s ease;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// Scroll Animations System
// ============================================================
function initializeScrollAnimations() {
    // Enhanced scroll reveal with Intersection Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('in-view');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with reveal class
    const revealElements = document.querySelectorAll('.reveal, .kpi-card, .chart-card, .activity-item, .product-item, .stat-card');
    revealElements.forEach((el) => {
        el.classList.add('reveal');
        observer.observe(el);
    });
    
    // Add stagger animation to children elements
    const staggerContainers = document.querySelectorAll('.kpi-grid, .charts-row, .activity-feed');
    staggerContainers.forEach((container) => {
        const children = Array.from(container.children);
        children.forEach((child, index) => {
            child.style.animationDelay = `${index * 0.1}s`;
        });
    });
}

// ============================================================
// Initialize when DOM is ready
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Always start from the top of the page on load/refresh
    window.scrollTo(0, 0);
    if (window.history.scrollRestoration) {
        window.history.scrollRestoration = 'manual';
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also scroll to top when page is fully loaded
    window.addEventListener('load', () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });
    
    // Check if we're running via file:// protocol (which won't work)
    if (window.location.protocol === 'file:') {
        const errorMsg = `
            <div style="position: fixed; top: 0; left: 0; right: 0; background: #ff4444; color: white; padding: 20px; text-align: center; z-index: 10000; font-family: Arial, sans-serif;">
                <h2>⚠️ Server Required</h2>
                <p>This dashboard must be accessed through the Flask server, not as a local file.</p>
                <p><strong>Please start the Flask server and access via:</strong></p>
                <p style="font-size: 18px; margin: 10px 0;"><code style="background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 3px;">http://localhost:5001</code></p>
                <p>Start the server by running: <code style="background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 3px;">python run.py</code></p>
            </div>
        `;
        document.body.innerHTML = errorMsg + document.body.innerHTML;
        console.error('[ERROR] Dashboard opened as file:// - please use http://localhost:5001');
        return;
    }
    
    // Check if server is running
    console.log('[App] Initializing dashboard...');
    console.log('[App] Current URL:', window.location.href);
    console.log('[App] API Base URL:', API_BASE_URL);
    
    addLoadingStyles();
    initializeDateRangeSelector();
    initializeFunnelPeriodButtons();
    initializeTabNavigation();
    initializeRevenueTabs();
    initializeApiConfigTabs();
    initializeScrollAnimations();
    initializeNotificationDropdown();
    initializeThemeToggle();
    initializeDataFetching();
    
    // Check if api-config page is initially active and load its data
    setTimeout(() => {
        const apiConfigPage = document.getElementById('api-config');
        if (apiConfigPage && apiConfigPage.classList.contains('active')) {
            console.log('[DOMContentLoaded] api-config page is active, fetching configurations...');
            fetchApiConfigurations().catch(err => {
                console.error('[DOMContentLoaded] Error fetching API config:', err);
            });
        }
    }, 500);
    
    // Check backend health to optionally show a banner if server is down
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
        console.error('[App] Backend server is not running!');
        // Show error banner
        const banner = document.createElement('div');
        banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #ff4444; color: white; padding: 15px; text-align: center; z-index: 10000; font-weight: bold;';
        banner.textContent = '⚠️ Backend server is not running. Please start Flask server with: python run.py';
        document.body.prepend(banner);
        
        // Show error in all KPI cards
        document.querySelectorAll('[data-kpi]').forEach(el => {
            el.innerHTML = '<div class="error" style="color: red; padding: 10px;">Server offline</div>';
        });
    }

// ============================================================
// API Configuration Tabs (Customer API, Product API, etc.)
// ============================================================
function initializeApiConfigTabs() {
    const page = document.getElementById('api-config');
    if (!page) return;

    // Delegate clicks to any element inside the API config tab nav
    page.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-tab], a[href^="#"]');
        if (!btn || !page.contains(btn)) return;

        let key = btn.dataset.tab;
        if (!key) {
            const href = btn.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            key = href.slice(1);
            e.preventDefault();
        }

        // Find panels; support different markup conventions (including config-tab-content)
        const panels = page.querySelectorAll('.config-tab-content, .tab-content, .api-tab, .tab-panel');
        if (panels.length) {
            panels.forEach(p => {
                const id = p.id || '';
                const shouldShow = id === key || id === `${key}-tab` || id === `${key}-panel`;
                p.style.display = shouldShow ? '' : 'none';
                p.classList.toggle('active', shouldShow);
            });
        }

        // Toggle active state on nav items
        const buttons = page.querySelectorAll('[data-tab], a[href^="#"]');
        buttons.forEach(b => b.classList.toggle('active', b === btn));
    });

    // Ensure an initial tab is visible
    const firstPanel = page.querySelector('.config-tab-content, .tab-content, .api-tab, .tab-panel');
    if (firstPanel) {
        const id = firstPanel.id;
        const buttons = page.querySelectorAll(`[data-tab="${id}"] , a[href="#${id}"] , [data-tab="${id.replace(/-(tab|panel)$/,'')}"]`);
        if (buttons.length) buttons[0].classList.add('active');
        firstPanel.style.display = '';
        firstPanel.classList.add('active');
        // Hide the rest
        page.querySelectorAll('.config-tab-content, .tab-content, .api-tab, .tab-panel').forEach(p => {
            if (p !== firstPanel) p.style.display = 'none';
        });
    }
    }
    
    // Auto refresh disabled to avoid flicker; uncomment to enable
    // setInterval(() => {
    //     if (document.visibilityState === 'visible') {
    //         loadAllData();
    //     }
    // }, 300000); // 5 minutes
});

// Export for use in other scripts
window.dashboardAPI = {
    fetchOverviewKPIs,
    fetchConversionFunnel,
    fetchInteractionTypes,
    fetchCustomerSegments,
    fetchCustomerInteractions,
    fetchProductAnalytics,
    fetchRevenueSummary,
    fetchRevenueAttribution,
    fetchAIModelPerformance,
    fetchSystemHealth,
    fetchBillingSummary,
    fetchApiConfigurations,
    loadAllData,
    setDateRange: (range) => {
        currentDateRange = range;
        loadAllData();
    }
};

// Make fetchApiConfigurations globally accessible for testing
window.fetchApiConfigurations = fetchApiConfigurations;

// ============================================================
// Theme Toggle
// ============================================================
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
}

function updateChartsTheme(theme) {
    // Update all ApexCharts instances to use the correct theme
    Object.keys(chartInstances).forEach(key => {
        const chart = chartInstances[key];
        if (chart && typeof chart.updateOptions === 'function') {
            try {
                chart.updateOptions({
                    theme: {
                        mode: theme === 'dark' ? 'dark' : 'light'
                    },
                    chart: {
                        foreColor: theme === 'dark' ? '#ffffff' : '#1e293b'
                    }
                }, false, false);
            } catch (e) {
                console.warn(`Failed to update theme for chart ${key}:`, e);
            }
        }
    });
    
    // Update AI Performance legend colors
    updateAIPerformanceLegendColors(theme);
}

function updateAIPerformanceLegendColors(theme) {
    // Try multiple times with delays to ensure legend exists
    const updateLegend = (attempt = 0) => {
        const legendElement = document.querySelector('.ai-perf-legend');
        if (!legendElement) {
            if (attempt < 5) {
                console.log(`[Theme] Legend element not found, retrying... (attempt ${attempt + 1})`);
                setTimeout(() => updateLegend(attempt + 1), 100);
            } else {
                console.warn('[Theme] Legend element not found after multiple attempts');
            }
            return;
        }
        
        const isDark = theme === 'dark';
        const blueColor = isDark ? '#3da5ff' : '#008ffb';
        const greenColor = isDark ? '#00ff88' : '#00e396';
        const orangeColor = isDark ? '#ffcc33' : '#feb019';
        
        const spans = legendElement.querySelectorAll('span');
        console.log('[Theme] Updating legend colors:', { theme, isDark, spanCount: spans.length });
        
        if (spans.length >= 3) {
            // Get text from multiple sources with fallbacks (data attributes, textContent, innerText, stored values)
            let text0 = spans[0].textContent || spans[0].innerText || spans[0].dataset?.text || legendElement.dataset?.legendText0 || `Recommendation Accuracy: ${(window._aiPerformanceValues?.[0] || 0).toFixed(1)}%`;
            let text1 = spans[1].textContent || spans[1].innerText || spans[1].dataset?.text || legendElement.dataset?.legendText1 || `Customer Satisfaction: ${(window._aiPerformanceValues?.[1] || 0).toFixed(1)}%`;
            let text2 = spans[2].textContent || spans[2].innerText || spans[2].dataset?.text || legendElement.dataset?.legendText2 || `Conversion Rate: ${(window._aiPerformanceValues?.[2] || 0).toFixed(1)}%`;
            
            // If text is empty, try to get from window stored values
            if (!text0 || text0.trim() === '' || text0.includes('undefined') || text0.includes('NaN')) {
                const val = window._aiPerformanceValues?.[0] || 0;
                text0 = `Recommendation Accuracy: ${val.toFixed(1)}%`;
                console.log('[Theme] Restored text0 from stored values:', text0);
            }
            if (!text1 || text1.trim() === '' || text1.includes('undefined') || text1.includes('NaN')) {
                const val = window._aiPerformanceValues?.[1] || 0;
                text1 = `Customer Satisfaction: ${val.toFixed(1)}%`;
                console.log('[Theme] Restored text1 from stored values:', text1);
            }
            if (!text2 || text2.trim() === '' || text2.includes('undefined') || text2.includes('NaN')) {
                const val = window._aiPerformanceValues?.[2] || 0;
                text2 = `Conversion Rate: ${val.toFixed(1)}%`;
                console.log('[Theme] Restored text2 from stored values:', text2);
            }
            
            // CRITICAL: ALWAYS set textContent explicitly (never skip this step)
            spans[0].textContent = text0;
            spans[1].textContent = text1;
            spans[2].textContent = text2;
            
            // Update colors with !important
            spans[0].style.setProperty('color', blueColor, 'important');
            spans[1].style.setProperty('color', greenColor, 'important');
            spans[2].style.setProperty('color', orangeColor, 'important');
            
            // Ensure visibility
            spans[0].style.setProperty('opacity', '1', 'important');
            spans[1].style.setProperty('opacity', '1', 'important');
            spans[2].style.setProperty('opacity', '1', 'important');
            
            spans[0].style.setProperty('visibility', 'visible', 'important');
            spans[1].style.setProperty('visibility', 'visible', 'important');
            spans[2].style.setProperty('visibility', 'visible', 'important');
            
            spans[0].style.setProperty('display', 'inline', 'important');
            spans[1].style.setProperty('display', 'inline', 'important');
            spans[2].style.setProperty('display', 'inline', 'important');
            
            // Also ensure the parent legend element is visible
            legendElement.style.setProperty('display', 'block', 'important');
            legendElement.style.setProperty('visibility', 'visible', 'important');
            legendElement.style.setProperty('opacity', '1', 'important');
            
            // Final verification - ensure text is still there
            if (!spans[0].textContent || spans[0].textContent.trim() === '' || spans[0].textContent.includes('undefined')) {
                spans[0].textContent = text0;
                console.warn('[Theme] Text0 was cleared or invalid, restored:', text0);
            }
            if (!spans[1].textContent || spans[1].textContent.trim() === '' || spans[1].textContent.includes('undefined')) {
                spans[1].textContent = text1;
                console.warn('[Theme] Text1 was cleared or invalid, restored:', text1);
            }
            if (!spans[2].textContent || spans[2].textContent.trim() === '' || spans[2].textContent.includes('undefined')) {
                spans[2].textContent = text2;
                console.warn('[Theme] Text2 was cleared or invalid, restored:', text2);
            }
            
            console.log('[Theme] Legend colors updated successfully:', { 
                blueColor, 
                greenColor, 
                orangeColor, 
                text0: spans[0].textContent?.substring(0, 40) || 'MISSING',
                text1: spans[1].textContent?.substring(0, 40) || 'MISSING',
                text2: spans[2].textContent?.substring(0, 40) || 'MISSING'
            });
        } else {
            console.warn('[Theme] Expected 3 spans, found:', spans.length);
        }
    };
    
    // Start update immediately and retry if needed
    updateLegend(0);
}

function initializeThemeToggle() {
    const saved = localStorage.getItem('theme') || 'light';
    applyTheme(saved);
    updateChartsTheme(saved);
    
    // Update legend colors on initial load
    setTimeout(() => {
        updateAIPerformanceLegendColors(saved);
    }, 300);
    
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.toggle-text');

    const render = (mode) => {
        if (mode === 'dark') {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light';
        } else {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark';
        }
    };

    render(saved);
    btn.addEventListener('click', () => {
        const current = (localStorage.getItem('theme') || 'light') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
        render(next);
        updateChartsTheme(next);
        
        // Update legend colors immediately and with retries
        setTimeout(() => {
            updateAIPerformanceLegendColors(next);
        }, 50);
        setTimeout(() => {
            updateAIPerformanceLegendColors(next);
        }, 200);
        setTimeout(() => {
            updateAIPerformanceLegendColors(next);
        }, 500);
        
        // Resize charts to ensure proper redraw under new theme
        if (typeof resizeCharts === 'function') {
            setTimeout(() => {
                resizeCharts();
                // Force a full redraw by updating each chart
                updateChartsTheme(next);
                // Update legend one more time after chart resize
                updateAIPerformanceLegendColors(next);
            }, 100);
        }
    });
}
