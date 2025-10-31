// src/components/ButtonView.jsx
import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'

export default function ButtonView({ node }) {
    const {
        label,
        backgroundColor,
        textColor,
        padding,
        borderRadius,
        borderColor,
        borderWidth,
        actionUrl,
    } = node.attrs

    return (
        <NodeViewWrapper style={{ display: 'inline-block' }}>
            <button
                type="button"
                contentEditable={false}
                style={{
                    backgroundColor,
                    color: textColor,
                    padding,
                    borderRadius,
                    border: `${borderWidth} solid ${borderColor}`,
                    cursor: 'pointer',
                }}
                onClick={() => {
                    if (actionUrl) window.open(actionUrl, '_blank')
                    else console.log('No action defined')
                }}
            >
                {label}
            </button>
        </NodeViewWrapper>
    )
}
