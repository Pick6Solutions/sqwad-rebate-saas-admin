import React, { Component } from 'react';
import { PulseLoader as LoadingSpinner } from 'react-spinners'

class Loading extends Component {

  render() {
    if (this.props.loading === true) {
            return (
                <div style={{
                    marginTop: '200px',
                    textAlign: 'center',
                    position: 'absolute',
                    left: '0px',
                    top: '0px',
                    width: '100%',
                }}>
                    <LoadingSpinner color='#fff' loading={true} />
                </div>
            )
        }
    }
}

export default Loading;
