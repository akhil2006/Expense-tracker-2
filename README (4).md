# Spend Tracker

A simple web application to track your spending. No installation, no build step.

## Pages
- **Home** (`index.html`): today's spend, this month's total, top field, recent spends
- **Daily Spends** (`daily.html`): every spend grouped by date, with a total for each day. Pick any month.
- **Monthly Total** (`monthly.html`): total expense for each month, % change vs the previous month, and a breakdown by field
- **Expense Fields** (`fields.html`): add, rename, recolour or delete fields such as Food, Transport and Bills

The **+ Add Expense** button (top right on every page) opens the entry form: amount, field, date and note.
Data is saved in your browser (localStorage), so it stays after you close the page.

## Files
`index.html`, `daily.html`, `monthly.html`, `fields.html`, `style.css`, `app.js`

## Upload to GitHub
1. Create a new repository.
2. Add file > Upload files, then add all the files above (not the folder).
3. Commit changes.

## Deploy on Vercel
1. Sign in at vercel.com with GitHub.
2. Add New > Project, import the repository.
3. Framework Preset: **Other**. Leave build command and output directory empty.
4. Deploy.
