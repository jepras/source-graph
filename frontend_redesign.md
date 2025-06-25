# Frontend Redesign Implementation Guide

## Context

I'm doing a complete frontend redesign of my React influence graph application. I want to replace all UI components while keeping the existing backend integration, hooks, and API calls intact.

### Current Setup

- **Vite + React + TypeScript**
- **Existing hooks**: `useGraphOperations`, `useProposals`
- **Existing contexts**: `GraphContext`, `ResearchContext`
- **Existing API service**: `api.ts`
- **Current state**: CSS foundation already updated with new Tailwind config and shadcn/ui

## Styling Standards & Design System

### Global Color System
All colors are managed through CSS variables in `index.css` and mapped to Tailwind classes via `tailwind.config.js`:

**Available Design Colors:**
- `design-green` - Primary green accent (#10b981)
- `design-green-hover` - Green hover state (#059669)
- `design-gray-800` - Dark gray borders (#1f2937)
- `design-gray-900` - Dark gray backgrounds (#111827)
- `design-gray-950` - Darkest gray backgrounds (#030712)
- `design-gray-400` - Medium gray text (#9ca3af)
- `design-gray-500` - Light gray text (#6b7280)

**Usage:**
```tsx
// Instead of hardcoded colors
className="bg-gray-900 border-gray-800 text-gray-400"

// Use global design colors
className="bg-design-gray-900 border-design-gray-800 text-design-gray-400"
```

### Component Standards
- **Use shadcn/ui components** where possible (Button, Input, Card, Badge, Tabs)
- **Dark theme by default** - All components use dark backgrounds
- **Consistent spacing** - Use Tailwind spacing scale
- **Green accent color** - Use `design-green` for primary actions and highlights
- **Global CSS variables** - All colors reference CSS variables for easy maintenance

### Design Principles
- **50/50 split layout** - Research panel left, graph panel right
- **Floating controls** - Use backdrop blur and semi-transparent backgrounds
- **Consistent borders** - Use `border-design-gray-800` for all borders
- **Hover states** - Use `hover:bg-design-gray-900` for interactive elements
- **Focus states** - Use `focus:border-design-green focus:ring-design-green/20`

## Target Design Files

These are the target component designs I want to implement:

1. `page.tsx` - Main layout (50/50 split)
2. `top-panel.tsx` - Header with search
3. `knowledge-graph.tsx` - Graph visualization with controls
4. `research-panel.tsx` - Chat-style research interface
5. `canvas-editor.tsx` - Document editing component
6. `item-details-panel.tsx` - Item information sidebar

## Current Project Structure

Keep in mind how my App is wrapped in various Contexts. Keep that context if possible.

App.tsx:
import React from 'react';
import { AppStateProvider } from './contexts/AppStateProvider';
import { MainLayout } from './components/layout/MainLayout';
import './index.css';

function App() {
  return (
    <AppStateProvider>
      <MainLayout />
    </AppStateProvider>
  );
}

export default App;

```
src/
├── components/
│   ├── panels/
│   │   ├── ResearchPanel.tsx      # REPLACE with research-panel.tsx design
│   │   ├── GraphPanel.tsx         # REMOVE (absorbed into main layout)
│   │   └── ItemDetailsPanel.tsx   # REPLACE with item-details-panel.tsx design
│   ├── graph/
│   │   └── InfluenceGraph.tsx     # MERGE with knowledge-graph.tsx design
│   ├── layout/
│   │   └── MainLayout.tsx         # REPLACE with page.tsx layout
│   └── research/                  # KEEP (reuse in new ResearchPanel)
├── hooks/
│   ├── useGraphOperations.ts      # KEEP UNCHANGED
│   └── useProposals.ts            # KEEP UNCHANGED
├── contexts/
│   ├── GraphContext.tsx           # KEEP UNCHANGED
│   └── ResearchContext.tsx        # KEEP UNCHANGED
├── services/
│   └── api.ts                     # KEEP UNCHANGED
└── App.tsx                        # UPDATE to use new layout
```

## Requirements

### Critical Constraints

- **Keep Vite + React** - Remove any Next.js specific code (`"use client"`, Next.js imports)
- **Preserve ALL existing functionality** - Every feature that works now must continue working
- **Maintain API integration** - All existing backend calls must remain functional
- **Keep existing hooks/contexts** - Don't modify `useGraphOperations`, `useProposals`, etc.
- **Use existing data structures** - Work with current TypeScript interfaces
- **Use global color system** - All colors must use CSS variables, no hardcoded colors
- **Use shadcn/ui components** - Prefer shadcn components over custom HTML elements

### Integration Points to Maintain

- Search functionality from `useGraphOperations`
- AI research system from `useProposals`
- Graph data loading and expansion
- Canvas document system
- Item selection and details display
- All existing API endpoints

## Implementation Plan

### Phase 1: Main Layout Structure ✅ COMPLETED
**Target**: Convert `page.tsx` design to replace current `App.tsx`/`MainLayout.tsx`

- ✅ Remove Next.js specific imports
- ✅ Create 50/50 split layout (research panel left, graph right)
- ✅ Integrate with existing `GraphContext` and `ResearchContext`
- ✅ Maintain routing if applicable
- ✅ Implement global color system
- ✅ Use shadcn/ui components

### Phase 2: TopPanel Component ✅ COMPLETED
**Target**: Implement `top-panel.tsx` design

- ✅ Replace/integrate with existing search functionality
- ✅ Connect to `useGraphOperations` search methods
- ✅ Maintain existing search behavior
- ✅ Keep all existing search features
- ✅ Use global color system and shadcn/ui components
- ✅ Add search results dropdown with loading states
- ✅ Integrate with existing item selection and loading

### Phase 3: KnowledgeGraph Component ✅ COMPLETED
**Target**: Merge `knowledge-graph.tsx` design with existing `InfluenceGraph.tsx`

**COMPLETED**: Keep ALL existing D3.js graph rendering logic
- ✅ Keep existing node/link data structures and positioning
- ✅ Keep existing graph interactions (click handlers, expansion)
- ✅ Add new UI controls and collapsible panels from design
- ✅ Maintain integration with `useGraphOperations`
- ✅ Update colors to use global design system
- ✅ Implement floating controls with graph actions
- ✅ Add hover cards and interactive elements
- ✅ Preserve all existing functionality while updating UI

**NOT IMPLEMENTED** (as requested):
- ~~Adding cluster visualization and management~~
- ~~Adding drag & drop functionality for cluster management~~
- ~~Integrating AI cluster tools with backend~~
- ~~Adding export functionality~~

### Phase 4: ResearchPanel Redesign ✅ COMPLETED
**Target**: Replace with `research-panel.tsx` chat-style interface

- ✅ Keep existing AI research functionality from `useProposals`
- ✅ Keep Canvas integration (`CanvasEditor` component)
- ✅ Maintain all existing API calls for proposals/research
- ✅ Add new chat interface design with floating controls
- ✅ Keep activity logging and suggestions
- ✅ Use global color system and shadcn/ui components
- ✅ Implement dark theme throughout Canvas system
- ✅ Add system prompt editor, research log, and suggestions dropdowns
- ✅ Maintain all existing functionality while updating UI

### Phase 5: CanvasEditor Integration ✅ COMPLETED
**Target**: Implement `canvas-editor.tsx` for document editing

**COMPLETED**: The existing Canvas system already provides comprehensive document editing functionality
- ✅ **DocumentRenderer** - Renders canvas documents with sections and proper styling
- ✅ **SectionComponent** - Individual sections with editing, refining, and deletion capabilities
- ✅ **Interactive Actions** - Hover menus with refine, edit, delete, and add to graph actions
- ✅ **Dark Theme Integration** - Uses global design system throughout
- ✅ **Rich Content Support** - Handles influence data, metadata, tags, and categories
- ✅ **State Management** - Full CanvasContext integration with proper state handling
- ✅ **Save Functionality** - Integration with graph operations and conflict resolution
- ✅ **AI Operations** - Real AI integration instead of mock actions
- ✅ **Advanced Features** - More sophisticated than target design with better data handling

**Note**: The existing implementation exceeds the target design with more robust functionality, better data structures, and full backend integration.

### Phase 6: ItemDetailsPanel ✅ COMPLETED
**Target**: Implement `item-details-panel.tsx` sidebar

**COMPLETED**: Successfully implemented the target design with full functionality
- ✅ **Tabbed Interface** - Overview, Connections, and History tabs
- ✅ **Real Data Integration** - Uses existing item selection from GraphContext
- ✅ **AI Content Generation** - Mock AI-generated content with loading states
- ✅ **Enhanced Styling** - Professional design with global color system
- ✅ **Preserved Functionality** - All existing API calls and graph operations intact
- ✅ **Interactive Elements** - Hover states, expandable sections, and action buttons
- ✅ **Content Types** - Support for Spotify, YouTube, Wikipedia, IMDB, and more
- ✅ **History Timeline** - Research log with expandable entries
- ✅ **Graph Integration** - Add influences to graph, merge functionality, delete items

### Phase 7: Bugs & refinements
- ✅ Make research panel adjustable in width & collapsable 
- ✅ Make the researchpanel scrollable vertically so the entire application stays in one viewport the entire time, if that makes sense? When researching items, then the document just continues down and down and the entire application is extended. I just want the research panel to be scrollable vertically so we always have the research search bar in view.
- ✅ Change the font & size of the text in the documentrenderer to fit Shadcn styling. Remove emojis. Also remove emoji "New Research". Also, the 
- ✅ Remove the dark blue colour scheme and move to the red theme that is in the design files. For example the background of the dropdown for each Model is not the dark colour i want. The send chat message button is not in red. Remove the green and move fully to red. 
- ✅ Also in the graph. 
- ✅ Include the new icon. 
- ✅ Remove the x in Item Details. Only use the hide/details button. 

## Specific Instructions

### For Each Component:
1. **Start with the target design file**
2. **Import required shadcn/ui components** (Button, Input, Card, Badge, Tabs, etc.)
3. **Use global color system** - Replace all hardcoded colors with `design-*` variables
4. **Verify Tailwind classes work** with updated config (dark theme colors)
5. **Identify existing functionality to preserve** from current component
6. **Remove Next.js specific code** (`"use client"`, Next.js imports)
7. **Connect to existing hooks/contexts** instead of creating new ones
8. **Test that all existing features still work**

### Color Usage Guidelines:
```tsx
// ✅ Correct - Use global design colors
className="bg-design-gray-900 border-design-gray-800 text-design-gray-400"

// ❌ Incorrect - Hardcoded colors
className="bg-gray-900 border-gray-800 text-gray-400"

// ✅ Correct - shadcn/ui components with design colors
<Button className="bg-design-green hover:bg-design-green-hover text-white">

// ✅ Correct - Focus states with design colors
className="focus:border-design-green focus:ring-design-green/20"
```

### Testing Checklist (after each component)

- [ ] Component renders without errors
- [ ] Existing hooks still function (`useGraphOperations`, `useProposals`)
- [ ] API calls still work
- [ ] Visual design matches target
- [ ] All click handlers and interactions work
- [ ] No console errors
- [ ] Uses global color system (no hardcoded colors)
- [ ] Uses shadcn/ui components where appropriate

## Expected Output

Please implement this redesign component by component, ensuring each step maintains all existing functionality while adopting the new visual design. Focus on keeping the backend integration intact while completely updating the user interface.

**Start with Phase 2 (TopPanel Component)** and proceed through each phase, testing functionality at each step.

### Key Priority

This is a UI redesign, not a functionality rewrite. **Every feature that works now must continue working** with the new interface.

### Styling Priority

**Use the global color system consistently** - All colors must reference CSS variables for maintainability and consistency across the application.