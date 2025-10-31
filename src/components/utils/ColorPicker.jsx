import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { PhotoshopPicker } from 'react-color'
import { Modal } from 'reactstrap'

/**
 * A reusable color input with swatch, text input, and inline modal picker.
 * Props:
 *  - name: string
 *  - label: string
 *  - value: string (hex color)
 *  - onChange: (hex: string) => void
 */
export default function ColorInput({ name, label, value, onChange }) {
    const [isPickerOpen, setPickerOpen] = useState(false)

    const openPicker = () => setPickerOpen(true)
    const closePicker = () => setPickerOpen(false)
    const handleAccept = () => setPickerOpen(false)
    const handleChangeComplete = color => {
        onChange(color.hex)
    }

    return (
        <>
            <div className="form-group">
                <label htmlFor={name}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                        style={{ marginRight: 8, cursor: 'pointer' }}
                        className="fa fa-eyedropper mobile-hide"
                        onClick={openPicker}
                    />
                    <div
                        style={{
                            backgroundColor: value,
                            marginRight: 8,
                            border: '1px solid #ccc',
                            height: 20,
                            width: 20,
                            cursor: 'pointer',
                        }}
                        onClick={openPicker}
                    />
                    <input
                        id={name}
                        name={name}
                        type="text"
                        className="form-control"
                        style={{ flex: 1 }}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder="#000"
                    />
                </div>
            </div>

            <Modal isOpen={isPickerOpen}>
                <PhotoshopPicker
                    color={value}
                    onChangeComplete={handleChangeComplete}
                    onAccept={handleAccept}
                    onCancel={closePicker}
                />
            </Modal>
        </>
    )
}

ColorInput.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
}
