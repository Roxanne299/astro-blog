# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based blog theme called "Typography" - a minimal, responsive, and SEO-friendly blog theme. It's built with Astro, TypeScript, and UnoCSS, featuring typography optimized for reading experience and multi-language support.

## Development Commands

### Core Development
- `pnpm run dev --host` - Start development server with type checking (opens on 0.0.0.0 for network access)
- `pnpm dev` - Start development server (localhost only)
- `pnpm build` - Build for production with type checking
- `pnpm preview` - Preview production build

### Code Quality
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm typecheck` - Run TypeScript type checking

### Theme-Specific Scripts
- `pnpm theme:create` - Create a new blog post
- `pnpm theme:release` - Release theme script
- `pnpm theme:update` - Update theme script

## Architecture

### Content System
- **Posts**: Located in `src/content/posts/` as Markdown/MDX files
- **Content Schema**: Defined in `src/content.config.ts` with frontmatter validation
- **Post Frontmatter**: Requires `title`, `pubDate`, `categories`, optional `description`, `draft`, `banner`, etc.

### Configuration System
- **Theme Config**: Split between `src/.config/default.ts` (defaults) and `src/.config/user.ts` (overrides)
- **Config Merging**: Deep merge handled in `src/.config/index.ts`
- **Site Config**: Main site settings, navigation, social links, comments, internationalization

### Key Directories
- `src/components/` - Reusable Astro components (Analytics, Comments, Navigation, etc.)
- `src/layouts/` - Page layouts (Default, Post, PostList)
- `src/pages/` - Route pages with dynamic routing for posts and categories
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `scripts/` - Theme management scripts

### Styling & UI
- **UnoCSS**: Primary CSS framework with preset configurations
- **Theme System**: Supports light/dark/system themes
- **Typography**: Chinese typography optimized with responsive design
- **Math Support**: KaTeX integration for mathematical expressions

### Features
- **i18n**: Multi-language support (en-us, zh-cn, zh-tw, ja-jp, it-it)
- **Comments**: Supports Disqus, Giscus, and Twikoo
- **Analytics**: Google Analytics and Umami integration
- **SEO**: Built-in sitemap, RSS, robots.txt, and Open Graph support
- **Performance**: Page transitions with Swup integration

### Package Manager
- Uses `pnpm` as specified in `package.json` with version `10.13.1`
- Git hooks configured for linting on pre-commit

## Git Workflow & Project Management

### Branch Strategy
- **Development Branch**: `dev` - All development work should be done here
- **Main Branch**: `main` - Production branch, merges require explicit user approval
- **IMPORTANT**: Never merge to `main` without user consent

### Git Operations Policy
- Claude Code is responsible for all git operations in this project
- Always work on the `dev` branch for development
- Commit changes regularly with descriptive messages
- Push changes to remote `dev` branch
- **CRITICAL**: Merging `dev` to `main` requires explicit user approval - ask permission first
- **Claude Files**: All claude-related files and folders should be committed and pushed to branches (not ignored)

### Workflow
1. Make changes on `dev` branch
2. Commit and push to `dev`
3. For production deployment, ask user before merging to `main`

## Content Creation

New posts should be created in `src/content/posts/` with required frontmatter or use `pnpm theme:create` command for guided creation.