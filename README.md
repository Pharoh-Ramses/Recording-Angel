# Recording Angel Service

A modern web application for enhancing church meetings by providing real-time transcription, speaker management, and congregation engagement tools.

## Overview

The Recording Angel Service is designed to serve various roles in the church:

- **Audience Members**: Follow along with transcriptions, see announcements, view hymns, and reference scriptures in real-time
- **Speakers**: Get timing cues, see their speaking notes, and track audience engagement
- **Bishops**: Manage ward meetings, track speakers, make announcements, and view meeting statistics
- **Stake Presidents**: Oversee multiple wards, track meeting trends, and access ward-level data

## Project Structure

- `index.html` - Main entry point
- `views/` - Individual view files for different roles
  - `audience-view-desktop.html` - Desktop view for congregation members
  - `audience-view-mobile.html` - Mobile view for congregation members
  - `speaker-view.html` - Interface for current speakers
  - `admin-view.html` - Administrative tools for technical staff
  - `stake-president-view.html` - Dashboard for stake presidents
  - `bishop-view.html` - Dashboard for bishops
  - `session-management.html` - Live meeting management interface
- `styles/` - CSS stylesheets
  - `main.css` - Main stylesheet with shared styles
- `scripts/` - JavaScript files
  - `main.js` - Main script with shared functionality

## Features

- Real-time transcription of talks
- Interactive scripture references
- Meeting announcements display
- Hymn tracking with status indicators
- Speaker program with current status
- Mobile-friendly interface with bottom navigation and slide-up drawers
- Administrative dashboards for church leadership
- Session management for conductors

## Development

See [project-notes.md](project-notes.md) for current progress and future plans.

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Select the view you want to explore

## License

All rights reserved.
