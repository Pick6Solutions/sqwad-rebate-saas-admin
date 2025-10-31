import React, {Component} from 'react';
import Dropzone from 'react-dropzone';
import '../../styles/css/DropzoneCSS.css';

class BasicDropzone extends Component {
    constructor(props) {
        super(props);
        this.onDrop = (files, rejectedFiles, argument) => {
            this.props.onDrop(files, rejectedFiles, argument)
        };
    }

    render() {
        const {maxFiles=1, multiple=false, maxSize=2200000, accept='image/*', preview} = this.props;

        return (
            <Dropzone onDrop={this.onDrop} maxFiles={maxFiles} multiple={multiple} maxSize={maxSize} accept={accept}>
                {({getRootProps, getInputProps}) => (
                    <section className="container">
                        <div {...getRootProps({className: 'dropzone'})}>
                            {!preview &&
                                <>
                                    <input {...getInputProps()} />
                                    <p>Drag 'n' drop some files here, or click to select files</p>
                                </>
                            }
                            {preview &&
                                <img
                                    src={preview}
                                    width="100px"
                                    height="auto"
                                    alt="Drop your image here"
                                />
                            }
                        </div>
                    </section>
                )}
            </Dropzone>
        );
    }
}

export default BasicDropzone
