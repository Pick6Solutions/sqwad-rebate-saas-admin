import React, { Component } from 'react'
import '../../styles/css/SideMenu.css'
import '../../styles/css/AdminMain.css'
import logoWithTextImage from '../../styles/images/sqwad_white_logo_w_text.png';
import {getAuth, signOut} from "firebase/auth";

class SideMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
        this.logOut = this.logOut.bind(this)
    }

    componentDidMount() {}


    logOut() {
      const auth = getAuth();
      signOut(auth).then(() => {
        this.setState({ redirect: true });
      }).catch((error) => {
        // Handle errors here
        console.error("Sign out error", error);
      });
    }

    render() {
      const homeLink = "/admin";
      const scratcherGameLink = "/setupgame";
      const ticketsLink = "/setuptickets";
      const questionsLink = "/setupquestions";
      const teamVariables = "/setupteamvariables";
      const rulesAndRegs = "/setuprulesandregs";
      const ticketEmail = "/setupticketemail";
      const loginVariables = "/setuploginvariables";
      const setUpShopLink = "/setupshop";

        return (
          <div className="admin-sidebar">
            <div className="logo">
              <a href={homeLink}>
                <div className="logo-img"><img src={logoWithTextImage} height="30" alt=""/></div>
              </a>
            </div>
            <div className="nav-container">
              <ul className="nav">
                <li className="side-menu-items">
                  <a href={homeLink}>
                    <span className="fa fa-home pre_side_item"/>
                    <span className="">Dashboard</span>
                    <span className="fa fa-chevron-right after_fa_side"/>
                  </a>
                </li>
                {/*<li className="">*/}
                {/*  <a href={scratcherGameLink}>*/}
                {/*    <span className="fa fa-gamepad pre_side_item"/>*/}
                {/*    <span className="">Games</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                {/*<li className="">*/}
                {/*  <a href={questionsLink}>*/}
                {/*    <span className="fa fa-question pre_side_item"/>*/}
                {/*    <span className="">Predictions</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                {/*<li className="">*/}
                {/*  <a href={ticketsLink}>*/}
                {/*    <span className="fa fa-trophy pre_side_item"/>*/}
                {/*    <span className="">Prizes</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                {/*<li className="">*/}
                {/*  <a href={teamVariables}>*/}
                {/*    <span className="fa fa-pencil-square-o pre_side_item"/>*/}
                {/*    <span className="">Game Branding</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                {/*<li className="">*/}
                {/*  <a href={rulesAndRegs}>*/}
                {/*    <span className="fa fa-legal pre_side_item"/>*/}
                {/*    <span className="">Rules And Regs</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                {/*<li className="">*/}
                {/*  <a href={ticketEmail}>*/}
                {/*    <span className="fa fa-envelope-open-o pre_side_item"/>*/}
                {/*    <span className="text">Email Branding</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                <li className="">
                  <a href={setUpShopLink}>
                    <span className="fa fa-building pre_side_item"/>
                    <span className="text">Shops</span>
                    <span className="fa fa-chevron-right after_fa_side"/>
                  </a>
                </li>
                {/*<li className="">*/}
                {/*  <a href={loginVariables}>*/}
                {/*    <span className="fa fa-users pre_side_item"/>*/}
                {/*    <span className="text">Fan Login</span>*/}
                {/*    <span className="fa fa-chevron-right after_fa_side"/>*/}
                {/*  </a>*/}
                {/*</li>*/}
                <div className="bottom-buttons">
                  <li className="" onClick={this.logOut}>
                    <a href={homeLink}>
                      <span className="fa fa-sign-out pre_side_item"/>
                      <span className="text">Logout</span>
                      <span className="fa fa-chevron-right after_fa_side"/>
                    </a>
                  </li>
                </div>
              </ul>
            </div>
          </div>

        );
    }
}

export default SideMenu
