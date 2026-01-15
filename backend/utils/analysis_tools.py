import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np
from scipy import stats

def plot_time_series(df, category=None, major_category=None, year=None, start_year=None, end_year=None, months=None, title=None):
    """
    Plots an enhanced time series chart. Uses bars for sparse data (<=20 points) 
    and line chart with moving average for dense data.
    """
    data = df.copy()
    if 'Date' in data.columns:
        data['Date'] = pd.to_datetime(data['Date'])
    
    # Filter by year or year range
    if year:
        data = data[data['Date'].dt.year == int(year)]
    elif start_year and end_year:
        data = data[(data['Date'].dt.year >= int(start_year)) & (data['Date'].dt.year <= int(end_year))]
    
    # Robust filtering for category/major_category
    if category and major_category:
        cat_filter = data[data['category'].str.lower() == category.lower()]
        if not cat_filter.empty:
            data = cat_filter
        else:
            data = data[data['major category'].str.lower() == major_category.lower()]
    elif category:
        data = data[data['category'].str.lower() == category.lower()]
    elif major_category:
        data = data[data['major category'].str.lower() == major_category.lower()]
        
    if months:
        cutoff = pd.Timestamp.now() - pd.DateOffset(months=int(months))
        data = data[data['Date'] >= cutoff]
    
    if data.empty:
        label = f"{category or major_category or 'Total'}"
        return None, f"No spending data found for {label} in the specified period."

    data = data.sort_values('Date')
    
    label = f"{category or major_category or 'Total'}"
    default_title = f"{label} Spending Over Time"
    
    # Determine if data is sparse (use bar chart) or dense (use line chart)
    use_bars = len(data) <= 20
    
    fig = go.Figure()
    
    if use_bars:
        # Bar chart for sparse data
        fig.add_trace(go.Bar(
            x=data['Date'], 
            y=data['Expense'],
            name='Expenses',
            marker=dict(color='#3b82f6'),
            text=[f'¥{v:,.0f}' for v in data['Expense']],
            textposition='outside',
            hovertemplate='<b>%{x|%Y-%m-%d}</b><br>¥%{y:,.2f}<extra></extra>'
        ))
    else:
        # Line chart for dense data
        fig.add_trace(go.Scatter(
            x=data['Date'], 
            y=data['Expense'],
            mode='lines+markers',
            name='Daily Expenses',
            line=dict(color='#3b82f6', width=2),
            marker=dict(size=4),
            hovertemplate='<b>%{x|%Y-%m-%d}</b><br>¥%{y:,.2f}<extra></extra>'
        ))
        
        # Add moving average for dense data if enough points
        if len(data) > 7:
            data['MA7'] = data['Expense'].rolling(window=7, min_periods=1).mean()
            fig.add_trace(go.Scatter(
                x=data['Date'],
                y=data['MA7'],
                mode='lines',
                name='7-Day Average',
                line=dict(color='#f59e0b', width=2, dash='dash'),
                hovertemplate='<b>%{x|%Y-%m-%d}</b><br>¥%{y:,.2f}<extra></extra>'
            ))
    
    # Update layout with better styling
    fig.update_layout(
        title=dict(text=title or default_title, font=dict(size=18)),
        xaxis_title="Date",
        yaxis_title="Amount (¥)",
        hovermode='x unified' if not use_bars else 'closest',
        template='plotly_white',
        showlegend=len(data) > 20,  # Only show legend for dense data with MA
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    msg = f"Time-series {'bar chart' if use_bars else 'plot'} for {label} expenses"
    if year: msg += f" in {year}"
    elif start_year and end_year: msg += f" from {start_year} to {end_year}"
    if months: msg += f" for the past {months} months"
    msg += f" ({len(data)} transactions)"
    if not use_bars:
        msg += " with trend analysis"
    msg += " has been generated."
    
    return fig, msg

def plot_pie_chart(df, year=None, major_category=None, category=None, title=None):
    """
    Plots an enhanced pie chart with percentages and better formatting.
    """
    data = df.copy()
    if year:
        data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    
    if major_category:
        data = data[data['major category'].str.lower() == major_category.lower()]
        names = 'category'
        default_title = f"{major_category} Breakdown"
        msg = f"Pie chart showing breakdown of {major_category} expenses"
    elif category:
        data = data[data['category'].str.lower() == category.lower()]
        names = 'category'
        default_title = f"{category} Breakdown"
        msg = f"Pie chart showing {category} expenses"
    else:
        names = 'major category'
        default_title = "Major Category Breakdown"
        msg = "Pie chart showing major category breakdown"
    
    if data.empty:
        label = f"{major_category or category or 'Total'}"
        return None, f"No data found to create a pie chart for {label}."

    if year: msg += f" for {year}"
    msg += " has been generated."
    
    # Group and calculate percentages
    grouped = data.groupby(names)['Expense'].sum().reset_index()
    grouped = grouped.sort_values('Expense', ascending=False)
    
    fig = go.Figure(data=[go.Pie(
        labels=grouped[names],
        values=grouped['Expense'],
        textposition='auto',
        textinfo='label+percent',
        hovertemplate='<b>%{label}</b><br>¥%{value:,.0f}<br>%{percent}<extra></extra>',
        marker=dict(line=dict(color='white', width=2))
    )])
    
    fig.update_layout(
        title=dict(text=title or default_title, font=dict(size=18)),
        template='plotly_white',
        showlegend=True
    )
    
    return fig, msg

def plot_comparison(df, category=None, major_category=None, y1=None, y2=None, title=None):
    """
    Enhanced comparison with box plots and statistical summary.
    """
    data = df.copy()
    data['Year'] = pd.to_datetime(data['Date']).dt.year.astype(str)
    
    filtered = data[data['Year'].isin([str(y1), str(y2)])]
    
    # Robust filtering for category/major_category
    if category and major_category:
        cat_filter = filtered[filtered['category'].str.lower() == category.lower()]
        if not cat_filter.empty:
            filtered = cat_filter
        else:
            filtered = filtered[filtered['major category'].str.lower() == major_category.lower()]
    elif category:
        filtered = filtered[filtered['category'].str.lower() == category.lower()]
    elif major_category:
        filtered = filtered[filtered['major category'].str.lower() == major_category.lower()]
    
    if filtered.empty:
        label = f"{category or major_category or 'Total'}"
        return None, f"No data found to compare {label} expenses between {y1} and {y2}."

    label = f"{category or major_category or 'Total'}"
    default_title = f"{label} Comparison: {y1} vs {y2}"
    
    # Create box plot for better comparison
    fig = go.Figure()
    
    for year in [str(y1), str(y2)]:
        year_data = filtered[filtered['Year'] == year]
        fig.add_trace(go.Box(
            y=year_data['Expense'],
            name=year,
            boxmean='sd',
            marker=dict(size=4)
        ))
    
    fig.update_layout(
        title=dict(text=title or default_title, font=dict(size=18)),
        yaxis_title="Amount (¥)",
        template='plotly_white',
        showlegend=True
    )
    
    # Calculate statistics
    y1_data = filtered[filtered['Year'] == str(y1)]['Expense']
    y2_data = filtered[filtered['Year'] == str(y2)]['Expense']
    
    msg = f"Comparison for {label}: {y1} (avg: ¥{y1_data.mean():.2f}) vs {y2} (avg: ¥{y2_data.mean():.2f}). "
    msg += f"Change: {((y2_data.mean() - y1_data.mean()) / y1_data.mean() * 100):.1f}%"
    
    return fig, msg

def plot_stacked_bar(df, year=None, y1=None, y2=None, mode='monthly', title=None):
    """
    Enhanced stacked bar charts with better colors and formatting.
    """
    data = df.copy()
    data['Date'] = pd.to_datetime(data['Date'])
    
    if mode == 'monthly' and year:
        data = data[data['Date'].dt.year == int(year)]
        data['Time'] = data['Date'].dt.strftime('%Y-%m')
        groupby_cols = ['Time', 'major category']
        x_axis = 'Time'
        default_title = f"Monthly Breakdown - {year}"
        msg = f"Monthly stacked bar chart for {year} has been generated."
    elif mode == 'yearly' and y1 and y2:
        data = data[data['Date'].dt.year.isin([int(y1), int(y2)])]
        data['Time'] = data['Date'].dt.year.astype(str)
        groupby_cols = ['Time', 'major category']
        x_axis = 'Time'
        default_title = f"Yearly Comparison: {y1} vs {y2}"
        msg = f"Yearly comparison stacked bar chart for {y1} vs {y2} has been generated."
    else:
        return None, "Invalid parameters for stacked bar chart."

    if data.empty:
        return None, f"No data found for the requested stacked bar chart breakdown."

    grouped = data.groupby(groupby_cols)['Expense'].sum().reset_index()
    
    # Create stacked bar chart using go.Figure for better control
    fig = go.Figure()
    
    categories = grouped['major category'].unique()
    times = sorted(grouped[x_axis].unique())
    
    for cat in categories:
        cat_data = grouped[grouped['major category'] == cat]
        values = [cat_data[cat_data[x_axis] == t]['Expense'].sum() if t in cat_data[x_axis].values else 0 
                  for t in times]
        
        fig.add_trace(go.Bar(
            name=cat,
            x=times,
            y=values,
            text=[f'¥{v:,.0f}' if v > 0 else '' for v in values],
            textposition='inside',
            hovertemplate='<b>%{fullData.name}</b><br>¥%{y:,.0f}<extra></extra>'
        ))
    
    fig.update_layout(
        barmode='stack',
        title=dict(text=title or default_title, font=dict(size=18)),
        xaxis_title="Period",
        yaxis_title="Amount (¥)",
        template='plotly_white',
        hovermode='x unified',
        showlegend=True
    )
    
    return fig, msg

def calculate_sum(df, category=None, major_category=None, year=None, remarks=None):
    """
    Calculates total sum with additional statistics.
    """
    data = df.copy()
    if year:
        data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    
    # Robust filtering for category/major_category
    if category and major_category:
        cat_filter = data[data['category'].str.lower() == category.lower()]
        if not cat_filter.empty:
            data = cat_filter
        else:
            data = data[data['major category'].str.lower() == major_category.lower()]
    elif category:
        data = data[data['category'].str.lower() == category.lower()]
    elif major_category:
        data = data[data['major category'].str.lower() == major_category.lower()]
    if remarks:
        data = data[data['remarks'].str.contains(remarks, case=False, na=False)]
    
    if data.empty:
        label = f"{remarks if remarks else (category or major_category or 'Total')}"
        return None, f"No transactions found for {label} in {year or 'the requested period'}."

    total = data['Expense'].sum()
    count = len(data)
    label = f"{remarks if remarks else (category or major_category or 'Total')}"
    
    return None, f"Total {label} in {year or 'all time'}: ¥{total:,.2f} ({count} transactions)"

def calculate_average(df, category=None, major_category=None, year=None, remarks=None):
    """
    Calculates mean with median and standard deviation.
    """
    data = df.copy()
    if year:
        data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    
    # Robust filtering for category/major_category
    if category and major_category:
        cat_filter = data[data['category'].str.lower() == category.lower()]
        if not cat_filter.empty:
            data = cat_filter
        else:
            data = data[data['major category'].str.lower() == major_category.lower()]
    elif category:
        data = data[data['category'].str.lower() == category.lower()]
    elif major_category:
        data = data[data['major category'].str.lower() == major_category.lower()]
    if remarks:
        data = data[data['remarks'].str.contains(remarks, case=False, na=False)]
    
    if data.empty:
        label = f"{remarks if remarks else (category or major_category or 'Total')}"
        return None, f"No transactions found for {label} calculation in {year or 'the requested period'}."

    avg = data['Expense'].mean()
    median = data['Expense'].median()
    std = data['Expense'].std()
    label = f"{remarks if remarks else (category or major_category or 'Total')}"
    
    return None, f"{label} in {year or 'all time'}: Mean ¥{avg:.2f}, Median ¥{median:.2f}, Std Dev ¥{std:.2f}"

def run_significance_test(df, category=None, major_category=None, y1=None, y2=None):
    """
    Performs a T-test with effect size (Cohen's d).
    """
    data = df.copy()
    data['Year'] = pd.to_datetime(data['Date']).dt.year
    
    def get_series(yr):
        d = data[data['Year'] == int(yr)]
        if category:
            d = d[d['category'].str.lower() == category.lower()]
        elif major_category:
            d = d[d['major category'].str.lower() == major_category.lower()]
        return d['Expense']

    s1 = get_series(y1)
    s2 = get_series(y2)
    
    if len(s1) < 2 or len(s2) < 2:
        return None, "Insufficient data for statistical comparison."
    
    t, p = stats.ttest_ind(s1, s2, equal_var=False, nan_policy='omit')
    
    # Calculate Cohen's d (effect size)
    pooled_std = np.sqrt(((len(s1)-1)*s1.std()**2 + (len(s2)-1)*s2.std()**2) / (len(s1)+len(s2)-2))
    cohens_d = (s1.mean() - s2.mean()) / pooled_std if pooled_std > 0 else 0
    
    sig = "significant" if p < 0.05 else "not significant"
    effect = "large" if abs(cohens_d) > 0.8 else "medium" if abs(cohens_d) > 0.5 else "small"
    
    label = category or major_category or "Total"
    msg = f"{label} - {y1}: ¥{s1.mean():.2f} (n={len(s1)}), {y2}: ¥{s2.mean():.2f} (n={len(s2)}) | "
    msg += f"Difference is {sig} (p={p:.4f}), effect size: {effect} (d={cohens_d:.3f})"
    
    return None, msg

def run_correlation(df, col1, col2):
    """
    Calculates correlation between two numeric columns.
    """
    if col1 not in df.columns or col2 not in df.columns:
        return None, f"One or both columns ({col1}, {col2}) not found in data."
    
    # Ensure numeric data
    data = df[[col1, col2]].dropna()
    
    if data.empty or len(data) < 2:
        return None, "Insufficient data for correlation analysis."
    
    corr = data[col1].corr(data[col2])
    strength = "strong" if abs(corr) > 0.7 else "moderate" if abs(corr) > 0.4 else "weak"
    direction = "positive" if corr > 0 else "negative"
    
    return None, f"Correlation between {col1} and {col2}: {corr:.4f} ({strength} {direction} correlation)"