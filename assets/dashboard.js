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
        loadAllData();
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
            value: data.find(p => p.pattern_type === 'peak_activity')?.value || 0
        },
        'preference_match': {
            text: `${data.find(p => p.pattern_type === 'preference_match')?.value || 0}% accuracy`,
            value: data.find(p => p.pattern_type === 'preference_match')?.value || 0
        },
        'return_rate': {
            text: `${data.find(p => p.pattern_type === 'return_rate')?.value || 0}% within 30 days`,
            value: data.find(p => p.pattern_type === 'return_rate')?.value || 0
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
        const response = await fetchAPI('/api/revenue/summary');
        
        if (response.success && response.data) {
            updateRevenueSummary(response.data);
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
        const response = await fetchAPI('/api/ai/model-performance');
        
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
    const container = document.querySelector('[data-billing-summary]');
    if (!container) return;
    
    showLoadingState('[data-billing-summary]');
    
    try {
        const response = await fetchAPI('/api/billing/summary');
        
        if (response.success && response.data) {
            updateBillingSummary(response.data);
            loadingState.hideLoader(container);
        }
    } catch (error) {
        console.error('Failed to fetch billing summary:', error);
        if (container) {
            container.innerHTML = '<div class="no-data">Failed to load data</div>';
            loadingState.hideLoader(container);
        }
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
        
        if (response.success && response.data) {
            updateInteractionStats(response.data);
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
            changeEl.innerHTML = `<i class="fas fa-arrow-up"></i> ${data.conversion_rate_change > 0 ? '+' : ''}${data.conversion_rate_change.toFixed(1)}% improvement`;
            changeEl.className = `kpi-change ${data.conversion_rate_change >= 0 ? 'positive' : 'negative'}`;
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
                animateGradually: {
                    enabled: true,
                    delay: 200
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
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
                animateGradually: {
                    enabled: true,
                    delay: 200
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
                return '€' + val.toFixed(0) + 'K';
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
                    return '€' + val.toFixed(0) + 'K';
                }
            }
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return '€' + val.toFixed(0) + ',000';
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

function updateRevenueSummary(data) {
    const container = document.querySelector('[data-revenue-summary]');
    if (!container || !data) {
        if (container) container.innerHTML = '<div class="no-data">No revenue data available</div>';
        return;
    }
    
    const html = `
        <div class="summary-card">
            <h3>Total Revenue Impact</h3>
            <div class="revenue-value">${formatCurrency(data.total_revenue || 0)}</div>
            <p>Directly attributed to AI recommendations</p>
        </div>
        <div class="summary-card">
            <h3>Average Order Value</h3>
            <div class="revenue-value">${formatCurrency(data.average_order_value || 0)}</div>
            <p class="increase">${data.order_value_change || 0 > 0 ? '+' : ''}${(data.order_value_change || 0).toFixed(1)}% with AI assistance</p>
        </div>
        <div class="summary-card">
            <h3>ROI Calculator</h3>
            <div class="roi-calc">
                <div class="roi-item">
                    <span>Investment:</span>
                    <span>${formatCurrency(data.monthly_investment || 0)}/mo</span>
                </div>
                <div class="roi-item">
                    <span>Return:</span>
                    <span>${formatCurrency(data.monthly_return || 0)}/mo</span>
                </div>
                <div class="roi-result">
                    <span>ROI:</span>
                    <span class="roi-value">${((data.roi || 0) * 100).toFixed(0)}%</span>
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
    
    // Clear container completely first
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
    const accuracy = parseFloat(latest.accuracy || latest.accuracy_percentage || 94);
    const satisfaction = parseFloat(latest.user_satisfaction || latest.satisfaction_score || latest.f1_score || 89);
    const conversion = parseFloat(latest.conversion_rate || latest.precision || 76);
    
    const options = {
        series: [accuracy, satisfaction, conversion],
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
                enabled: true,
                animateGradually: {
                    enabled: true,
                    delay: 200
                }
            }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 270,
                track: {
                    show: true,
                    background: 'rgba(242,242,242,0.9)'
                },
                hollow: {
                    margin: 0,
                    size: '66%'
                },
                dataLabels: {
                    show: true,
                    name: { show: false },
                    value: {
                        show: true,
                        fontSize: '18px',
                        fontWeight: 700,
                        offsetY: 8,
                        formatter: function(val) { return val + '%'; }
                    }
                },
                stroke: {
                    lineCap: 'round'
                }
            }
        },
        labels: ['Recommendation Accuracy', 'Customer Satisfaction', 'Conversion Rate'],
        colors: ['#008ffb', '#00e396', '#feb019'],
        legend: { show: false },
        tooltip: {
            enabled: true,
            y: {
                formatter: function(val, opts) {
                    const label = opts.w.globals.labels[opts.seriesIndex];
                    return `<div style="font-weight: 600;">${label}</div><div style="font-size: 16px; margin-top: 5px;">${val}%</div>`;
                }
            },
            marker: {
                show: true
            },
            theme: 'light',
            style: {
                fontSize: '14px'
            },
            followCursor: true
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
    
    chartInstances['aiPerformance'] = new ApexCharts(container, options);
    chartInstances['aiPerformance'].render();

    // Custom legend styled like the reference (colored text, inline)
    const legendHtml = `
        <div class="ai-perf-legend" style="margin-top: 16px; text-align: center; font-size: 14px;">
            <span style="color:#008ffb; margin-right: 18px;">Recommendation Accuracy: ${accuracy}%</span>
            <span style="color:#00e396; margin-right: 18px;">Customer Satisfaction: ${satisfaction}%</span>
            <span style="color:#feb019;">Conversion Rate: ${conversion}%</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', legendHtml);
}

function updateSystemHealth(data) {
    const container = document.querySelector('[data-system-health]');
    if (!container || !data || data.length === 0) {
        if (container) container.innerHTML = '<div class="no-data">No system health data available</div>';
        return;
    }
    
    // Use latest health record
    const latest = data[0] || {};
    
    const html = `
        <div class="health-metrics">
            <div class="metric">
                <span>API Response</span>
                <div class="metric-bar">
                    <div class="bar-fill healthy" style="width: ${latest.api_response_rate || 95}%;"></div>
                </div>
                <span>${latest.api_response_time || 95}ms</span>
            </div>
            <div class="metric">
                <span>CPU Usage</span>
                <div class="metric-bar">
                    <div class="bar-fill" style="width: ${latest.cpu_usage || 42}%;"></div>
                </div>
                <span>${latest.cpu_usage || 42}%</span>
            </div>
            <div class="metric">
                <span>Memory</span>
                <div class="metric-bar">
                    <div class="bar-fill" style="width: ${latest.memory_usage || 58}%;"></div>
                </div>
                <span>${latest.memory_usage || 58}%</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function updateBillingSummary(data) {
    const container = document.querySelector('[data-billing-summary]');
    if (!container || !data) {
        if (container) container.innerHTML = '<div class="no-data">No billing data available</div>';
        return;
    }
    
    // Implementation for billing summary
    console.log('Billing summary data:', data);
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
    
    // Group data by month if we have date-based data
    const monthMap = {};
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (Array.isArray(data)) {
        data.forEach(item => {
            const date = item.record_date || item.date;
            if (date) {
                const d = new Date(date);
                const monthKey = monthOrder[d.getMonth()];
                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = {
                        overall: 0,
                        product: 0,
                        ai: 0,
                        count: 0
                    };
                }
                monthMap[monthKey].overall += parseFloat(item.overall_satisfaction || item.rating || 0);
                monthMap[monthKey].product += parseFloat(item.product_match_quality || 0);
                monthMap[monthKey].ai += parseFloat(item.ai_helpfulness || 0);
                monthMap[monthKey].count += 1;
            }
        });
    }
    
    // Use available months or default range
    const availableMonths = Object.keys(monthMap).length > 0 ? Object.keys(monthMap).slice(-7) : ['Apr', 'May', 'Jun', 'Jul'];
    const months = availableMonths.length > 0 ? availableMonths : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    
    const overallSatisfaction = months.map(m => {
        if (monthMap[m] && monthMap[m].count > 0) {
            return monthMap[m].overall / monthMap[m].count;
        }
        return 4.0; // Default value
    });
    const productMatch = months.map(m => {
        if (monthMap[m] && monthMap[m].count > 0) {
            return monthMap[m].product / monthMap[m].count;
        }
        return 4.2; // Default value
    });
    const aiHelpfulness = months.map(m => {
        if (monthMap[m] && monthMap[m].count > 0) {
            return monthMap[m].ai / monthMap[m].count;
        }
        return 4.1; // Default value
    });
    
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
            categories: months,
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
    
    // Ensure we have some data
    if (dateLabels.length === 0) {
        dateLabels = ['No data'];
        questionnaire = [0];
        chat = [0];
        image = [0];
        routine = [0];
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
        yaxis: {
            min: 0,
            labels: {
                formatter: function(val) {
                    // Format numbers without decimals for interaction counts
                    if (val >= 1000) {
                        return (val / 1000).toFixed(0) + 'K';
                    }
                    return val.toFixed(0);
                }
            },
            tickAmount: 6
        },
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
            y: {
                formatter: function(val) {
                    return formatNumber(val);
                }
            }
        }
    };
    
    chartInstances['interactionTimeline'] = new ApexCharts(container, options);
    chartInstances['interactionTimeline'].render();
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
    if (num === null || num === undefined) return '€0';
    const value = parseFloat(num);
    if (value >= 1000000) {
        return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
        return `€${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0
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
    fetchAIModelPerformance();
    fetchSystemHealth();
    fetchBillingSummary();
    fetchConversionTrends();
    fetchSatisfactionTrends();
    fetchInteractionTimeline();
    fetchInteractionStats();
    fetchLiveActiveCount();
}

// ============================================================
// Tab Navigation Functions
// ============================================================

function initializeTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.dashboard-page');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show the corresponding page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPage) {
                    page.classList.add('active');
                    // Load page-specific data if needed
                    if (targetPage === 'conversions') {
                        fetchConversionTrends();
                    } else if (targetPage === 'interactions') {
                        fetchInteractionStats();
                        fetchInteractionTimeline();
                    } else if (targetPage === 'customers') {
                        fetchCustomerSegments();
                        fetchBehavioralPatterns();
                        fetchCustomerConcerns();
                        fetchCustomerLifetimeValue();
                    }
                }
            });
        });
    });
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
    initializeDataFetching();
    
    // Check backend health before loading data
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
    } else {
        console.log('[App] Backend server is healthy, loading data...');
        // Load data after a short delay to ensure DOM is ready
        setTimeout(() => loadAllData(), 100);
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
    loadAllData,
    setDateRange: (range) => {
        currentDateRange = range;
        loadAllData();
    }
};
