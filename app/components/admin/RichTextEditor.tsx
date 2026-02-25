'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react';
import { extractYouTubeVideoId } from '@/lib/utils/youtube';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your article content here...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Keep DOM in sync when value changes externally (e.g. loading an article for edit).
    // Avoid writing when unchanged to prevent caret jumps and duplicate insert behavior.
    const current = editor.innerHTML === '<br>' ? '' : editor.innerHTML;
    if (current !== value) {
      editor.innerHTML = value || '';
    }
  }, [value]);

  const applyFormat = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML || '');
  };

  const normalizeLinkUrl = (input: string) => {
    const value = input.trim();
    if (!value) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
    return `https://${value}`;
  };

  const insertLink = () => {
    if (typeof window === 'undefined') return;
    const rawUrl = window.prompt('Enter link URL');
    if (!rawUrl) return;

    const normalizedUrl = normalizeLinkUrl(rawUrl);
    if (!normalizedUrl) return;

    const selection = window.getSelection();
    const hasSelectedText = Boolean(selection && selection.toString().trim().length);

    if (hasSelectedText) {
      document.execCommand('createLink', false, normalizedUrl);
    } else {
      const safeText = normalizedUrl.replace(/"/g, '&quot;');
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${safeText}" target="_blank" rel="noopener noreferrer">${safeText}</a>`
      );
    }

    handleInput();
    editorRef.current?.focus();
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || '';
    onChange(html === '<br>' ? '' : html);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';

    const compactText = text.trim();
    const isSingleToken = compactText.length > 0 && compactText.split(/\s+/).length === 1;
    const youtubeId = isSingleToken ? extractYouTubeVideoId(compactText) : null;

    if (youtubeId) {
      const shortcode = `[youtube:https://www.youtube.com/watch?v=${youtubeId}]`;
      document.execCommand('insertText', false, shortcode);
      handleInput();
      return;
    }

    // Paste plain text only, then update state from DOM once.
    document.execCommand('insertText', false, text);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const withMeta = e.ctrlKey || e.metaKey;
    if (!withMeta) return;

    if (e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertLink();
    }
  };

  const insertYouTubeEmbed = () => {
    if (typeof window === 'undefined') return;
    const input = window.prompt('Paste YouTube URL');
    if (!input) return;

    const videoId = extractYouTubeVideoId(input);
    if (!videoId) {
      window.alert('Please enter a valid YouTube link');
      return;
    }

    const shortcode = `[youtube:https://www.youtube.com/watch?v=${videoId}]`;
    document.execCommand('insertText', false, shortcode);
    handleInput();
    editorRef.current?.focus();
  };

  return (
    <div className="w-full border border-gray-300 rounded-lg overflow-hidden focus-within:border-spanish-red transition-colors">
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link (Ctrl+K)"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('unlink')}
          className="p-2 hover:bg-gray-200 rounded transition-colors text-xs font-semibold"
          title="Remove Link"
        >
          Unlink
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat('formatBlock', '<h2>')}
          className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-semibold"
          title="Heading"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => applyFormat('formatBlock', '<h3>')}
          className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-semibold"
          title="Subheading"
        >
          H3
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat('insertHorizontalRule')}
          className="p-2 hover:bg-gray-200 rounded transition-colors text-sm"
          title="Divider"
        >
          ---
        </button>

        <button
          type="button"
          onClick={() => applyFormat('removeFormat')}
          className="p-2 hover:bg-gray-200 rounded transition-colors text-sm"
          title="Clear Formatting"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => applyFormat('undo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('redo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={insertYouTubeEmbed}
          className="px-2.5 py-2 hover:bg-gray-200 rounded transition-colors text-sm font-semibold text-red-700"
          title="Insert YouTube Embed"
        >
          YouTube
        </button>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          suppressContentEditableWarning
          className="min-h-64 p-4 focus:outline-none prose prose-sm max-w-none"
          style={{
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        />
        {!value && !isFocused && (
          <span className="pointer-events-none absolute left-4 top-4 text-gray-400">{placeholder}</span>
        )}
      </div>

      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        <span>{value.length} characters</span>
        <span className="mx-2">|</span>
        <span>Paste a YouTube link or use the YouTube button to insert inline video</span>
      </div>
    </div>
  );
}
