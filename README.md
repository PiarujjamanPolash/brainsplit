# AgencySplit

AgencySplit is a "Splitwise-style" application designed specifically for agency partners to track income, expenses, and profit shares.

## How to Publish to GitHub

To publish this project to your own GitHub repository, follow these steps in your local terminal:

1. **Create a new repository** on GitHub (do not initialize with a README).
2. **Initialize git** in your project folder:
   ```bash
   git init
   ```
3. **Add all files**:
   ```bash
   git add .
   ```
4. **Commit the changes**:
   ```bash
   git commit -m "Initial commit: AgencySplit prototype"
   ```
5. **Link to your GitHub repo**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
6. **Push to GitHub**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Components**: Radix UI / Shadcn UI
- **AI**: Genkit with Google Gemini
- **Icons**: Lucide React
