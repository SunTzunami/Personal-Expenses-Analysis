
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
 */
export function getPromptMetadata(data) {
    if (!data || data.length === 0) return { columns: [], uniqueCategories: [], uniqueNewCategories: [] };

    const columns = Object.keys(data[0]);
    const uniqueCategories = [...new Set(data.map(d => d.Category))].filter(Boolean);
    const uniqueNewCategories = [...new Set(data.map(d => d.NewCategory))].filter(Boolean);

    return {
        columns,
        uniqueCategories,
        uniqueNewCategories
    };
}

/**
 * Enhanced System Prompt Definitions for Python Analysis.
 */
export const PYTHON_ANALYSIS_PROMPT = `
You are an Expert Python Data Scientist specialized in Financial Analysis. 
You are analyzing a DataFrame \`df\` containing expense records.

DataFrame Information:
{{metadata}}

USER REQUEST: "{{prompt}}"

GUIDELINES:
1. **ENVIRONMENT & DATA (CRITICAL)**: 
   - **DO NOT RECREATE THE DATAFRAME \`df\`**.
   - **DO NOT** use \`df = pd.DataFrame(...)\` or hardcode any data.
   - **DO NOT** import \`pandas\`, \`numpy\`, or \`io\`. They are ALREADY pre-imported and available.
   - The global variable \`df\` contains the user's actual expense data. USE IT DIRECTLY.
2. **Syntax**: 
   - Use \`df[(df['col'] == val) & (df['col2'] == val2)]\` (Parentheses are mandatory).
   - Use \`.str.contains('pattern', case=False, na=False)\` for text searching in columns.
2. **Context & Strategy**:
   - 'NewCategory' = Mapped/High-Level Groups.
   - 'Category' = Original/Raw Categories.
   - 'remarks' = Personal comments/details about the expense.
   - **CRITICAL SEARCH LOGIC**: If the user asks for something (e.g., 'Starbucks', 'Gym', 'Futsal') that is NOT present in the unique values of 'Category' or 'NewCategory', you MUST search for it within the 'remarks' column using \`.str.contains()\`.
4. **PRIORITIZE TEXT RESULTS**: 
   - For simple questions (e.g., "Most expensive month?", "Total spent on X?"), ALWAYS provide the numeric/text answer in \`result\`.
   - **SELECTIVE PLOTS**: Only create a \`fig\` if it adds significant value (e.g., trends, distributions, comparisons). Do not generate a plot for a single number.
   - If a plot is useful, provide BOTH the text \`result\` and the \`fig\`.
5. **Output**:
   - Store final text/number answers in \`result\`.
    - Store Plotly figure objects in \`fig\`.
    - **DIRECT ASSIGNMENT ONLY**.
    - Output ONLY executable Python code.
    - **NO EXPLANATIONS, NO PREAMBLE, NO CONVERSATIONAL TEXT.**
    - Your entire response will be passed to an interpreter. Any non-Python text outside of comments will cause an error.
    - Do not say "Here is the code" or "I can help with that". Just provide the code.

EXAMPLES:
- Question: "How much did I spend on Starbucks?"
  Code:
  # 'starbucks' might not be a category, so search remarks
  result = df[df['remarks'].str.contains('starbucks', case=False, na=False)]['Expense'].sum()

- Question: "Total for Snacks in 2025?"
  Code: result = df[(df['Date'].dt.year == 2025) & (df['NewCategory'] == 'snacks')]['Expense'].sum()

- Question: "Daily spend trend for gym"
  Code:
  import plotly.express as px
  gym_data = df[df['remarks'].str.contains('gym', case=False, na=False)]
  fig = px.line(gym_data, x='Date', y='Expense', title='Gym Spending Trend')
`;

