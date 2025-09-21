# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal tech blog built with Astro Starlight framework. The main blog content is located in the `docs/` directory on the `starlight` branch. The blog features three main content categories: Technical, Algorithm, and Investment.

## Development Commands

**Working Directory**: Always work in `/docs/` subdirectory

```bash
# Install dependencies
cd docs && npm install

# Start development server
cd docs && npm run dev

# Build for production
cd docs && npm run build

# Preview build
cd docs && npm run preview

# Type checking
cd docs && npm run typecheck

# Link validation
cd docs && npm run linkcheck
```

## Blog Management Requirements

### Content Structure
- **Location**: All content files are in `docs/src/content/docs/`
- **Current categories**: 
  - `technical/` (Java, Database, Tools, AI, Architecture, DevOps, Concurrency)
  - `algorithm/` (Contest, Advanced)  
  - `investment/` (Basics)

### Critical File Management Rules

1. **Index File Requirement**: Every directory MUST have an `index.md` file or it will result in 404 errors
2. **Sidebar Auto-generation**: The sidebar uses `autogenerate` configuration in `docs/astro.config.mjs`
3. **File Maintenance**: When adding new files to existing categories, no sidebar updates needed due to autogenerate
4. **Homepage Updates**: Every new article must update the "最新文章" section in `docs/src/content/docs/index.mdx` by publication date
5. **New Category Creation**: When creating new categories, must update:
   - Create directory structure with required `index.md` files
   - Update `sidebar` configuration in `docs/astro.config.mjs`
   - **REQUIRED**: Add new Card component to homepage CardGrid section

### Adding New Articles (Existing Categories)

1. Create `.md` file in appropriate subdirectory (use English filename)
2. Add frontmatter with `title` and `description`
3. Update the relevant `index.md` file to include the new article in the list
4. File will automatically appear in sidebar due to autogenerate

### Adding New Categories

1. Create directory structure: `mkdir -p docs/src/content/docs/category/subcategory`
2. Create all required index files:
   - `docs/src/content/docs/category/index.md` 
   - `docs/src/content/docs/category/subcategory/index.md`
3. Update sidebar in `docs/astro.config.mjs`:
   ```javascript
   {
     label: 'Category Name',
     items: [
       {
         label: 'Subcategory Name',
         autogenerate: { directory: 'category/subcategory' },
       },
     ],
   }
   ```
4. **REQUIRED**: Update main page cards in `docs/src/content/docs/index.mdx`:
   - Add new Card component in the CardGrid section
   - Use appropriate emoji icon and description
   - Link to the new category path
   - Example:
   ```jsx
   <Card title="🎨 Category Name" icon="laptop" href="/category/">
     Category description
   </Card>
   ```

### File Naming and Structure

- **File names**: Use English with hyphens (`spring-boot-tutorial.md`)
- **Directory depth**: Keep to 2-3 levels maximum
- **URL pattern**: `/category/subcategory/article-name/`
- **Chinese titles**: Use `title` field in frontmatter

### Index Page Templates

**Category index (`category/index.md`)**:
```markdown
---
title: Category Name
description: Category description
---

# Category Name

## Subcategories
- **[Subcategory](/category/subcategory/)** - Description
```

**Subcategory index (`category/subcategory/index.md`)**:
```markdown
---
title: Subcategory Name  
description: Subcategory description
---

# Subcategory Name

## Articles
- **[Article Title](./article-name/)** - Article description
```

## Architecture Notes

- **Framework**: Astro + Starlight
- **Content**: Markdown files with frontmatter
- **Sidebar**: Auto-generated from directory structure
- **Routing**: File-based routing with trailing slashes
- **Localization**: Configured for Chinese (zh-CN)
- **Deployment**: Netlify with preview URLs

## Important Files

- **Configuration**: `docs/astro.config.mjs` - Contains sidebar structure and site settings
- **Project structure guide**: [docs/README.md](docs/README.md) - Comprehensive management instructions
- **Content directory**: `docs/src/content/docs/` - All blog articles
- **Homepage**: `docs/src/content/docs/index.mdx` - Main page with CardGrid and latest articles
- **Styles**: `docs/src/assets/landing.css` - Contains card hover animations and page styling
- **Package config**: `docs/package.json` - Development dependencies and scripts

## Branch Context

- **Current branch**: `starlight` (main blog branch)
- **Main branch**: `main` (for PRs)
- Working directory is always `docs/` subdirectory when making changes