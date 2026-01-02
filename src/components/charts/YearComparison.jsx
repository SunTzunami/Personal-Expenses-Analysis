import React from 'react';
import Plot from 'react-plotly.js';
import { getDayOfYear } from 'date-fns';

const YearComparison = ({ data, year1, year2 }) => {
    // Filter and sort data for each year
    const year1Data = data
        .filter(d => d.Date.getFullYear() === year1)
        .sort((a, b) => a.Date - b.Date);

    const year2Data = data
        .filter(d => d.Date.getFullYear() === year2)
        .sort((a, b) => a.Date - b.Date);

    // Calculate cumulative expenses
    let cumulative1 = 0;
    const year1Cumulative = year1Data.map(d => {
        cumulative1 += d.Expense;
        return { dayOfYear: getDayOfYear(d.Date), cumulative: cumulative1 };
    });

    let cumulative2 = 0;
    const year2Cumulative = year2Data.map(d => {
        cumulative2 += d.Expense;
        return { dayOfYear: getDayOfYear(d.Date), cumulative: cumulative2 };
    });

    return (
        <div className="w-full h-full min-h-[400px]">
            <Plot
                data={[
                    {
                        x: year1Cumulative.map(d => d.dayOfYear),
                        y: year1Cumulative.map(d => d.cumulative),
                        type: 'scatter',
                        mode: 'lines',
                        name: `${year1}`,
                        line: { color: '#76a5af', width: 3 },
                    },
                    {
                        x: year2Cumulative.map(d => d.dayOfYear),
                        y: year2Cumulative.map(d => d.cumulative),
                        type: 'scatter',
                        mode: 'lines',
                        name: `${year2}`,
                        line: { color: '#f5a399', width: 3 },
                    }
                ]}
                layout={{
                    title: {
                        text: `Cumulative Expenses: ${year1} vs ${year2}`,
                        font: { color: '#f8fafc', size: 18, family: 'Outfit' }
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: {
                        title: 'Day of Year',
                        showgrid: false,
                        color: '#94a3b8',
                        tickfont: { family: 'Outfit' }
                    },
                    yaxis: {
                        showgrid: true,
                        gridcolor: 'rgba(255,255,255,0.05)',
                        color: '#94a3b8',
                        tickprefix: '¥',
                        tickfont: { family: 'Outfit' }
                    },
                    legend: {
                        orientation: 'h',
                        y: -0.2,
                        font: { color: '#94a3b8' }
                    },
                    margin: { t: 50, b: 50, l: 60, r: 20 },
                    autosize: true,
                    hovermode: 'x unified'
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
};

export default YearComparison;
