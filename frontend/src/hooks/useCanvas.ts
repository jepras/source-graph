import { useCallback } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import { canvasApi } from '../services/api';
import type { StreamingChunk } from '../types/canvas';

export const useCanvasOperations = () => {
  const { 
    state, 
    setResearchState, 
    setError, 
    setDocument, 
    addChatMessage, 
    updateSection,
    setSectionLoading,
    addSections,
    setActiveModel,
    addActivityLog,
    updateActivityLog,
    clearActivityLogs,
    // Streaming helper functions
    addStreamingChunk,
    setStreamingStage,
    setStreamingProgress,
    clearStreaming
  } = useCanvas();

  const startResearch = useCallback(async (itemName: string) => {
    console.log('=== START RESEARCH DEBUG ===');
    console.log('Item name:', itemName);
    console.log('Selected model:', state.selectedModel);
    console.log('Use two agent:', state.use_two_agent);
    
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setResearchState('streaming');
    setError(null);
    clearActivityLogs();

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
        
        // Set research state to complete
        setResearchState('complete');
      } else {
        setError(response.error_message || 'Failed to generate research');
        setResearchState('error');
        
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
      setResearchState('error');
      
      // Add error activity log
      addActivityLog({
        id: (Date.now() + 5).toString(),
        timestamp: new Date(),
        stage: 'error',
        activity: `Research failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        function_called: 'startResearch',
        status: 'failed'
      });
    }
  }, [setResearchState, setError, setDocument, addChatMessage, state.selectedModel, state.use_two_agent, setActiveModel, addActivityLog, updateActivityLog, clearActivityLogs]);

  const startResearchStreaming = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setResearchState('streaming');
    setError(null);
    clearActivityLogs();
    clearStreaming(); // Clear any previous streaming state

    // Start streaming
    setStreamingStage('analyzing');
    setStreamingProgress(0);

    // Add initial activity log
    const setupLogId = Date.now().toString();
    addActivityLog({
      id: setupLogId,
      timestamp: new Date(),
      stage: 'setup',
      activity: `Starting streaming research for "${itemName}"`,
      function_called: 'startResearchStreaming',
      parameters: { item_name: itemName, model: state.selectedModel, use_two_agent: state.use_two_agent },
      status: 'in_progress'
    });

    // Add user message to chat
    addChatMessage({
      id: Date.now().toString(),
      content: itemName,
      role: 'user',
      timestamp: new Date()
    });

    try {
      const startTime = Date.now();
      
      // Call the streaming API with callbacks
      const result = await canvasApi.startResearchStreaming({
        item_name: itemName,
        scope: 'highlights',
        selected_model: state.selectedModel,
        use_two_agent: state.use_two_agent
      }, {
        onChunk: (chunk: StreamingChunk) => {
          console.log('📦 Received streaming chunk:', chunk);
          
          switch (chunk.type) {
            case 'llm_token':
              // Add LLM token chunks to streaming output (only actual AI content)
              if (chunk.chunk) {
                addStreamingChunk(chunk.chunk);
              }
              break;
              
            case 'continuous_text':
              // Replace accumulated text for continuous display
              if (chunk.text) {
                // For continuous text, we want to replace the last chunk instead of adding
                // This will be handled by clearing and adding the new text
                // The StreamingDisplay will join all chunks into continuous text
                addStreamingChunk(chunk.text);
              }
              break;
              
            case 'stage_start':
              // Update streaming stage when stage starts
              if (chunk.stage) {
                setStreamingStage(chunk.stage);
              }
              if (chunk.progress !== undefined) {
                setStreamingProgress(chunk.progress);
              }
              // Don't add stage_start messages to streaming output - they're handled by the UI
              break;
              
            case 'stage_complete':
              // Handle stage completion
              if (chunk.progress !== undefined) {
                setStreamingProgress(chunk.progress);
              }
              // Don't add stage_complete messages to streaming output - they're handled by the UI
              break;
              
            case 'connected':
            case 'agent_selected':
              // Handle connection and agent selection messages (don't show in streaming output)
              break;
              
            case 'complete':
              // Handle completion - just log it, let onComplete handle the document
              console.log('🎉 Streaming completed!');
              // Don't add completion message to streaming output
              break;
              
            case 'error':
              // Handle error
              console.error('❌ Streaming error:', chunk.error);
              setError(chunk.error || 'Streaming error occurred');
              setResearchState('error');
              setStreamingStage(null);
              setStreamingProgress(0);
              
              // Add error activity log
              addActivityLog({
                id: (Date.now() + 4).toString(),
                timestamp: new Date(),
                stage: 'error',
                activity: `Streaming research failed: ${chunk.error || 'Unknown error'}`,
                function_called: 'startResearchStreaming',
                status: 'failed'
              });
              break;
          }
        },
        onComplete: (finalDocument: any) => {
          console.log('📄 Final document received:', finalDocument);
          
          if (finalDocument) {
            setDocument(finalDocument);
            
            // Add AI response to chat
            addChatMessage({
              id: (Date.now() + 1).toString(),
              content: `I've created a research document about ${finalDocument.item_name}. You can now ask questions, refine sections, or select influences to add to the graph.`,
              role: 'assistant',
              timestamp: new Date()
            });
          }
          
          // Complete the streaming process
          setResearchState('complete');
          setStreamingStage(null);
          setStreamingProgress(100);
          
          // Add completion activity log
          addActivityLog({
            id: (Date.now() + 3).toString(),
            timestamp: new Date(),
            stage: 'complete',
            activity: `Streaming research completed successfully`,
            function_called: 'startResearchStreaming',
            duration_ms: Date.now() - startTime,
            status: 'completed'
          });
          
          // Update setup log to completed
          updateActivityLog(setupLogId, { 
            status: 'completed', 
            duration_ms: Date.now() - startTime 
          });
        },
        onError: (error: string) => {
          console.error('❌ Streaming API error:', error);
          setError(error);
          setResearchState('error');
          setStreamingStage(null);
          setStreamingProgress(0);
          
          // Add error activity log
          addActivityLog({
            id: (Date.now() + 5).toString(),
            timestamp: new Date(),
            stage: 'error',
            activity: `Streaming research failed: ${error}`,
            function_called: 'startResearchStreaming',
            status: 'failed'
          });
        }
      });
    } catch (err) {
      console.error('Streaming research error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start streaming research');
      setResearchState('error');
      setStreamingStage(null);
      setStreamingProgress(0);
      
      // Add error activity log
      addActivityLog({
        id: (Date.now() + 6).toString(),
        timestamp: new Date(),
        stage: 'error',
        activity: `Streaming research failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        function_called: 'startResearchStreaming',
        status: 'failed'
      });
    }
  }, [setResearchState, setError, setDocument, addChatMessage, state.selectedModel, state.use_two_agent, setActiveModel, addActivityLog, updateActivityLog, clearActivityLogs, addStreamingChunk, setStreamingStage, setStreamingProgress, clearStreaming]);

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
  
    console.log('Setting research state to streaming');
    setResearchState('streaming');
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
        
        // Set research state back to complete
        setResearchState('complete');
      } else {
        console.error('API returned success: false:', response.error_message);
        setError(response.error_message || 'Failed to process message');
        setResearchState('error');
        
        // Update chat activity log to failed
        updateActivityLog(chatLogId, { 
          status: 'failed',
          activity: `Chat message failed: ${response.error_message || 'Unknown error'}`
        });
      }
    } catch (err) {
      console.error('Chat message error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setResearchState('error');
      
      // Update chat activity log to failed
      updateActivityLog(chatLogId, { 
        status: 'failed',
        activity: `Chat message failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }, [state.currentDocument, state.selectedModel, setResearchState, setError, addChatMessage, addSections, updateSection, setActiveModel, addActivityLog, updateActivityLog]);

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
    startResearchStreaming,
    sendChatMessage,
    refineSection
  };
};