import React from 'react';
import Plot from 'react-plotly.js';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const WeekdayPattern = ({ data }) => {
    // Aggregate by day of week
    const weekdayTotals = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    const weekdayCounts = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    data.forEach(row => {
        const day = format(row.Date, 'EEEE');
        weekdayTotals[day] += row.Expense;
        weekdayCounts[day] += 1;
    });

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const averages = weekdays.map(day => weekdayTotals[day] / (weekdayCounts[day] || 1));

    return (
        <div className="w-full h-full min-h-[350px]">
            <Plot
                data={[
                    {
                        x: weekdays,
                        y: averages,
                        type: 'bar',
                        marker: {
                            color: averages,
                            colorscale: [
                                [0, '#76a5af'],
                                [1, '#f5a399']
                            ],
                            line: { color: '#1e293b', width: 1 }
                        },
                        hovertemplate: '<b>%{x}</b><br>Avg: ¥%{y:,.0f}<extra></extra>',
                    },
                ]}
                layout={{
                    title: {
                        text: 'Average Spending by Day of Week',
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
                        tickprefix: '¥',
                        tickfont: { family: 'Outfit' }
                    },
                    margin: { t: 50, b: 50, l: 60, r: 20 },
                    autosize: true,
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
};

export default WeekdayPattern;
