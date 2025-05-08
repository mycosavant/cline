import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, style, onChange, ...props }, ref) => {
    // Adjust height on input change
    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = event.target;
      textarea.style.height = 'auto'; // Reset height to recalculate
      // Set height based on scroll height, respecting max-height from style or className
      const maxHeight = parseInt(textarea.style.maxHeight || '0', 10) || Infinity; // Get maxHeight from inline style or fallback
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;

      // Call original onChange if provided
      if (onChange) {
        onChange(event);
      }
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm overflow-y-auto resize-none', // Added overflow-y-auto and resize-none
          className
        )}
        ref={ref}
        style={{ ...style, overflowY: 'auto' }} // Ensure overflowY is auto
        onChange={handleInput} // Use custom handler
        rows={1} // Start with one row
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
