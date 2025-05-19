'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { Loader2, Copy, User, Bot, AlertTriangle, Pencil, ArrowUp, FileText, Code, RefreshCw, // Added retry icon
 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // Verified correct path
import { useChat } from 'ai/react'; // Import useChat hook and Message type
// Sample prompts for chip buttons
const samplePrompts = [
    "Explain this code",
    "Refactor this code",
    "Generate component: User profile card",
    "What is the difference between SSR and SSG?",
];
export default function ChatInterface() {
    const { toast } = useToast();
    const scrollAreaRef = useRef(null);
    const inputRef = useRef(null);
    const [isClient, setIsClient] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [contextContent, setContextContent] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    // Get settings, effective keys, and loading state from context
    const { settings, effectiveGeminiApiKey, effectiveOpenRouterApiKey, setIsSettingsOpen, isInitialLoadComplete, } = useSettings();
    // Vercel AI SDK `useChat` hook setup
    const { messages, input, handleInputChange, handleSubmit: handleChatSubmit, // Rename to avoid conflict
    setInput, isLoading, setMessages, reload, // Add reload function
    // Add other relevant properties from useChat if needed
    error, // Get error state from useChat
    stop, // Function to stop generation
    append, // Function to append a message
     } = useChat({
        api: '/api/chat',
        body: {
            settings: {
                provider: settings.provider,
                // Pass effective keys (or placeholders/indicators if you don't want to send keys directly)
                geminiApiKey: effectiveGeminiApiKey,
                geminiModel: settings.geminiModel,
                openRouterApiKey: effectiveOpenRouterApiKey,
                openRouterModel: settings.openRouterModel,
            },
            // Include context in the body - API route needs to handle this
            context: contextContent,
            selectedFile: selectedFile,
        },
        onError: (error) => {
            const errorId = `error-${Date.now()}`;
            console.error(`[ChatInterface ${errorId}][useChat Error]`, error);
            toast({
                title: 'Error',
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive',
            });
        },
        streamMode: 'text', // Ensure we handle plain text stream
        // experimental_streamData: true, // Enable if using streamData for structured streaming
    });
    // Set isClient to true only after component mounts
    useEffect(() => {
        setIsClient(true);
        // Listen for messages from the VS Code extension
        const handleVSCodeMessage = (event) => {
            const message = event.data; // The JSON data sent from the extension
            console.log('[ChatInterface] Received message from VS Code:', message);
            switch (message.type) {
                case 'selectedCode':
                    setContextContent(message.payload);
                    setSelectedFile(null); // Clear selected file when code is selected
                    toast({
                        title: 'Context Updated',
                        description: 'Selected code added to context.',
                    });
                    inputRef.current?.focus();
                    break;
                case 'selectedFile':
                    setSelectedFile(message.payload.fileName);
                    setContextContent(message.payload.fileContent); // Use file content as context
                    toast({
                        title: 'Context Updated',
                        description: `File "${message.payload.fileName}" added to context.`,
                    });
                    inputRef.current?.focus();
                    break;
                // Add other message types if needed
            }
        };
        window.addEventListener('message', handleVSCodeMessage);
        return () => {
            window.removeEventListener('message', handleVSCodeMessage);
        };
    }, [toast]); // Added toast to dependency array
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (scrollableViewport) {
                    scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
                }
            }
        }, 100); // Delay to allow DOM updates
    }, []);
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    // Focus input on initial load *after* settings are loaded
    useEffect(() => {
        if (isInitialLoadComplete && isClient) {
            // Ensure client-side before focusing
            inputRef.current?.focus();
        }
    }, [isInitialLoadComplete, isClient]);
    // Determine if the current provider is configured
    const isProviderConfigured = useMemo(() => {
        // Wait until settings are loaded from localStorage and component is mounted
        if (!isInitialLoadComplete || !isClient)
            return false;
        if (settings.provider === 'gemini') {
            // Check if either server-side key OR user-provided key exists, AND model is selected
            return (!!process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY || !!settings.geminiApiKey) && !!settings.geminiModel;
        }
        else if (settings.provider === 'openrouter') {
            // Check if either server-side key OR user-provided key exists, AND model is selected
            return (!!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || !!settings.openRouterApiKey) && !!settings.openRouterModel;
        }
        return false;
    }, [
        settings.provider,
        settings.geminiModel,
        settings.openRouterModel,
        settings.geminiApiKey, // Need user-provided keys in dependency array
        settings.openRouterApiKey,
        isInitialLoadComplete,
        isClient,
    ]);
    const handleCopy = (content, type) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard
                .writeText(content)
                .then(() => {
                toast({
                    title: type === 'code' ? 'Code Copied!' : 'Message Copied!',
                    description: `The ${type} has been copied to your clipboard.`,
                });
            })
                .catch((err) => {
                console.error(`[ChatInterface] Failed to copy ${type}: `, err);
                toast({
                    title: 'Copy Failed',
                    description: `Could not copy the ${type} to clipboard.`,
                    variant: 'destructive',
                });
            });
        }
        else {
            console.error('[ChatInterface] Clipboard API not available.');
            toast({
                title: 'Copy Failed',
                description: 'Clipboard API not available in this browser.',
                variant: 'destructive',
            });
        }
    };
    // Wrapper for useChat's handleSubmit to include context and settings
    const handleSubmitWrapper = (e) => {
        e?.preventDefault();
        const submitId = `submit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        console.log(`[ChatInterface ${submitId}] handleSubmitWrapper triggered.`);
        if (!input.trim() && !contextContent && !selectedFile) {
            console.log(`[ChatInterface ${submitId}] Ignoring submission: Input and context are empty.`);
            toast({ title: "Input Required", description: "Please enter a message or add context.", variant: "destructive" });
            return;
        }
        if (isLoading) {
            console.log(`[ChatInterface ${submitId}] Ignoring submission: Already loading.`);
            return;
        }
        if (!isProviderConfigured) {
            console.warn(`[ChatInterface ${submitId}] Ignoring submission: Provider not configured.`);
            const providerName = settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1);
            toast({
                title: "Provider Not Configured",
                description: `Please configure the API key/model for ${providerName} in settings.`,
                variant: "destructive",
                action: (<Button variant="link" onClick={() => setIsSettingsOpen(true)}>
                     Open Settings
                 </Button>),
            });
            setIsSettingsOpen(true);
            return;
        }
        console.log(`[ChatInterface ${submitId}] Submitting message. Context present: ${!!contextContent}, File selected: ${selectedFile}`);
        // Prepare the body with current settings and context
        const requestBody = {
            settings: {
                provider: settings.provider,
                // Only pass keys if they are explicitly set by the user in settings
                // Let the API route handle environment variables securely
                geminiApiKey: settings.geminiApiKey || null,
                geminiModel: settings.geminiModel,
                openRouterApiKey: settings.openRouterApiKey || null,
                openRouterModel: settings.openRouterModel,
            },
            context: contextContent,
            selectedFile: selectedFile,
        };
        console.log(`[ChatInterface ${submitId}] Request body for API:`, {
            settings: {
                provider: requestBody.settings.provider,
                geminiApiKey: requestBody.settings.geminiApiKey ? '******' : null, // Mask key
                geminiModel: requestBody.settings.geminiModel,
                openRouterApiKey: requestBody.settings.openRouterApiKey ? '******' : null, // Mask key
                openRouterModel: requestBody.settings.openRouterModel,
            },
            contextLength: requestBody.context?.length || 0,
            selectedFile: requestBody.selectedFile,
        });
        // Pass context and selected file in the options object
        handleChatSubmit(e, {
            options: {
                body: requestBody,
            },
        });
        // Clear context after submission
        setContextContent(null);
        setSelectedFile(null);
    };
    // Function to handle resubmitting an edited message
    const handleResubmit = (messageId) => {
        const messageToResubmit = messages.find((msg) => msg.id === messageId);
        if (!messageToResubmit || messageToResubmit.role !== 'user')
            return;
        // Find the index of the message to resubmit
        const messageIndex = messages.findIndex((msg) => msg.id === messageId);
        if (messageIndex === -1)
            return;
        // Create the new user message with edited content
        const editedUserMessage = { ...messageToResubmit, content: editContent };
        // Filter out messages *after* the edited one (including the original assistant response)
        const historyBeforeResubmit = messages.slice(0, messageIndex);
        // Optimistically update the UI with the edited message first
        setMessages([...historyBeforeResubmit, editedUserMessage]);
        setEditingMessageId(null); // Exit editing mode
        // --- Vercel AI SDK Approach for Resubmission ---
        // The `reload` function resubmits the *last* exchange.
        // To resubmit from an earlier point, we need to manually set the messages
        // and then trigger a new message append/submission.
        // Set the messages state to include the history *up to and including* the edited message
        // We already did this optimistically above.
        // Now, append the edited message content again, triggering the API call
        // with the correct (truncated) history implicitly handled by `useChat`.
        // `append` adds the message and makes the API call.
        console.log(`[ChatInterface] Resubmitting. History length: ${historyBeforeResubmit.length}. New content: "${editContent.substring(0, 50)}..."`);
        // Prepare the body with current settings (context is likely not relevant for edits)
        const requestBody = {
            settings: {
                provider: settings.provider,
                geminiApiKey: settings.geminiApiKey || null,
                geminiModel: settings.geminiModel,
                openRouterApiKey: settings.openRouterApiKey || null,
                openRouterModel: settings.openRouterModel,
            },
            context: null, // Clear context for resubmission
            selectedFile: null,
        };
        // Use `append` to send the edited message, implicitly using the history
        // NOTE: `append` expects a Message object, but we only provide content here.
        // `useChat` internally creates the user message object before sending.
        // It also uses the current `messages` state (which we updated) for history.
        append({ role: 'user', content: editContent }, // Provide the content to append
        { options: { body: requestBody } } // Pass updated settings/context
        );
        setEditContent(''); // Clear edit buffer
        setInput(''); // Clear main input buffer as well
    };
    // Function to handle starting the edit
    const startEditing = (messageId, currentContent) => {
        setEditingMessageId(messageId);
        setEditContent(currentContent);
        // Consider focusing the textarea for editing
    };
    // Function to cancel editing
    const cancelEditing = () => {
        setEditingMessageId(null);
        setEditContent('');
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitWrapper();
        }
    };
    // Click handler for chip buttons
    const handleChipClick = (prompt) => {
        setInput(prompt);
        // Focus input after setting value
        inputRef.current?.focus();
        // Optionally trigger submission immediately
        // setTimeout(() => handleSubmitWrapper(), 0);
    };
    // Placeholder text based on state
    const placeholderText = !isClient || !isInitialLoadComplete
        ? 'Loading settings...'
        : !isProviderConfigured
            ? `Configure ${settings.provider} API key/model in settings...`
            : `Ask ${settings.provider} (${settings.provider === 'gemini' ? settings.geminiModel : settings.openRouterModel})... (Shift+Enter for new line)`;
    const isInputDisabled = isLoading || !isClient || !isInitialLoadComplete || !isProviderConfigured;
    // Component to render markdown with syntax highlighting
    const MarkdownRenderer = ({ content }) => (<Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{
            code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeContent = String(children).replace(/\n$/, '');
                return !inline ? (<div className="relative my-2 rounded-md bg-gray-900 font-mono text-sm text-gray-200 shadow-inner backdrop-blur-sm">
               <div className="flex items-center justify-between px-3 py-1 border-b border-gray-700/50 bg-gray-800/30 rounded-t-md">
                   <span className="text-xs text-gray-400">{match ? match[1] : 'code'}</span>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => handleCopy(codeContent, 'code')}>
                       <Copy className="h-3.5 w-3.5"/>
                   </Button>
               </div>
               <pre className="p-3 overflow-x-auto">
                  <code className={cn(className, 'hljs')} {...props}>
                      {children}
                  </code>
               </pre>
            </div>) : (<code className="rounded bg-muted/50 dark:bg-muted/20 px-1 py-0.5 font-mono text-sm" {...props}>
              {children}
            </code>);
            },
            // Customize other elements like headings, links, lists etc. if needed
            p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
            },
            ul({ children }) {
                return <ul className="list-disc list-inside mb-2">{children}</ul>;
            },
            ol({ children }) {
                return <ol className="list-decimal list-inside mb-2">{children}</ol>;
            },
            li({ children }) {
                return <li className="mb-1">{children}</li>;
            },
            blockquote({ children }) {
                return <blockquote className="border-l-4 border-muted-foreground/30 pl-3 italic text-muted-foreground mb-2">{children}</blockquote>;
            },
            a({ node, ...props }) {
                return <a className="text-accent underline hover:text-accent/80" {...props}/>;
            },
            // Add more custom renderers as needed
        }}>
      {content}
    </Markdown>);
    return (<div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-background/80 to-background/60 backdrop-blur-xl dark:from-card dark:via-card/80 dark:to-card/60">
      {/* Configuration Alert */}
      {isClient && isInitialLoadComplete && !isProviderConfigured && (<Alert variant="destructive" className="m-4 rounded-lg border-destructive/30 bg-destructive/10 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 text-destructive"/>
          <AlertTitle>Provider Not Configured</AlertTitle>
          <AlertDescription>
            The selected AI provider ({settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)}) is missing a required
            API key or model name. Please{' '}
            <Button variant="link" className="p-0 h-auto text-destructive hover:underline" onClick={() => setIsSettingsOpen(true)}>
              configure your settings
            </Button>
            .
          </AlertDescription>
        </Alert>)}

       {/* Context Display Area */}
       {(contextContent || selectedFile) && (<div className="mx-4 mb-2 p-3 rounded-lg border border-border/50 bg-muted/30 backdrop-blur-sm text-xs text-muted-foreground shadow-sm">
               <div className="flex items-center justify-between mb-1">
                   <span className="font-medium flex items-center gap-1.5">
                       {selectedFile ? <FileText className="h-3.5 w-3.5"/> : <Code className="h-3.5 w-3.5"/>}
                       Context: {selectedFile ? `File: ${selectedFile}` : 'Selected Code'}
                   </span>
                   <Button variant="ghost" size="xs" onClick={() => { setContextContent(null); setSelectedFile(null); }}>
                       Clear Context
                   </Button>
               </div>
               {contextContent && !selectedFile && ( // Show preview only for code selection
            <pre className="max-h-20 overflow-y-auto rounded bg-black/20 p-1.5 font-mono text-[11px] whitespace-pre-wrap break-all">
                       <code>{contextContent}</code>
                   </pre>)}
               {contextContent && selectedFile && ( // Show preview for file content
            <pre className="max-h-20 overflow-y-auto rounded bg-black/20 p-1.5 font-mono text-[11px] whitespace-pre-wrap break-all">
                       <code>{contextContent}</code>
                   </pre>)}
           </div>)}

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 px-4 pt-4" ref={scrollAreaRef}>
        <div className="space-y-6 pb-4 group/chat-area"> {/* Added group */}
          {messages.map((message, index) => (<div key={message.id} className={cn('flex items-start gap-3 group/message', // Added group/message
            message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {/* Assistant Avatar */}
              {message.role === 'assistant' && (<Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                  <AvatarFallback className="bg-muted/50">
                    <Bot className="h-4 w-4 text-accent"/>
                  </AvatarFallback>
                </Avatar>)}

              {/* Message Card */}
              <Card className={cn('max-w-[85%] rounded-xl p-3 shadow-md relative backdrop-blur-md border border-border/20', 'transition-all duration-300 ease-out', // Added transition
            message.role === 'user'
                ? 'bg-primary/80 text-primary-foreground rounded-br-none'
                : 'bg-muted/60 text-foreground rounded-bl-none', 
            // Apply pulse animation to the latest assistant message while loading *if* it's the last message overall
            isLoading && index === messages.length - 1 && message.role === 'assistant' && 'animate-pulse opacity-70')}>
                {editingMessageId === message.id ? (
            // Edit Mode
            <div className="space-y-2">
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[60px] text-sm bg-background/80 dark:bg-black/30 border-border/50 focus:ring-accent" rows={3}/>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing} className="text-xs">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleResubmit(message.id)} disabled={!editContent.trim() || isLoading} // Disable if loading
             className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs">
                        Save & Resubmit <ArrowUp className="ml-1 h-3 w-3"/> {/* Smaller icon */}
                      </Button>
                    </div>
                  </div>) : (
            // Display Mode
            <>
                    <CardContent className="p-0 text-sm break-words">
                      <MarkdownRenderer content={message.content}/>
                       {/* Display artifact if present (e.g., generated code) */}
                       {message.role === 'assistant' && message.data?.artifact && (<div className="mt-3 border-t pt-2">
                               <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Generated Artifact:</h4>
                               <MarkdownRenderer content={`\`\`\`tsx\n${message.data.artifact}\n\`\`\``}/>
                           </div>)}
                    </CardContent>

                     {/* Actions for non-editing messages: Appear on hover over message card */}
                      <div className="absolute -top-3 -right-2 flex items-center gap-0.5 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
                         {message.role === 'user' && !isLoading && ( // Only show edit for user, not while loading
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground bg-background/70 dark:bg-card/70 backdrop-blur-sm rounded-full shadow" onClick={() => startEditing(message.id, message.content)} title="Edit message" aria-label="Edit message">
                               <Pencil className="h-3.5 w-3.5"/>
                             </Button>)}
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground bg-background/70 dark:bg-card/70 backdrop-blur-sm rounded-full shadow" onClick={() => handleCopy(message.content, 'message')} title="Copy message" aria-label="Copy message">
                           <Copy className="h-3.5 w-3.5"/>
                         </Button>
                          {/* Retry button for the last exchange if it failed */}
                          {message.role === 'user' && index === messages.length - 2 && error && !isLoading && (<Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 bg-background/70 dark:bg-card/70 backdrop-blur-sm rounded-full shadow" onClick={() => reload()} // Reloads the last exchange
                 title="Retry request" aria-label="Retry request">
                                <RefreshCw className="h-3.5 w-3.5"/>
                                </Button>)}
                       </div>

                  </>)}
              </Card>

              {/* User Avatar */}
              {message.role === 'user' && (<Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                  <AvatarFallback className="bg-primary/70 text-primary-foreground">
                    <User className="h-4 w-4"/>
                  </AvatarFallback>
                </Avatar>)}
            </div>))}
            {/* Display loading indicator when message is being generated */}
             {isLoading && messages[messages.length - 1]?.role === 'user' && (<div className="flex items-start gap-3 justify-start">
                     <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                         <AvatarFallback className="bg-muted/50">
                             <Bot className="h-4 w-4 text-accent"/>
                         </AvatarFallback>
                     </Avatar>
                     <Card className="max-w-[85%] rounded-xl p-3 shadow-md backdrop-blur-md border border-border/20 bg-muted/60 text-foreground rounded-bl-none animate-pulse opacity-70">
                         <CardContent className="p-0 text-sm flex items-center gap-2">
                             <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                             <span className="text-muted-foreground italic">Thinking...</span>
                         </CardContent>
                     </Card>
                 </div>)}
        </div>
      </ScrollArea>

      {/* Input Area */}
       <div className="border-t border-border/20 bg-background/60 dark:bg-card/60 p-4 shadow-inner backdrop-blur-xl">
         {/* Chip Buttons */}
         <div className="mb-3 flex flex-wrap gap-2">
             {samplePrompts.map((prompt, i) => (<Button key={i} variant="outline" size="sm" className="rounded-full text-xs h-7 bg-muted/30 backdrop-blur-sm border-border/30 hover:bg-muted/60 hover:border-border/50 transition-all duration-200" onClick={() => handleChipClick(prompt)} disabled={isLoading}>
                     {prompt}
                 </Button>))}
         </div>

         {/* Text Input Form */}
        <form onSubmit={handleSubmitWrapper} className="relative flex items-end gap-2" // items-end aligns button with bottom of taller textarea
    >
          <Textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={placeholderText} className={cn('flex-1 resize-none rounded-lg border border-input bg-background/80 dark:bg-muted/50 backdrop-blur-sm px-4 py-2.5 pr-12 text-sm shadow-sm focus:border-accent focus:ring-accent/50 dark:text-foreground', 'min-h-[52px]' // Ensure minimum height
        )} rows={1} // Start with one row, auto-grows
     disabled={isInputDisabled} style={{ maxHeight: '200px' }} // Limit max height
     aria-label="Chat input"/>
          <Button type="submit" size="icon" className="absolute right-[10px] bottom-[10px] h-9 w-9 rounded-lg bg-accent text-accent-foreground shadow-md hover:bg-accent/90 disabled:opacity-50 transition-all" disabled={isInputDisabled || !input.trim()} aria-label="Send message" title="Send message (Enter)">
            {isLoading ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<ArrowUp className="h-4 w-4"/> // Changed to ArrowUp for modern look
        )}
          </Button>
        </form>
      </div>
    </div>);
}
//# sourceMappingURL=chat-interface.js.map