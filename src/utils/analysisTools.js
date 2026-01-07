
import _ from 'lodash';
import { format, isWithinInterval, startOfWeek, parseISO } from 'date-fns';

/**
 * Helper to filter data by date range.
 */
function filterByDateRange(data, startDate, endDate) {
    if (!startDate && !endDate) return data;

    const start = startDate ? (typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate)) : new Date(0);
    const end = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate)) : new Date();

    return data.filter(d => {
        const itemDate = new Date(d.Date);
        return isWithinInterval(itemDate, { start, end });
    });
}

/**
 * Get aggregated statistics for expenses.
 * @param {Array} data - The expense data array.
 * @param {Object} args - { groupBy: 'month' | 'category' | 'year' | 'day' | 'week', startDate?: string, endDate?: string }
 */
export function getAggregatedStats(data, { groupBy = 'category', startDate, endDate } = {}) {
    if (!data || data.length === 0) return "No data available.";

    let filtered = filterByDateRange(data, startDate, endDate);
    if (filtered.length === 0) return "No data found for the specified date range.";

    let grouped;
    if (groupBy === 'month') {
        grouped = _.groupBy(filtered, d => format(new Date(d.Date), 'yyyy-MM'));
    } else if (groupBy === 'year') {
        grouped = _.groupBy(filtered, d => new Date(d.Date).getFullYear());
    } else if (groupBy === 'day') {
        grouped = _.groupBy(filtered, d => format(new Date(d.Date), 'yyyy-MM-dd'));
    } else if (groupBy === 'week') {
        grouped = _.groupBy(filtered, d => format(startOfWeek(new Date(d.Date)), 'yyyy-MM-dd'));
    } else {
        // use NewCategory for cleaner grouping
        grouped = _.groupBy(filtered, 'NewCategory');
    }

    const result = Object.entries(grouped).map(([key, items]) => ({
        key,
        total: _.sumBy(items, 'Expense'),
        count: items.length
    }));

    // Sort by total descending
    return _.orderBy(result, ['total'], ['desc']);
}

/**
 * Find highest or lowest expense items.
 * @param {Array} data - The expense data array.
 * @param {Object} args - { type: 'highest' | 'lowest', count: 5, startDate?: string, endDate?: string }
 */
export function findExtremes(data, { type = 'highest', count = 5, startDate, endDate } = {}) {
    if (!data || data.length === 0) return "No data available.";

    let filtered = filterByDateRange(data, startDate, endDate);
    if (filtered.length === 0) return "No data found for the specified date range.";

    const sorted = _.orderBy(filtered, ['Expense'], [type === 'highest' ? 'desc' : 'asc']);
    return sorted.slice(0, count).map(item => ({
        date: format(new Date(item.Date), 'yyyy-MM-dd'),
        description: item.Description,
        category: item.NewCategory,
        expense: item.Expense
    }));
}

/**
 * Search for specific expenses.
 * @param {Array} data 
 * @param {Object} args - { query: 'uber', startDate?: string, endDate?: string } 
 */
export function searchExpenses(data, { query, startDate, endDate } = {}) {
    if (!data) return "No data available.";
    if (!query) return "Please provide a search query.";

    let filtered = filterByDateRange(data, startDate, endDate);
    if (filtered.length === 0) return "No data found for the specified date range.";

    const lowerQuery = query.toLowerCase();
    const found = filtered.filter(d =>
        (d.Description && d.Description.toLowerCase().includes(lowerQuery)) ||
        (d.NewCategory && d.NewCategory.toLowerCase().includes(lowerQuery)) ||
        (d.Category && d.Category.toLowerCase().includes(lowerQuery))
    );

    return found.slice(0, 10).map(item => ({
        date: format(new Date(item.Date), 'yyyy-MM-dd'),
        description: item.Description,
        expense: item.Expense,
        category: item.NewCategory
    }));
}


/**
 * Deprecated: Individual tools are replaced by Python execution.
 */
export function executeTool(toolName, args, data) {
    return "Tools are deprecated. Please use the Python execution environment.";
}

/**
 * Get metadata for the LLM prompt.
 * Includes column names, data types, unique categories, and category mapping.
 */
export function getPromptMetadata(data) {
    if (!data || data.length === 0) return {
        columns: [],
        columnTypes: {},
        uniqueCategories: [],
        uniqueNewCategories: [],
        categoryMapping: {}
    };

    const columns = Object.keys(data[0]);

    // Infer column data types from first non-null value
    const columnTypes = {};
    columns.forEach(col => {
        const sample = data.find(row => row[col] != null)?.[col];
        if (sample instanceof Date) {
            columnTypes[col] = 'datetime';
        } else if (typeof sample === 'number') {
            columnTypes[col] = 'float';
        } else if (typeof sample === 'boolean') {
            columnTypes[col] = 'boolean';
        } else {
            columnTypes[col] = 'string';
        }
    });

    // Get unique values from Category (original/raw) and NewCategory (mapped/broad)
    // Deduplicate case-insensitively for the prompt to reduce confusion
    const normalizeUnique = (arr) => {
        const seen = new Set();
        return arr.filter(v => {
            if (!v) return false;
            const lower = v.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        }).sort();
    };

    const uniqueCategories = normalizeUnique(data.map(d => d.Category));
    const uniqueNewCategories = normalizeUnique(data.map(d => d.NewCategory));

    // Build mapping: original category → mapped category (case-insensitive deduplication)
    const categoryMapping = {};
    const seenMapping = new Set();
    data.forEach(row => {
        if (row.Category && row.NewCategory) {
            const lowerOrig = row.Category.toLowerCase();
            if (!seenMapping.has(lowerOrig)) {
                categoryMapping[row.Category] = row.NewCategory;
                seenMapping.add(lowerOrig);
            }
        }
    });

    return {
        columns,
        columnTypes,
        uniqueCategories,
        uniqueNewCategories,
        categoryMapping
    };
}

/**
 * Enhanced System Prompt for Python Analysis - Optimized for small local LLMs (<4B params).
 * Placeholders: {{metadata}}, {{prompt}}
 */
export const PYTHON_ANALYSIS_PROMPT = `You are analyzing expense data in a pandas DataFrame called \`df\`.

{{metadata}}

USER QUESTION: "{{prompt}}"

RULES:
1. DO NOT create df. It already exists with all the data.
2. DO NOT import pandas, numpy, or io. They are pre-imported as pd, np.
3. Use parentheses for filtering: df[(df['col'] == val) & (df['col2'] == val2)]
4. For text search use: df['col'].str.contains('text', case=False, na=False)

SEARCH LOGIC (CRITICAL):
- If query term is in MAPPED CATEGORIES list → filter by NewCategory column
- If query term is in ORIGINAL CATEGORIES list → filter by Category column  
- If query term is NOT in any category list → search in 'remarks' column

OUTPUT:
- Store text/number answer in \`result\` variable
- Store Plotly figure in \`fig\` variable (only if visualization adds value)
- Output ONLY Python code. No explanations.

EXAMPLES:
# Q: "Total spent on Food?" (Food is in MAPPED CATEGORIES)
result = df[df['NewCategory'] == 'Food']['Expense'].sum()

# Q: "How much on snacks?" (snacks is in ORIGINAL CATEGORIES)
result = df[df['Category'] == 'snacks']['Expense'].sum()

# Q: "How much on starbucks?" (starbucks is NOT in any category, search remarks)
result = df[df['remarks'].str.contains('starbucks', case=False, na=False)]['Expense'].sum()

# Q: "Snacks in 2025"
result = df[(df['Date'].dt.year == 2025) & (df['Category'] == 'snacks')]['Expense'].sum()
`;

