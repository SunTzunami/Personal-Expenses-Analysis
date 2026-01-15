import pandas as pd
import plotly.express as px
import numpy as np
from scipy import stats

def plot_time_series(df, category=None, major_category=None, year=None, start_year=None, end_year=None, months=None, title=None):
    """
    Plots a time series line chart for the specified criteria.
    Supports single year or a range of years.
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
        # If both provided, try category first, then fallback to major_category if empty
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
    default_title = f"{label} Spending Over Time (¥)"
    fig = px.line(data, x='Date', y='Expense', title=title or default_title)
    
    msg = f"Time-series plot for {label} expenses"
    if year: msg += f" in {year}"
    elif start_year and end_year: msg += f" from {start_year} to {end_year}"
    if months: msg += f" for the past {months} months"
    msg += " has been generated."
    
    return fig, msg

def plot_pie_chart(df, year=None, major_category=None, title=None):
    """
    Plots a pie chart showing breakdown of expenses.
    """
    data = df.copy()
    if year:
        data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    
    if major_category:
        # Show sub-categories within a major category
        data = data[data['major category'].str.lower() == major_category.lower()]
        names = 'category'
        default_title = f"{major_category} Breakdown (¥)"
        msg = f"Pie chart showing breakdown of {major_category} expenses"
    elif category:
        # If user provides category (specific) to a pie chart, we probably want to show 
        # it relative to its siblings in the same major category, but for simplicity 
        # we'll just filter by its parent major category if we can find it.
        # For now, let's just filter by category and show labels if it's the intended behavior.
        data = data[data['category'].str.lower() == category.lower()]
        names = 'category'
        default_title = f"{category} Breakdown (¥)"
        msg = f"Pie chart showing {category} expenses"
    else:
        # Show major categories
        names = 'major category'
        default_title = "Major Category Breakdown (¥)"
        msg = "Pie chart showing major category breakdown"
    
    if data.empty:
        label = f"{major_category if major_category else 'Total'}"
        return None, f"No data found to create a pie chart for {label}."

    if year: msg += f" for {year}"
    msg += " has been generated."
    
    fig = px.pie(data, names=names, values='Expense', title=title or default_title)
    return fig, msg

def plot_comparison(df, category=None, major_category=None, y1=None, y2=None, title=None):
    """
    Contrasts spending between two years.
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
    default_title = f"{label} Comparison: {y1} vs {y2} (¥)"
    fig = px.scatter(filtered.sort_values('Date'), x='Date', y='Expense', color='Year', title=title or default_title)
    
    msg = f"Comparison plot for {label} expenses between {y1} and {y2} has been generated."
    return fig, msg

def plot_stacked_bar(df, year=None, y1=None, y2=None, mode='monthly', title=None):
    """
    Plots stacked bar charts for monthly or yearly breakdowns.
    """
    data = df.copy()
    data['Date'] = pd.to_datetime(data['Date'])
    
    if mode == 'monthly' and year:
        data = data[data['Date'].dt.year == int(year)]
        data['Time'] = data['Date'].dt.strftime('%Y-%m')
        groupby_cols = ['Time', 'major category']
        x_axis = 'Time'
        msg = f"Monthly stacked bar chart for {year} has been generated."
    elif mode == 'yearly' and y1 and y2:
        data = data[data['Date'].dt.year.isin([int(y1), int(y2)])]
        data['Time'] = data['Date'].dt.year.astype(str)
        groupby_cols = ['Time', 'major category']
        x_axis = 'Time'
        msg = f"Yearly comparison stacked bar chart for {y1} vs {y2} has been generated."
    else:
        return None, "Invalid parameters for stacked bar"

    if data.empty:
        return None, f"No data found for the requested stacked bar chart breakdown."

    grouped = data.groupby(groupby_cols)['Expense'].sum().reset_index()
    default_title = f"{year if year else f'{y1} vs {y2}'} Breakdown (¥)"
    fig = px.bar(grouped, x=x_axis, y='Expense', color='major category', title=title or default_title, barmode='stack')
    return fig, msg

def calculate_sum(df, category=None, major_category=None, year=None, remarks=None):
    """
    Calculates total sum based on filters.
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
    label = f"{remarks if remarks else (category or major_category or 'Total')}"
    return None, f"Total {label} in {year or 'all time'}: {round(total, 2)}"

def calculate_average(df, category=None, major_category=None, year=None, remarks=None):
    """
    Calculates mean based on filters.
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
    label = f"{remarks if remarks else (category or major_category or 'Total')}"
    return None, f"Average {label} in {year or 'all time'}: {round(avg, 2) if pd.notnull(avg) else 0.0}"

def run_significance_test(df, category=None, major_category=None, y1=None, y2=None):
    """
    Performs a T-test between two years for a specific category.
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
    
    t, p = stats.ttest_ind(s1, s2, equal_var=False, nan_policy='omit')
    sig = "significant" if p < 0.05 else "not significant"
    return None, f"Avg {y1}: {round(s1.mean(), 2)}, Avg {y2}: {round(s2.mean(), 2)} | Difference is {sig} (p={round(p, 4)})"

def run_correlation(df, col1, col2):
    """
    Checks correlation between two columns or category spending (TBD).
    For now, handles simple column correlation if they exist.
    """
    # This is a placeholder for more complex correlation logic
    corr = df[[col1, col2]].corr().iloc[0, 1]
    return None, f"Correlation between {col1} and {col2}: {round(corr, 4)}"
