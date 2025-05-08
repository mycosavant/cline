
'use client'; // Mark as client component to use hooks

import ChatInterface from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button'; // Import Button
import { Settings } from 'lucide-react'; // Import Settings icon
import { useSettings } from '@/contexts/settings-context'; // Import useSettings hook

export default function Home() {
  const { setIsSettingsOpen } = useSettings(); // Get function to open settings

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">AI PairProgrammer</h1>
         <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="AI Provider Settings">
             <Settings className="h-5 w-5" />
         </Button>
      </header>
      <ChatInterface />
    </div>
  );
}
