#!/bin/bash

# Script to create a release using git flow
# Usage: ./release.sh <version>
# Example: ./release.sh 0.4.0

set -e  # Exit if any command fails

# Function to show help
show_help() {
    echo "Usage: $0 <version>"
    echo ""
    echo "This script automates the release process using git flow:"
    echo "1. Starts a new release branch"
    echo "2. Updates version in package.json"
    echo "3. Commits the changes"
    echo "4. Finishes the release"
    echo "5. Creates the corresponding tag"
    echo ""
    echo "Examples:"
    echo "  $0 0.4.0    # Release version 0.4.0"
    echo "  $0 1.0.0    # Release version 1.0.0"
    echo ""
    echo "Requirements:"
    echo "- git flow must be initialized"
    echo "- Must be on develop branch"
    echo "- Clean working directory"
}

# Function to validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "❌ Error: Version format must be X.Y.Z (e.g: 1.0.0)"
        exit 1
    fi
}

# Function to verify that git flow is initialized
check_git_flow() {
    if ! git config --get gitflow.branch.master &> /dev/null; then
        echo "❌ Error: git flow is not initialized in this repository"
        echo "Run: git flow init"
        exit 1
    fi
}

# Function to verify that we are on develop
check_develop_branch() {
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "develop" ]; then
        echo "❌ Error: You must be on 'develop' branch to create a release"
        echo "Current branch: $current_branch"
        exit 1
    fi
}

# Function to verify that working directory is clean
check_clean_working_dir() {
    if ! git diff-index --quiet HEAD --; then
        echo "❌ Error: There are uncommitted changes in working directory"
        echo "Commit or stash your changes before continuing"
        git status --short
        exit 1
    fi
}

# Function to verify that version doesn't exist already
check_version_exists() {
    local version=$1
    if git tag | grep -q "^v$version$"; then
        echo "❌ Error: Version v$version already exists"
        echo "Existing versions:"
        git tag | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V
        exit 1
    fi
}

# Function to update version in package.json
update_package_version() {
    local version=$1
    local package_file="package.json"
    
    echo "📝 Updating version in $package_file..."
    
    # Use sed to update version in package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$package_file"
    else
        # Linux
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$package_file"
    fi
    
    # Verify that the change was made correctly
    local new_version=$(grep -o '"version": "[^"]*"' "$package_file" | cut -d'"' -f4)
    if [ "$new_version" != "$version" ]; then
        echo "❌ Error: Could not update version in package.json"
        exit 1
    fi
    
    echo "✅ Version updated to $version in package.json"
}

# Main release function
create_release() {
    local version=$1
    
    echo "🚀 Starting release v$version..."
    
    # Update develop with latest changes
    echo "📥 Updating develop branch..."
    git pull origin develop
    
    # Start release branch
    echo "🌿 Creating release branch..."
    git flow release start "$version"
    
    # Update version in package.json
    update_package_version "$version"
    
    # Commit version changes
    echo "💾 Committing version changes..."
    git add package.json
    git commit -m "chore: bump version to $version"
    
    # Finish release
    echo "🔄 Finishing release..."
    echo "Editor will open for tag message..."
    git flow release finish "$version" -m "Release v$version"
    
    # Push branches and tags
    echo "📤 Pushing changes to remote repository..."
    git checkout main
    git push origin main
    git checkout develop
    git push origin develop
    git push origin --tags
    
    echo ""
    echo "🎉 Release v$version completed successfully!"
    echo ""
    echo "Summary of actions performed:"
    echo "✅ Release branch created and finished"
    echo "✅ Version updated in package.json"
    echo "✅ Tag v$version created"
    echo "✅ Changes pushed to main, develop and tags"
    echo ""
    echo "Tag created: v$version"
    echo "To view the tag: git show v$version"
}

# Main function
main() {
    # Verify arguments
    if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    local version=$1
    
    echo "🔍 Running pre-checks..."
    
    # Verifications
    validate_version "$version"
    check_git_flow
    check_develop_branch
    check_clean_working_dir
    check_version_exists "$version"
    
    echo "✅ All checks passed"
    echo ""
    
    # Show release information
    echo "📋 Release information:"
    echo "   Version: $version"
    echo "   Current branch: $(git branch --show-current)"
    echo "   Last commit: $(git log -1 --oneline)"
    echo ""
    
    # Confirm before proceeding
    read -p "Proceed with release v$version? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Release cancelled by user"
        exit 1
    fi
    
    # Create release
    create_release "$version"
}

# Execute main function with all arguments
main "$@"
