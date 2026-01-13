
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
export async function runPython(code, data, options = {}) {
    const { prompt, metadata, currency, model, chatModel } = options;

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
                chat_model: chatModel
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

# Load data
df = pd.read_csv(io.StringIO(csv_content))
if 'Date' in df.columns:
    df['Date'] = pd.to_datetime(df['Date'])

# Standardize columns for Finetuned Model (major category, category)
if 'NewCategory' in df.columns:
    df['major category'] = df['NewCategory']
if 'Category' in df.columns:
    df['category'] = df['Category'].astype(str).str.lower().str.strip()
else:
    df['category'] = ''
    df['major category'] = ''

exec_scope = {"df": df, "pd": pd, "np": np}
result = None
fig = None

try:
    exec_scope = {"df": df, "pd": pd, "np": np, "px": __import__('plotly.express')}
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
