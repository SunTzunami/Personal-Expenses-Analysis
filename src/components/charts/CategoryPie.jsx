
import React from 'react';
import Plot from 'react-plotly.js';

import { CATEGORY_COLORS } from '../../utils/categoryMapping';

const CategoryPie = ({ data, currency = 'JPY' }) => {
    // Aggregate data by NewCategory
    const aggregated = data.reduce((acc, row) => {
        const cat = row.NewCategory;
        acc[cat] = (acc[cat] || 0) + row.Expense;
        return acc;
    }, {});

    const labels = Object.keys(aggregated);
    const values = Object.values(aggregated);

    const markerColors = labels.map(l => CATEGORY_COLORS[l] || '#818cf8'); // Fallback color

    const symbols = { 'JPY': '¥', 'INR': '₹' };
    const symbol = symbols[currency] || currency;

    return (
        <div className="w-full h-full min-h-[250px]">
            <Plot
                data={[
                    {
                        values: values,
                        labels: labels,
                        type: 'pie',
                        textinfo: 'percent+label',
                        textposition: 'inside', // cleaner look
                        hovertemplate: `<b>%{label}</b><br>${symbol}%{value:,.0f}<extra></extra>`,
                        marker: {
                            colors: markerColors,
                            line: { color: '#1e293b', width: 2 } // Dark border matching bg
                        },
                        hole: 0.4, // Donut style looks more modern
                    },
                ]}
                layout={{
                    title: {
                        text: 'Expense Distribution',
                        font: { color: '#f8fafc', size: 18, family: 'Outfit' }
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    showlegend: false,
                    font: { color: '#94a3b8', family: 'Outfit' },
                    margin: { t: 50, b: 20, l: 20, r: 20 },
                    autosize: true,
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
};

export default CategoryPie;
