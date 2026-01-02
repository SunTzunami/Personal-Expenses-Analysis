
import _ from 'lodash';
import { format } from 'date-fns';

/**
 * Collection of tools that the LLM can "call" upon to analyze data.
 */

// Helper to filter data by date range if needed (often passed pre-filtered)
// but specific tools might need full context. for now we assume 'data' passed is what we want to analyze.

/**
 * Get aggregated statistics for expenses.
 * @param {Array} data - The expense data array.
 * @param {Object} args - { groupBy: 'month' | 'category' | 'year' | 'day' }
 */
export function getAggregatedStats(data, { groupBy = 'category' } = {}) {
    if (!data || data.length === 0) return "No data available.";

    let grouped;
    if (groupBy === 'month') {
        grouped = _.groupBy(data, d => format(new Date(d.Date), 'yyyy-MM'));
    } else if (groupBy === 'year') {
        grouped = _.groupBy(data, d => new Date(d.Date).getFullYear());
    } else if (groupBy === 'day') {
        grouped = _.groupBy(data, d => format(new Date(d.Date), 'yyyy-MM-dd'));
    } else {
        // use NewCategory for cleaner grouping
        grouped = _.groupBy(data, 'NewCategory');
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
 * @param {Object} args - { type: 'highest' | 'lowest', count: 5 }
 */
export function findExtremes(data, { type = 'highest', count = 5 } = {}) {
    if (!data || data.length === 0) return "No data available.";

    const sorted = _.orderBy(data, ['Expense'], [type === 'highest' ? 'desc' : 'asc']);
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
 * @param {Object} args - { query: 'uber' } 
 */
export function searchExpenses(data, { query } = {}) {
    if (!data || !query) return "Please provide a search query.";

    const lowerQuery = query.toLowerCase();
    const found = data.filter(d =>
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
 * Execute a named tool.
 */
export function executeTool(toolName, args, data) {
    if (!data) return "No data available to analyze.";

    switch (toolName) {
        case 'getAggregatedStats':
            return getAggregatedStats(data, args);
        case 'findExtremes':
            return findExtremes(data, args);
        case 'searchExpenses':
            return searchExpenses(data, args);
        default:
            return `Tool '${toolName}' not found.`;
    }
}

/**
 * Definitions of tools for the system prompt.
 */
export const TOOL_DEFINITIONS = `
DATASET SCHEMA:
Each expense record has:
- Date: The date of transaction
- Description: What was bought (e.g. "Amazon", "Uber", "Grocery Shop")
- Expense: The amount spent
- NewCategory: The broad category (e.g. "Food", "Transportation", "Entertainment")
- Onetime: Boolean, true if it's a non-recurring large purchase

AVAILABLE TOOLS:

1. getAggregatedStats(groupBy: 'month' | 'category' | 'year' | 'day')
   - Returns totals and counts grouped by the specified period or category.
   - Use for: "What is my total spend on Food?", "Which month was most expensive?", "Category breakdown".

2. findExtremes(type: 'highest' | 'lowest', count: number)
   - Returns the top N highest or lowest individual transactions.
   - Use for: "What was my biggest purchase?", "List my 5 smallest expenses".

3. searchExpenses(query: string)
   - Searches for transactions where Description or Category matches the query.
   - Use for: "How much did I spend at Starbucks?", "Find all Uber rides".

TOOL CALL FORMAT:
If you need to use a tool, respond ONLY with a JSON object:
{ "tool": "toolName", "args": { "arg1": "value" } }

If you can answer without tools or after receiving tool results, respond with natural language.
`;
