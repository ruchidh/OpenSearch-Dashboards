# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenSearch Dashboards is an open-source data visualization tool designed to work with OpenSearch. It's a React-based web application built on Node.js that provides dashboards, visualizations, and analytics for OpenSearch data.

## Development Commands

### Basic Development
- `yarn start` - Start development server with dev mode
- `yarn start:security` - Start with security plugin enabled
- `yarn start:enhancements` - Start with query enhancements and new home page
- `yarn start:explore` - Start with explore mode enabled (includes query enhancements, data sources, and various UI features)

### Building
- `yarn build` - Build for all platforms
- `yarn build-platform` - Build platform-specific artifacts

### Testing
- `yarn test` - Run all tests using Grunt
- `yarn test:jest` - Run Jest unit tests
- `yarn test:jest:ci` - Run Jest tests in CI mode
- `yarn test:mocha` - Run Mocha tests
- `yarn test:ftr` - Run functional tests
- `yarn typecheck` - Run TypeScript type checking

### Code Quality
- `yarn lint` - Run both ESLint and Stylelint
- `yarn lint:es` - Run ESLint only
- `yarn lint:style` - Run Stylelint only

### Development Tools
- `yarn osd:bootstrap` - Bootstrap the development environment (build TypeScript refs and register git hooks)
- `yarn osd:watch` - Watch mode for development

## Architecture Overview

### Core Structure
- **`src/core/`** - Core platform code with client/server architecture
  - `public/` - Browser-side core services
  - `server/` - Node.js server-side core services
  - `common/` - Shared code between client and server

### Plugin System
- **`src/plugins/`** - Core plugins (dashboard, data, visualizations, etc.)
- **`plugins/`** - External/optional plugins
- **`packages/`** - Shared packages and utilities (prefixed with `osd-`)

### Key Directories
- **`scripts/`** - Build scripts and development tools
- **`config/`** - Configuration files
- **`test/`** - Test utilities and functional tests
- **`examples/`** - Example plugins and implementations
- **`cypress/`** - End-to-end tests

## Plugin Development

OpenSearch Dashboards uses a plugin architecture where features are implemented as plugins. Core functionality like dashboards, visualizations, and data management are all plugins in `src/plugins/`.

### Package Management
- Uses Yarn workspaces for monorepo management
- Packages in `packages/` are prefixed with `@osd/`
- Uses `scripts/use_node` wrapper for Node.js execution

## Testing Strategy

- **Unit Tests**: Jest for component and utility testing
- **Integration Tests**: Jest integration tests
- **Functional Tests**: Custom functional test runner
- **E2E Tests**: Cypress for end-to-end testing
- **Type Checking**: TypeScript compiler for type validation

## Build System

- Uses custom build scripts in `scripts/` directory
- TypeScript compilation with project references
- Webpack for client-side bundling
- Supports building for multiple platforms

## Key Technologies

- **Frontend**: React, TypeScript, SASS, Webpack
- **Backend**: Node.js, Hapi.js
- **Testing**: Jest, Mocha, Cypress
- **Build**: Custom scripts, TypeScript, Babel
- **Package Manager**: Yarn with workspaces