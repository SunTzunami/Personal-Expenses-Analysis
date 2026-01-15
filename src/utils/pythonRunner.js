
let pyodide = null;

/**
 * Initialize Pyodide and load pandas/numpy
 */
export async function initPyodide() {
    if (pyodide) return pyodide;

    // @ts-ignore
    pyodide = await loadPyodide();

    // Load packages
    await pyodide.loadPackage(['pandas', 'numpy', 'micropip']);
    const micropip = pyodide.pyimport("micropip");
    await micropip.install('plotly');

    return pyodide;
}

/**
 * Run Python code against a dataset. 
 * First attempts to use the FastAPI backend, falls back to Pyodide if unavailable.
 */
export async function runPython(code, data, optionsArg = {}) {
    const { prompt, metadata, currency, model, chatModel, options } = optionsArg;

    // 1. Try FastAPI Backend
    try {
        const response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data,
                prompt,
                metadata,
                currency,
                model,
                chat_model: chatModel,
                options
            })
        });

        if (response.ok) {
            const result = await response.json();
            return {
                result: result.result,
                fig: result.fig,
                code: result.code,
                backend: true
            };
        }
    } catch (e) {
        console.warn("FastAPI backend not available, falling back to Pyodide:", e);
    }

    // 2. Fallback to Pyodide (Browser)
    const instance = await initPyodide();
    const csvContent = arrayToCsv(data);
    instance.globals.set("csv_content", csvContent);

    const wrapperCode = `
import pandas as pd
import numpy as np
import io
import json

// Load data
df = pd.read_csv(io.StringIO(csv_content))
if 'Date' in df.columns:
    df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)

# Standardize columns for Finetuned Model (major category, category)
if 'NewCategory' in df.columns:
    df['major category'] = df['NewCategory']
if 'Category' in df.columns:
    df['category'] = df['Category'].astype(str).str.lower().str.strip()
else:
    if 'category' not in df.columns: df['category'] = ''
    if 'major category' not in df.columns: df['major category'] = ''

# Analysis Tools Library
def plot_time_series(df, category=None, major_category=None, year=None, months=None, title=None):
    data = df.copy()
    if year: data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    if category and major_category:
        cat_f = data[data['category'].str.lower() == category.lower()]
        data = cat_f if not cat_f.empty else data[data['major category'].str.lower() == major_category.lower()]
    elif category: data = data[data['category'].str.lower() == category.lower()]
    elif major_category: data = data[data['major category'].str.lower() == major_category.lower()]
    if months:
        cutoff = pd.Timestamp.now() - pd.DateOffset(months=int(months))
        data = data[data['Date'] >= cutoff]
    if data.empty: return None, "No data found for this period."
    data = data.sort_values('Date')
    fig = px.line(data, x='Date', y='Expense', title=title or f"Spending Over Time")
    return fig, "Plot generated"

def plot_pie_chart(df, year=None, major_category=None, title=None):
    data = df.copy()
    if year: data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    if major_category:
        data = data[data['major category'].str.lower() == major_category.lower()]
        names = 'category'
    else:
        names = 'major category'
    if data.empty: return None, "No data for pie chart."
    fig = px.pie(data, names=names, values='Expense', title=title or "Breakdown")
    return fig, "Plot generated"

def plot_comparison(df, category=None, major_category=None, y1=None, y2=None, title=None):
    data = df.copy()
    data['Year'] = pd.to_datetime(data['Date']).dt.year.astype(str)
    filtered = data[data['Year'].isin([str(y1), str(y2)])]
    if category: filtered = filtered[filtered['category'].str.lower() == category.lower()]
    if major_category: filtered = filtered[filtered['major category'].str.lower() == major_category.lower()]
    if filtered.empty: return None, "No data to compare."
    fig = px.scatter(filtered.sort_values('Date'), x='Date', y='Expense', color='Year', title=title or "Comparison")
    return fig, "Plot generated"

def calculate_sum(df, category=None, major_category=None, year=None, remarks=None):
    data = df.copy()
    if year: data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    if category: data = data[data['category'].str.lower() == category.lower()]
    if major_category: data = data[data['major category'].str.lower() == major_category.lower()]
    if remarks: data = data[data['remarks'].str.contains(remarks, case=False, na=False)]
    if data.empty: return None, "No transactions found."
    return None, f"Total: {round(data['Expense'].sum(), 2)}"

def calculate_average(df, category=None, major_category=None, year=None, remarks=None):
    data = df.copy()
    if year: data = data[pd.to_datetime(data['Date']).dt.year == int(year)]
    if category: data = data[data['category'].str.lower() == category.lower()]
    if major_category: data = data[data['major category'].str.lower() == major_category.lower()]
    if remarks: data = data[data['remarks'].str.contains(remarks, case=False, na=False)]
    if data.empty: return None, "No data for average."
    return None, f"Average: {round(data['Expense'].mean(), 2)}"

def run_significance_test(df, category=None, major_category=None, y1=None, y2=None):
    from scipy import stats
    data = df.copy()
    data['Year'] = pd.to_datetime(data['Date']).dt.year
    def get_s(yr):
        d = data[data['Year'] == int(yr)]
        if category: d = d[d['category'].str.lower() == category.lower()]
        elif major_category: d = d[d['major category'].str.lower() == major_category.lower()]
        return d['Expense']
    s1, s2 = get_s(y1), get_s(y2)
    t, p = stats.ttest_ind(s1, s2, equal_var=False, nan_policy='omit')
    return None, f"Avg {y1}: {round(s1.mean(), 2)}, Avg {y2}: {round(s2.mean(), 2)} | P-value: {round(p, 4)}"

exec_scope = {
    "df": df, "pd": pd, "np": np, "px": __import__('plotly.express'),
    "plot_time_series": plot_time_series, "plot_pie_chart": plot_pie_chart,
    "plot_comparison": plot_comparison, "plot_stacked_bar": plot_stacked_bar,
    "calculate_sum": calculate_sum, "calculate_average": calculate_average,
    "run_significance_test": run_significance_test
}
result = None
fig = None

try:
    exec("""${code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}""", {}, exec_scope)
    
    if 'result' in exec_scope: result = exec_scope['result']
    if 'fig' in exec_scope:
        fig_obj = exec_scope['fig']
        fig = fig_obj.to_json() if hasattr(fig_obj, 'to_json') else str(fig_obj)
except Exception as e:
    result = f"Error: {str(e)}"

final_output = json.dumps({"result": str(result) if result is not None else None, "fig": fig})
final_output
`;

    const outputJson = await instance.runPythonAsync(wrapperCode);
    return { ...JSON.parse(outputJson), backend: false };
}

/**
 * Simple JS array to CSV converter
 */
function arrayToCsv(data) {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(obj =>
        headers.map(header => {
            let val = obj[header];
            if (val instanceof Date) val = val.toISOString();
            if (typeof val === 'string') {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}
