
import React, { useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import { Underline } from '@tiptap/extension-underline';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import "@/styles/tiptap-editor.css";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Loader2,
  Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onPreview?: () => void;
}

export default function RichTextEditor({ content, onChange, onPreview }: RichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pasteOptions, setPasteOptions] = useState<{
    open: boolean;
    html: string;
    text: string;
    x: number;
    y: number;
  }>({ open: false, html: '', text: '', x: 0, y: 0 });
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref in sync
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const cleanPastedHtml = useCallback((html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const blockedTags = new Set([
        'meta',
        'style',
        'script',
        'link',
        'title',
        'head',
      ]);

      const unwrapTags = new Set([
        'span',
        'font',
        'div',
      ]);

      const allowedAttrs = new Set(['href', 'src', 'alt']);

      const walk = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          if (blockedTags.has(tag)) {
            el.remove();
            return;
          }

          if (unwrapTags.has(tag)) {
            const parent = el.parentNode;
            if (parent) {
              while (el.firstChild) parent.insertBefore(el.firstChild, el);
              parent.removeChild(el);
            }
            return;
          }

          Array.from(el.attributes).forEach((attr) => {
            if (!allowedAttrs.has(attr.name.toLowerCase())) {
              el.removeAttribute(attr.name);
            }
          });
        }

        const children = Array.from(node.childNodes);
        for (const child of children) {
          walk(child);
        }
      };

      walk(doc.body);

      return doc.body.innerHTML || '';
    } catch {
      return '';
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      console.log('🔄 Editor updated, calling onChange with length:', html.length);
      onChangeRef.current(html);
    },
    editorProps: {
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        const html = clipboard.getData('text/html') || '';
        const text = clipboard.getData('text/plain') || '';

        if (!html && !text) return false;

        event.preventDefault();

        const pos = view.state.selection.from;
        const coords = view.coordsAtPos(pos);
        const rect = editorContainerRef.current?.getBoundingClientRect();

        setPasteOptions({
          open: true,
          html,
          text,
          x: rect ? coords.left - rect.left : 0,
          y: rect ? coords.bottom - rect.top : 0,
        });

        return true;
      },
    },
  });

  React.useEffect(() => {
    if (!pasteOptions.open) return;
    const onDown = (e: MouseEvent) => {
      const container = editorContainerRef.current;
      if (!container) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!container.contains(target)) {
        setPasteOptions((s) => ({ ...s, open: false }));
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pasteOptions.open]);

  // Sync external content prop changes
  React.useEffect(() => {
    if (!editor) return;
    if (content && content !== '<p></p>' && content !== editor.getHTML()) {
      console.log('📌 Syncing content from prop, length:', content.length);
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const applyPaste = (mode: 'keep' | 'clean' | 'text') => {
    const html = pasteOptions.html || '';
    const text = pasteOptions.text || '';

    let payload = '';
    if (mode === 'text') {
      payload = text;
    } else if (mode === 'clean') {
      payload = cleanPastedHtml(html) || text;
    } else {
      payload = html || text;
    }

    editor.chain().focus().insertContent(payload).run();
    setPasteOptions((s) => ({ ...s, open: false, html: '', text: '' }));
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToServer = async () => {
    if (!imageFile) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      throw new Error('Upload failed');
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const addImage = async () => {
    let finalImageUrl = imageUrl;

    // If file is selected, upload it first
    if (imageFile) {
      const uploadedUrl = await uploadImageToServer();
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }

    if (finalImageUrl) {
      editor.chain().focus().setImage({ src: finalImageUrl }).run();
      setImageUrl('');
      setImageFile(null);
      setShowImageDialog(false);
    }
  };

  const addLink = () => {
    if (linkUrl) {
      if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  };

  const ToolbarButton = ({ onClick, active, children, title }: any) => (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div ref={editorContainerRef} className="border rounded-md relative">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/50">
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Font Size */}
        <select
          className="h-8 text-sm border rounded px-2"
          onChange={(e) => {
            const size = e.target.value;
            if (size) {
              editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
            }
          }}
        >
          <option value="">Font Size</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="32px">32px</option>
        </select>

        {/* Text Color */}
        <input
          type="color"
          className="h-8 w-12 border rounded cursor-pointer"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          title="Text Color"
        />

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Media */}
        <ToolbarButton
          onClick={() => setShowImageDialog(true)}
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowLinkDialog(true)}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-8" />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        {onPreview && (
          <>
            <Separator orientation="vertical" className="mx-1 h-8" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </>
        )}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none"
      />

      {pasteOptions.open && (
        <div
          className="absolute z-50 bg-white border rounded-md shadow-lg p-2 flex items-center gap-2"
          style={{ left: pasteOptions.x, top: pasteOptions.y }}
        >
          <div className="text-xs text-muted-foreground pr-2">Paste Options:</div>
          <Button type="button" size="sm" variant="outline" onClick={() => applyPaste('keep')}>
            Keep
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyPaste('clean')}>
            Clean
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyPaste('text')}>
            Text
          </Button>
        </div>
      )}

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={(open) => {
        setShowImageDialog(open);
        if (!open) {
          setImageUrl('');
          setImageFile(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="imageFileUpload">Upload Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                  id="imageFileUpload"
                />
                <Label htmlFor="imageFileUpload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload image</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                </Label>
                {imageFile && (
                  <p className="text-sm text-green-600 mt-2">Selected: {imageFile.name}</p>
                )}
              </div>
              {imageUrl && (
                <div className="mt-2">
                  <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                </div>
              )}
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageFile ? '' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFile(null);
                }}
                placeholder="https://example.com/image.jpg"
                disabled={!!imageFile}
              />
            </div>
            
            <Button 
              onClick={addImage} 
              disabled={uploadingImage || (!imageUrl && !imageFile)}
              className="w-full"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Insert Image'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkUrl">URL</Label>
              <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="linkText">Link Text (optional)</Label>
              <Input
                id="linkText"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
              />
            </div>
            <Button onClick={addLink}>Insert Link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
