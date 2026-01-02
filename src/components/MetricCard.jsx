
import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, subtext, icon: Icon, color, currency = 'JPY' }) => {

    const formatCurrency = (val) => {
        if (typeof val !== 'number') return val;

        const locales = {
            'JPY': 'ja-JP',
            'INR': 'en-IN'
        };

        try {
            return new Intl.NumberFormat(locales[currency] || 'en-US', {
                style: 'currency',
                currency: currency,
                maximumFractionDigits: 0
            }).format(val);
        } catch (e) {
            // Fallback
            const symbols = { 'JPY': '¥', 'INR': '₹' };
            return `${symbols[currency] || currency} ${val.toLocaleString()}`;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden group"
        >
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white tracking-tight">
                            {formatCurrency(value)}
                        </span>
                    </div>
                </div>
                <div className={`p-3 rounded-xl bg-opacity-20 ${color ? `bg-${color}-500 text-${color}-400` : 'bg-blue-500/20 text-blue-400'}`}>
                    {Icon && <Icon size={24} />}
                </div>
            </div>

            {subtext && (
                <p className="mt-4 text-xs text-gray-400 z-10">
                    {subtext}
                </p>
            )}

            {/* Ambient background glow */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-3xl opacity-20 ${color ? `bg-${color}-500` : 'bg-blue-500'} group-hover:opacity-40 transition-opacity duration-500`} />
        </motion.div>
    );
};

export default MetricCard;
