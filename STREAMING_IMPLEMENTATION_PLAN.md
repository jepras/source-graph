# 🚀 Streaming Implementation Plan

*Branch: `feature/streaming-ai-output`*

This document tracks the step-by-step implementation of streaming AI output for the Canvas research functionality.

## 📋 Implementation Overview

**Goal**: Replace the current loading spinner with real-time streaming of AI agent outputs during research.

**Current State**: 15-20 second wait with basic loading spinner
**Target State**: Immediate feedback with real-time AI thinking visible

---

## 🏗️ Phase 1: Backend Streaming Foundation

### Step 1.1: Add Streaming Endpoint (30 min) ✅ COMPLETED
- [x] Create new endpoint `/api/canvas/research/stream` in `backend/app/api/routes/canvas.py`
- [x] Add basic streaming response using FastAPI's `StreamingResponse`
- [x] Return simple test stream (not AI yet)
- [x] Test: `curl -N http://localhost:8000/api/canvas/research/stream?item_name=test`

**Files to modify:**
- `backend/app/api/routes/canvas.py`

**Test criteria:**
- Endpoint returns immediate streaming response
- No errors in backend logs
- Can see test output in terminal

---

### Step 1.2: Add Streaming to Base Agent (45 min) ✅ COMPLETED
- [x] Add `stream_invoke` method to `BaseAgent` class
- [x] Use LangChain's streaming capabilities (`llm.astream()`)
- [x] Add streaming callback handler
- [x] Test: Verify agent can stream simple responses

**Files to modify:**
- `backend/app/services/ai_agents/base_agent.py`

**Test criteria:**
- Agent can stream responses chunk by chunk
- No errors in streaming implementation
- Streaming works with different model types

---

### Step 1.3: Modify Two-Agent for Streaming (1 hour) ✅ COMPLETED
- [x] Add streaming version of `generate_research` method
- [x] Stream Agent 1's free-form analysis output
- [x] Stream Agent 2's structured extraction output
- [x] Add progress callbacks between agents
- [x] Test: Verify both agents stream their outputs

**Files to modify:**
- `backend/app/services/ai_agents/two_agent_canvas_agent.py`

**Test criteria:**
- Agent 1 streams cultural analysis
- Agent 2 streams structuring process
- Progress callbacks work correctly
- Final structured document is still generated

---

## 🔗 Phase 2: Backend-Frontend Connection

### Step 2.1: Add Streaming API Methods (30 min)
- [ ] Add streaming methods to `frontend/src/services/api.ts`
- [ ] Create `startResearchStreaming()` function using fetch with streaming
- [ ] Handle Server-Sent Events connection
- [ ] Parse streaming data format
- [ ] Test: Verify API can connect to backend streaming endpoint

**Files to modify:**
- `frontend/src/services/api.ts`

**Test criteria:**
- API connects to streaming endpoint successfully
- Can receive and parse streaming data
- Handles connection lifecycle properly
- Error handling works correctly

---

### Step 2.2: Add Streaming State Management (30 min) ✅ COMPLETED
- [x] Add `streamingOutput: string[]` to CanvasContext state
- [x] Add `streamingActive: boolean` to track streaming status
- [x] Add `streamingStage: string | null` to track current stage
- [x] Add `streamingProgress: number` to track progress percentage
- [x] Add actions: `ADD_STREAMING_CHUNK`, `CLEAR_STREAMING`, `SET_STREAMING_ACTIVE`, `SET_STREAMING_STAGE`, `SET_STREAMING_PROGRESS`
- [x] Add helper functions to CanvasContext
- [x] Test: Verify state updates correctly

**Files to modify:**
- `frontend/src/contexts/CanvasContext.tsx`
- `frontend/src/types/canvas.ts`

**Test criteria:**
- ✅ State updates when streaming chunks added
- ✅ Streaming status tracks correctly
- ✅ Stage and progress tracking works
- ✅ No state conflicts with existing functionality

---

### Step 2.3: Create Streaming Hook (45 min) ✅ COMPLETED
- [x] Add `startResearchStreaming` method to `useCanvas.ts`
- [x] Connect to streaming API methods
- [x] Update state with streaming data
- [x] Handle connection lifecycle (connect, disconnect, error)
- [x] Add comprehensive error handling and activity logging
- [x] Test: Verify hook connects and receives real backend data

**Files to modify:**
- `frontend/src/hooks/useCanvas.ts`

**Test criteria:**
- ✅ Hook connects to backend streaming endpoint
- ✅ Receives and parses real AI streaming data (81 chunks, 19,801 bytes)
- ✅ Updates state with streaming chunks
- ✅ Handles connection errors gracefully
- ✅ Manages streaming lifecycle (start, progress, complete, error)

---

## 🎨 Phase 3: Frontend Streaming Display

### Step 3.1: Add Streaming UI Component (1 hour) ✅ COMPLETED
- [x] Create `StreamingDisplay` component
- [x] Show real-time AI output with typing effect
- [x] Add progress indicators during streaming
- [x] Handle transition from streaming to final document
- [x] Integrate with CanvasTab and ResearchPanel
- [x] Test: Verify UI updates with real backend streaming data

**Files to create/modify:**
- `frontend/src/components/canvas/StreamingDisplay.tsx`
- `frontend/src/components/canvas/CanvasTab.tsx`
- `frontend/src/components/panels/ResearchPanel.tsx`

**Test criteria:**
- ✅ Streaming output appears immediately with real AI data
- ✅ Typing effect works smoothly with animated cursor
- ✅ Progress indicators update correctly (0-100%)
- ✅ Stage transitions work (analyzing → structuring)
- ✅ Transitions to final document seamlessly
- ✅ Auto-scrolls to show latest content
- ✅ Fallback to regular loading for non-streaming research

---

### Step 3.2: Add Progress Indicators (45 min)
- [ ] Show progress bar during streaming
- [ ] Add stage transitions (Agent 1 → Agent 2)
- [ ] Display estimated time remaining
- [ ] Add completion indicators
- [ ] Test: Verify progress updates correctly

**Files to modify:**
- `frontend/src/components/canvas/StreamingDisplay.tsx`
- `frontend/src/contexts/CanvasContext.tsx`

**Test criteria:**
- Progress bar updates smoothly
- Stage transitions are clear
- Time estimates are reasonable
- Completion is clearly indicated

---

### Step 3.3: Error Handling & Fallback (30 min)
- [ ] Handle streaming failures gracefully
- [ ] Fallback to regular loading if streaming fails
- [ ] Add retry mechanisms
- [ ] Test: Verify error scenarios work

**Files to modify:**
- `frontend/src/hooks/useCanvas.ts`
- `frontend/src/components/canvas/CanvasTab.tsx`

**Test criteria:**
- Streaming failures don't break the app
- Fallback to regular loading works
- Retry mechanisms function correctly
- User experience remains smooth

---

### Step 3.2: Add Progress Indicators (45 min)
- [ ] Show progress bar during streaming
- [ ] Add stage transitions (Agent 1 → Agent 2)
- [ ] Display estimated time remaining
- [ ] Add completion indicators
- [ ] Test: Verify progress updates correctly

**Files to modify:**
- `frontend/src/components/canvas/StreamingDisplay.tsx`
- `frontend/src/contexts/CanvasContext.tsx`

**Test criteria:**
- Progress bar updates smoothly
- Stage transitions are clear
- Time estimates are reasonable
- Completion is clearly indicated

---

### Step 3.3: Error Handling & Fallback (30 min)
- [ ] Handle streaming failures gracefully
- [ ] Fallback to regular loading if streaming fails
- [ ] Add retry mechanisms
- [ ] Test: Verify error scenarios work

**Files to modify:**
- `frontend/src/hooks/useCanvas.ts`
- `frontend/src/components/canvas/CanvasTab.tsx`

**Test criteria:**
- Streaming failures don't break the app
- Fallback to regular loading works
- Retry mechanisms function correctly
- User experience remains smooth

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Streaming endpoint responds immediately
- [ ] AI agents stream their outputs
- [ ] Progress callbacks work correctly
- [ ] Error handling works
- [ ] Performance is acceptable

### Frontend Testing
- [ ] Streaming state updates correctly
- [ ] UI shows real-time output
- [ ] Progress indicators work
- [ ] Error handling works
- [ ] Fallback mechanisms work

### Integration Testing
- [ ] End-to-end streaming works
- [ ] Performance is good
- [ ] User experience is smooth
- [ ] No regressions in existing functionality

---

## 📊 Success Metrics

### Performance
- [ ] Streaming starts within 1 second
- [ ] No UI freezing during streaming
- [ ] Total time similar to current implementation
- [ ] Memory usage remains reasonable

### User Experience
- [ ] Users see immediate feedback
- [ ] AI thinking process is transparent
- [ ] Progress is clearly indicated
- [ ] Error states are handled gracefully

### Technical
- [ ] No memory leaks from streaming
- [ ] Connection cleanup works properly
- [ ] Error recovery works
- [ ] Code is maintainable

---

## 🚨 Known Risks & Mitigation

### Risks
1. **Streaming complexity**: Mitigation - Start simple, add features incrementally
2. **Performance impact**: Mitigation - Test performance at each step
3. **Error handling**: Mitigation - Comprehensive error handling and fallbacks
4. **Browser compatibility**: Mitigation - Use standard Server-Sent Events

### Fallback Plan
If streaming becomes too complex, we can implement **progressive display** instead:
- Show Agent 1's raw output immediately
- Show "structuring..." indicator
- Replace with final structured document

---

## 📝 Notes

- Each step should be tested before moving to the next
- Keep existing functionality working throughout
- Document any issues or learnings
- Update this plan as we discover new requirements

---

*Last updated: [Date]*
*Current step: [Step number]* 