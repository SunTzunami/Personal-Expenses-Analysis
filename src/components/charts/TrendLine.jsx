
import React from 'react';
import Plot from 'react-plotly.js';
import { format } from 'date-fns';

const TrendLine = ({ data, currency = 'JPY' }) => {

    // Currency Symbols Map
    const currencySymbols = { 'JPY': '¥', 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹' };
    const symbol = currencySymbols[currency] || currency;

    // Group by Date (Daily)
    const aggregated = data.reduce((acc, row) => {
        const dateStr = format(row.Date, 'yyyy-MM-dd');
        acc[dateStr] = (acc[dateStr] || 0) + row.Expense;
        return acc;
    }, {});

    // Sort by Date
    const sortedDates = Object.keys(aggregated).sort();
    const values = sortedDates.map(d => aggregated[d]);

    // Calculate Moving Average (DMA 10)
    const movingAvg = values.map((val, idx, arr) => {
        if (idx < 9) return null;
        const window = arr.slice(idx - 9, idx + 1);
        const sum = window.reduce((a, b) => a + b, 0);
        return sum / 10;
    });

    return (
        <div className="w-full h-full min-h-[250px]">
            <Plot
                data={[
                    {
                        x: sortedDates,
                        y: values,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Daily Expense',
                        line: { color: '#76a5af', width: 2 },
                        fill: 'tozeroy', // Area effect
                        fillcolor: 'rgba(118, 165, 175, 0.1)'
                    },
                    {
                        x: sortedDates,
                        y: movingAvg,
                        type: 'scatter',
                        mode: 'lines',
                        name: '10 DMA',
                        line: { color: '#f5a399', width: 2, dash: 'dot' }
                    }
                ]}
                layout={{
                    title: {
                        text: 'Spending Trend',
                        font: { color: '#f8fafc', size: 18, family: 'Outfit' }
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: {
                        showgrid: false,
                        color: '#94a3b8',
                        tickfont: { family: 'Outfit' }
                    },
                    yaxis: {
                        showgrid: true,
                        gridcolor: 'rgba(255,255,255,0.05)',
                        color: '#94a3b8',
                        tickprefix: symbol,
                        tickfont: { family: 'Outfit' }
                    },
                    legend: {
                        orientation: 'h',
                        y: -0.2,
                        font: { color: '#94a3b8' }
                    },
                    margin: { t: 50, b: 50, l: 50, r: 20 },
                    autosize: true,
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
};

export default TrendLine;
