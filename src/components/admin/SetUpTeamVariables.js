import React, {Component} from 'react'
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import UploadImage from '../utils/UploadImage';
import {onValue, ref, set} from 'firebase/database';
//import {database} from '../../base';
import '../../styles/css/AdminMain.css';
import {ErrorMessage, Toast} from '../utils/HelpfulFunction';
import RichTextMarkdown from "../utils/RichTextMarkdown";
import ColorPicker from "../utils/ColorPicker";

class SetUpTeamVariables extends Component {
    constructor(props) {
        super(props);
        this.UploadImage = new UploadImage();
        this.state = {
            tenantVariables: {},
            showTabOneMajor: true,
            showTabTwoMajor: false,
            showTabThreeMajor: false,
            showTabOneMinor: true,
            showTabTwoMinor: false,
            showTabThreeMinor: false,
            loading:true,
            colorsTab: true,
            advanced: false
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleImageChange = this.handleImageChange.bind(this);
        this.handleCheckBoxChange = this.handleCheckBoxChange.bind(this);
    }

    componentDidMount() {
        const tenantVariablesRef = ref(database, 'tenantVariables');
        onValue(tenantVariablesRef, (snapshot) => {
            const tenantVariables = snapshot.val() || {};
            this.setState({
                tenantVariables,
                loading: false
            });
        });
    }

    handleSubmit(event) {
      event.preventDefault();
      const variables = this.state.tenantVariables;
        const tenantVariablesRef = ref(database, 'tenantVariables');
        set(tenantVariablesRef, variables)
            .then(() => {
                this.setState({ loading: false });
                Toast.fire({
                    title: 'Tenant Variables Updated!'
                });
            })
            .catch((err) => {
                this.setState({ loading: false });
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again and if the problem persists try logging out and logging back in'
                });
                console.log(err);
            });
    }

    handleChange (evt) {
        let target = evt.target;
        let value = target.value;
        if(target.type === 'checkbox'){
            value = target.checked;
            this.setState({[target.name]: value})
        } else {
            let tenantVariablesCopy = this.state.tenantVariables;
            tenantVariablesCopy[evt.target.name] = value
            this.setState({ tenantVariables:  tenantVariablesCopy});
        }
    }

    handleRichTextChange = (name, text) => {
        let tenantVariablesCopy = this.state.tenantVariables;
        tenantVariablesCopy[name] = text;
        this.setState({ tenantVariables:  tenantVariablesCopy});
    }

    handleCheckBoxChange(evt){
        let target = evt.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ [evt.target.name]: value });
    }

    handleImageChange(event) {
        let name_of_file = event.target.name;
        let target = this[name_of_file];
        let file_to_update = target.files[0];
        this.setState({ loading: true });
        this.UploadImage.upload_file(file_to_update).then(res => {
            this.setState({ loading: false });
            if (res.error) {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: res.error
                });
            } else if (res.imageUrl) {
                const tenantVariablesCopy = this.state.tenantVariables;
                tenantVariablesCopy[name_of_file] = res.imageUrl;
                this.setState({
                    tenantVariables: tenantVariablesCopy,
                }, () => {
                    this[name_of_file].value = "";
                });
            } else {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: 'There was some issue with the image upload, please check the image type and size and try again'
                });
            }
        });
    }

    toggleColors(){
        if(this.state.colorsTab){
            document.getElementById('showColors').classList.remove('active');
            document.getElementById('showImages').classList.add('active');
        } else {
            document.getElementById('showColors').classList.add('active');
            document.getElementById('showImages').classList.remove('active');
        }
        this.setState({colorsTab: !this.state.colorsTab})
    }

    tripleToggleControl(element, whichToggle){
        const tabOne = "showTabOne" + whichToggle;
        const tabTwo = "showTabTwo" + whichToggle;
        const tabThree = "showTabThree" + whichToggle;
        if(element === "first"){
            document.getElementById('showsecond' + whichToggle).classList.remove('active');
            document.getElementById('showfirst' + whichToggle).classList.add('active');
            document.getElementById('showthird' + whichToggle).classList.remove('active');
            this.setState({
                [tabOne]: true,
                [tabTwo]: false,
                [tabThree]: false,
            })
        }else if(element === "second"){
            document.getElementById('showfirst' + whichToggle).classList.remove('active');
            document.getElementById('showsecond' + whichToggle).classList.add('active');
            document.getElementById('showthird' + whichToggle).classList.remove('active');
            this.setState({
                [tabOne]: false,
                [tabTwo]: true,
                [tabThree]: false,
            })
        } else {
            document.getElementById('showfirst' + whichToggle).classList.remove('active');
            document.getElementById('showthird' + whichToggle).classList.add('active');
            document.getElementById('showsecond' + whichToggle).classList.remove('active');
            this.setState({
                [tabOne]: false,
                [tabTwo]: false,
                [tabThree]: true,
            })
        }
    }

    render() {
        const tenantVariables = this.state.tenantVariables || {};
        const backgroundImage = tenantVariables.backgroundImage;
        const topAnswerImage = tenantVariables.topAnswerImage;
        const holdingScreenImage = tenantVariables.holdingScreenImage;
        const frontImage = tenantVariables.frontLogoImage;
        const sponsorLogo = tenantVariables.sponsorLogo;
        const thankYouPageTopLogo = tenantVariables.thankYouPageTopLogo;
        const leftOfScoreboardImage = tenantVariables.leftOfScoreboardImage || "";
        const scoreboardBackground = tenantVariables.scoreboardBackgroundImage;
        const leftScoreboardBackground = tenantVariables.leftScoreboardBackground;
        const topScoreboardImage = tenantVariables.topOfScoreboardImage;
        const desktopBackgroundImage = tenantVariables.desktopBackgroundImage;
        const thankYouPageBackgroundImage = tenantVariables.thankYouPageBackgroundImage;
        const faviconImage = tenantVariables.faviconImage;
        return (
          <div className="admin-wrapper">
            <div className="loading-screen" style={{display: this.state.loading ? 'block' : 'none' }}/>
            <SideMenu/>
            <TopMenu/>
            <div className="admin-main-panel">
                <p className="admin-header-text" style={{marginBottom:0, marginTop:'5px'}}>Game Branding</p>
                <p className="admin-subheader-text">This is where you can edit the game branding on your activation</p>
                <div className="container-out">
                  <div className="admin-form-box" style={{marginTop:'0px', paddingTop:'5px'}}>
                    <form onSubmit={this.handleSubmit} id="create-game-form">
                      <button className="btn btn-primary btn-lg update-button" id="submitButton" style={{marginBottom:'20px'}}><span className="fa fa-arrow-circle-o-up"/> Update</button>
                      <ul className="nav nav-tabs nav-justified nav-bordered mb-3">
                          <li className="nav-item" onClick={()=> this.tripleToggleControl('first', 'Major')}>
                              <a href="#" aria-expanded="false" className="nav-link active" id="showfirstMajor">
                                  <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                  <span className="d-none d-lg-block">Fan Color/Images</span>
                              </a>
                          </li>
                          <li style={{display: 'none'}} className="nav-item" onClick={()=> this.tripleToggleControl('second', 'Major')}>
                              <a href="#" aria-expanded="true" className="nav-link" id="showsecondMajor">
                                  <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                  <span className="d-none d-lg-block">Scoreboard Color/Images</span>
                              </a>
                          </li>
                          <li className="nav-item" onClick={()=> this.tripleToggleControl('third', 'Major')}>
                              <a href="#" aria-expanded="true" className="nav-link" id="showthirdMajor">
                                  <i className="mdi mdi-account-circle d-lg-none d-block mr-1"/>
                                  <span className="d-none d-lg-block">Game Text</span>
                              </a>
                          </li>
                      </ul>
                        <ul className="nav nav-tabs nav-justified nav-bordered mb-3" style={{display: this.state.showTabOneMajor === true ? '' : 'none'}}>
                            <li className="nav-item" onClick={()=> this.toggleColors()}>
                                <a href="#" aria-expanded="false" className="nav-link active" id="showColors">
                                    <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                    <span className="d-none d-lg-block">Colors</span>
                                </a>
                            </li>
                            <li className="nav-item" onClick={()=> this.toggleColors()}>
                                <a href="#" aria-expanded="true" className="nav-link" id="showImages">
                                    <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                    <span className="d-none d-lg-block">Images</span>
                                </a>
                            </li>
                        </ul>
                        <ul className="nav nav-tabs nav-justified nav-bordered mb-3" style={{display: this.state.showTabTwoMajor === true ? '' : 'none'}}>
                            <li className="nav-item" onClick={()=> this.tripleToggleControl("first", "Minor")}>
                                <a href="#" aria-expanded="false" className="nav-link active" id="showfirstMinor">
                                    <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                    <span className="d-none d-lg-block">Colors</span>
                                </a>
                            </li>
                            <li className="nav-item" onClick={()=> this.tripleToggleControl("second", "Minor")}>
                                <a href="#" aria-expanded="true" className="nav-link" id="showsecondMinor">
                                    <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                    <span className="d-none d-lg-block">Images</span>
                                </a>
                            </li>
                            <li className="nav-item" onClick={()=> this.tripleToggleControl("third", "Minor")}>
                                <a href="#" aria-expanded="true" className="nav-link" id="showthirdMinor">
                                    <i className="mdi mdi-home-variant d-lg-none d-block mr-1"/>
                                    <span className="d-none d-lg-block">Timing/Sizes</span>
                                </a>
                            </li>
                        </ul>
                      <div style={{display: this.state.showTabOneMajor ? 'block' : 'none'}}>
                          <div style={{display: this.state.colorsTab ? 'block': 'none'}}>
                              <div className="row">
                                  <div className="col-md-6">
                                      <h4>Primary Colors</h4>
                                      <div className="form-inline">
                                          <ColorPicker
                                              name="primaryColor"
                                              label="Button Color"
                                              value={tenantVariables.primaryColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'primaryColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <ColorPicker
                                              name="secondaryColor"
                                              label="Button Text Color"
                                              value={tenantVariables.secondaryColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'secondaryColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <ColorPicker
                                              name="fanQuestionColor"
                                              label="Question Color"
                                              value={tenantVariables.fanQuestionColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'fanQuestionColor', value: hex }
                                                  })
                                              }
                                          />

                                      </div>
                                  </div>
                                  <div className="col-md-6">
                                      <h4>Answer Button Colors</h4>
                                      <div className="form-inline">

                                          <ColorPicker
                                              name="answerBackgroundColor"
                                              label="Background Color"
                                              value={tenantVariables.answerBackgroundColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'answerBackgroundColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <ColorPicker
                                              name="answerTextColor"
                                              label="Text Color"
                                              value={tenantVariables.answerTextColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'answerTextColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <ColorPicker
                                              name="answerOutlineColor"
                                              label="Outline Color"
                                              value={tenantVariables.answerOutlineColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'answerOutlineColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{ height: '10px', width: '100%' }} />

                                          <ColorPicker
                                              name="answerDescriptionTextColor"
                                              label="Answer Description Text Color"
                                              value={tenantVariables.answerDescriptionTextColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'answerDescriptionTextColor', value: hex }
                                                  })
                                              }
                                          />
                                      </div>
                                  </div>
                              </div>

                              <div style={{height:'10px', width:'100%'}}/>
                              <div className="row">
                                  <div className="col-md-6">
                                      <h4>Answer Action Colors</h4>
                                      <div className="form-inline">
                                          <ColorPicker
                                              name="correctTextColor"
                                              label="Correct Answer Color"
                                              value={tenantVariables.correctTextColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'correctTextColor', value: hex }
                                                  })
                                              }
                                          />

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <ColorPicker
                                              name="incorrectTextColor"
                                              label="Incorrect Answer Color"
                                              value={tenantVariables.incorrectTextColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'incorrectTextColor', value: hex }
                                                  })
                                              }
                                          />

                                      </div>
                                  </div>
                                  <div className="col-md-6">
                                      <h4>Log Out Colors</h4>
                                      <div className="form-inline">

                                          <ColorPicker
                                              name="logOutButtonColor"
                                              label="Log Out Button Color"
                                              value={tenantVariables.logOutButtonColor}
                                              onChange={hex =>
                                                  this.handleChange({
                                                      target: { name: 'logOutButtonColor', value: hex }
                                                  })
                                              }
                                          />

                                      </div>
                                  </div>
                              </div>
                        </div>
                          <div style={{display: this.state.colorsTab ? 'none' : 'block'}}>
                              <div className="row">
                                  <div className="admin-grid-container four-columns" style={{alignItems: 'flex-end', flexGrow: 1}}>
                                      <div className="form-group" style={{textAlign:'center', margin:20}}>
                                          <img src={backgroundImage} width="160" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="backgroundImage">Phone Background Image<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="backgroundImage" name="backgroundImage" type="file" ref={input => {this.backgroundImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('backgroundImage').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{textAlign:'center', margin:20}}>
                                          <img src={desktopBackgroundImage} width="160" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="desktopBackgroundImage">Desktop Background Image<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="desktopBackgroundImage" name="desktopBackgroundImage" type="file" ref={input => {this.desktopBackgroundImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('desktopBackgroundImage').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={topAnswerImage} width="100" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="topAnswerImage">Above End Answers Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="topAnswerImage" name="topAnswerImage" type="file" ref={input => {this.topAnswerImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('topAnswerImage').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{textAlign:'center', margin:20}}>
                                          <img src={frontImage} width="150" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="frontLogoImage">Front Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="frontLogoImage" name="frontLogoImage" type="file" ref={input => {this.frontLogoImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('frontLogoImage').click()} />
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="row">
                                  <div className="admin-grid-container four-columns" style={{alignItems: 'flex-end'}}>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={sponsorLogo} width="140" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="sponsorLogo">Sponsor Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="sponsorLogo" name="sponsorLogo" type="file" ref={input => {this.sponsorLogo = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('sponsorLogo').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={thankYouPageTopLogo} width="100" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="thankYouPageTopLogo">Thank You Page Top Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="thankYouPageTopLogo" name="thankYouPageTopLogo" type="file" ref={input => {this.thankYouPageTopLogo = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('thankYouPageTopLogo').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={holdingScreenImage} width="100" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="holdingScreenImage">Holding Screen Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="holdingScreenImage" name="holdingScreenImage" type="file" ref={input => {this.holdingScreenImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('holdingScreenImage').click()} />
                                          </div>
                                      </div>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={thankYouPageBackgroundImage} width="100" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="thankYouPageBackgroundImage">Thank You Page Background Image<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="thankYouPageBackgroundImage" name="thankYouPageBackgroundImage" type="file" ref={input => {this.thankYouPageBackgroundImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('thankYouPageBackgroundImage').click()} />
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="row">
                                  <div className="admin-grid-container four-columns" style={{alignItems: 'flex-end'}}>
                                      <div className="form-group" style={{float:'left', textAlign:'center', margin:20}}>
                                          <img src={faviconImage} width="140" height="auto" alt=""/>
                                          <br/>
                                          <label htmlFor="faviconImage">Favicon Logo<br/></label>
                                          <div className="form-group">
                                              <input style={{display:'none'}} id="faviconImage" name="faviconImage" type="file" ref={input => {this.faviconImage = input; }} onChange={this.handleImageChange}/>
                                              <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('faviconImage').click()} />
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div style={{display: this.state.showTabTwoMajor ? 'block' : 'none'}}>
                          <div style={{display: this.state.showTabOneMinor ? 'block': 'none'}}>
                              <div className="row">
                                  <div className="col-md-12">
                                      <h4>Scoreboard Colors</h4>
                                      <div className="form-inline">
                                          <div style={{height:'10px', width:'100%'}}/>

                                          <span style={{marginRight:10}} className="fa fa-eyedropper mobile-hide" onClick={()=> this.openColorPicker("progressBarEndWinColor")}/>
                                          <div style={{backgroundColor: this.state.tenantVariables.progressBarEndWinColor, marginRight: 10, border: "solid 1px", minHeight: 20, width: 20, display: "inline-block"}}/>
                                          <label htmlFor="progressBarEndWinColor" style={{marginRight: 10}}>Scoreboard Correct Color</label>
                                          <input id="progressBarEndWinColor" name="progressBarEndWinColor" type="text" className="form-control" value={this.state.tenantVariables.progressBarEndWinColor} onChange={this.handleChange} placeholder="#000"/>

                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div style={{display: this.state.showTabTwoMinor ? 'block' : 'none'}}>
                              <div className="admin-grid-container two-columns">
                                  <div style={{textAlign:'center'}}>
                                      <h4>Scoreboard With Top Image</h4>
                                      <h6>{process.env.REACT_APP_SCOREBOARD_TOP_LINK}</h6>
                                      <div style={{height:'10px', width:'100%'}}/>
                                      <div className="row">
                                          <div className="col-md-6">
                                              <div className="form-group" style={{textAlign:'center'}}>
                                                  <img src={scoreboardBackground} width="160" height="auto" alt=""/>
                                                  <br/>
                                                  <label htmlFor="scoreboardBackgroundImage">Scoreboard Background Image<br/></label>
                                                  <div className="form-group">
                                                      <input style={{display:'none'}} id="scoreboardBackgroundImage" name="scoreboardBackgroundImage" type="file" ref={input => {this.scoreboardBackgroundImage = input; }} onChange={this.handleImageChange}/>
                                                      <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('scoreboardBackgroundImage').click()} />
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="col-md-6">
                                              <div className="form-group" style={{textAlign:'center'}}>
                                                  <img src={topScoreboardImage} width="160" height="auto" alt=""/>
                                                  <br/>
                                                  <label htmlFor="topOfScoreboardImage">Top Of Scoreboard Image<br/></label>
                                                  <div className="form-group">
                                                      <input style={{display:'none'}} id="topOfScoreboardImage" name="topOfScoreboardImage" type="file" ref={input => {this.topOfScoreboardImage = input; }} onChange={this.handleImageChange}/>
                                                      <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('topOfScoreboardImage').click()} />
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div style={{textAlign:'center'}}>
                                      <h4>Scoreboard With Left Image</h4>
                                      <h6>{process.env.REACT_APP_SCOREBOARD_SIDE_LINK}</h6>
                                      <div style={{height:'10px', width:'100%'}}/>
                                      <div className="row">
                                          <div className="col-md-6">
                                              <div className="form-group" style={{textAlign:'center'}}>
                                                  <img src={leftScoreboardBackground} width="160" height="auto" alt=""/>
                                                  <br/>
                                                  <label htmlFor="leftScoreboardBackground">Scoreboard Background Image<br/></label>
                                                  <div className="form-group">
                                                      <input style={{display:'none'}} id="leftScoreboardBackground" name="leftScoreboardBackground" type="file" ref={input => {this.leftScoreboardBackground = input; }} onChange={this.handleImageChange}/>
                                                      <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('leftScoreboardBackground').click()} />
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="col-md-6">
                                              <div className="form-group" style={{textAlign:'center'}}>
                                                  <img src={leftOfScoreboardImage} width="160" height="auto" alt=""/>
                                                  <br/>
                                                  <label htmlFor="leftOfScoreboardImage">Left Of Scoreboard Image<br/></label>
                                                  <div className="form-group">
                                                      <input style={{display:'none'}} id="leftOfScoreboardImage" name="leftOfScoreboardImage" type="file" ref={input => {this.leftOfScoreboardImage = input; }} onChange={this.handleImageChange}/>
                                                      <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('leftOfScoreboardImage').click()} />
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div style={{display: this.state.showTabThreeMinor ? 'block' : 'none'}}>
                              <div className="row">
                                  <div className="col-md-6">
                                      <h4>Timing</h4>
                                      <div className="form-inline">
                                          <label htmlFor="questionDisplayLength" style={{marginRight: 10}}>Question Show Length (secs)</label>
                                          <input id="questionDisplayLength" name="questionDisplayLength" type="number" className="form-control" value={this.state.tenantVariables.questionDisplayLength} onChange={this.handleChange} placeholder="5"/>

                                          <div style={{height:'10px', width:'100%'}}/>

                                          <label htmlFor="answerDisplayLength" style={{marginRight: 10}}>Correct Answer Show Length (secs)</label>
                                          <input id="answerDisplayLength" name="answerDisplayLength" type="number" className="form-control" value={this.state.tenantVariables.answerDisplayLength} onChange={this.handleChange} placeholder="5"/>
                                      </div>
                                  </div>
                                  <div className="col-md-6">
                                      <h4>Top Image Scoreboard Sizes</h4>
                                      <div className="form-inline">
                                          <label htmlFor="topScoreboardQuestionSize" style={{marginRight: 10, marginLeft: 10}}>Question Size</label>
                                          <input id="topScoreboardQuestionSize" name="topScoreboardQuestionSize" type="number" className="form-control" value={this.state.tenantVariables.topScoreboardQuestionSize} onChange={this.handleChange} placeholder="44"/>
                                      </div>
                                      <h4>Left Image Scoreboard Sizes</h4>
                                      <div className="form-inline">
                                          <label htmlFor="leftScoreboardQuestionSize" style={{marginRight: 10, marginLeft: 10}}>Question Size</label>
                                          <input id="leftScoreboardQuestionSize" name="leftScoreboardQuestionSize" type="number" className="form-control" value={this.state.tenantVariables.leftScoreboardQuestionSize} onChange={this.handleChange} placeholder="44"/>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div style={{display: this.state.showTabThreeMajor ? 'block' : 'none'}}>
                          <div className="form-group">
                              <label htmlFor="pageTitle">Page Title:</label>
                              <input id="pageTitle" name="pageTitle" type="text" className="form-control" value={this.state.tenantVariables.pageTitle} onChange={this.handleChange} placeholder="Prediction"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="gameOverHeader">Game Over Header Text:</label>
                              <input id="gameOverHeader" name="gameOverHeader" type="text" className="form-control" value={this.state.tenantVariables.gameOverHeader} onChange={this.handleChange} placeholder="Answers are up!"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="gameOverBody">Game Over Body Text:</label>
                              <input id="gameOverBody" name="gameOverBody" type="text" className="form-control" value={this.state.tenantVariables.gameOverBody} onChange={this.handleChange} placeholder="Sorry you missed answering before the game ended! Come back next game to play again."/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="choosePositionText">Choose Position Text:</label>
                              <input id="choosePositionText" name="choosePositionText" type="text" className="form-control" value={this.state.tenantVariables.choosePositionText} onChange={this.handleChange} placeholder="Choose Position"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="switchText">Switch Text:</label>
                              <input id="switchText" name="switchText" type="text" className="form-control" value={this.state.tenantVariables.switchText} onChange={this.handleChange} placeholder="Switch"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="clearOptionText">Clear Option Text:</label>
                              <input id="clearOptionText" name="clearOptionText" type="text" className="form-control" value={this.state.tenantVariables.clearOptionText} onChange={this.handleChange} placeholder="Clear"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="thankYouPageTopText">Thank You Screen Text:</label>
                              <RichTextMarkdown
                                  allowParagraphAlignment={true}
                                  allowButtons={true}
                                  field={{
                                      id: "thankYouPageTopText",
                                      name: "thankYouPageTopText",
                                      value: tenantVariables.thankYouPageTopText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('thankYouPageTopText', value)
                                  }}
                                  placeholder=""
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="thankYouPageBelowAnswersText">Below Show Answers On Thank You Screen Text:</label>
                              <RichTextMarkdown
                                  allowParagraphAlignment={true}
                                  allowButtons={true}
                                  field={{
                                      id: "thankYouPageBelowAnswersText",
                                      name: "thankYouPageBelowAnswersText",
                                      value: tenantVariables.thankYouPageBelowAnswersText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('thankYouPageBelowAnswersText', value)
                                  }}
                                  placeholder=""
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="gameOverPageText">Game Over Page Text:</label>
                              <RichTextMarkdown
                                  allowParagraphAlignment={true}
                                  allowButtons={true}
                                  field={{
                                      id: "gameOverPageText",
                                      name: "gameOverPageText",
                                      value: tenantVariables.gameOverPageText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('gameOverPageText', value)
                                  }}
                                  placeholder=""
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="playingText">Holding Screen Text:</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "playingText",
                                      name: "playingText",
                                      value: tenantVariables.playingText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('playingText', value)
                                  }}
                                  placeholder=""
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="loginFormHeader">Login Form Header</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "loginFormHeader",
                                      name: "loginFormHeader",
                                      value: tenantVariables.loginFormHeader || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('loginFormHeader', value)
                                  }}
                                  placeholder=""
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="aboveFormText">Above Form Text</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "aboveFormText",
                                      name: "aboveFormText",
                                      value: tenantVariables.aboveFormText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('aboveFormText', value)
                                  }}
                                  placeholder="Enter text above the form"
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="aboveSubmitButtonText">Above Submit Button Text Login Page</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "aboveSubmitButtonText",
                                      name: "aboveSubmitButtonText",
                                      value: tenantVariables.aboveSubmitButtonText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('aboveSubmitButtonText', value)
                                  }}
                                  placeholder="Enter text above the submit button on the login screen"
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="belowSubmitButtonText">Below Submit Button Text Login Page</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "belowSubmitButtonText",
                                      name: "belowSubmitButtonText",
                                      value: tenantVariables.belowSubmitButtonText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('belowSubmitButtonText', value)
                                  }}
                                  placeholder="Enter text below the submit button on the login screen"
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="aboveSubmitButtonMainScreenText">Above Submit Button Text Main Page</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "aboveSubmitButtonMainScreenText",
                                      name: "aboveSubmitButtonMainScreenText",
                                      value: tenantVariables.aboveSubmitButtonMainScreenText || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('aboveSubmitButtonMainScreenText', value)
                                  }}
                                  placeholder="Enter text above the submit button on the main screen"
                              />
                          </div>
                          <div className="form-group">
                              <label htmlFor="needMorePredictionsHeader">Need More Predictions Header:</label>
                              <input id="needMorePredictionsHeader" name="needMorePredictionsHeader" type="text" className="form-control" value={this.state.tenantVariables.needMorePredictionsHeader} onChange={this.handleChange} placeholder="ERROR"/>
                          </div>
                          <div className="form-group">
                              <label htmlFor="needMorePredictionsBody">Need More Predictions Body</label>
                              <RichTextMarkdown
                                  field={{
                                      id: "needMorePredictionsBody",
                                      name: "needMorePredictionsBody",
                                      value: tenantVariables.needMorePredictionsBody || ""
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.handleRichTextChange('needMorePredictionsBody', value)
                                  }}
                                  placeholder="Please select all answers first"
                              />
                          </div>
                        <div className="form-group">
                            <label htmlFor="showAdvancedSettings">Advanced</label>
                            <br/>
                            <input type="checkbox" checked={this.state.advanced} id="advanced" name="advanced" onChange={this.handleCheckBoxChange}/>
                        </div>
                          {this.state.advanced &&
                              <>
                                <div className="form-group">
                                    <label htmlFor="formHeaderText">Form header Text:</label>
                                    <input id="formHeaderText" name="formHeaderText" type="text" className="form-control" value={this.state.tenantVariables.formHeaderText} onChange={this.handleChange} placeholder="Fill out the form for a chance to win a prize!"/>
                                </div>
                              </>
                          }
                      </div>
                    </form>
                  </div>
                </div>
            </div>
         </div>
        );
    }
}

export default SetUpTeamVariables;
