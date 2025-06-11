import React, { useState } from 'react';
import { api, proposalApi } from '../services/api';
import type { 
  ResearchRequest, 
  ResearchResponse, 
  StructureRequest, 
  StructuredOutput,
  ProposalResponse, 
  MoreProposalsRequest, 
  AcceptProposalsRequest,
  UnifiedQuestionRequest,    
  UnifiedQuestionResponse 
} from '../services/api';
import { ConflictResolution } from './ConflictResolution';
import { YearValidation } from './YearValidation';

interface AIResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

type ResearchMode = 'traditional' | 'proposals';

export const AIResearchPanel: React.FC<AIResearchPanelProps> = ({ onItemSaved }) => {
  // Existing state for traditional research
  const [itemName, setItemName] = useState('');
  const [creator, setCreator] = useState('');
  const [loading, setLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [structuredResult, setStructuredResult] = useState<StructuredOutput | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStructuredExpanded, setIsStructuredExpanded] = useState(false);
  const [yearValidationData, setYearValidationData] = useState<StructuredOutput | null>(null);
  const [loadingSpecifics, setLoadingSpecifics] = useState<Record<string, boolean>>({});
  const [expandedProposals, setExpandedProposals] = useState<Record<string, any>>({});
  
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionResponse, setQuestionResponse] = useState<UnifiedQuestionResponse | null>(null);

  const [mainItemQuestionText, setMainItemQuestionText] = useState('');
  const [mainItemQuestionLoading, setMainItemQuestionLoading] = useState(false);
  const [mainItemQuestionResponse, setMainItemQuestionResponse] = useState<UnifiedQuestionResponse | null>(null);
  const [influenceQuestions, setInfluenceQuestions] = useState<Record<string, string>>({});
  const [influenceQuestionLoading, setInfluenceQuestionLoading] = useState<Record<string, boolean>>({});
  const [influenceQuestionResponses, setInfluenceQuestionResponses] = useState<Record<string, UnifiedQuestionResponse>>({});

  // New state for proposal system
  const [researchMode, setResearchMode] = useState<ResearchMode>('traditional');
  const [proposals, setProposals] = useState<ProposalResponse | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());

  // Existing traditional research methods (unchanged)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStructuredResult(null);
    setSavedItemId(null);

    try {
      const request: ResearchRequest = {
        item_name: itemName.trim(),
        creator: creator.trim() || undefined
      };

      const response = await api.researchInfluences(request);
      setResult(response);

      if (!response.success) {
        setError(response.error_message || 'Research failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleStructure = async () => {
    if (!result || !result.success) return;
  
    setStructureLoading(true);
    setError(null);
  
    try {
      const request: StructureRequest = {
        influences_text: result.influences_text,
        main_item: result.item_name,
        main_item_creator: result.artist
      };
  
      const structuredData = await api.structureInfluences(request);
      setStructuredResult(structuredData);
    } catch (err) {
      console.error('Structure error:', err);
      
      let userMessage = 'Failed to structure influences. ';
      
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        
        if (errorMsg.includes('year')) {
          userMessage += 'All influences must have years. Please research items with clear dates.';
        } else if (errorMsg.includes('server error') || errorMsg.includes('500')) {
          userMessage += 'Server processing error. Try researching a different item or simplify the research text.';
        } else if (errorMsg.includes('json') || errorMsg.includes('format')) {
          userMessage += 'Data formatting error. Please try again with a different item.';
        } else {
          userMessage += err.message;
        }
      } else {
        userMessage += 'Please try again or contact support if the problem persists.';
      }
      
      setError(userMessage);
    } finally {
      setStructureLoading(false);
    }
  };

  const saveStructuredData = async (dataToSave: StructuredOutput) => {
    setSaveLoading(true);
    setError(null);

    try {
      const saveResponse = await api.saveStructuredInfluences(dataToSave);
      
      if (saveResponse.requires_review) {
        setConflictData(saveResponse);
      } else {
        setSavedItemId(saveResponse.item_id);
        onItemSaved(saveResponse.item_id);
        setYearValidationData(null);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to database');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSave = async () => {
    if (!structuredResult) return;

    const missingYears = [];
    
    if (!structuredResult.main_item_year) {
      missingYears.push('main item');
    }
    
    const influencesWithoutYears = structuredResult.influences.filter(inf => !inf.year);
    if (influencesWithoutYears.length > 0) {
      missingYears.push(`${influencesWithoutYears.length} influence(s)`);
    }

    if (missingYears.length > 0) {
      setYearValidationData(structuredResult);
      return;
    }

    await saveStructuredData(structuredResult);
  };

  const handleYearValidationResolve = async (updatedData: StructuredOutput) => {
    setYearValidationData(null);
    setStructuredResult(updatedData);
    await saveStructuredData(updatedData);
  };

  const handleYearValidationCancel = () => {
    setYearValidationData(null);
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string) => {
    setSaveLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (resolution === 'merge' && selectedItemId) {
        response = await api.mergeWithExisting(selectedItemId, structuredResult!);
      } else {
        response = await api.forceSaveAsNew(structuredResult!);
      }
      
      setSavedItemId(response.item_id);
      onItemSaved(response.item_id);
      setConflictData(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setSaveLoading(false);
    }
  };

  // New proposal system methods
  const handleGenerateProposals = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setProposalLoading(true);
    setError(null);
    setProposals(null);
    setSelectedProposals(new Set());

    try {
      const proposalResponse = await proposalApi.generateProposals({
        item_name: itemName.trim(),
        artist: creator.trim() || undefined,
        item_type: undefined // Let AI auto-detect
      });

      if (proposalResponse.success) {
        setProposals(proposalResponse);
      } else {
        setError(proposalResponse.error_message || 'Failed to generate proposals');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proposals');
    } finally {
      setProposalLoading(false);
    }
  };

  const toggleProposal = (proposalName: string, scope: string) => {
    const key = `${proposalName}-${scope}`;
    const newSelected = new Set(selectedProposals);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedProposals(newSelected);
  };

  const isProposalSelected = (proposalName: string, scope: string) => {
    return selectedProposals.has(`${proposalName}-${scope}`);
  };

  const handleAcceptSelected = async () => {
    if (!proposals || selectedProposals.size === 0) {
      setError('Please select at least one proposal to accept');
      return;
    }
  
    setSaveLoading(true);
    setError(null);
  
    try {
      // Get all original proposals
      const allProposals = [
        ...proposals.macro_influences,
        ...proposals.micro_influences,
        ...proposals.nano_influences
      ];
  
      // Get all nested specifics from expanded proposals
      const allSpecifics: any[] = [];
      Object.values(expandedProposals).forEach((specifics: any) => {
        if (Array.isArray(specifics)) {
          allSpecifics.push(...specifics);
        }
      });
  
      // Get all question responses (main item and individual influences)
      const allQuestionInfluences: any[] = [];
      
      // Add main item question influences
      if (mainItemQuestionResponse?.new_influences) {
        allQuestionInfluences.push(...mainItemQuestionResponse.new_influences);
      }
      
      // Add individual influence question influences
      Object.values(influenceQuestionResponses).forEach((response: any) => {
        if (response?.new_influences) {
          allQuestionInfluences.push(...response.new_influences);
        }
      });
  
      // Combine all available proposals
      const allAvailableProposals = [...allProposals, ...allSpecifics, ...allQuestionInfluences];
  
      // Filter for only selected proposals
      const selectedObjects = allAvailableProposals.filter(proposal => 
        isProposalSelected(proposal.name, proposal.scope)
      );
  
      console.log(`Saving ${selectedObjects.length} selected proposals:`, selectedObjects.map(p => `${p.name} (${p.scope})`));
  
      const request: AcceptProposalsRequest = {
        item_name: proposals.item_name,
        item_type: proposals.item_type,
        artist: proposals.artist,
        item_year: proposals.item_year,
        item_description: proposals.item_description,
        accepted_proposals: selectedObjects.map(p => ({ ...p, accepted: true }))
      };
  
      const result = await proposalApi.acceptProposals(request);
      
      if (result.success) {
        setSavedItemId(result.item_id);
        onItemSaved(result.item_id);
        setSelectedProposals(new Set());
        // Clear question responses after saving
        setMainItemQuestionResponse(null);
        setInfluenceQuestionResponses({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save proposals');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClear = () => {
    setItemName('');
    setCreator('');
    setResult(null);
    setStructuredResult(null);
    setSavedItemId(null);
    setError(null);
    setYearValidationData(null);
    setConflictData(null);
    setProposals(null);
    setSelectedProposals(new Set());
    // Clear question state
    setMainItemQuestionText('');
    setMainItemQuestionResponse(null);
    setInfluenceQuestions({});
    setInfluenceQuestionResponses({});
  };

  const handleGetSpecifics = async (proposal: any, scope: string) => {
    if (!proposals) return;
    
    const proposalKey = `${proposal.name}-${proposal.scope}`;
    setLoadingSpecifics(prev => ({ ...prev, [proposalKey]: true }));
    
    try {
      // NEW: Use unified question system
      const response = await proposalApi.askQuestion({
        item_name: proposals.item_name,
        item_type: proposals.item_type,
        artist: proposals.artist,
        item_year: proposals.item_year,
        item_description: proposals.item_description,
        question: "Which specific sources, songs, or works influenced this technique?",
        target_influence_name: proposal.name,
        target_influence_explanation: proposal.explanation,
      });
      
      if (response.success) {
        // Store the specifics (same as before)
        setExpandedProposals(prev => ({
          ...prev,
          [proposalKey]: response.new_influences
        }));
      } else {
        alert('Failed to get specifics: ' + response.error_message);
      }
      
    } catch (error) {
      console.error('Error getting specifics:', error);
      alert('Failed to get specifics. Please try again.');
    } finally {
      setLoadingSpecifics(prev => ({ ...prev, [proposalKey]: false }));
    }
  };

  const handleMainItemQuestion = async () => {
    if (!proposals || !mainItemQuestionText.trim()) {
      setError('Please enter a question');
      return;
    }
  
    setMainItemQuestionLoading(true);
    setError(null);
  
    try {
      const request: UnifiedQuestionRequest = {
        item_name: proposals.item_name,
        item_type: proposals.item_type,
        artist: proposals.artist,
        item_year: proposals.item_year,
        item_description: proposals.item_description,
        question: mainItemQuestionText.trim(),
        // No target_influence_name = discovery mode
      };
  
      const response = await proposalApi.askQuestion(request);
      
      if (response.success) {
        setMainItemQuestionResponse(response);
        setMainItemQuestionText(''); // Clear the input
      } else {
        setError(response.error_message || 'Failed to process question');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process question');
    } finally {
      setMainItemQuestionLoading(false);
    }
  };
  
  const handleInfluenceQuestion = async (proposal: any) => {
    if (!proposals) return;
    
    const proposalKey = `${proposal.name}-${proposal.scope}`;
    const questionText = influenceQuestions[proposalKey];
    
    if (!questionText?.trim()) {
      setError('Please enter a question');
      return;
    }
  
    setInfluenceQuestionLoading(prev => ({ ...prev, [proposalKey]: true }));
    setError(null);
  
    try {
      const request: UnifiedQuestionRequest = {
        item_name: proposals.item_name,
        item_type: proposals.item_type,
        artist: proposals.artist,
        item_year: proposals.item_year,
        item_description: proposals.item_description,
        question: questionText.trim(),
        target_influence_name: proposal.name,
        target_influence_explanation: proposal.explanation,
      };
  
      const response = await proposalApi.askQuestion(request);
      
      if (response.success) {
        setInfluenceQuestionResponses(prev => ({
          ...prev,
          [proposalKey]: response
        }));
        // Clear the question input
        setInfluenceQuestions(prev => ({
          ...prev,
          [proposalKey]: ''
        }));
      } else {
        setError(response.error_message || 'Failed to process question');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process question');
    } finally {
      setInfluenceQuestionLoading(prev => ({ ...prev, [proposalKey]: false }));
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'macro': return 'bg-blue-100 text-blue-800';
      case 'micro': return 'bg-green-100 text-green-800';
      case 'nano': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-md font-semibold text-gray-800 border-b border-gray-200 pb-2">
        🤖 AI Research
      </h3>

      {/* Research Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setResearchMode('traditional')}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
            researchMode === 'traditional'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📄 Traditional Research
        </button>
        <button
          onClick={() => setResearchMode('proposals')}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
            researchMode === 'proposals'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎯 Proposal System
        </button>
      </div>

      {/* Common Form Fields */}
      <form onSubmit={researchMode === 'traditional' ? handleSubmit : handleGenerateProposals} className="space-y-3">
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            id="itemName"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Stan, Inception, iPhone"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
            Creator (optional)
          </label>
          <input
            id="creator"
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="e.g., Eminem, Nolan, Apple"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading || proposalLoading || !itemName.trim()}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(loading || proposalLoading) ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {researchMode === 'traditional' ? 'Research' : 'Generating'}
              </>
            ) : (
              researchMode === 'traditional' ? '🔍 Research' : '🎯 Generate Proposals'
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Processing Failed</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <div className="mt-2">
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {savedItemId && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-green-600">
            <h4 className="text-sm font-medium">✅ Saved!</h4>
            <p className="text-xs mt-1">
              Added to graph: {researchMode === 'traditional' ? structuredResult?.main_item : proposals?.item_name}
            </p>
          </div>
        </div>
      )}

      {/* Proposal System Results */}
      {researchMode === 'proposals' && proposals && proposals.success && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">
              🎯 Influence Proposals for "{proposals.item_name}"
            </h4>
            
            {/* Add this new section for description and year */}
            <div className="text-xs text-blue-700 space-y-1">
              {proposals.item_year && (
                <div><strong>Year:</strong> {proposals.item_year}</div>
              )}
              {proposals.item_description && (
                <div><strong>Description:</strong> {proposals.item_description}</div>
              )}
              {proposals.artist && (
                <div><strong>Artist:</strong> {proposals.artist}</div>
              )}
              {proposals.item_type && (
                <div><strong>Type:</strong> {proposals.item_type}</div>
              )}
            </div>
          </div>
            
          <div className="text-xs space-y-1 mb-3 pt-2 border-t border-blue-200">
            <div><strong>Total Proposals:</strong> {proposals.total_proposals}</div>
            <div><strong>Selected:</strong> {selectedProposals.size}</div>
            <div><strong>Categories:</strong> {proposals.all_categories.join(', ')}</div>
          </div>

          {/* Inline Main Item Question */}
          <div className="mb-3 pt-2 border-t border-blue-200">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ask about "{proposals.item_name}":
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={mainItemQuestionText}
                onChange={(e) => setMainItemQuestionText(e.target.value)}
                placeholder="Can you be more specific about how this influenced it?"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleMainItemQuestion();
                  }
                }}
              />
              <button
                onClick={handleMainItemQuestion}
                disabled={mainItemQuestionLoading || !mainItemQuestionText.trim()}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {mainItemQuestionLoading ? '...' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Main Item Question Response */}
          {mainItemQuestionResponse && mainItemQuestionResponse.success && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
              <h6 className="text-xs font-semibold text-green-800 mb-1">
                ✨ New Influences Found
              </h6>
              <p className="text-xs text-green-600 mb-2">
                {mainItemQuestionResponse.answer_explanation}
              </p>
              
              <div className="space-y-1">
                {mainItemQuestionResponse.new_influences.map((influence, index) => (
                  <div 
                    key={index} 
                    onClick={() => toggleProposal(influence.name, influence.scope)}
                    className={`p-2 border rounded cursor-pointer text-xs transition-colors ${
                      isProposalSelected(influence.name, influence.scope)
                        ? 'border-green-500 bg-green-100'
                        : 'border-green-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{influence.name}</div>
                        <div className="text-gray-600">{influence.category}</div>
                        <div className="text-gray-700 mt-1">{influence.explanation}</div>
                        <div className="text-gray-500 mt-1">
                          {influence.year} • {Math.round(influence.confidence * 100)}% confidence
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded border-2 flex-shrink-0 ml-2 ${
                        isProposalSelected(influence.name, influence.scope)
                          ? 'bg-green-500 border-green-500'
                          : 'border-green-300'
                      }`}>
                        {isProposalSelected(influence.name, influence.scope) && (
                          <span className="text-white text-xs leading-none">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setMainItemQuestionResponse(null)}
                className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}

            {/* Proposal Lists */}
            {[
              { title: 'Macro (Foundational)', proposals: proposals.macro_influences, scope: 'macro' },
              { title: 'Micro (Specific)', proposals: proposals.micro_influences, scope: 'micro' },
              { title: 'Nano (Details)', proposals: proposals.nano_influences, scope: 'nano' }
            ].map(section => (
              section.proposals.length > 0 && (
                <div key={section.scope} className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">{section.title}</h5>
                  <div className="space-y-2">
                  {section.proposals.map((proposal, index) => {
                      const proposalKey = `${proposal.name}-${proposal.scope}`;
                      const isLoadingSpecifics = loadingSpecifics[proposalKey] || false;
                      const hasSpecifics = expandedProposals[proposalKey];
                      
                      return (
                        <div key={`${proposal.name}-${index}`} className="space-y-2">
                          {/* Main proposal card */}
                          <div 
                            className={`p-2 border rounded text-xs transition-colors ${
                              isProposalSelected(proposal.name, proposal.scope)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* Header row - clickable for selection */}
                            <div 
                              onClick={() => toggleProposal(proposal.name, proposal.scope)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <span className="font-medium text-gray-900">{proposal.name}</span>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeColor(proposal.scope)}`}>
                                    {proposal.scope.toUpperCase()}
                                  </span>
                                  <div className={`w-3 h-3 rounded border-2 ${
                                    isProposalSelected(proposal.name, proposal.scope)
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-gray-300'
                                  }`}>
                                    {isProposalSelected(proposal.name, proposal.scope) && (
                                      <span className="text-white text-xs leading-none">✓</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-gray-600 mb-1">{proposal.category}</div>
                              <div className="text-gray-700 mb-2">{proposal.explanation}</div>
                              <div className="text-gray-500">
                                {proposal.year} • {Math.round(proposal.confidence * 100)}% confidence
                              </div>
                            </div>
                            
                            {/* Action buttons row - not clickable for selection */}
                            <div className="flex flex-col space-y-2 mt-2 pt-2 border-t border-gray-100">
                              {/* Existing buttons row */}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleGetSpecifics(proposal, proposal.scope)}
                                  disabled={isLoadingSpecifics || hasSpecifics}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                  {isLoadingSpecifics ? 'Loading...' : hasSpecifics ? 'Expanded' : 'Specifics'}
                                </button>
                                <button
                                  disabled
                                  className="px-2 py-1 text-xs bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                                >
                                  Propose
                                </button>
                              </div>
                              
                              {/* NEW: Inline question for this influence */}
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={influenceQuestions[`${proposal.name}-${proposal.scope}`] || ''}
                                  onChange={(e) => setInfluenceQuestions(prev => ({
                                    ...prev,
                                    [`${proposal.name}-${proposal.scope}`]: e.target.value
                                  }))}
                                  placeholder={`Ask about "${proposal.name}"...`}
                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleInfluenceQuestion(proposal);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleInfluenceQuestion(proposal)}
                                  disabled={influenceQuestionLoading[`${proposal.name}-${proposal.scope}`] || !influenceQuestions[`${proposal.name}-${proposal.scope}`]?.trim()}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                  {influenceQuestionLoading[`${proposal.name}-${proposal.scope}`] ? '...' : 'Ask'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Individual influence question response */}
                          {influenceQuestionResponses[`${proposal.name}-${proposal.scope}`] && (
                            <div className="ml-4 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <h6 className="text-xs font-semibold text-yellow-800 mb-1">
                                ✨ More Details Found
                              </h6>
                              <p className="text-xs text-yellow-600 mb-2">
                                {influenceQuestionResponses[`${proposal.name}-${proposal.scope}`].answer_explanation}
                              </p>
                              
                              <div className="space-y-1">
                                {influenceQuestionResponses[`${proposal.name}-${proposal.scope}`].new_influences.map((influence, index) => (
                                  <div 
                                    key={index}
                                    onClick={() => toggleProposal(influence.name, influence.scope)}
                                    className={`p-2 border rounded cursor-pointer text-xs transition-colors ${
                                      isProposalSelected(influence.name, influence.scope)
                                        ? 'border-yellow-500 bg-yellow-100'
                                        : 'border-yellow-200 bg-white hover:border-yellow-300'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-1">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{influence.name}</div>
                                        <div className="text-gray-600">{influence.category}</div>
                                        <div className="text-gray-700 mt-1">{influence.explanation}</div>
                                        <div className="text-gray-500 mt-1">
                                          {influence.year} • {Math.round(influence.confidence * 100)}% confidence
                                        </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded border-2 flex-shrink-0 ml-2 ${
                                        isProposalSelected(influence.name, influence.scope)
                                          ? 'bg-yellow-500 border-yellow-500'
                                          : 'border-yellow-300'
                                      }`}>
                                        {isProposalSelected(influence.name, influence.scope) && (
                                          <span className="text-white text-xs leading-none">✓</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <button
                                onClick={() => setInfluenceQuestionResponses(prev => {
                                  const newResponses = { ...prev };
                                  delete newResponses[`${proposal.name}-${proposal.scope}`];
                                  return newResponses;
                                })}
                                className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                          
                          {/* Nested specifics */}
                          {hasSpecifics && hasSpecifics.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {hasSpecifics.map((specific: any, specIndex: number) => {
                                const specificKey = `${specific.name}-${specific.scope}`;
                                return (
                                  <div
                                    key={specIndex}
                                    onClick={() => toggleProposal(specific.name, specific.scope)}
                                    className={`p-2 border rounded cursor-pointer text-xs transition-colors bg-indigo-25 ${
                                      isProposalSelected(specific.name, specific.scope)
                                        ? 'border-indigo-400 bg-indigo-100'
                                        : 'border-indigo-200 hover:border-indigo-300 bg-indigo-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-1">
                                      <span className="font-medium text-indigo-900">{specific.name}</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          NANO
                                        </span>
                                        <div className={`w-3 h-3 rounded border-2 ${
                                          isProposalSelected(specific.name, specific.scope)
                                            ? 'bg-indigo-500 border-indigo-500'
                                            : 'border-indigo-300'
                                        }`}>
                                          {isProposalSelected(specific.name, specific.scope) && (
                                            <span className="text-white text-xs leading-none">✓</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-indigo-600 mb-1">{specific.category}</div>
                                    <div className="text-indigo-800">{specific.explanation}</div>
                                    <div className="text-indigo-500 mt-1">
                                      {specific.year} • {Math.round(specific.confidence * 100)}% confidence
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}

            {/* Accept Button */}
            <button 
              onClick={handleAcceptSelected}
              disabled={saveLoading || selectedProposals.size === 0 || savedItemId !== null}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLoading ? 'Saving...' : savedItemId ? '✅ Saved' : `💾 Accept Selected (${selectedProposals.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Traditional Research Results (existing code) */}
      {researchMode === 'traditional' && (
        <>
          {/* Structured Results */}
          {structuredResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                📊 Structured Data
              </h4>
              
              <div className="text-xs space-y-1 mb-3">
                <div><strong>Item:</strong> {structuredResult.main_item}</div>
                <div><strong>Influences:</strong> {structuredResult.influences.length}</div>
                <div><strong>Categories:</strong> {structuredResult.categories.join(', ')}</div>
              </div>

              {/* Expandable structured data details */}
              <div className="text-xs text-gray-700 mb-3">
                {isStructuredExpanded ? (
                  <div className="space-y-2">
                    <div>
                      <strong>All Influences:</strong>
                      <ul className="mt-1 space-y-1 ml-2">
                        {structuredResult.influences.map((influence, index) => (
                          <li key={index} className="text-xs">
                            • <strong>{influence.name}</strong> ({influence.year || 'No year'}) - {influence.influence_type}
                            {influence.explanation && (
                              <div className="text-gray-600 ml-2 mt-1">{influence.explanation}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    Click "Show Details" to see all influences and structured data
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsStructuredExpanded(!isStructuredExpanded)}
                className="mb-3 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                {isStructuredExpanded ? 'Hide Details' : 'Show Details'}
              </button>

              {/* Year Validation, Conflict Resolution, or Save Button */}
              {yearValidationData ? (
                <YearValidation
                  structuredData={yearValidationData}
                  onResolve={handleYearValidationResolve}
                  onCancel={handleYearValidationCancel}
                />
              ) : conflictData ? (
                <ConflictResolution
                  similarItems={conflictData.similar_items}
                  newData={conflictData.new_data}
                  onResolve={handleConflictResolve}
                  onCancel={() => setConflictData(null)}
                />
              ) : (
                <button 
                  onClick={handleSave}
                  disabled={saveLoading || savedItemId !== null}
                  className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveLoading ? 'Checking for conflicts...' : savedItemId ? '✅ Saved' : '💾 Save to Graph'}
                </button>
              )}
            </div>
          )}

          {/* Research Results */}
          {result && result.success && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">
                    🎯 "{result.item_name}"
                  </h4>
                  
                  <button
                    onClick={handleStructure}
                    disabled={structureLoading}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {structureLoading ? 'Processing...' : 'Structure'}
                  </button>
                </div>
                
                <div className="text-xs text-gray-600">
                  {isExpanded ? (
                    <div className="whitespace-pre-wrap">
                      {result.influences_text}
                    </div>
                  ) : (
                    <div>
                      {result.influences_text.substring(0, 200)}...
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!result && !proposals && !loading && !proposalLoading && !error && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-2xl mb-2">
            {researchMode === 'traditional' ? '🔍' : '🎯'}
          </div>
          <p className="text-xs">
            {researchMode === 'traditional' 
              ? 'Enter an item name to research its influences'
              : 'Enter an item name to generate influence proposals'
            }
          </p>
          <p className="text-xs mt-1 text-gray-400">
            {researchMode === 'traditional'
              ? 'Traditional research provides free-form text that you structure manually'
              : 'Proposal system suggests organized influences across macro/micro/nano levels'
            }
          </p>
        </div>
      )}
      
    </div>
  );
};