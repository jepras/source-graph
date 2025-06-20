import { useCallback } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import { canvasApi, proposalApi } from '../services/api';
import type { CanvasDocument } from '../types/canvas';

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
    setLoadingStage
  } = useCanvas();

  const startResearch = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);

    // Set initial loading stage for two-agent system
    if (state.use_two_agent) {
      setLoadingStage('analyzing');
      
      // Simulate the structuring stage after a delay
      setTimeout(() => {
        if (state.loading) {
          setLoadingStage('structuring');
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

      const response = await canvasApi.generateResearch({
        item_name: itemName,
        scope: 'highlights',
        selected_model: state.selectedModel,
        use_two_agent: state.use_two_agent
      });

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
      } else {
        setError(response.error_message || 'Failed to generate research');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research');
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }, [setLoading, setError, setDocument, addChatMessage, state.selectedModel, state.use_two_agent, setActiveModel, setLoadingStage]);

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
      const response = await canvasApi.sendChatMessage({
        message: message.trim(),
        current_document: state.currentDocument,
        selected_model: state.selectedModel
      });
  
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
      } else {
        console.error('API returned success: false:', response.error_message);
        setError(response.error_message || 'Failed to process message');
      }
    } catch (err) {
      console.error('Chat message error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [state.currentDocument, state.selectedModel, setLoading, setError, addChatMessage, addSections, updateSection, setActiveModel]);

  const refineSection = useCallback(async (sectionId: string, prompt: string) => {
    if (!state.currentDocument || !prompt.trim()) return;
  
    setSectionLoading(sectionId, true);
    setError(null);
  
    try {
      const response = await canvasApi.refineSection({
        section_id: sectionId,
        prompt: prompt,
        document: state.currentDocument,
        selected_model: state.selectedModel
      });
  
      if (response.success && response.refined_content) {
        // Update active model if provided
        if (response.active_model) {
          setActiveModel(response.active_model);
        }
        
        // Update the section content
        const currentSection = state.currentDocument.sections.find(s => s.id === sectionId);
        const currentMetadata = currentSection?.metadata || { createdAt: new Date(), aiGenerated: true };
        
        updateSection(sectionId, { 
          content: response.refined_content,
          metadata: {
            ...currentMetadata,
            lastEdited: new Date()
          }
        });
      } else {
        setError('Failed to refine section');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine section');
    } finally {
      setSectionLoading(sectionId, false);
    }
  }, [state.currentDocument, state.selectedModel, setSectionLoading, setError, updateSection, setActiveModel]);

  return {
    startResearch,
    sendChatMessage,
    refineSection
  };
};