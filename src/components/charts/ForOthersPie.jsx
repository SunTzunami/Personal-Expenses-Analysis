import React from 'react';
import Plot from 'react-plotly.js';

const ForOthersPie = ({ data }) => {
    // Aggregate by 'for others' field
    const forOthersData = data.reduce((acc, row) => {
        const key = row['for others'] === 1 ? 'For Others' : 'For Myself';
        acc[key] = (acc[key] || 0) + row.Expense;
        return acc;
    }, {});

    const labels = Object.keys(forOthersData);
    const values = Object.values(forOthersData);

    return (
        <div className="w-full h-full min-h-[400px]">
            <Plot
                data={[
                    {
                        values: values,
                        labels: labels,
                        type: 'pie',
                        textinfo: 'percent+label',
                        hoverinfo: 'label+value+percent',
                        marker: {
                            colors: ['#76a5af', '#f5a399'],
                            line: { color: '#1e293b', width: 2 }
                        },
                        hole: 0.4,
                    },
                ]}
                layout={{
                    title: {
                        text: 'Expense Distribution (For Myself vs Others)',
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

export default ForOthersPie;
