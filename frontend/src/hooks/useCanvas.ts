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
    addSections
  } = useCanvas();

  const startResearch = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);

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
        scope: 'highlights'
      });

      if (response.success && response.document) {
        setDocument(response.document);
        
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
    }
  }, [setLoading, setError, setDocument, addChatMessage]);

  const sendChatMessage = useCallback(async (message: string) => {
    console.log('=== SEND CHAT MESSAGE DEBUG ===');
    console.log('Message:', message);
    console.log('Current document exists:', !!state.currentDocument);
    console.log('Message trimmed length:', message.trim().length);
    
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
        current_document: state.currentDocument
      });
  
      console.log('API Response received:', response);
  
      if (response.success) {
        console.log('Response successful, adding AI message');
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
  }, [state.currentDocument, setLoading, setError, addChatMessage, addSections, updateSection]);

  const refineSection = useCallback(async (sectionId: string, prompt: string) => {
    if (!state.currentDocument || !prompt.trim()) return;
  
    setSectionLoading(sectionId, true);
    setError(null);
  
    try {
      const response = await canvasApi.refineSection({
        section_id: sectionId,
        prompt: prompt,
        document: state.currentDocument
      });
  
      if (response.success && response.refined_section) {
        // Update the section with ALL refined data, not just content
        const refinedData = response.refined_section;
        
        // Convert influence_data back to the right format if present
        let influence_data = null;
        if (refinedData.influence_data) {
          influence_data = refinedData.influence_data;
        }
  
        updateSection(sectionId, { 
          content: refinedData.content,
          influence_data: influence_data,
          selectedForGraph: refinedData.selectedForGraph,
          metadata: {
            ...state.currentDocument.sections.find(s => s.id === sectionId)?.metadata,
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
  }, [state.currentDocument, setSectionLoading, setError, updateSection]);

  return {
    startResearch,
    sendChatMessage,
    refineSection
  };
};