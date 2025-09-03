# React Media Recorder Application

## Overview

This is a modern React application built with Vite that provides media recording capabilities. The project is structured as a single-page application (SPA) with routing support and media recording functionality. It uses TypeScript for type safety and is optimized for development on the Replit platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **Language**: TypeScript with strict type checking enabled
- **Routing**: React Router DOM v7 for client-side navigation
- **Styling**: CSS modules approach with index.css for global styles

### Development Environment
- **Hot Module Replacement**: Enabled through Vite for instant development feedback
- **TypeScript Configuration**: Strict mode enabled with ESNext target for modern JavaScript features
- **Build Process**: Vite handles bundling, optimization, and development server

### Media Handling
- **Recording**: React Media Recorder library for audio/video capture functionality
- **Browser APIs**: Leverages native MediaRecorder API through the react-media-recorder wrapper

### Server Configuration
- **Development Server**: Configured to run on host 0.0.0.0 port 5000 for Replit compatibility
- **Strict Port**: Enabled to ensure consistent port binding in containerized environments

## External Dependencies

### Core React Ecosystem
- **react**: ^18.2.0 - Core React library
- **react-dom**: ^18.2.0 - React DOM rendering
- **react-router-dom**: ^7.8.2 - Client-side routing

### Media Recording
- **react-media-recorder**: ^1.7.2 - Media recording capabilities with browser MediaRecorder API integration

### Development Tools
- **@vitejs/plugin-react**: ^4.2.0 - Vite React plugin for JSX transformation and Fast Refresh
- **typescript**: ^5.2.2 - TypeScript compiler and type definitions
- **@types/react**: ^18.2.37 - React TypeScript definitions
- **@types/react-dom**: ^18.2.15 - React DOM TypeScript definitions

### Build System
- **vite**: ^5.0.0 - Next-generation frontend build tool with native ES modules support