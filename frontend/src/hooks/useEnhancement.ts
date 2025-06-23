import { useState, useCallback } from 'react';
import { enhancementApi } from '../services/api';
import type { EnhancementRequest, EnhancementResponse, EnhancedContent } from '../services/api';

interface EnhancementState {
  loading: boolean;
  error: string | null;
  enhancedContent: EnhancedContent[];
  lastEnhancement: EnhancementResponse | null;
}

export const useEnhancement = () => {
  const [state, setState] = useState<EnhancementState>({
    loading: false,
    error: null,
    enhancedContent: [],
    lastEnhancement: null,
  });

  const enhanceItem = useCallback(async (request: EnhancementRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await enhancementApi.enhanceItem(request);
      setState(prev => ({
        ...prev,
        loading: false,
        lastEnhancement: response,
        enhancedContent: response.enhanced_content,
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enhance item';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const loadEnhancedContent = useCallback(async (itemId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const content = await enhancementApi.getEnhancedContent(itemId);
      setState(prev => ({
        ...prev,
        loading: false,
        enhancedContent: content,
      }));
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load enhanced content';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const deleteEnhancedContent = useCallback(async (contentId: string) => {
    try {
      await enhancementApi.deleteEnhancedContent(contentId);
      setState(prev => ({
        ...prev,
        enhancedContent: prev.enhancedContent.filter(content => content.id !== contentId),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete enhanced content';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const deleteAllEnhancedContent = useCallback(async (itemId: string) => {
    try {
      await enhancementApi.deleteAllEnhancedContent(itemId);
      setState(prev => ({
        ...prev,
        enhancedContent: [],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete all enhanced content';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearLastEnhancement = useCallback(() => {
    setState(prev => ({ ...prev, lastEnhancement: null }));
  }, []);

  return {
    ...state,
    enhanceItem,
    loadEnhancedContent,
    deleteEnhancedContent,
    deleteAllEnhancedContent,
    clearError,
    clearLastEnhancement,
  };
}; 