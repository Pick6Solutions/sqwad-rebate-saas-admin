import { Extension } from '@tiptap/core';

const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
            defaultSize: '16px',
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: this.options.defaultSize,
                        parseHTML: element => element.style.fontSize || this.options.defaultSize,
                        renderHTML: attributes => ({
                            style: `font-size: ${attributes.fontSize || this.options.defaultSize}`,
                        }),
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontSize: size => ({ chain }) => {
                return chain().setMark('textStyle', { fontSize: size || this.options.defaultSize }).run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain().setMark('textStyle', { fontSize: this.options.defaultSize }).run();
            },
        };
    },
});

export default FontSize;
