import React, { Component } from 'react'
import '../../styles/css/SideMenu.css'
import '../../styles/css/AdminMain.css'
import '../../styles/css/TopBar.css'
import logoImage from '../../styles/images/sqwad-hand.png';

class TopBar extends Component {
    render() {
        return (
          <div className="admin-topbar">
            <p className="topBarText">
              <img src={logoImage} width="50px" height="auto" alt="Team" className="rounded-circle" style={{marginRight:'5px'}}/>
              SQWAD
            </p>
          </div>

        );
    }
}

export default TopBar
