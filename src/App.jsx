import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { LayoutDashboard, Wallet, Calendar, Settings, PieChart, TrendingUp, Sliders, MessageSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import FileUploader from './components/FileUploader';
import MetricCard from './components/MetricCard';
import CategoryPie from './components/charts/CategoryPie';
import TrendLine from './components/charts/TrendLine';
import ForOthersPie from './components/charts/ForOthersPie';
import ExpenseHeatmap from './components/charts/ExpenseHeatmap';
import YearComparison from './components/charts/YearComparison';
import SunburstChart from './components/charts/SunburstChart';
import InsightCards from './components/InsightCards';
import WeekdayPattern from './components/charts/WeekdayPattern';
import CalendarHeatmap from './components/charts/CalendarHeatmap';
import ChatInterface from './components/ChatInterface';

import { processExcelFile, filterData, calculateMetrics } from './utils/dataProcessor';
import { generateDummyData } from './utils/dummyGenerator';

import './styles/index.css';
import './styles/glass.css';

function App() {
  const [rawData, setRawData] = useState(null);
  const [filters, setFilters] = useState({
    type: 'Year', // Year, Month, Day
    year: 2025,
    month: 11, // Dec (0-indexed)
    includeRent: true,
    startDate: new Date(),
    endDate: new Date(),
  });
  const currency = 'JPY';
  const [isDemo, setIsDemo] = useState(false);
  const [dateBounds, setDateBounds] = useState({ min: '', max: '' });

  const [compareYear, setCompareYear] = useState(null);
  const [showCharts, setShowCharts] = useState({
    heatmap: true,
    forOthers: true,
    yearComparison: false,
    sunburst: true,
    insights: true,
    weekdayPattern: true
  });
  const [showChat, setShowChat] = useState(false);

  const handleFileUpload = async (file) => {
    setIsDemo(false);
    const data = await processExcelFile(file);
    setRawData(data);

    // Auto-set the year to the latest available in data
    const years = [...new Set(data.map(d => d.Date.getFullYear()))];

    // Calculate Date Bounds
    if (data.length > 0) {
      const dates = data.map(d => d.Date.getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      setDateBounds({
        min: format(minDate, 'yyyy-MM-dd'),
        max: format(maxDate, 'yyyy-MM-dd')
      });

      // Initialize filters with max year and full date range
      setFilters(prev => ({
        ...prev,
        year: Math.max(...years),
        startDate: minDate,
        endDate: maxDate
      }));
    }
  };

  const handleUseDemo = () => {
    const data = generateDummyData();
    setIsDemo(true);
    setRawData(data);

    // Auto-set filters for demo (current year)
    const currentYear = new Date().getFullYear();
    setFilters(prev => ({ ...prev, year: currentYear }));

    // Set bounds
    if (data.length > 0) {
      const dates = data.map(d => d.Date.getTime());
      setDateBounds({
        min: format(new Date(Math.min(...dates)), 'yyyy-MM-dd'),
        max: format(new Date(Math.max(...dates)), 'yyyy-MM-dd')
      });
    }
  };

  // Derived state
  const filteredData = useMemo(() => {
    if (!rawData) return [];
    return filterData(rawData, filters);
  }, [rawData, filters]);

  const metrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);
  const availableYears = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.map(d => d.Date.getFullYear()))].sort((a, b) => b - a);
  }, [rawData]);

  if (!rawData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <FileUploader onFileUpload={handleFileUpload} onUseDemo={handleUseDemo} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-slate-100">

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-72 glass-panel m-4 mr-0 flex flex-col fixed top-0 bottom-0 z-50 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent flex items-center gap-2">
            <Wallet className="text-primary" />
            Expense Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">Advanced Expense Analysis</p>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

          {/* Filter Section */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4 flex items-center gap-2">
              <Calendar size={14} /> Period
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-1">
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {['Year', 'Month', 'Custom Range'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilters(f => ({ ...f, type }))}
                      className={`py-1.5 rounded-md transition-all text-xs ${filters.type === type ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {filters.type === 'Custom Range' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Start Date</label>
                    <input
                      type="date"
                      value={format(filters.startDate, 'yyyy-MM-dd')}
                      min={dateBounds.min}
                      max={dateBounds.max}
                      onChange={(e) => setFilters(f => ({ ...f, startDate: new Date(e.target.value) }))}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">End Date</label>
                    <input
                      type="date"
                      value={format(filters.endDate, 'yyyy-MM-dd')}
                      min={dateBounds.min}
                      max={dateBounds.max}
                      onChange={(e) => setFilters(f => ({ ...f, endDate: new Date(e.target.value) }))}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary text-slate-200"
                    />
                  </div>
                </div>
              )}

              {(filters.type === 'Year' || filters.type === 'Month') && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Select Year</label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {filters.type === 'Month' && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Select Month</label>
                  <select
                    value={filters.month}
                    onChange={(e) => setFilters(f => ({ ...f, month: Number(e.target.value) }))}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4 flex items-center gap-2">
              <Sliders size={14} /> Analysis
            </h3>
            <div className="space-y-3">


              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setFilters(f => ({ ...f, includeRent: !f.includeRent }))}>
                <span className="text-sm text-slate-300">Include Rent</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${filters.includeRent ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${filters.includeRent ? 'translate-x-4' : ''}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Year Comparison */}
          {availableYears.length > 1 && filters.type === 'Year' && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} /> Compare Years
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowCharts(s => ({ ...s, yearComparison: !s.yearComparison }))}>
                  <span className="text-sm text-slate-300">Enable Comparison</span>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showCharts.yearComparison ? 'bg-primary' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCharts.yearComparison ? 'translate-x-4' : ''}`} />
                  </div>
                </div>

                {showCharts.yearComparison && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Compare with</label>
                    <select
                      value={compareYear || ''}
                      onChange={(e) => setCompareYear(Number(e.target.value))}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Select year...</option>
                      {availableYears.filter(y => y !== filters.year).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chart Display Options */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4 flex items-center gap-2">
              <PieChart size={14} /> Charts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowCharts(s => ({ ...s, heatmap: !s.heatmap }))}>
                <span className="text-sm text-slate-300">Heatmap</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showCharts.heatmap ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCharts.heatmap ? 'translate-x-4' : ''}`} />
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowCharts(s => ({ ...s, forOthers: !s.forOthers }))}>
                <span className="text-sm text-slate-300">For Others</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showCharts.forOthers ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCharts.forOthers ? 'translate-x-4' : ''}`} />
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowCharts(s => ({ ...s, sunburst: !s.sunburst }))}>
                <span className="text-sm text-slate-300">Sunburst</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showCharts.sunburst ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCharts.sunburst ? 'translate-x-4' : ''}`} />
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowCharts(s => ({ ...s, weekdayPattern: !s.weekdayPattern }))}>
                <span className="text-sm text-slate-300">Weekday Pattern</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showCharts.weekdayPattern ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCharts.weekdayPattern ? 'translate-x-4' : ''}`} />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-white/10 bg-black/20 space-y-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`w-full glass-button text-xs flex items-center justify-center gap-2 ${showChat ? 'bg-primary/20 text-primary border-primary/50' : ''}`}
          >
            <MessageSquare size={14} />
            {showChat ? 'Close AI Assistant' : 'Ask AI Assistant'}
          </button>
          <button className="w-full glass-button text-xs" onClick={() => setRawData(null)}>
            Upload New File
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="ml-80 flex-1 p-8 overflow-x-hidden">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold mb-2"
            >
              Dashboard
              {isDemo && <span className="ml-3 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full border border-amber-500/50">Demo Mode</span>}
            </motion.h2>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-800/50 text-xs border border-white/5">
                {filters.type === 'Year' ? `Year: ${filters.year}` : `${new Date(0, filters.month).toLocaleString('default', { month: 'long' })} ${filters.year}`}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/50 text-xs border border-white/5">
                {metrics.days} Days analyzed
              </span>
            </div>
          </div>
        </header>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Expenses"
            value={metrics.total}
            icon={Wallet}
            color="blue"
            currency={currency}
          />
          <MetricCard
            title="Avg Monthly"
            value={metrics.avgMonthly}
            icon={Calendar}
            color="indigo"
            currency={currency}
          />
          <MetricCard
            title="Avg Daily"
            value={metrics.avgDaily}
            icon={TrendingUp}
            color="pink"
            currency={currency}
          />
        </div>

        {/* Insight Cards */}
        {
          showCharts.insights && (
            <div className="mb-8 relative z-40">
              <InsightCards data={filteredData} currency={currency} />
            </div>
          )
        }

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-30">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 relative group"
          >
            <div className="flex items-center gap-2 mb-4 group/title relative">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Category Spending</h3>
              <div className="group/tip relative">
                <Info size={14} className="text-slate-600 hover:text-primary cursor-help transition-colors" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 border border-white/10 rounded-xl shadow-2xl text-[11px] text-slate-300 hidden group-hover/tip:block z-[100] backdrop-blur-xl">
                  Shows the distribution of your expenses across different categories.
                  <p className="mt-2 text-primary/80 italic font-medium">Use this to identify which areas of your life consume the most capital.</p>
                  <div className="absolute top-full right-1 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45 -translate-y-1/2"></div>
                </div>
              </div>
            </div>
            <CategoryPie data={filteredData} currency={currency} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6"
          >
            <TrendLine data={filteredData} currency={currency} />
          </motion.div>
        </div>

        {/* Advanced Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {showCharts.forOthers && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6"
            >
              <ForOthersPie data={filteredData} />
            </motion.div>
          )}
        </div>

        {/* Heatmap Full Width */}
        {
          showCharts.heatmap && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-6 mb-8 relative z-20"
            >
              <CalendarHeatmap data={filteredData} currency={currency} />
            </motion.div>
          )
        }

        {/* Year Comparison Chart */}
        {
          showCharts.yearComparison && compareYear && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-panel p-6 mb-8"
            >
              <YearComparison data={rawData} year1={filters.year} year2={compareYear} />
            </motion.div>
          )
        }

        {/* Additional Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {showCharts.sunburst && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-panel p-6 relative z-10"
            >
              <SunburstChart data={filteredData} currency={currency} />
            </motion.div>
          )}

          {showCharts.weekdayPattern && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="glass-panel p-6"
            >
              <WeekdayPattern data={filteredData} />
            </motion.div>
          )}
        </div>

      </main>

      <ChatInterface
        visible={showChat}
        onClose={() => setShowChat(false)}
        data={rawData}
        currency={currency}
      />
    </div>
  );
}

export default App;
