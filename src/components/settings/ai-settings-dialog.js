'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context'; // Import ModelInfo and AiSettings
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, } from '@/components/ui/select';
import { Info, KeyRound, Loader2, AlertTriangle, Search, ArrowUpDown, DollarSign, Layers, Maximize } from 'lucide-react'; // Added Blocks, Maximize
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Import Card components
import { Badge } from '@/components/ui/badge'; // Import Badge
// Hardcoded common Gemini models (can be extended similarly if needed)
const GEMINI_MODELS = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', inputCostMtok: 0.35, outputCostMtok: 0.53, contextLength: 1048576, provider: 'google' }, // Added provider
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', inputCostMtok: 3.50, outputCostMtok: 10.50, contextLength: 1048576, provider: 'google' }, // Added provider
    { id: 'gemini-pro', name: 'Gemini 1.0 Pro', inputCostMtok: 0.50, outputCostMtok: 1.50, contextLength: 32768, provider: 'google' }, // Added provider
];
// Helper function to format cost
const formatCost = (cost) => {
    if (cost === null || cost === undefined)
        return 'N/A';
    if (cost === 0)
        return 'Free';
    return `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};
// Helper function to format context length
const formatContext = (length) => {
    if (length === null || length === undefined)
        return 'N/A';
    if (length >= 1000000)
        return `${(length / 1000000).toLocaleString()}M`;
    if (length >= 1000)
        return `${(length / 1000).toLocaleString()}K`;
    return length.toLocaleString();
};
// Component to display model details
const ModelDetailsCard = ({ model }) => {
    if (!model) {
        return (<Card className="mt-4 border-dashed">
                 <CardContent className="pt-6">
                    <p className="text-center text-sm text-muted-foreground">Select a model to view its details.</p>
                 </CardContent>
            </Card>);
    }
    return (<Card className="mt-4 bg-muted/30 dark:bg-muted/10">
            <CardHeader className="pb-2 pt-4">
                 <CardTitle className="text-base font-semibold flex items-center justify-between">
                     {model.name}
                     <Badge variant="outline" className="text-xs">{model.provider || model.id.split('/')[0]}</Badge>
                 </CardTitle>
                <CardDescription className="text-xs">{model.id}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pb-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="h-4 w-4"/> Context:
                </div>
                <div className="text-right font-medium">{formatContext(model.contextLength)} tokens</div>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4"/> Input Cost:
                </div>
                 <div className="text-right font-medium">{formatCost(model.inputCostMtok)} <span className="text-xs text-muted-foreground">/ Mtok</span></div>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4"/> Output Cost:
                </div>
                 <div className="text-right font-medium">{formatCost(model.outputCostMtok)} <span className="text-xs text-muted-foreground">/ Mtok</span></div>

                 {model.description && (<>
                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 pt-2 border-t mt-2">
                            <Info className="h-4 w-4"/> Description:
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">{model.description}</div>
                    </>)}
            </CardContent>
        </Card>);
};
export function AiSettingsDialog() {
    const { settings, setSettings, isSettingsOpen, setIsSettingsOpen, openRouterModels, fetchOpenRouterModels, modelsLoading, modelsError, isInitialLoadComplete, defaultSettings: contextDefaultSettings // Get default settings from context
     } = useSettings();
    const [localSettings, setLocalSettings] = useState(contextDefaultSettings); // Initialize with defaults from context
    const [isClient, setIsClient] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortCriteria, setSortCriteria] = useState('cost');
    const [selectedModelDetails, setSelectedModelDetails] = useState(null); // State for selected model details
    useEffect(() => {
        setIsClient(true);
    }, []);
    // Load saved settings only after the initial load is complete
    useEffect(() => {
        if (isInitialLoadComplete) {
            setLocalSettings(settings);
            // Pre-populate details if a model is already selected
            if (settings.provider === 'gemini') {
                const geminiModel = GEMINI_MODELS.find(m => m.id === settings.geminiModel);
                setSelectedModelDetails(geminiModel || null);
            }
            else if (settings.provider === 'openrouter' && openRouterModels.length > 0) {
                const openRouterModel = openRouterModels.find(m => m.id === settings.openRouterModel);
                setSelectedModelDetails(openRouterModel || null);
            }
            else {
                setSelectedModelDetails(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialLoadComplete, settings]); // Depend on settings from context
    // Fetch OpenRouter models when provider is selected and dialog opens (if needed)
    useEffect(() => {
        if (isClient && isSettingsOpen && localSettings.provider === 'openrouter' && openRouterModels.length === 0 && !modelsLoading) {
            fetchOpenRouterModels();
        }
    }, [isClient, isSettingsOpen, localSettings.provider, openRouterModels.length, fetchOpenRouterModels, modelsLoading]);
    const handleSave = () => {
        setSettings(localSettings); // Save the potentially modified local settings
        setIsSettingsOpen(false);
        setSearchTerm('');
    };
    const handleCancel = () => {
        // Reset local state to the settings from context (which are the saved ones)
        setLocalSettings(settings);
        // Reset details view based on saved settings
        if (settings.provider === 'gemini') {
            setSelectedModelDetails(GEMINI_MODELS.find(m => m.id === settings.geminiModel) || null);
        }
        else if (settings.provider === 'openrouter') {
            setSelectedModelDetails(openRouterModels.find(m => m.id === settings.openRouterModel) || null);
        }
        else {
            setSelectedModelDetails(null);
        }
        setIsSettingsOpen(false);
        setSearchTerm('');
    };
    const handleOpenChange = (open) => {
        if (!open) {
            handleCancel(); // Use cancel logic which resets based on saved settings
        }
        else {
            // When opening, ensure local state matches context IF loaded, otherwise keeps defaults
            if (isInitialLoadComplete) {
                setLocalSettings(settings);
                // Update details view when opening
                if (settings.provider === 'gemini') {
                    setSelectedModelDetails(GEMINI_MODELS.find(m => m.id === settings.geminiModel) || null);
                }
                else if (settings.provider === 'openrouter') {
                    // Attempt to fetch if switching to OpenRouter and models aren't loaded
                    if (openRouterModels.length === 0 && !modelsLoading) {
                        fetchOpenRouterModels(); // Fetch models if needed
                    }
                    setSelectedModelDetails(openRouterModels.find(m => m.id === settings.openRouterModel) || null);
                }
                else {
                    setSelectedModelDetails(null);
                }
            }
        }
        setIsSettingsOpen(open);
    };
    // Check if server-side keys are set (only check on client-side)
    const isGeminiKeySetServerSide = isClient && !!process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;
    const isOpenRouterKeySetServerSide = isClient && !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    // Filter and sort OpenRouter models based on search term and sort criteria
    const filteredAndSortedModels = useMemo(() => {
        let modelsToProcess = [...openRouterModels];
        // Filter
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            modelsToProcess = modelsToProcess.filter(model => model.name.toLowerCase().includes(lowerSearchTerm) ||
                model.id.toLowerCase().includes(lowerSearchTerm) ||
                model.description?.toLowerCase().includes(lowerSearchTerm));
        }
        // Sort
        modelsToProcess.sort((a, b) => {
            switch (sortCriteria) {
                case 'cost':
                    // Treat null costs as Infinity for sorting (push non-free/N/A to the end if mixing?)
                    // Or treat null/0 as 0? Let's treat null as Infinity so free models come first.
                    const costA = (a.inputCostMtok === null ? Infinity : a.inputCostMtok) + (a.outputCostMtok === null ? Infinity : a.outputCostMtok);
                    const costB = (b.inputCostMtok === null ? Infinity : b.inputCostMtok) + (b.outputCostMtok === null ? Infinity : b.outputCostMtok);
                    return costA - costB || a.name.localeCompare(b.name); // Sort by combined cost, then name
                case 'context':
                    const contextA = a.contextLength ?? 0;
                    const contextB = b.contextLength ?? 0;
                    return contextB - contextA || a.name.localeCompare(b.name); // Sort descending by context, then name
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        return modelsToProcess;
    }, [openRouterModels, searchTerm, sortCriteria]);
    // Update selected model details when local settings change
    useEffect(() => {
        let foundModel = null;
        if (localSettings.provider === 'gemini') {
            foundModel = GEMINI_MODELS.find(m => m.id === localSettings.geminiModel) || null;
        }
        else if (localSettings.provider === 'openrouter') {
            foundModel = openRouterModels.find(m => m.id === localSettings.openRouterModel) || null;
        }
        // Only update if the found model is different from the current details
        // or if the provider changed and details are now null
        if (foundModel?.id !== selectedModelDetails?.id || (foundModel === null && selectedModelDetails !== null)) {
            setSelectedModelDetails(foundModel);
        }
    }, [localSettings.provider, localSettings.geminiModel, localSettings.openRouterModel, openRouterModels, selectedModelDetails]); // Added selectedModelDetails
    return (<Dialog open={isSettingsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]"> {/* Slightly wider */}
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
          <DialogDescription>
            Configure the AI provider and model. Keys set server-side take precedence.
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider>
            <div className="grid gap-4 py-4"> {/* Reduced gap */}
            {/* Provider Selection */}
            <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                <Label htmlFor="provider" className="text-right col-span-1">
                Provider
                </Label>
                <Select value={localSettings.provider} onValueChange={(value) => {
            const newProvider = value;
            setLocalSettings(prev => ({
                ...prev,
                provider: newProvider,
                // Reset model selection when provider changes? Optional, but maybe good UX.
                // geminiModel: newProvider === 'gemini' ? prev.geminiModel : defaultSettings.geminiModel,
                // openRouterModel: newProvider === 'openrouter' ? prev.openRouterModel : defaultSettings.openRouterModel,
            }));
            // Fetch models immediately if switching to OpenRouter and needed
            if (newProvider === 'openrouter' && openRouterModels.length === 0 && !modelsLoading) {
                fetchOpenRouterModels();
            }
            // Reset selected details when provider changes
            setSelectedModelDetails(null);
            setSearchTerm(''); // Reset search term
        }} disabled={!isClient} // Disable select until client mounts
    >
                  <SelectTrigger id="provider" className="col-span-3">
                      <SelectValue placeholder="Select AI Provider"/>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
            </div>

             {/* Model Details Card - Moved above provider-specific settings */}
             <ModelDetailsCard model={selectedModelDetails}/>

            {/* Gemini Settings */}
            {localSettings.provider === 'gemini' && (<Card className="border-border/50 bg-background mt-4"> {/* Add margin top */}
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium">Gemini Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 grid gap-4"> {/* Remove top padding */}
                        {/* API Key Input */}
                        <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                            <Label htmlFor="gemini-api-key" className="text-right col-span-1 flex items-center gap-1">
                            API Key
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground cursor-help"/>
                                    </TooltipTrigger>
                                    <TooltipContent side='right' className="max-w-[200px]">
                                        <p className="text-xs">Your Google AI Gemini API Key. Stored locally in browser storage.</p>
                                        {isClient && isGeminiKeySetServerSide && <p className='text-xs text-muted-foreground mt-1'>(Server key detected, will be used)</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Input id="gemini-api-key" type="password" placeholder={!isClient ? "Loading..." : isGeminiKeySetServerSide ? "Using server-side key" : "Enter Gemini API Key"} value={localSettings.geminiApiKey || ''} onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value || null })} className="col-span-3 h-9" // Smaller height
         disabled={!isClient || isGeminiKeySetServerSide}/>
                        </div>
                         {/* Model Selection */}
                        <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                            <Label htmlFor="gemini-model" className="text-right col-span-1">
                                Model
                            </Label>
                            <Select value={localSettings.geminiModel} onValueChange={(value) => setLocalSettings({ ...localSettings, geminiModel: value })} disabled={!isClient}>
                                <SelectTrigger id="gemini-model" className="col-span-3 h-9">
                                    <SelectValue placeholder="Select Gemini Model"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-[200px]">
                                        <SelectGroup>
                                            <SelectLabel>Gemini Models</SelectLabel>
                                            {GEMINI_MODELS.map((model) => (<SelectItem key={model.id} value={model.id}>
                                                    {model.name} ({model.id}) {/* Simpler display */}
                                                </SelectItem>))}
                                        </SelectGroup>
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>)}

            {/* OpenRouter Settings */}
            {localSettings.provider === 'openrouter' && (<Card className="border-border/50 bg-background mt-4"> {/* Add margin top */}
                     <CardHeader className="pb-2 pt-4">
                         <CardTitle className="text-sm font-medium">OpenRouter Configuration</CardTitle>
                     </CardHeader>
                    <CardContent className="pt-0 grid gap-4"> {/* Remove top padding */}
                         {/* API Key Input */}
                        <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                            <Label htmlFor="openrouter-api-key" className="text-right col-span-1 flex items-center gap-1">
                            API Key
                             <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground cursor-help"/>
                                </TooltipTrigger>
                                <TooltipContent side='right' className="max-w-[200px]">
                                    <p className="text-xs">Your OpenRouter API Key. Stored locally in browser storage.</p>
                                    {isClient && isOpenRouterKeySetServerSide && <p className='text-xs text-muted-foreground mt-1'>(Server key detected, will be used)</p>}
                                </TooltipContent>
                            </Tooltip>
                            </Label>
                            <Input id="openrouter-api-key" type="password" placeholder={!isClient ? "Loading..." : isOpenRouterKeySetServerSide ? "Using server-side key" : "Enter OpenRouter API Key"} value={localSettings.openRouterApiKey || ''} onChange={(e) => setLocalSettings({ ...localSettings, openRouterApiKey: e.target.value || null })} className="col-span-3 h-9" disabled={!isClient || isOpenRouterKeySetServerSide}/>
                        </div>
                         {/* Model Selection */}
                        <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                            <Label htmlFor="openrouter-model-select" className="text-right col-span-1 self-start pt-2">
                                Model
                            </Label>
                            <div className="col-span-3 flex flex-col">
                                <Select value={localSettings.openRouterModel} onValueChange={(value) => setLocalSettings({ ...localSettings, openRouterModel: value })} disabled={!isClient || modelsLoading || !!modelsError || openRouterModels.length === 0}>
                                     <SelectTrigger id="openrouter-model-select" className="h-9">
                                        <SelectValue placeholder={modelsLoading ? "Loading models..." : modelsError ? "Error loading models" : "Select OpenRouter Model"}/>
                                     </SelectTrigger>
                                     <SelectContent>
                                         {/* Search and Sort Controls inside the SelectContent */}
                                         <div className="p-2 sticky top-0 bg-popover z-10 shadow-sm">
                                             <div className="relative mb-2">
                                                 <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                                                 <Input type="search" placeholder="Search models..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" // Smaller search input
         aria-label="Search OpenRouter models"/>
                                             </div>
                                             <div className="flex justify-end items-center gap-1 text-xs text-muted-foreground">
                                                 Sort by:
                                                <Button variant={sortCriteria === 'cost' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortCriteria('cost')} className="h-auto p-1 px-1.5 text-xs">
                                                      <DollarSign className="h-3 w-3 mr-1"/> Cost
                                                  </Button>
                                                 <Button variant={sortCriteria === 'context' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortCriteria('context')} className="h-auto p-1 px-1.5 text-xs">
                                                      <Maximize className="h-3 w-3 mr-1"/> Context
                                                 </Button>
                                                 <Button variant={sortCriteria === 'name' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortCriteria('name')} className="h-auto p-1 px-1.5 text-xs">
                                                      <ArrowUpDown className="h-3 w-3 mr-1"/> Name
                                                 </Button>
                                             </div>
                                         </div>

                                         {/* Model List */}
                                         {modelsLoading ? (<div className="flex items-center justify-center p-4 text-muted-foreground">
                                                 <Loader2 className="h-5 w-5 animate-spin mr-2"/> Loading...
                                             </div>) : modelsError ? (<div className="p-4 text-center text-destructive text-sm">{modelsError}</div>) : filteredAndSortedModels.length > 0 ? (<ScrollArea className="h-[200px]"> {/* Adjust height as needed */}
                                                 <SelectGroup>
                                                     {/* Optionally keep the label if needed <SelectLabel>OpenRouter Models</SelectLabel> */}
                                                     {filteredAndSortedModels.map((model) => (<SelectItem key={model.id} value={model.id} className="text-sm">
                                                              {/* Simplified display in dropdown, full details below */}
                                                             {model.name} ({model.provider}) {/* Show provider */}
                                                         </SelectItem>))}
                                                 </SelectGroup>
                                            </ScrollArea>) : (<div className="p-4 text-center text-muted-foreground text-sm">No models match '{searchTerm}'.</div>)}
                                     </SelectContent>
                                 </Select>
                                 {/* Display Error Alert Below the Select component */}
                                 {modelsError && !modelsLoading && (<Alert variant="destructive" className="mt-2">
                                          <AlertTriangle className="h-4 w-4"/>
                                          <AlertTitle className="text-xs">Error Loading Models</AlertTitle>
                                          <AlertDescription className="text-xs">
                                              {modelsError}. Check connection or OpenRouter status.
                                          </AlertDescription>
                                      </Alert>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>)}
            </div>
        </TooltipProvider>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {/* Disable save button only if client hasn't mounted OR initial settings haven't loaded */}
          <Button onClick={handleSave} disabled={!isClient || !isInitialLoadComplete}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
//# sourceMappingURL=ai-settings-dialog.js.map