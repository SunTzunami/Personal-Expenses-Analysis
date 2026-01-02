import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';

const DayPopup = ({ day, expenses, onClose, currency = 'JPY' }) => {
    if (!day) return null;

    const locales = { 'JPY': 'ja-JP', 'INR': 'en-IN' };
    const symbols = { 'JPY': '¥', 'INR': '₹' };
    const locale = locales[currency] || 'en-US';
    const symbol = symbols[currency] || currency;

    const formatVal = (val) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[100] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
        >
            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-white">{format(day, 'MMMM do, yyyy')}</h3>
                    <p className="text-xs text-slate-400">{format(day, 'EEEE')}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <X size={16} className="text-slate-400" />
                </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-4 custom-scrollbar">
                {expenses.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No expenses recorded</p>
                ) : (
                    <div className="space-y-3">
                        {expenses.map((exp, idx) => (
                            <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-white">{exp.NewCategory || exp.Category}</span>
                                    <span className="text-sm font-bold text-primary">{formatVal(exp.Expense)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-slate-400 italic truncate max-w-[150px]">
                                        {exp.Description || exp.Remark || exp.item || '-'}
                                    </span>
                                    {exp['for others'] === 1 && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">For Others</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center text-sm">
                            <span className="text-slate-400">Total</span>
                            <span className="font-bold text-white">
                                {formatVal(expenses.reduce((sum, e) => sum + e.Expense, 0))}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const MonthGrid = ({ monthStart, expenseMap, globalMax, viewMode, currency, onDayClick }) => {
    const monthEnd = endOfMonth(monthStart);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const symbols = { 'JPY': '¥', 'INR': '₹' };
    const symbol = symbols[currency] || currency;

    // Color scale logic
    const getColor = (val) => {
        if (!val || val === 0) return 'rgba(255,255,255,0.05)';
        const intensity = Math.min(val / globalMax, 1);
        const r = 248;
        const g = Math.floor(113 * (1 - intensity));
        const b = Math.floor(113 * (1 - intensity));
        return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
    };

    // Grid construction
    const weeks = [];
    let currentWeek = [];

    // Prefix padding
    for (let i = 0; i < getDay(monthStart); i++) currentWeek.push(null);

    allDays.forEach(day => {
        currentWeek.push(day);
        if (getDay(day) === 6 || day.getTime() === monthEnd.getTime()) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }
    });
    // Suffix padding
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="mb-6 break-inside-avoid">
            <h4 className="text-sm font-semibold text-slate-300 mb-2 ml-1">{format(monthStart, 'MMMM')}</h4>
            <div className="grid grid-cols-7 gap-1 mb-1">
                {weekdays.map(d => (
                    <div key={d} className="text-center text-[10px] text-slate-500">{d}</div>
                ))}
            </div>
            <div className="space-y-1">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-7 gap-1">
                        {week.map((day, dIdx) => {
                            if (!day) return <div key={dIdx} className="aspect-square" />;

                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayData = expenseMap[dateKey];
                            const val = dayData ? (viewMode === 'magnitude' ? dayData.total : dayData.items.length) : 0;

                            return (
                                <div
                                    key={dIdx}
                                    onClick={() => onDayClick(day, dayData?.items || [])}
                                    className="aspect-square rounded sm:rounded-md flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative group"
                                    style={{ backgroundColor: getColor(val) }}
                                >
                                    <span className={`text-[10px] ${val > 0 ? 'text-white font-medium' : 'text-slate-600'}`}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Simple tooltip for quick glance */}
                                    {val > 0 && (
                                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                                            {viewMode === 'magnitude' ? `${symbol}${val.toLocaleString()}` : `${val} transactions`}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

const CalendarHeatmap = ({ data, currency = 'JPY' }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedExpenses, setSelectedExpenses] = useState([]);
    const [viewMode, setViewMode] = useState('magnitude'); // 'magnitude' | 'frequency'

    // Identify available years in the dataset
    const availableYears = useMemo(() => {
        if (!data) return [];
        const years = [...new Set(data.map(d => d.Date.getFullYear()))];
        return years.sort((a, b) => b - a);
    }, [data]);

    const [displayYear, setDisplayYear] = useState(() => {
        if (data && data.length > 0) {
            return new Date(Math.max(...data.map(d => d.Date.getTime()))).getFullYear();
        }
        return new Date().getFullYear();
    });

    // Reset displayYear if it's no longer in availableYears
    React.useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(displayYear)) {
            setDisplayYear(availableYears[0]);
        }
    }, [availableYears, displayYear]);

    if (!data || data.length === 0) {
        return <div className="w-full min-h-[400px] flex items-center justify-center text-slate-400">No data available</div>;
    }

    // Pre-process data
    const expenseMap = {};
    let maxTotal = 0;
    let maxCount = 0;

    data.forEach(row => {
        const dateKey = format(row.Date, 'yyyy-MM-dd');
        if (!expenseMap[dateKey]) {
            expenseMap[dateKey] = { total: 0, items: [] };
        }
        expenseMap[dateKey].total += row.Expense;
        expenseMap[dateKey].items.push(row);

        if (expenseMap[dateKey].total > maxTotal) maxTotal = expenseMap[dateKey].total;
        if (expenseMap[dateKey].items.length > maxCount) maxCount = expenseMap[dateKey].items.length;
    });

    const globalMax = viewMode === 'magnitude' ? maxTotal : maxCount;

    // Calculate Correlation (Frequency vs Magnitude)
    const calculateCorrelation = () => {
        const entries = Object.values(expenseMap).filter(e => e.items.length > 0);
        if (entries.length < 2) return null;

        const n = entries.length;
        const x = entries.map(e => e.items.length); // counts
        const y = entries.map(e => e.total);        // totals

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);

        const numerator = (n * sumXY) - (sumX * sumY);
        const denomVal = (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY);
        if (denomVal <= 0) return 0;
        const denominator = Math.sqrt(denomVal);

        return numerator / denominator;
    };

    const correlation = calculateCorrelation();
    const getCorrelationLabel = (r) => {
        if (r === null) return 'N/A';
        const absR = Math.abs(r);
        if (absR > 0.7) return r > 0 ? 'Strong Positive' : 'Strong Negative';
        if (absR > 0.3) return r > 0 ? 'Moderate Positive' : 'Moderate Negative';
        return 'Weak/No Correlation';
    };

    // Identify months to render for the displayYear
    const months = useMemo(() => {
        const result = [];
        // Filter data dates by the display year to find relevant months
        // Or simply iterate 12 months of that year if they exist in interval
        const dataDates = data.filter(d => d.Date.getFullYear() === displayYear).map(d => d.Date);
        if (dataDates.length === 0) return [];

        const minYearDate = new Date(Math.min(...dataDates.map(d => d.getTime())));
        const maxYearDate = new Date(Math.max(...dataDates.map(d => d.getTime())));

        let current = startOfMonth(minYearDate);
        const end = endOfMonth(maxYearDate);

        while (current <= end) {
            result.push(new Date(current));
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
        return result;
    }, [data, displayYear]);

    return (
        <div className="relative w-full h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <h3 className="text-lg font-semibold text-slate-200">
                        Expense Calendar ({displayYear})
                    </h3>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Year Selector */}
                        {availableYears.length > 1 && (
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
                                {availableYears.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => setDisplayYear(year)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayYear === year ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => setViewMode('magnitude')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'magnitude' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Magnitude
                            </button>
                            <button
                                onClick={() => setViewMode('frequency')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'frequency' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Frequency
                            </button>
                        </div>

                        {/* Correlation Stat */}
                        {correlation !== null && (
                            <div className="flex flex-col group relative">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                                    Correlation <Info size={10} className="text-slate-600 group-hover:text-primary transition-colors cursor-help" />
                                </div>
                                <div className="text-xs text-primary font-medium flex items-center gap-1">
                                    {correlation.toFixed(2)} — {getCorrelationLabel(correlation)}
                                </div>
                                <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-slate-900/95 border border-white/20 rounded-xl shadow-2xl text-[12px] text-slate-300 hidden group-hover:block z-[100] backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 bg-primary/20 rounded-lg">
                                            <Info size={14} className="text-primary" />
                                        </div>
                                        <p className="font-bold text-white text-sm">Frequency vs. Magnitude</p>
                                    </div>
                                    <p className="leading-relaxed mb-3">
                                        This calculates the <strong>Pearson Correlation Coefficient</strong> between how often you spend (transaction count) and how much you spend (total amount) each day.
                                    </p>
                                    <div className="space-y-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                        <div className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                                            <p><span className="text-white font-medium">Positive:</span> More transactions = More spending. Indicates your spending is driven by volume ("Death by a thousand cuts").</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1 shrink-0" />
                                            <p><span className="text-white font-medium">Weak/Zero:</span> No clear pattern. Usually means your high-spending days are caused by a few large purchases (Splurging).</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[10px] text-slate-500 italic border-t border-white/5 pt-2">
                                        <p>• Monitoring this helps identify if saving efforts should focus on reducing transaction frequency or purchase magnitude.</p>
                                        <p className="text-primary/70">• Tip: Disable "Include Rent" in the sidebar to remove large fixed costs and see your true daily spending correlation.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Low</span>
                    <div className="flex gap-0.5">
                        {[0.2, 0.4, 0.6, 0.8, 1].map((intensity, idx) => (
                            <div key={idx} className="w-3 h-3 rounded-[1px]" style={{ backgroundColor: `rgba(248, ${Math.floor(113 * (1 - intensity))}, ${Math.floor(113 * (1 - intensity))}, ${0.3 + intensity * 0.7})` }} />
                        ))}
                    </div>
                    <span>High</span>
                </div>
            </div>

            {/* Scrollable Grid of Months */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 max-h-[600px] overflow-y-auto custom-scrollbar p-2">
                {months.map((m) => (
                    <MonthGrid
                        key={m.toISOString()}
                        monthStart={m}
                        expenseMap={expenseMap}
                        globalMax={globalMax}
                        viewMode={viewMode}
                        currency={currency}
                        onDayClick={(day, expenses) => {
                            setSelectedDay(day);
                            setSelectedExpenses(expenses);
                        }}
                    />
                ))}
            </div>

            <AnimatePresence>
                {selectedDay && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDay(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <DayPopup
                            day={selectedDay}
                            expenses={selectedExpenses}
                            currency={currency}
                            onClose={() => setSelectedDay(null)}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarHeatmap;
