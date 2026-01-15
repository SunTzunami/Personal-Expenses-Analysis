
/**
 * CATEGORY MAPPING CONFIGURATION
 * 
 * This file controls how your raw Excel categories are mapped to broader groups
 * and what colors are used for each group in the charts.
 */

// 1. Define your high-level category groups and their display colors
export const CATEGORY_COLORS = {
    'Housing and Utilities': '#e2c596',
    'Food': '#99b98b',
    'Transportation': '#cda180',
    'Fitness': '#d6a7c3',
    'Souvenirs/Gifts/Treats': '#b4aea8',
    'Household and Clothing': '#e7d8c4',
    'Entertainment': '#909eb3',
    'Miscellaneous': '#b3b3cc',
    'Education': '#6fa8dc',
    // Add new categories and colors here
};

// 2. Map specific keywords or raw categories from your Excel file to the groups above.
// Format: 'Raw Excel Category': 'Dashboard Category'
export const CATEGORY_MAPPING = {
    // Food
    'grocery': 'Food', 'Grocery': 'Food',
    'snacks': 'Food', 'Snacks': 'Food',
    'cafe': 'Food', 'Coffee': 'Food',
    'Cafe': 'Food', 'café': 'Food', 'Café': 'Food',
    'bento': 'Food', 'Bento': 'Food',
    'beverage': 'Food', 'Beverage': 'Food',
    'combini meal': 'Food', 'Combini meal': 'Food',
    'dining': 'Food', 'Dining': 'Food',
    'eating out': 'Food', 'Eating out': 'Food',
    'eating with friend': 'Food', 'Eating with friend': 'Food',

    // Housing
    'housing': 'Housing and Utilities', 'Housing': 'Housing and Utilities',
    'internet bill': 'Housing and Utilities', 'Internet bill': 'Housing and Utilities',
    'electricity bill': 'Housing and Utilities', 'Electricity bill': 'Housing and Utilities',
    'gas bill': 'Housing and Utilities', 'Gas bill': 'Housing and Utilities',
    'water & sewage bill': 'Housing and Utilities', 'Water & sewage bill': 'Housing and Utilities',
    'phone bill': 'Housing and Utilities', 'Phone bill': 'Housing and Utilities',
    'water': 'Housing and Utilities', 'Water': 'Housing and Utilities',

    // Household & Clothing
    'clothing': 'Household and Clothing', 'Clothing': 'Household and Clothing',
    'household': 'Household and Clothing', 'Household': 'Household and Clothing',
    'furniture': 'Electronics and Furniture', 'Furniture': 'Electronics and Furniture',
    'electronics': 'Electronics and Furniture', 'Electronics': 'Electronics and Furniture',

    // Fitness
    'supplements': 'Fitness', 'Supplements': 'Fitness',
    'shoes': 'Fitness', 'Shoes': 'Fitness',
    'sports event': 'Fitness', 'Sports event': 'Fitness',
    'sports watch': 'Fitness', 'Sports watch': 'Fitness',
    'sports clothing': 'Fitness', 'Sports clothing': 'Fitness',
    'sports rental': 'Fitness', 'Sports rental': 'Fitness',
    'gym': 'Fitness', 'Gym': 'Fitness',
    'sports equipment': 'Fitness', 'Sports equipment': 'Fitness',
    'basketball game': 'Fitness', 'Basketball game': 'Fitness',
    'footbal game': 'Fitness', 'Footbal game': 'Fitness',
    'futsal game': 'Fitness', 'Futsal game': 'Fitness',

    // Transportation
    'commute': 'Transportation', 'Commute': 'Transportation',
    'ride share': 'Transportation', 'Ride share': 'Transportation',
    'tokyo metro': 'Transportation', 'Tokyo Metro': 'Transportation',
    'flight tickets': 'Transportation', 'Flight tickets': 'Transportation',
    'cable car': 'Transportation', 'Cable car': 'Transportation',
    'bus': 'Transportation', 'Bus': 'Transportation',
    'shinkansen': 'Transportation', 'Shinkansen': 'Transportation',
    'car rental': 'Transportation', 'Car rental': 'Transportation',
    'taxi': 'Transportation', 'Taxi': 'Transportation',
    'stay': 'Transportation', 'Stay': 'Transportation',

    // Gifts & Traits
    'souvenirs': 'Souvenirs/Gifts/Treats', 'Souvenirs': 'Souvenirs/Gifts/Treats',
    'treat': 'Souvenirs/Gifts/Treats', 'Treat': 'Souvenirs/Gifts/Treats',
    'gift': 'Souvenirs/Gifts/Treats', 'Gift': 'Souvenirs/Gifts/Treats',

    // Misc
    'medicines': 'Miscellaneous', 'Medicines': 'Miscellaneous',
    'personal care': 'Miscellaneous', 'Personal care': 'Miscellaneous',
    'misc': 'Miscellaneous', 'Misc': 'Miscellaneous',
    'books': 'Miscellaneous', 'Books': 'Miscellaneous',
    'help': 'Miscellaneous', 'Help': 'Miscellaneous',

    // Entertainment
    'entertainment': 'Entertainment', 'Entertainment': 'Entertainment',
    'nomikai': 'Entertainment', 'Nomikai': 'Entertainment',
    'Activities': 'Entertainment', 'activities': 'Entertainment',
    'Arcades & Karaoke': 'Entertainment', 'arcades & karaoke': 'Entertainment',
    'Events & Venues': 'Entertainment', 'events & venues': 'Entertainment',
    'charity': 'Miscellaneous', 'Charity': 'Miscellaneous',
    'donation': 'Miscellaneous', 'Donation': 'Miscellaneous',
    'entrance fees': 'Miscellaneous', 'Entrance fees': 'Miscellaneous',
    'park entrance fees': 'Miscellaneous', 'Park entrance fees': 'Miscellaneous',
    'healthcare': 'Miscellaneous', 'Healthcare': 'Miscellaneous',

    // Education
    'education': 'Education', 'Education': 'Education',
};
