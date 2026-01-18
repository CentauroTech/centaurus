import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
interface ComboboxCellProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isPrivate?: boolean;
  disabled?: boolean;
}
export function ComboboxCell({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isPrivate = false,
  disabled = false
}: ComboboxCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const portalId = useId();
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
      if (inputValue !== value) {
        onChange(inputValue);
      }
    };
    const handleScroll = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom - 10;
        const spaceAbove = rect.top - 10;

        // Position dropdown above if not enough space below
        const dropdownHeight = Math.min(300, spaceBelow > 150 ? spaceBelow : spaceAbove);
        const showAbove = spaceBelow < 150 && spaceAbove > spaceBelow;
        setPosition({
          top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 250),
          maxHeight: dropdownHeight
        } as any);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [inputValue, value, onChange, isOpen]);
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 10;
      const spaceAbove = rect.top - 10;
      const maxDropdownHeight = 300;
      const showAbove = spaceBelow < 150 && spaceAbove > spaceBelow;
      const availableHeight = showAbove ? Math.min(spaceAbove, maxDropdownHeight) : Math.min(spaceBelow, maxDropdownHeight);
      setPosition({
        top: showAbove ? rect.top - availableHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 250),
        maxHeight: availableHeight
      } as any);
    }
  }, [isOpen]);
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter(option => option.toLowerCase().includes(inputValue.toLowerCase()));
  const handleSelect = (option: string) => {
    isSelectingRef.current = true;
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isOpen) setIsOpen(true);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(inputValue);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  const handleBlur = () => {
    if (isSelectingRef.current) return;
    setTimeout(() => {
      if (!isSelectingRef.current && inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };
  const dropdown = isOpen ? createPortal(<div ref={dropdownRef} id={portalId} className="fixed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg shadow-lg border border-border py-1 overflow-y-auto overflow-x-hidden" style={{
    top: position.top,
    left: position.left,
    width: position.width,
    maxHeight: (position as any).maxHeight || 300,
    zIndex: 99999
  }} onMouseDown={e => {
    e.preventDefault();
  }}>
      {filteredOptions.length > 0 ? filteredOptions.map(option => <button key={option} type="button" onMouseDown={e => {
      e.preventDefault();
      handleSelect(option);
    }} className={cn("w-full px-3 py-2 text-left text-sm flex items-center justify-between text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", value === option && "bg-slate-100 dark:bg-slate-800")}>
            <span className="truncate">{option}</span>
            {value === option && <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />}
          </button>) : inputValue ? <button type="button" onMouseDown={e => {
      e.preventDefault();
      handleSelect(inputValue);
    }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
          Add "{inputValue}"
        </button> : <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No options available</div>}
    </div>, document.body) : null;
  if (disabled) {
    return (
      <div className="flex items-center gap-1 opacity-60 cursor-not-allowed">
        <span className="text-sm truncate text-inherit px-[10px]">
          {value || placeholder}
        </span>
      </div>
    );
  }

  return <>
      <div className="flex items-center gap-1" ref={containerRef}>
        {value && isPrivate ? <span className="px-2 py-0.5 rounded text-xs font-medium truncate bg-white text-slate-800">
            {value}
          </span> : <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onFocus={() => setIsOpen(true)} onBlur={handleBlur} onKeyDown={handleKeyDown} className="w-full bg-transparent border-0 outline-none text-sm focus:ring-0 truncate text-inherit placeholder:opacity-60 px-[10px]" placeholder={placeholder} />}
        <button type="button" onMouseDown={e => {
        e.preventDefault();
        if (value && isPrivate) {
          // Clear value to allow editing
          setInputValue('');
          onChange('');
          setTimeout(() => {
            inputRef.current?.focus();
            setIsOpen(true);
          }, 0);
        } else {
          setIsOpen(!isOpen);
        }
      }} className="p-0.5 hover:bg-white/10 rounded transition-colors">
          <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      {dropdown}
    </>;
}