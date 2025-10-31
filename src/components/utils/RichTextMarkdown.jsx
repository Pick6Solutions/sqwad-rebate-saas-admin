import React, { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import LinkExtension from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import FontSize from '../richTextExtensions/FontSizeExtension'
import HardBreak from '@tiptap/extension-hard-break'
import Image from '@tiptap/extension-image'
import UploadImage from '../utils/UploadImage'
import { Column, Row } from 'simple-flexbox'
import { Modal, ModalHeader, ModalBody, Button as RSButton } from 'reactstrap'
import { isEmptyHtmlEntity, validUrl } from './HelpfulFunction'
import swal from 'sweetalert2'
import { ButtonNode } from '../richTextExtensions/ButtonNode'
import ColorInput from '../utils/ColorPicker'
import TextAlign from '@tiptap/extension-text-align'
import 'prosemirror-view/style/prosemirror.css'

const RichTextMarkdown = ({
                              placeholder,
                              form = {},
                              field = {},
                              label,
                              sublabel,
                              handleChange,
                              allowParagraphAlignment,
                              overrideMlbBlock,
                              allowButtons,
                          }) => {
    const fileInputRef = useRef(null)
    const [selectedFontSize, setSelectedFontSize] = useState('16px')
    const [showButtonModal, setShowButtonModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [btnForm, setBtnForm] = useState({
        id: null,
        label: 'Click me',
        backgroundColor: '#007bff',
        textColor: '#ffffff',
        padding: '4px 8px',
        borderRadius: '4px',
        borderColor: 'transparent',
        borderWidth: '0px',
        actionUrl: '',
        openInNewTab: true,
    })
    const isMlbApp = process.env.REACT_APP_IS_MLB_TEAM === 'true'
    const defaultLinkAttrs = LinkExtension.options.HTMLAttributes || {
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
        }

    const editor = useEditor({
        extensions: [
            Document,
            Paragraph.configure({
                HTMLAttributes: { style: 'min-height:24px' },
            }),
            Text,
            Underline,
            Bold,
            Italic,
            Image.configure({
                inline: true,
                draggable: true,
                HTMLAttributes: {
                    style: 'max-width: 100%; height: auto;'
                },
            }),
            Placeholder.configure({ placeholder }),
            LinkExtension.configure({ HTMLAttributes: defaultLinkAttrs }),
            TextStyle,
            FontSize,
            HardBreak,
            ButtonNode,
            ...(allowParagraphAlignment
                ? [TextAlign.configure({ types: ['paragraph'] })]
                : []),
        ],
        editorProps: { attributes: { class: 'form-control' } },
        content: '',
        onUpdate: ({ editor }) => {
            let html = editor.getHTML()
            if (isEmptyHtmlEntity(html)) html = ''
            if (field.value !== html) {
                form.setFieldValue(field.name, html)
                handleChange?.(html)
            }
        },
    })

    useEffect(() => {
        if (editor && field.value && editor.getHTML() !== field.value) {
            editor.commands.setContent(field.value)
        }
    }, [editor, field.value])

    useEffect(() => {
        if (!editor) return
        const updateSize = () => {
            const { from, to } = editor.state.selection
            const sizes = new Set()
            editor.view.state.doc.nodesBetween(from, to, (node) => {
                if (node.isText) {
                    const mark = node.marks.find(
                        (m) => m.type.name === 'textStyle' && m.attrs.fontSize,
                    )
                    sizes.add(mark ? mark.attrs.fontSize : '16px')
                }
            })
            setSelectedFontSize(
                sizes.size === 1 ? [...sizes][0] : sizes.size > 1 ? '' : '16px',
            )
        }
        editor.on('selectionUpdate', updateSize)
        return () => editor.off('selectionUpdate', updateSize)
    }, [editor])

    const cmd = (fn, arg) => editor.chain().focus()[fn](arg).run()
    const handleBold = () => cmd('toggleBold')
    const handleItalic = () => cmd('toggleItalic')
    const handleUnderline = () => cmd('toggleUnderline')
    const handleUnlink = () => cmd('unsetLink')
    const handleLineBreak = () => editor.chain().focus().splitBlock().run()
    const handleFontSizeChange = (e) => {
        const sz = e.target.value;
        setSelectedFontSize(sz)
        cmd(sz ? 'setFontSize' : 'unsetFontSize', sz || undefined)
    }
    const handleLink = async () => {
        const { value } = await swal.fire({
            title: 'Enter URL',
            html: `
            <input type="text" id="swal-input-url" class="swal2-input" placeholder="Enter your URL here">
            <div style="text-align: left; margin-top: 10px;">
                <input type="checkbox" id="swal-input-target" checked>
                <label for="swal-input-target">Open in new window</label>
            </div>
            <div style="text-align: left; margin-top: 10px;">
                <input type="checkbox" id="swal-input-target-2" checked>
                <label for="swal-input-target-2">Validate URL</label>
            </div>
        `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Add Link',
            preConfirm: () => {
                const url = document.getElementById('swal-input-url').value;
                const openInNewWindow = document.getElementById('swal-input-target').checked;
                const validateUrlCheckbox = document.getElementById('swal-input-target-2').checked;
                if (validateUrlCheckbox && !validUrl(url)) {
                    swal.showValidationMessage('Invalid URL. Please ensure the URL format is correct');
                }
                return { url, openInNewWindow };
            }
        });

        if (editor && value && value.url) {
            // Set up the link options
            const linkOptions = { href: value.url };
            if (value.openInNewWindow) {
                linkOptions.target = '_blank';
            }
            // Apply the link using TipTap's command chain
            editor.chain().focus().extendMarkRange('link').setLink(linkOptions).run();
        }
    }

    const handleImageUpload = () => fileInputRef.current?.click()
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const { error, imageUrl } = await new UploadImage().upload_file(file)
        if (error) swal.fire('Error', error, 'warning')
        else cmd('setImage', { src: imageUrl })
    }

    const openAddButton = () => {
        const { from, to } = editor.state.selection
        const found = []
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'buttonNode') found.push({ node, pos })
        })

        if (found.length) {
            const { node, pos } = found[0]
            const currentTarget = node.attrs.target ?? defaultLinkAttrs.target
            setBtnForm({ ...node.attrs, openInNewTab: currentTarget === defaultLinkAttrs.target })
            setIsEditing(true)
            editor
                .chain()
                .focus()
                .setTextSelection({ from: pos, to: pos + node.nodeSize })
                .run()
        } else {
            setBtnForm({
                id: null,
                label: 'Click me',
                backgroundColor: '#007bff',
                textColor: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                borderColor: 'transparent',
                borderWidth: '0px',
                actionUrl: '',
                openInNewTab: true,
            })
            setIsEditing(false)
        }
        setShowButtonModal(true)
    }
    const closeAddButton = () => setShowButtonModal(false)
    const onButtonField = (key) => (e) => setBtnForm((f) => ({ ...f, [key]: e.target.value }))
    const toggleNewTab = () => setBtnForm((f) => ({ ...f, openInNewTab: !f.openInNewTab }))

    const insertOrUpdateButton = () => {
        const { openInNewTab, ...rest } = btnForm
        const attrs = {
            ...rest,
            target: openInNewTab ? defaultLinkAttrs.target : '_self',
            rel: defaultLinkAttrs.rel,
        }
        const chain = editor.chain().focus()
        isEditing ? chain.updateButtonNode(attrs) : chain.setButtonNode(attrs)
        chain.run()
        closeAddButton()
    }

    const applyAlign = (alignment) => {
        if (!editor) return;

        // If there's no text selected, apply to every paragraph in the doc
        if (editor.state.selection.empty) {
            editor
                .chain()
                .focus()
                .command(({ tr }) => {
                    tr.doc.descendants((node, pos) => {
                        if (node.type.name === 'paragraph') {
                            tr.setNodeMarkup(
                                pos,
                                node.type,
                                { ...node.attrs, textAlign: alignment },
                                node.marks
                            );
                        }
                    });
                    return true;
                })
                .run();
        }
        // Otherwise just align the selected blocks
        else {
            editor.chain().focus().setTextAlign(alignment).run();
        }
    };

    return (
        <>
            <Column style={{ width: '100%', maxWidth: 800, marginBottom: 10 }}>
                <Row>
                    <label htmlFor={field.id || field.name}>{label}</label>
                </Row>
                <Row>
                    <span className="form-text">{sublabel}</span>
                </Row>
                <Row
                    className="btn-group mb-3"
                    style={{ maxWidth: allowParagraphAlignment ? 500 : 300 }}
                    role="group"
                >
                    <button
                        type="button"
                        onClick={handleBold}
                        className="btn btn-light"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        onClick={handleItalic}
                        className="btn btn-light"
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        onClick={handleUnderline}
                        className="btn btn-light"
                    >
                        <u>U</u>
                    </button>
                    {(!isMlbApp || overrideMlbBlock) && (
                        <>
                            <button
                                type="button"
                                onClick={handleLink}
                                className="btn btn-light"
                            >
                                <i className="fa fa-link" />
                            </button>
                            <button
                                type="button"
                                onClick={handleUnlink}
                                className="btn btn-light"
                            >
                                <i className="fa fa-unlink" />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={handleLineBreak}
                        className="btn btn-light"
                    >
                        <i className="fa fa-minus" />
                    </button>
                    <button
                        type="button"
                        onClick={handleImageUpload}
                        className="btn btn-light"
                    >
                        <i className="fa fa-image" />
                    </button>
                    {allowParagraphAlignment && (
                        <>
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => applyAlign('left')}
                            >
                                <i className="fa fa-align-left" />
                            </button>
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => {
                                    applyAlign('center')
                                }}
                            >
                                <i className="fa fa-align-center" />
                            </button>
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() =>
                                    editor.chain().focus().setTextAlign('right').run()
                                }
                            >
                                <i className="fa fa-align-right" />
                            </button>
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() =>
                                    editor.chain().focus().setTextAlign('justify').run()
                                }
                            >
                                <i className="fa fa-align-justify" />
                            </button>
                        </>
                    )}
                    {allowButtons && (
                        <button
                            type="button"
                            onClick={openAddButton}
                            className="btn btn-light"
                        >
                            <i className="fa fa-square" />
                        </button>
                    )}
                    <select
                        onChange={handleFontSizeChange}
                        value={selectedFontSize}
                        className="form-select"
                        style={{ width: 100 }}
                    >
                        <option value="">Size</option>
                        {['8px', '12px','14px','16px','18px','20px','24px','28px','32px','48px','72px'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </Row>
                <Row flexGrow={1}>
                    <EditorContent editor={editor} style={{ width:'100%', fontFamily:'Helvetica' }} />
                </Row>
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display:'none' }}
                />
                {form.touched?.[field.name] && form.errors?.[field.name] && (
                    <div className="alert alert-danger mt-3">
                        {form.errors[field.name]}
                    </div>
                )}
            </Column>

            <Modal isOpen={showButtonModal} toggle={closeAddButton}>
                <ModalHeader toggle={closeAddButton}>
                    {isEditing ? 'Edit Button' : 'Insert Button'}
                </ModalHeader>
                <ModalBody style={{ padding:20 }}>
                    <div className="form-group">
                        <label>Label</label>
                        <input
                            className="form-control"
                            value={btnForm.label}
                            onChange={onButtonField('label')}
                        />
                    </div>
                    <div className="form-group">
                        <label>Action URL</label>
                        <input
                            type="url"
                            className="form-control"
                            placeholder="https://example.com"
                            value={btnForm.actionUrl}
                            onChange={onButtonField('actionUrl')}
                        />
                    </div>
                    <div className="form-check mb-3">
                        <input
                            id="newTabCheck"
                            type="checkbox"
                            className="form-check-input"
                            checked={btnForm.openInNewTab}
                            onChange={toggleNewTab}
                        />
                        <label htmlFor="newTabCheck" className="form-check-label">
                            Open in new tab
                        </label>
                    </div>
                    <div className="row mb-3">
                        <div className="col">
                            <ColorInput
                                name="backgroundColor"
                                label="Background Color"
                                value={btnForm.backgroundColor}
                                onChange={hex =>
                                    setBtnForm(f => ({ ...f, backgroundColor: hex }))
                                }
                            />
                        </div>
                        <div className="col">
                            <ColorInput
                                name="textColor"
                                label="Text Color"
                                value={btnForm.textColor}
                                onChange={hex => setBtnForm(f => ({ ...f, textColor: hex }))}
                            />
                        </div>
                        <div className="col">
                            <ColorInput
                                name="borderColor"
                                label="Border Color"
                                value={btnForm.borderColor}
                                onChange={hex =>
                                    setBtnForm(f => ({ ...f, borderColor: hex }))
                                }
                            />
                        </div>
                    </div>
                    <div className="form-group mb-3">
                        <label>Padding</label>
                        <input
                            className="form-control"
                            placeholder="e.g. 4px 8px"
                            value={btnForm.padding}
                            onChange={onButtonField('padding')}
                        />
                    </div>
                    <div className="form-group mb-3">
                        <label>Border Radius</label>
                        <input
                            className="form-control"
                            placeholder="e.g. 4px"
                            value={btnForm.borderRadius}
                            onChange={onButtonField('borderRadius')}
                        />
                    </div>
                    <div className="form-group mb-3">
                        <label>Border Size</label>
                        <input
                            className="form-control"
                            placeholder="e.g. 1px"
                            value={btnForm.borderWidth}
                            onChange={onButtonField('borderWidth')}
                        />
                    </div>
                    <RSButton color="primary" block onClick={insertOrUpdateButton}>
                        {isEditing ? 'Save' : 'Insert'}
                    </RSButton>
                </ModalBody>
            </Modal>
        </>
    )
}

export default RichTextMarkdown
