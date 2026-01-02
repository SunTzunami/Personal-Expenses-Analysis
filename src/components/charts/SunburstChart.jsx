import React from 'react';
import Plot from 'react-plotly.js';

import { CATEGORY_COLORS } from '../../utils/categoryMapping';

const SunburstChart = ({ data, currency = 'JPY' }) => {
    if (!data || data.length === 0) {
        return <div className="w-full h-full min-h-[300px] flex items-center justify-center text-slate-400">No data available</div>;
    }

    // Aggregate data with unique IDs
    const aggregated = {};

    data.forEach(row => {
        const parentLabel = row.NewCategory;
        const childLabel = row.category || row.Category;

        const parentId = parentLabel;
        const childId = `${parentLabel}-${childLabel}`;

        // Initialize parent if not exists
        if (!aggregated[parentId]) {
            aggregated[parentId] = {
                id: parentId,
                label: parentLabel,
                parent: '',
                value: 0
            };
        }

        // Initialize child if not exists
        if (!aggregated[childId]) {
            aggregated[childId] = {
                id: childId,
                label: childLabel,
                parent: parentId,
                value: 0
            };
        }

        // Accumulate values
        aggregated[parentId].value += row.Expense;
        aggregated[childId].value += row.Expense;
    });

    const ids = Object.values(aggregated).map(d => d.id);
    const labels = Object.values(aggregated).map(d => d.label);
    const parents = Object.values(aggregated).map(d => d.parent);
    const values = Object.values(aggregated).map(d => d.value);

    // Map colors to labels (using parent logic)
    const markerColors = ids.map((id, idx) => {
        const label = labels[idx];
        // If it's a root/parent category
        if (CATEGORY_COLORS[label] && parents[idx] === '') return CATEGORY_COLORS[label];

        // Inherit from parent
        const parentId = parents[idx];
        // Find parent's label
        const parentObj = aggregated[parentId];
        const parentLabel = parentObj ? parentObj.label : '';

        return CATEGORY_COLORS[parentLabel] || '#818cf8';
    });

    const symbols = { 'JPY': '¥', 'INR': '₹' };
    const symbol = symbols[currency] || currency;

    return (
        <div className="w-full h-full min-h-[300px]">
            <Plot
                data={[
                    {
                        type: 'sunburst',
                        ids: ids,
                        labels: labels,
                        parents: parents,
                        values: values,
                        textinfo: 'label+percent parent',
                        hovertemplate: `<b>%{label}</b><br>${symbol}%{value:,.0f}<extra></extra>`,
                        marker: {
                            colors: markerColors,
                            line: { color: '#1e293b', width: 2 }
                        },
                        branchvalues: 'total'
                    },
                ]}
                layout={{
                    title: {
                        text: 'Hierarchical Expense Breakdown',
                        font: { color: '#f8fafc', size: 18, family: 'Outfit' }
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#94a3b8', family: 'Outfit', size: 11 },
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

export default SunburstChart;
