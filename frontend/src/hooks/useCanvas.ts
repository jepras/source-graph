import { useCallback } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import { canvasApi, proposalApi } from '../services/api';
import type { CanvasDocument, ActivityLogEntry } from '../types/canvas';

export const useCanvasOperations = () => {
  const { 
    state, 
    setLoading, 
    setError, 
    setDocument, 
    addChatMessage, 
    updateSection,
    setSectionLoading,
    addSections,
    setActiveModel,
    setLoadingStage,
    addActivityLog,
    updateActivityLog,
    clearActivityLogs
  } = useCanvas();

  const startResearch = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    clearActivityLogs(); // Clear previous activity logs

    // Add initial activity log
    const setupLogId = Date.now().toString();
    addActivityLog({
      id: setupLogId,
      timestamp: new Date(),
      stage: 'setup',
      activity: `Starting research for "${itemName}"`,
      function_called: 'startResearch',
      parameters: { item_name: itemName, model: state.selectedModel, use_two_agent: state.use_two_agent },
      status: 'in_progress'
    });

    // Set initial loading stage for two-agent system
    if (state.use_two_agent) {
      setLoadingStage('analyzing');
      
      // Add analyzing activity log
      const analyzingLogId = (Date.now() + 1).toString();
      addActivityLog({
        id: analyzingLogId,
        timestamp: new Date(),
        stage: 'analyzing',
        activity: 'Analyzing influences with cultural forensics',
        function_called: 'Agent 1 - Free-form Analysis',
        status: 'in_progress'
      });
      
      // Simulate the structuring stage after a delay
      setTimeout(() => {
        if (state.loading) {
          setLoadingStage('structuring');
          
          // Update analyzing log to completed
          updateActivityLog(analyzingLogId, { status: 'completed' });
          
          // Add structuring activity log
          const structuringLogId = (Date.now() + 2).toString();
          addActivityLog({
            id: structuringLogId,
            timestamp: new Date(),
            stage: 'structuring',
            activity: 'Structuring analysis into organized sections',
            function_called: 'Agent 2 - Structured Extraction',
            status: 'in_progress'
          });
        }
      }, 8000); // 8 seconds delay
    }

    try {
      // Add user message to chat
      addChatMessage({
        id: Date.now().toString(),
        content: itemName,
        role: 'user',
        timestamp: new Date()
      });

      const startTime = Date.now();
      const response = await canvasApi.generateResearch({
        item_name: itemName,
        scope: 'highlights',
        selected_model: state.selectedModel,
        use_two_agent: state.use_two_agent
      });
      const duration = Date.now() - startTime;

      if (response.success && response.document) {
        setDocument(response.document);
        
        // Update active model if provided
        if (response.active_model) {
          setActiveModel(response.active_model);
        }
        
        // Add AI response to chat
        addChatMessage({
          id: (Date.now() + 1).toString(),
          content: response.response_text || `I've created a research document about ${response.document.item_name}. You can now ask questions, refine sections, or select influences to add to the graph.`,
          role: 'assistant',
          timestamp: new Date()
        });

        // Add completion activity log
        addActivityLog({
          id: (Date.now() + 3).toString(),
          timestamp: new Date(),
          stage: 'complete',
          activity: `Research completed successfully`,
          function_called: 'generateResearch',
          parameters: { sections_count: response.document.sections.length },
          duration_ms: duration,
          status: 'completed'
        });

        // Update setup log to completed
        updateActivityLog(setupLogId, { status: 'completed', duration_ms: duration });
      } else {
        setError(response.error_message || 'Failed to generate research');
        
        // Add error activity log
        addActivityLog({
          id: (Date.now() + 4).toString(),
          timestamp: new Date(),
          stage: 'error',
          activity: `Research failed: ${response.error_message || 'Unknown error'}`,
          function_called: 'generateResearch',
          status: 'failed'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research');
      
      // Add error activity log
      addActivityLog({
        id: (Date.now() + 5).toString(),
        timestamp: new Date(),
        stage: 'error',
        activity: `Research failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        function_called: 'startResearch',
        status: 'failed'
      });
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }, [setLoading, setError, setDocument, addChatMessage, state.selectedModel, state.use_two_agent, setActiveModel, setLoadingStage, addActivityLog, updateActivityLog, clearActivityLogs]);

  const sendChatMessage = useCallback(async (message: string) => {
    console.log('=== SEND CHAT MESSAGE DEBUG ===');
    console.log('Message:', message);
    console.log('Current document exists:', !!state.currentDocument);
    console.log('Message trimmed length:', message.trim().length);
    console.log('Selected model:', state.selectedModel);
    
    if (!state.currentDocument || !message.trim()) {
      console.log('Early return - missing document or message');
      return;
    }
  
    console.log('Setting loading to true');
    setLoading(true);
    setError(null);

    // Add chat activity log
    const chatLogId = Date.now().toString();
    addActivityLog({
      id: chatLogId,
      timestamp: new Date(),
      stage: 'analyzing',
      activity: `Processing chat message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      function_called: 'sendChatMessage',
      parameters: { message_length: message.length, model: state.selectedModel },
      status: 'in_progress'
    });
  
    try {
      console.log('Adding user message to chat');
      // Add user message to chat
      addChatMessage({
        id: Date.now().toString(),
        content: message,
        role: 'user',
        timestamp: new Date()
      });
  
      console.log('Making API call to canvasApi.sendChatMessage');
      const startTime = Date.now();
      const response = await canvasApi.sendChatMessage({
        message: message.trim(),
        current_document: state.currentDocument,
        selected_model: state.selectedModel
      });
      const duration = Date.now() - startTime;
  
      console.log('API Response received:', response);
  
      if (response.success) {
        console.log('Response successful, adding AI message');
        
        // Update active model if provided
        if (response.active_model) {
          setActiveModel(response.active_model);
        }
        
        // Add AI response to chat
        addChatMessage({
          id: (Date.now() + 1).toString(),
          content: response.response_text,
          role: 'assistant',
          timestamp: new Date()
        });
  
        // Handle document updates
        if (response.new_sections && response.new_sections.length > 0) {
          console.log('Adding new sections:', response.new_sections.length);
          addSections(response.new_sections, response.insert_after);
        }
  
        if (response.updated_sections && response.updated_sections.length > 0) {
          console.log('Updating existing sections:', response.updated_sections.length);
          // Update existing sections
          response.updated_sections.forEach(section => {
            updateSection(section.id, section);
          });
        }

        // Update chat activity log to completed
        updateActivityLog(chatLogId, { 
          status: 'completed', 
          duration_ms: duration,
          activity: `Chat message processed successfully${response.new_sections ? ` (${response.new_sections.length} new sections)` : ''}`
        });
      } else {
        console.error('API returned success: false:', response.error_message);
        setError(response.error_message || 'Failed to process message');
        
        // Update chat activity log to failed
        updateActivityLog(chatLogId, { 
          status: 'failed',
          activity: `Chat message failed: ${response.error_message || 'Unknown error'}`
        });
      }
    } catch (err) {
      console.error('Chat message error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Update chat activity log to failed
      updateActivityLog(chatLogId, { 
        status: 'failed',
        activity: `Chat message failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [state.currentDocument, state.selectedModel, setLoading, setError, addChatMessage, addSections, updateSection, setActiveModel, addActivityLog, updateActivityLog]);

  const refineSection = useCallback(async (sectionId: string, prompt: string) => {
    if (!state.currentDocument || !prompt.trim()) return;
  
    setSectionLoading(sectionId, true);
    setError(null);

    // Add refine activity log
    const refineLogId = Date.now().toString();
    addActivityLog({
      id: refineLogId,
      timestamp: new Date(),
      stage: 'structuring',
      activity: `Refining section "${sectionId}"`,
      function_called: 'refineSection',
      parameters: { section_id: sectionId, prompt_length: prompt.length, model: state.selectedModel },
      status: 'in_progress'
    });
  
    try {
      const startTime = Date.now();
      const response = await canvasApi.refineSection({
        section_id: sectionId,
        prompt: prompt,
        document: state.currentDocument,
        selected_model: state.selectedModel
      });
      const duration = Date.now() - startTime;
  
      if (response.success && response.refined_section) {
        // Update active model if provided
        if (response.active_model) {
          setActiveModel(response.active_model);
        }
        
        // Update the section with the complete refined section data
        const refinedSection = response.refined_section;
        const currentSection = state.currentDocument.sections.find(s => s.id === sectionId);
        const currentMetadata = currentSection?.metadata || { createdAt: new Date(), aiGenerated: true };
        
        updateSection(sectionId, { 
          content: refinedSection.content,
          influence_data: refinedSection.influence_data,
          metadata: {
            ...currentMetadata,
            lastEdited: new Date()
          }
        });

        // Update refine activity log to completed
        updateActivityLog(refineLogId, { 
          status: 'completed', 
          duration_ms: duration,
          activity: `Section "${sectionId}" refined successfully`
        });
      } else {
        setError('Failed to refine section');
        
        // Update refine activity log to failed
        updateActivityLog(refineLogId, { 
          status: 'failed',
          activity: `Section refinement failed`
        });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine section');
      
      // Update refine activity log to failed
      updateActivityLog(refineLogId, { 
        status: 'failed',
        activity: `Section refinement failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      setSectionLoading(sectionId, false);
    }
  }, [state.currentDocument, state.selectedModel, setSectionLoading, setError, updateSection, setActiveModel, addActivityLog, updateActivityLog]);

  return {
    startResearch,
    sendChatMessage,
    refineSection
  };
};