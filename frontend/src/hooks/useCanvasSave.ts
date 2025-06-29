import { useState } from 'react';
import { useCanvas } from '../contexts/CanvasContext';
import { useGraphOperations } from './useGraphOperations';
import { proposalApi } from '../services/api';
import type { AcceptProposalsRequest, StructuredOutput, InfluenceProposal } from '../services/api';

interface UseCanvasSaveProps {
  onItemSaved: (itemId: string) => void;
  clearCanvas?: () => void;
  updateSection?: (id: string, updates: any) => void;
}

interface SaveResult {
  success: boolean;
  item_id?: string;
  requires_review?: boolean;
  conflicts?: any;
  preview_data?: any;
  new_data?: StructuredOutput;
  message?: string;
}

export function useCanvasSave({ onItemSaved, clearCanvas, updateSection }: UseCanvasSaveProps) {
  const { state } = useCanvas();
  const { loadItemWithAccumulation } = useGraphOperations();
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const extractMainItemData = () => {
    if (!state.currentDocument) return { year: undefined, description: undefined };

    // Try to get year from main item data or first influence
    const mainItemYear = state.currentDocument.item_year || 
                        state.currentDocument.sections.filter(s => s.selectedForGraph)[0]?.influence_data?.year;

    // Try to get description from intro section
    const mainItemDescription = state.currentDocument.sections.find(s => s.type === 'intro')?.content;

    return { year: mainItemYear, description: mainItemDescription };
  };

  const createAcceptProposalsRequest = (): AcceptProposalsRequest => {
    if (!state.currentDocument) throw new Error('No current document');

    const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph && s.influence_data);
    
    if (selectedSections.length === 0) {
      throw new Error('No influences selected for saving');
    }

    const { year, description } = extractMainItemData();

    return {
      item_name: state.currentDocument.item_name,
      item_type: state.currentDocument.item_type,
      creator: state.currentDocument.creator,
      item_year: year,
      item_description: description,
      accepted_proposals: selectedSections.map(section => ({
        ...section.influence_data!,
        accepted: true,
        parent_id: undefined,
        children: [],
        is_expanded: false,
        influence_type: section.influence_data?.influence_type || 'general'
      }))
    };
  };

  const createStructuredOutput = (): StructuredOutput => {
    if (!state.currentDocument) throw new Error('No current document');

    const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph);
    
    if (selectedSections.length === 0) {
      throw new Error('No influences selected for saving');
    }

    const { year, description } = extractMainItemData();

    return {
      main_item: state.currentDocument.item_name,
      main_item_type: state.currentDocument.item_type,
      main_item_creator: state.currentDocument.creator,
      main_item_year: year,
      main_item_description: description,
      influences: selectedSections.map(section => {
        const influence = section.influence_data;
        return {
          name: influence?.name || section.title || "Unknown",
          type: influence?.type,
          creator_name: influence?.creator_name,
          creator_type: influence?.creator_type,
          year: influence?.year,
          category: influence?.category || "General",
          scope: influence?.scope || "macro",
          influence_type: influence?.influence_type || "direct",
          confidence: influence?.confidence || 0.8,
          explanation: influence?.explanation || section.content,
          source: undefined,
          clusters: influence?.clusters
        };
      }),
      categories: Array.from(new Set(selectedSections.map(s => s.influence_data?.category || "General")))
    };
  };

  const handleSaveToGraph = async (): Promise<SaveResult> => {
    if (!state.currentDocument) {
      throw new Error('No current document');
    }

    setSaveLoading(true);
    setSaveError(null);

    try {
      const request = createAcceptProposalsRequest();
      const response = await proposalApi.acceptProposals(request);

      if (response.success && response.item_id) {
        // Success - load item into graph
        await loadItemWithAccumulation(response.item_id, state.currentDocument.item_name);
        onItemSaved(response.item_id);
        
        // Clear canvas if provided
        if (clearCanvas) {
          clearCanvas();
        }
        
        // Clear selected sections if updateSection is provided
        if (updateSection) {
          const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph);
          selectedSections.forEach(section => {
            updateSection(section.id, { selectedForGraph: false });
          });
        }

        return {
          success: true,
          item_id: response.item_id,
          message: response.message
        };
      } else if (response.requires_review) {
        // Conflict resolution needed
        const structuredOutput = createStructuredOutput();
        return {
          success: false,
          requires_review: true,
          conflicts: response.conflicts,
          preview_data: response.preview_data,
          new_data: structuredOutput,
          message: response.message
        };
      } else {
        throw new Error(response.message || "Failed to save influences");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save influences";
      setSaveError(errorMessage);
      
      // Parse validation errors for better user feedback
      let userFriendlyError = 'Failed to save to graph. Please try again.';
      
      if (errorMessage.includes('scope')) {
        userFriendlyError = 'Error with influence. Issue with scope - must be macro, micro, or nano.';
      } else if (errorMessage.includes('year')) {
        userFriendlyError = 'Error with influence. Issue with year - must be a valid number.';
      } else if (errorMessage.includes('confidence')) {
        userFriendlyError = 'Error with influence. Issue with confidence - must be between 0 and 1.';
      } else if (errorMessage.includes('validation error')) {
        userFriendlyError = 'Error with influence data. Please refine sections and try again.';
      }
      
      setSaveError(userFriendlyError);
      throw err;
    } finally {
      setSaveLoading(false);
    }
  };

  return {
    saveLoading,
    saveError,
    setSaveError,
    handleSaveToGraph,
    createStructuredOutput,
    createAcceptProposalsRequest
  };
} 