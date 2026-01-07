
import * as XLSX from 'xlsx';
import { CATEGORY_MAPPING } from './categoryMapping';
import { format, parseISO, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parse } from 'date-fns';

export const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Parse to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd'
                });

                // Clean and Transform
                const processedData = jsonData
                    .map(row => {
                        // Handle various date formats potentially coming from Excel
                        let dateObj = new Date(row.Date || row.date);
                        if (isNaN(dateObj.getTime())) {
                            // simple fallback if string
                            dateObj = new Date(Date.parse(row.Date || row.date));
                        }

                        // Robust header selection based on uploaded Excel
                        const rawCategory = row.category || 'Unknown';
                        const rawExpense = row.Expense || row.expense || 0;
                        const remarks = row.remarks || '';
                        const onetime = row.onetime || 0;
                        const forOthers = row['for others'] || 0;

                        // Map category
                        const newCategory = CATEGORY_MAPPING[rawCategory] || rawCategory;

                        return {
                            ...row,
                            Date: dateObj,
                            Expense: parseFloat(rawExpense) || 0,
                            remarks: remarks,
                            category: rawCategory,
                            Category: rawCategory, // Keep both for safety
                            NewCategory: newCategory,
                            Onetime: onetime == 1,
                            'for others': forOthers == 1 ? 1 : 0
                        };
                    })
                    .filter(row => row.Expense > 0); // Filter out 0 expenses (days with no spending)

                resolve(processedData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

export const filterData = (data, filters) => {
    const { type, year, month, date, startDate, endDate, includeRent } = filters;

    let filtered = [...data];

    // 1. Rent Logic
    if (!includeRent) {
        // Filter out specific 'housing' category (rent), but keep utilities
        filtered = filtered.filter(row => row.Category && row.Category.toLowerCase() !== 'housing');
    }

    // 2. Date Filtering
    filtered = filtered.filter(row => {
        const rowDate = row.Date;
        if (type === 'Year') {
            return rowDate.getFullYear() === year;
        } else if (type === 'Month') {
            return rowDate.getFullYear() === year && rowDate.getMonth() === month; // month is 0-indexed
        } else if (type === 'Day') {
            // Compare YYYY-MM-DD strings
            return format(rowDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        } else if (type === 'Custom Range') {
            return isWithinInterval(rowDate, { start: startDate, end: endDate });
        }
        return true;
    });

    return filtered;
};

export const calculateMetrics = (data) => {
    const total = data.reduce((sum, row) => sum + row.Expense, 0);
    // Simple Approximation for period logic
    if (data.length === 0) return { total: 0, avgMonthly: 0, avgDaily: 0, days: 0 };

    // Sort by date to find range
    const sortedDates = data.map(d => d.Date.getTime()).sort((a, b) => a - b);
    const minDate = new Date(sortedDates[0]);
    const maxDate = new Date(sortedDates[sortedDates.length - 1]);

    // Days diff
    const diffTime = Math.abs(maxDate - minDate);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const months = days / 30;

    return {
        total,
        avgMonthly: total / (months || 1),
        avgDaily: total / (days || 1),
        days
    };
};
