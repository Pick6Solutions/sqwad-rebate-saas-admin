// src/richTextExtensions/ButtonNode.js
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { v4 as uuid } from 'uuid'
import ButtonView from '../richTextExtensions/ButtonView'

export const ButtonNode = Node.create({
    name: 'buttonNode',
    group: 'inline',
    inline: true,
    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {
                target: '_blank',
                rel: 'noopener noreferrer nofollow',
            },
        }
    },

    addAttributes() {
        return {
            id:              { default: null },
            label:           { default: 'Click me' },
            backgroundColor: { default: '#007bff' },
            textColor:       { default: '#ffffff' },
            padding:         { default: '4px 8px' },
            borderRadius:    { default: '4px' },
            borderColor:     { default: 'transparent' },  // ← NEW
            borderWidth:     { default: '1px' },          // ← NEW
            actionUrl:       { default: '' },
            target:          { default: this.options.HTMLAttributes.target },
            rel:             { default: this.options.HTMLAttributes.rel },
        }
    },

    addCommands() {
        return {
            setButtonNode: attrs => ({ commands }) => {
                const a = { ...attrs }
                if (!a.id) a.id = uuid()
                a.target ??= this.options.HTMLAttributes.target
                a.rel    ??= this.options.HTMLAttributes.rel
                return commands.insertContent({ type: this.name, attrs: a })
            },
            updateButtonNode: attrs => ({ commands }) =>
                commands.updateAttributes(this.name, attrs),
        }
    },

    parseHTML() {
        return [{
            tag: 'button[data-button-node]',
            getAttrs: dom => {
                const element = dom
                const style   = getComputedStyle(element)
                return {
                    id:              element.getAttribute('data-id'),
                    label:           element.getAttribute('data-label')           ?? element.textContent ?? '',
                    backgroundColor: element.getAttribute('data-background-color') ?? style.backgroundColor,
                    textColor:       element.getAttribute('data-text-color')       ?? style.color,
                    padding:         element.getAttribute('data-padding')          ?? style.padding,
                    borderRadius:    element.getAttribute('data-border-radius')    ?? style.borderRadius,
                    borderColor:     element.getAttribute('data-border-color')     ?? style.borderColor,
                    borderWidth:     element.getAttribute('data-border-width')     ?? style.borderWidth,
                    actionUrl:       element.getAttribute('data-action-url'),
                    target:          element.getAttribute('target'),
                    rel:             element.getAttribute('rel'),
                }
            },
        }]
    },

    renderHTML({ node }) {
        const {
            id,
            label,
            backgroundColor,
            textColor,
            padding,
            borderRadius,
            borderColor,
            borderWidth,
            actionUrl,
            target,
            rel,
        } = node.attrs

        const style = `
      background-color: ${backgroundColor};
      color: ${textColor};
      padding: ${padding};
      border-radius: ${borderRadius};
      border: ${borderWidth} solid ${borderColor};
      cursor: pointer;
    `.trim()

        const onclick = actionUrl
            ? `window.open('${actionUrl.replace(/'/g, "\\'")}', '${target}')`
            : undefined

        return [
            'button',
            mergeAttributes({
                'data-button-node':     '',
                'data-id':              id,
                'data-label':           label,
                'data-background-color':backgroundColor,
                'data-text-color':      textColor,
                'data-padding':         padding,
                'data-border-radius':   borderRadius,
                'data-border-color':    borderColor,
                'data-border-width':    borderWidth,
                'data-action-url':      actionUrl,
                onclick,
                target,
                rel,
                style,
                type: 'button',
            }),
            label,
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ButtonView)
    },
})
