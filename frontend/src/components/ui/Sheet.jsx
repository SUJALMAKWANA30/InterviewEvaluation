import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Sheet Context
const SheetContext = React.createContext({
  open: false,
  onOpenChange: () => {},
});

// Sheet Root
export function Sheet({ children, open, onOpenChange }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

// Sheet Trigger
export function SheetTrigger({ children, asChild, className, ...props }) {
  const { onOpenChange } = React.useContext(SheetContext);
  
  const handleClick = (e) => {
    e.stopPropagation();
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button className={className} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// Sheet Content
export function SheetContent({ 
  children, 
  side = 'right', 
  className,
  onClose,
  ...props 
}) {
  const { open, onOpenChange } = React.useContext(SheetContext);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    onClose?.();
  }, [onOpenChange, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sideStyles = {
    right: 'inset-y-0 right-0 h-full w-full sm:w-[420px] translate-x-0 data-[state=closed]:translate-x-full',
    left: 'inset-y-0 left-0 h-full w-full sm:w-[420px] translate-x-0 data-[state=closed]:-translate-x-full',
    top: 'inset-x-0 top-0 w-full max-h-[85vh] translate-y-0 data-[state=closed]:-translate-y-full',
    bottom: 'inset-x-0 bottom-0 w-full max-h-[85vh] translate-y-0 data-[state=closed]:translate-y-full',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={handleClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      
      {/* Sheet Panel */}
      <div
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'fixed z-50 bg-white shadow-2xl flex flex-col',
          sideStyles[side],
          className
        )}
        style={{ 
          animation: side === 'right' ? 'slideInRight 0.3s ease-out' : 
                     side === 'left' ? 'slideInLeft 0.3s ease-out' :
                     side === 'top' ? 'slideInTop 0.3s ease-out' : 
                     'slideInBottom 0.3s ease-out'
        }}
        {...props}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </button>
        
        {children}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInTop {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideInBottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// Sheet Header
export function SheetHeader({ children, className, ...props }) {
  return (
    <div 
      className={cn('flex flex-col gap-1.5 p-6 pb-4 border-b border-gray-100', className)} 
      {...props}
    >
      {children}
    </div>
  );
}

// Sheet Title
export function SheetTitle({ children, className, ...props }) {
  return (
    <h2 
      className={cn('text-xl font-semibold text-gray-900', className)} 
      {...props}
    >
      {children}
    </h2>
  );
}

// Sheet Description
export function SheetDescription({ children, className, ...props }) {
  return (
    <p 
      className={cn('text-sm text-gray-500', className)} 
      {...props}
    >
      {children}
    </p>
  );
}

// Sheet Footer
export function SheetFooter({ children, className, ...props }) {
  return (
    <div 
      className={cn('flex items-center gap-3 p-6 pt-4 border-t border-gray-100 mt-auto', className)} 
      {...props}
    >
      {children}
    </div>
  );
}

// Sheet Close
export function SheetClose({ children, asChild, className, ...props }) {
  const { onOpenChange } = React.useContext(SheetContext);
  
  const handleClick = () => {
    onOpenChange(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button className={className} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
