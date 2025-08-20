#!/bin/bash

echo "🚀 Deploying Call Follow-Up Tracker to GitHub and Render..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Initial deployment: Call Follow-Up Tracker with PostgreSQL backend"

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Please add your GitHub repository as remote origin:"
    echo "   git remote add origin <your-github-repo-url>"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Successfully deployed to GitHub!"
echo ""
echo "🌐 Next steps to deploy on Render:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Click 'New +' and select 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Render will automatically detect the render.yaml configuration"
echo "5. Click 'Create Web Service'"
echo ""
echo "🎉 Your app will be deployed with a PostgreSQL database automatically!"
echo ""
echo "📚 For more details, see the README.md file"
