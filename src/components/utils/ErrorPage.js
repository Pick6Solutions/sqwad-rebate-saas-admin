import React, {Component} from 'react';
import '../../styles/css/AdminMain.css';
import logoImage from '../../styles/images/sqwad-hand.png';

class ErrorPage extends Component {
    constructor(props) {
        super();
        this.state = {
        };
    }

    componentDidMount(){
    }

    render() {
        return(
          <div className="backgroundImageHere">
            <div className="account-pages mt-5 mb-5">
              <div className="container" style={{backgroundColor:'none', position:'fixed', top:'50%', left:'50%', transform: 'translate(-50%, -50%)'}}>
                  <div className="row justify-content-center">
                      <div className="col-lg-5">
                          <div className="card">
                              <div className="card-header pt-4 pb-4 text-center" style={{color:'black'}}>
                                  <a href="index.html">
                                      <span><img src={logoImage} alt="" height="50"/></span>
                                  </a>
                              </div>

                              <div className="card-body p-4">
                                  <div className="text-center">
                                      <h4 className="text-uppercase text-danger mt-3" style={{fontWeight:'bolder', fontFamily:'Roboto'}}>Page Not Found</h4>
                                      <p className="text-muted mt-3" style={{fontWeight:'bold', fontFamily:'Roboto'}}>It's looking like you may have taken a wrong turn. Don't worry... it
                                          happens to the best of us. Check your link and make sure it is entered correctly!</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>
     )
    }
}

export default ErrorPage;
