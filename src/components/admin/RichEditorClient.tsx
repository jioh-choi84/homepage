'use client';

import { useState, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, Underline,
  Link, List, BlockQuote, Autoformat, PasteFromOffice,
  Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageUpload, AutoImage, LinkImage,
  MediaEmbed,
  Plugin, Command, ButtonView,
  type Editor, type EditorConfig, type FileLoader, type UploadResponse,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { compressImage, isTiff } from '@/lib/image-compress';
import {
  isCloudinaryUrl, stripCloudinaryCrop, applyCloudinaryCrop,
} from '@/lib/cloudinary-crop';

const COMPRESS_THRESHOLD = Math.floor(9.5 * 1024 * 1024);
async function uploadToCloudinary(file: File): Promise<string> {
  const uploadFile = (isTiff(file) || file.size > COMPRESS_THRESHOLD) ? await compressImage(file) : file;
  const sigRes = await fetch(`/api/portfolio/upload?filename=${encodeURIComponent(uploadFile.name)}&contentType=${encodeURIComponent(uploadFile.type)}`);
  if (!sigRes.ok) throw new Error('upload sign failed');
  const { signature, timestamp, publicId, folder, cloudName, apiKey } = await sigRes.json();
  const fd = new FormData();
  fd.append('file', uploadFile);
  fd.append('api_key', apiKey);
  fd.append('timestamp', String(timestamp));
  fd.append('signature', signature);
  fd.append('folder', folder);
  fd.append('public_id', publicId);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
  if (!up.ok) throw new Error('cloudinary upload failed');
  return (await up.json()).secure_url as string;
}

// CKEditor 업로드 어댑터 → Cloudinary
class CloudinaryAdapter {
  loader: FileLoader;
  constructor(loader: FileLoader) { this.loader = loader; }
  async upload(): Promise<UploadResponse> {
    const file = await this.loader.file;
    if (!file) throw new Error('no file');
    const url = await uploadToCloudinary(file);
    return { default: url };
  }
  abort() { /* noop */ }
}
function CloudinaryUploadPlugin(editor: Editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: FileLoader) => new CloudinaryAdapter(loader);
}

// 선택된 미디어(YouTube 등)의 너비를 설정하는 커맨드
class SetMediaWidthCommand extends Command {
  override execute({ value }: { value: string | null }) {
    const model = this.editor.model;
    const el = model.document.selection.getSelectedElement();
    if (el && el.is('element', 'media')) {
      model.change((writer) => {
        if (value) writer.setAttribute('mediaWidth', value, el);
        else writer.removeAttribute('mediaWidth', el);
      });
    }
  }
  override refresh() {
    const el = this.editor.model.document.selection.getSelectedElement();
    this.isEnabled = !!(el && el.is('element', 'media'));
  }
}

// 미디어 너비(mediaWidth) 모델속성 ↔ figure.media 의 style:width 변환 + 너비 버튼
// MediaEmbed가 'media' 스키마를 먼저 등록하도록 requires로 의존성 보장
class ResizableMediaPlugin extends Plugin {
  static get requires() { return [MediaEmbed]; }
  static get pluginName() { return 'ResizableMediaPlugin'; }
  init() {
    const editor = this.editor;
  editor.model.schema.extend('media', { allowAttributes: ['mediaWidth'] });

  // downcast(편집뷰 + 데이터): mediaWidth -> figure style width
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor.conversion.for('downcast').add((dispatcher: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatcher.on('attribute:mediaWidth:media', (evt: any, data: any, api: any) => {
      if (!api.consumable.consume(data.item, evt.name)) return;
      const figure = api.mapper.toViewElement(data.item);
      if (!figure) return;
      if (data.attributeNewValue) api.writer.setStyle('width', data.attributeNewValue, figure);
      else api.writer.removeStyle('width', figure);
    });
  });

  // upcast(불러오기): figure.media 의 style width -> mediaWidth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor.conversion.for('upcast').add((dispatcher: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatcher.on('element:figure', (evt: any, data: any, api: any) => {
      const figure = data.viewItem;
      if (!figure.hasClass || !figure.hasClass('media')) return;
      const width = figure.getStyle && figure.getStyle('width');
      if (!width || !data.modelRange) return;
      for (const item of data.modelRange.getItems()) {
        if (item.is('element', 'media')) { api.writer.setAttribute('mediaWidth', width, item); break; }
      }
    }, { priority: 'low' });
  });

  editor.commands.add('setMediaWidth', new SetMediaWidthCommand(editor));

  const sizes: { name: string; label: string; value: string | null }[] = [
    { name: 'mediaWidthSmall', label: '▶ 50%', value: '50%' },
    { name: 'mediaWidthMedium', label: '▶ 75%', value: '75%' },
    { name: 'mediaWidthFull', label: '▶ 100%', value: null },
  ];
  for (const s of sizes) {
    editor.ui.componentFactory.add(s.name, (locale) => {
      const btn = new ButtonView(locale);
      btn.set({ label: s.label, tooltip: `동영상 너비 ${s.value ?? '100%'}`, withText: true });
      const cmd = editor.commands.get('setMediaWidth')!;
      btn.bind('isEnabled').to(cmd);
      btn.on('execute', () => { editor.execute('setMediaWidth', { value: s.value }); editor.editing.view.focus(); });
      return btn;
    });
  }
  }
}

// 선택된 이미지 자르기 요청 — React 크롭 모달을 띄운다(실제 crop은 Cloudinary URL 변환).
// Cloudinary 이미지일 때만 활성화. 자르기 적용/해제는 모달에서 모델 src를 교체한다.
class CropImageCommand extends Command {
  override execute() {
    const el = this.editor.model.document.selection.getSelectedElement();
    if (!el) return;
    const src = el.getAttribute('src') as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.editor as any).fire('chuniCropRequest', { element: el, src });
  }
  override refresh() {
    const el = this.editor.model.document.selection.getSelectedElement();
    const isImg = !!(el && (el.is('element', 'imageBlock') || el.is('element', 'imageInline')));
    const src = isImg ? (el!.getAttribute('src') as string) : '';
    this.isEnabled = isImg && isCloudinaryUrl(src || '');
  }
}

class CropImagePlugin extends Plugin {
  static get requires() { return [Image]; }
  static get pluginName() { return 'CropImagePlugin'; }
  init() {
    const editor = this.editor;
    editor.commands.add('chuniCropImage', new CropImageCommand(editor));
    editor.ui.componentFactory.add('cropImage', (locale) => {
      const btn = new ButtonView(locale);
      btn.set({ label: '자르기', tooltip: '이미지 자르기 (Crop)', withText: true });
      const cmd = editor.commands.get('chuniCropImage')!;
      btn.bind('isEnabled').to(cmd);
      btn.on('execute', () => editor.execute('chuniCropImage'));
      return btn;
    });
  }
}

// 전체 기능 편집기(글·이미지·유튜브)
const fullConfig: EditorConfig = {
  licenseKey: 'GPL',
  plugins: [
    Essentials, Paragraph, Heading, Bold, Italic, Underline, Link, List, BlockQuote,
    Autoformat, PasteFromOffice,
    Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageUpload, AutoImage, LinkImage,
    MediaEmbed,
  ],
  extraPlugins: [CloudinaryUploadPlugin, ResizableMediaPlugin, CropImagePlugin],
  toolbar: [
    'undo', 'redo', '|',
    'heading', '|',
    'bold', 'italic', 'underline', 'link', '|',
    'bulletedList', 'numberedList', 'blockQuote', '|',
    'insertImage', 'mediaEmbed', '|',
    'mediaWidthSmall', 'mediaWidthMedium', 'mediaWidthFull',
  ],
  image: {
    resizeUnit: '%',
    toolbar: [
      'imageStyle:alignLeft', 'imageStyle:alignCenter', 'imageStyle:alignRight', '|',
      'resizeImage', 'cropImage', '|',
      'toggleImageCaption', 'imageTextAlternative',
    ],
  },
  mediaEmbed: { previewsInData: true },
};

// 글 전용 편집기 — 이미지/동영상 제외(영문 번역용). 이미지·영상은 한글 본문에서만 관리.
const textOnlyConfig: EditorConfig = {
  licenseKey: 'GPL',
  plugins: [
    Essentials, Paragraph, Heading, Bold, Italic, Underline, Link, List, BlockQuote,
    Autoformat, PasteFromOffice,
  ],
  toolbar: [
    'undo', 'redo', '|',
    'heading', '|',
    'bold', 'italic', 'underline', 'link', '|',
    'bulletedList', 'numberedList', 'blockQuote',
  ],
};

export default function RichEditorClient({ value, onChange, textOnly = false }: { value: string; onChange: (html: string) => void; textOnly?: boolean }) {
  const editorRef = useRef<Editor | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // 크롭 대상: 선택된 이미지의 모델 element + 현재 src. base=crop 없는 원본(모달은 원본을 보여줌)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cropTarget, setCropTarget] = useState<{ element: any; base: string } | null>(null);
  // 초기 선택은 비워둔다(undefined) → 첫 드래그가 새 영역을 그린다.
  // (기본 선택이 이미지를 거의 덮으면 안쪽 드래그가 '이동'으로 처리돼 새로 그릴 수 없음)
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const hasSelection = !!(crop && crop.width && crop.height);

  const closeCrop = () => setCropTarget(null);

  // 모델 이미지의 src 교체(자르기 적용/해제 공통)
  const setImageSrc = (newSrc: string) => {
    const editor = editorRef.current;
    if (!editor || !cropTarget) return;
    editor.model.change((writer) => writer.setAttribute('src', newSrc, cropTarget.element));
    closeCrop();
  };

  const applyCrop = () => {
    if (!cropTarget || !crop || !hasSelection) return;
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    // ReactCrop crop은 %단위(원본 표시 이미지 기준). 원본 '픽셀' 좌표로 변환해 c_crop 적용.
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImageSrc(applyCloudinaryCrop(cropTarget.base, {
      x: (crop.x / 100) * nw,
      y: (crop.y / 100) * nh,
      width: (crop.width / 100) * nw,
      height: (crop.height / 100) * nh,
    }));
  };

  const resetCrop = () => {
    if (!cropTarget) return;
    setImageSrc(cropTarget.base); // 원본(crop 해제)으로 되돌림
  };

  return (
    <div className="ck-wrap">
      <CKEditor
        editor={ClassicEditor}
        config={textOnly ? textOnlyConfig : fullConfig}
        data={value || ''}
        onChange={(_e, editor) => onChange(editor.getData())}
        onReady={(editor) => {
          editorRef.current = editor;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor as any).on('chuniCropRequest', (_evt: unknown, data: { element: unknown; src: string }) => {
            const base = stripCloudinaryCrop(data.src);
            setCrop(undefined); // 빈 상태로 시작 → 드래그로 새 영역 선택(원본 base 위에서)
            setCropTarget({ element: data.element, base });
          });
        }}
      />

      {cropTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-5">
            <h3 className="text-lg font-medium mb-1 text-gray-900">이미지 자르기</h3>
            <p className="text-sm text-gray-500 mb-3">
              이미지 위에서 <b>마우스로 드래그</b>해 자를 영역을 그리세요. 모서리를 끌어 크기를 조절할 수 있습니다. 원본은 보존되며 언제든 다시 조정할 수 있습니다.
            </p>
            <div className="flex justify-center bg-gray-100 rounded p-2">
              <ReactCrop crop={crop} onChange={(_px, percent) => setCrop(percent)} minWidth={16} minHeight={16}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imgRef} src={cropTarget.base} alt="" className="max-h-[60vh] w-auto object-contain select-none" draggable={false} />
              </ReactCrop>
            </div>
            <div className="flex items-center justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={resetCrop}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                원본으로 (자르기 해제)
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCrop}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={!hasSelection}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
