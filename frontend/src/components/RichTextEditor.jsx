import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addImage = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result;
        if (base64) {
          editor.chain().focus().setImage({ src: base64 }).run();
        }
      };
      reader.readAsDataURL(file);
    };
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border-b border-gray-300 p-2 flex flex-wrap gap-1">
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('bold')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('italic')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('strike')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('underline')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Underline"
      >
        <u>U</u>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Headers */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Heading 3"
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('heading', { level: 4 })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Heading 4"
      >
        H4
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('bulletList')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Bullet List (Ctrl+Shift+8)"
      >
        <span className="font-bold text-lg leading-none">•</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('orderedList')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Numbered List (Ctrl+Shift+7)"
      >
        <span className="font-bold">1.</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('blockquote')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Quote"
      >
        "
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Link and Image */}
      <button
        onClick={setLink}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('link')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Add Link"
      >
        🔗 Link
      </button>
      <button
        onClick={addImage}
        className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
        title="Add Image"
      >
        🖼️ Image
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Code */}
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('code')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Inline Code"
      >
        {'</>'}
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('codeBlock')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Code Block"
      >
        {'{}'}
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive({ textAlign: 'left' })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Align Left"
      >
        ⬅
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive({ textAlign: 'center' })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Align Center"
      >
        ⬌
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive({ textAlign: 'right' })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Align Right"
      >
        ➡
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive({ textAlign: 'justify' })
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Justify"
      >
        ⬌⬌
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Subscript/Superscript */}
      <button
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        disabled={!editor.can().chain().focus().toggleSubscript().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('subscript')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Subscript"
      >
        x<sub>2</sub>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        disabled={!editor.can().chain().focus().toggleSuperscript().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('superscript')
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Superscript"
      >
        x<sup>2</sup>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Horizontal Rule */}
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
        title="Horizontal Rule"
      >
        ─
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Table */}
      <button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
        title="Insert Table"
      >
        ⧉ Table
      </button>
      {editor.isActive('table') && (
        <>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Add Column Before"
          >
            +Col
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Add Column After"
          >
            Col+
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Delete Column"
          >
            -Col
          </button>
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Add Row Before"
          >
            +Row
          </button>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Add Row After"
          >
            Row+
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Delete Row"
          >
            -Row
          </button>
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Delete Table"
          >
            ×Table
          </button>
        </>
      )}
    </div>
  );
};

const RichTextEditor = ({ content, onChange, placeholder = 'Write your blog post here...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Exclude link and underline from StarterKit since we're adding them separately
        link: false,
        underline: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[300px] p-4',
      },
    },
    onError: ({ editor, view, transaction, errors }) => {
      console.error('Editor error:', errors);
    },
  });

  // Update editor content when content prop changes
  React.useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      const newContent = content || '';
      
      // Only update if content actually changed
      if (currentContent !== newContent) {
        try {
          editor.commands.setContent(newContent);
        } catch (error) {
          console.error('Error setting content:', error);
        }
      }
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-md overflow-hidden p-4">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
